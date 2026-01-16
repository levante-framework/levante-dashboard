import process from 'node:process';

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function parseArgs(argv) {
  const args = {
    projectId: 'hs-levante-admin-prod',
    uid: undefined,
    email: undefined,
    apply: false,
    pretty: true,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === '--project-id' && next) {
      args.projectId = next;
      i += 1;
      continue;
    }

    if (arg === '--uid' && next) {
      args.uid = next;
      i += 1;
      continue;
    }

    if (arg === '--email' && next) {
      args.email = next;
      i += 1;
      continue;
    }

    if (arg === '--apply') {
      args.apply = true;
      continue;
    }

    if (arg === '--no-pretty') {
      args.pretty = false;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      // eslint-disable-next-line no-console
      console.log(`
Usage:
  node scripts/admin/rebuild-custom-claims.mjs --project-id <firebase-project-id> (--uid <uid> | --email <email>) [--apply]

What it does:
  - Reads Firestore:
    - users/<uid>.roles (new permissions roles)
  - Builds a consistent Firebase Auth custom claims object including:
    - admin, super_admin, roarUid/adminUid/assessmentUid, useNewPermissions
    - rolesSet
    - roles[] (array of { siteId, role, siteName })
    - siteRoles (map siteId -> [roles])
    - siteNames (map siteId -> siteName)
  - By default it prints the proposed custom claims (dry run).
  - With --apply it writes them via Firebase Auth setCustomUserClaims.

Why:
  - Some environments can end up with Auth custom claims missing siteRoles/siteNames/roles, which backend authorization
    may depend on. This script rebuilds those mappings from users/<uid>.roles without relying on userClaims docs.

Auth:
  - Uses Application Default Credentials (ADC). Ensure one of these is set up:
    - GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
    - or \`gcloud auth application-default login\` on a machine with access.

Examples:
  node scripts/admin/rebuild-custom-claims.mjs --project-id hs-levante-admin-prod --email anniec42@stanford.edu
  node scripts/admin/rebuild-custom-claims.mjs --project-id hs-levante-admin-prod --email anniec42@stanford.edu --apply
`);
      process.exit(0);
    }
  }

  if (!args.uid && !args.email) {
    throw new Error('Missing required identifier: provide --uid <uid> or --email <email>');
  }

  return args;
}

function buildRoleMaps(roles) {
  const siteRoles = {};
  const siteNames = {};

  for (const r of roles) {
    if (!r?.siteId || !r?.role) continue;
    if (!siteRoles[r.siteId]) siteRoles[r.siteId] = [];
    if (!siteRoles[r.siteId].includes(r.role)) siteRoles[r.siteId].push(r.role);

    if (typeof r.siteName === 'string' && r.siteName.trim()) {
      siteNames[r.siteId] = r.siteName.trim();
    } else if (!(r.siteId in siteNames)) {
      siteNames[r.siteId] = r.siteId;
    }
  }

  return { siteRoles, siteNames };
}

async function main() {
  const args = parseArgs(process.argv);

  initializeApp({
    credential: applicationDefault(),
    projectId: args.projectId,
  });

  const auth = getAuth();
  const firestore = getFirestore();

  const user = args.uid ? await auth.getUser(args.uid) : await auth.getUserByEmail(args.email);
  const uid = user.uid;

  const usersSnap = await firestore.doc(`users/${uid}`).get();
  const usersDoc = usersSnap.exists ? usersSnap.data() : null;

  const rolesFromUsers = Array.isArray(usersDoc?.roles) ? usersDoc.roles : [];
  const normalizedRoles =
    rolesFromUsers.length > 0
      ? rolesFromUsers.map((r) => ({
          siteId: String(r.siteId ?? ''),
          role: String(r.role ?? ''),
          siteName: typeof r.siteName === 'string' ? r.siteName : '',
        }))
      : [];

  const existingCustomClaims = user.customClaims ?? {};

  // Keep these booleans from Auth custom claims (authoritative for backend authorization).
  const hasSuperAdmin = Boolean(existingCustomClaims?.super_admin);
  const hasAdmin = Boolean(existingCustomClaims?.admin || hasSuperAdmin);
  const useNewPermissions = Boolean(existingCustomClaims?.useNewPermissions);

  const fallbackRoles =
    normalizedRoles.length > 0
      ? normalizedRoles
      : Array.isArray(existingCustomClaims?.roles) && existingCustomClaims.roles.length > 0
        ? existingCustomClaims.roles.map((r) => ({
            siteId: String(r.siteId ?? ''),
            role: String(r.role ?? ''),
            siteName: typeof r.siteName === 'string' ? r.siteName : '',
          }))
      : hasSuperAdmin
        ? [{ siteId: 'any', role: 'super_admin', siteName: 'any' }]
        : [];

  const rolesSet = Array.from(new Set(fallbackRoles.map((r) => r.role).filter(Boolean)));
  const { siteRoles, siteNames } = buildRoleMaps(fallbackRoles);

  const nextCustomClaims = {
    ...existingCustomClaims,
    admin: hasAdmin,
    super_admin: hasSuperAdmin,
    adminUid: String(existingCustomClaims?.adminUid ?? uid),
    assessmentUid: String(existingCustomClaims?.assessmentUid ?? uid),
    roarUid: String(existingCustomClaims?.roarUid ?? uid),
    useNewPermissions,
    rolesSet,
    roles: fallbackRoles,
    siteRoles,
    siteNames,
  };

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        projectId: args.projectId,
        uid,
        email: user.email ?? undefined,
        apply: args.apply,
        proposedCustomClaims: nextCustomClaims,
      },
      null,
      args.pretty ? 2 : 0,
    ),
  );

  if (!args.apply) return;

  await auth.setCustomUserClaims(uid, nextCustomClaims);
  // eslint-disable-next-line no-console
  console.log('Custom claims updated.');
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to rebuild custom claims:', error?.message ?? error);
  process.exitCode = 1;
});

