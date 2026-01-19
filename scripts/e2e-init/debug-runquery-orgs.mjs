import 'dotenv/config';

function parseArgs(argv) {
  const args = {
    projectId: undefined,
    email: undefined,
    password: undefined,
    idToken: undefined,
    siteId: undefined,
    schoolId: undefined,
    className: undefined,
    orgType: 'classes',
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--project-id') args.projectId = argv[++i];
    else if (a === '--email') args.email = argv[++i];
    else if (a === '--password') args.password = argv[++i];
    else if (a === '--id-token') args.idToken = argv[++i];
    else if (a === '--site-id') args.siteId = argv[++i];
    else if (a === '--school-id') args.schoolId = argv[++i];
    else if (a === '--class-name') args.className = argv[++i];
    else if (a === '--org-type') args.orgType = argv[++i];
  }
  return args;
}

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase();
}

async function jsonFetch(url, options) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  return { res, body };
}

async function signIn({ apiKey, email, password }) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
  const { res, body } = await jsonFetch(url, {
    method: 'POST',
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  if (!res.ok) throw new Error(`signIn failed (${res.status}): ${JSON.stringify(body)}`);
  return body.idToken;
}

function buildRunQuery({ orgType, orgNormalizedName, siteId, schoolId }) {
  const filters = [
    {
      fieldFilter: {
        field: { fieldPath: 'normalizedName' },
        op: 'EQUAL',
        value: { stringValue: orgNormalizedName },
      },
    },
  ];

  if (orgType === 'schools' && siteId) {
    filters.push({
      fieldFilter: {
        field: { fieldPath: 'districtId' },
        op: 'EQUAL',
        value: { stringValue: siteId },
      },
    });
  }

  if (orgType === 'classes') {
    if (schoolId) {
      filters.push({
        fieldFilter: {
          field: { fieldPath: 'schoolId' },
          op: 'EQUAL',
          value: { stringValue: schoolId },
        },
      });
    }
    if (siteId) {
      filters.push({
        fieldFilter: {
          field: { fieldPath: 'districtId' },
          op: 'EQUAL',
          value: { stringValue: siteId },
        },
      });
    }
  }

  return {
    structuredQuery: {
      from: [{ collectionId: orgType, allDescendants: false }],
      select: { fields: [{ fieldPath: 'id' }, { fieldPath: 'name' }, { fieldPath: 'normalizedName' }] },
      where: {
        compositeFilter: {
          op: 'AND',
          filters,
        },
      },
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.projectId) throw new Error('Missing --project-id');
  if (!args.idToken && (!args.email || !args.password)) {
    throw new Error('Missing --id-token or --email/--password');
  }
  if (!args.className) throw new Error('Missing --class-name');

  let idToken = args.idToken;
  if (!idToken) {
    const apiKey =
      process.env.VITE_FIREBASE_API_KEY ||
      process.env.FIREBASE_API_KEY ||
      process.env.VITE_FIREBASE_KEY ||
      process.env.VITE_FIREBASE_PUBLIC_API_KEY ||
      (args.projectId.includes('hs-levante-admin-dev') ? 'AIzaSyCOzRA9a2sDHtVlX7qnszxrgsRCBLyf5p0' : null) ||
      (args.projectId.includes('hs-levante-admin-prod') ? 'AIzaSyCcnmBCojjK0_Ia87f0SqclSOihhKVD3f8' : null);
    if (!apiKey) throw new Error('Missing Firebase API key (set VITE_FIREBASE_API_KEY)');
    idToken = await signIn({ apiKey, email: args.email, password: args.password });
  }
  const orgNormalizedName = normalizeName(args.className);
  const body = buildRunQuery({
    orgType: args.orgType,
    orgNormalizedName,
    siteId: args.siteId,
    schoolId: args.schoolId,
  });

  const url = `https://firestore.googleapis.com/v1/projects/${args.projectId}/databases/(default)/documents:runQuery`;
  const { res, body: responseBody } = await jsonFetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(body),
  });

  console.log(
    JSON.stringify(
      {
        projectId: args.projectId,
        email: args.email,
        orgType: args.orgType,
        className: args.className,
        siteId: args.siteId ?? null,
        schoolId: args.schoolId ?? null,
        status: res.status,
        response: responseBody,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exit(1);
});
