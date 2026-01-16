import process from 'node:process';

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function parseArgs(argv) {
  const args = {
    projectId: 'hs-levante-admin-prod',
    includeAuth: true,
    limit: undefined,
    format: 'compact',
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === '--project-id' && next) {
      args.projectId = next;
      i += 1;
      continue;
    }

    if (arg === '--no-auth') {
      args.includeAuth = false;
      continue;
    }

    if (arg === '--limit' && next) {
      const parsed = Number(next);
      if (Number.isFinite(parsed) && parsed > 0) args.limit = parsed;
      i += 1;
      continue;
    }

    if (arg === '--format' && next) {
      if (next === 'json' || next === 'table' || next === 'compact') args.format = next;
      i += 1;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      // eslint-disable-next-line no-console
      console.log(`
Usage:
  node scripts/admin/list-superadmins.mjs [--project-id hs-levante-admin-prod] [--no-auth] [--limit N] [--format compact|table|json]

What it does:
  - Queries Firestore collection "userClaims" for documents where claims.super_admin == true.
  - Prints matching UIDs and (optionally) resolves each UID to a Firebase Auth user (email/displayName).

Auth:
  - Uses Application Default Credentials (ADC). Ensure one of these is set up:
    - GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
    - or \`gcloud auth application-default login\` on a machine with access.
`);
      process.exit(0);
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv);

  initializeApp({
    credential: applicationDefault(),
    projectId: args.projectId,
  });

  const firestore = getFirestore();
  const auth = args.includeAuth ? getAuth() : null;

  const query = firestore.collection('userClaims').where('claims.super_admin', '==', true);
  const snap = await query.get();

  const uids = snap.docs.map((d) => d.id);
  const limitedUids = typeof args.limit === 'number' ? uids.slice(0, args.limit) : uids;

  const rows = [];

  for (const uid of limitedUids) {
    const doc = snap.docs.find((d) => d.id === uid);
    const docData = doc?.data() ?? {};
    const claims = docData?.claims ?? {};

    let email;
    let displayName;
    let authDisabled;
    let authSuperAdmin;
    let authAdmin;

    if (auth) {
      try {
        const user = await auth.getUser(uid);
        email = user.email ?? undefined;
        displayName = user.displayName ?? undefined;
        authDisabled = user.disabled ?? undefined;
        authSuperAdmin = Boolean(user.customClaims?.super_admin);
        authAdmin = Boolean(user.customClaims?.admin);
      } catch (error) {
        email = undefined;
        displayName = undefined;
        authDisabled = undefined;
        authSuperAdmin = undefined;
        authAdmin = undefined;
      }
    }

    rows.push({
      uid,
      email,
      displayName,
      authDisabled,
      super_admin: Boolean(claims?.super_admin),
      admin: Boolean(claims?.admin),
      auth_super_admin: authSuperAdmin,
      auth_admin: authAdmin,
      mismatch: auth ? Boolean(claims?.super_admin) !== Boolean(authSuperAdmin) : undefined,
    });
  }

  if (args.format === 'json') {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ projectId: args.projectId, count: rows.length, rows }, null, 2));
    return;
  }

  if (args.format === 'compact') {
    // eslint-disable-next-line no-console
    console.log(`Project: ${args.projectId}`);
    // eslint-disable-next-line no-console
    console.log(`SuperAdmins found: ${uids.length}${args.limit ? ` (showing first ${rows.length})` : ''}`);

    const compactRows = rows
      .map((r) => ({ displayName: r.displayName ?? '', email: r.email ?? '' }))
      .filter((r) => r.displayName || r.email);

    // eslint-disable-next-line no-console
    console.table(compactRows);
    return;
  }

  // eslint-disable-next-line no-console
  console.log(`Project: ${args.projectId}`);
  // eslint-disable-next-line no-console
  console.log(`SuperAdmins found: ${uids.length}${args.limit ? ` (showing first ${rows.length})` : ''}`);
  // eslint-disable-next-line no-console
  console.table(rows);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to list SuperAdmins:', error?.message ?? error);
  process.exitCode = 1;
});

