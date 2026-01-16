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
    updateUsersRoles: true,
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

    if (arg === '--no-update-users-roles') {
      args.updateUsersRoles = false;
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
  node scripts/admin/set-superadmin.mjs --project-id <firebase-project-id> (--uid <uid> | --email <email>) [--apply] [--no-update-users-roles]

What it does:
  - Sets Firebase Auth custom claims:
    - super_admin: true
    - admin: true
  - Ensures the claims mappings used by the dashboard/backend exist:
    - rolesSet, roles[], siteRoles, siteNames
  - Optionally ensures Firestore users/<uid>.roles includes { siteId: "any", role: "super_admin" } (default on).

Safety:
  - Dry-run by default (prints proposed changes). Only writes when --apply is provided.

Auth:
  - Uses Application Default Credentials (ADC). Ensure one of these is set up:
    - GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
    - or \`gcloud auth application-default login\` on a machine with access.

Examples:
  node scripts/admin/set-superadmin.mjs --project-id hs-levante-admin-prod --email cuskley@stanford.edu
  node scripts/admin/set-superadmin.mjs --project-id hs-levante-admin-prod --email cuskley@stanford.edu --apply
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

function normalizeRoles(roles) {
  if (!Array.isArray(roles)) return [];
  return roles
    .map((r) => ({
      siteId: String(r?.siteId ?? ''),
      role: String(r?.role ?? ''),
      siteName: typeof r?.siteName === 'string' ? r.siteName : '',
    }))
    .filter((r) => r.siteId && r.role);
}

function ensureAnySuperAdminRole(roles) {
  const normalized = normalizeRoles(roles);
  const hasAnySuperAdmin = normalized.some((r) => r.siteId === 'any' && r.role === 'super_admin');
  if (hasAnySuperAdmin) return normalized;
  return [...normalized, { siteId: 'any', role: 'super_admin', siteName: 'any' }];
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

  const existingCustomClaims = user.customClaims ?? {};

  const usersRef = firestore.doc(`users/${uid}`);
  const usersSnap = await usersRef.get();
  const usersDoc = usersSnap.exists ? usersSnap.data() : null;

  const rolesFromUsers = normalizeRoles(usersDoc?.roles);
  const rolesFromClaims = normalizeRoles(existingCustomClaims?.roles);

  const rolesBase = rolesFromUsers.length > 0 ? rolesFromUsers : rolesFromClaims;
  const nextRoles = ensureAnySuperAdminRole(rolesBase);

  const rolesSet = Array.from(new Set(nextRoles.map((r) => r.role)));
  const { siteRoles, siteNames } = buildRoleMaps(nextRoles);

  const nextCustomClaims = {
    ...existingCustomClaims,
    admin: true,
    super_admin: true,
    adminUid: String(existingCustomClaims?.adminUid ?? uid),
    assessmentUid: String(existingCustomClaims?.assessmentUid ?? uid),
    roarUid: String(existingCustomClaims?.roarUid ?? uid),
    useNewPermissions: Boolean(existingCustomClaims?.useNewPermissions ?? true),
    rolesSet,
    roles: nextRoles,
    siteRoles,
    siteNames,
  };

  const willUpdateUsersRoles =
    args.updateUsersRoles &&
    (rolesFromUsers.length === 0 || !rolesFromUsers.some((r) => r.siteId === 'any' && r.role === 'super_admin'));

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        projectId: args.projectId,
        uid,
        email: user.email ?? undefined,
        apply: args.apply,
        updateUsersRoles: args.updateUsersRoles,
        willUpdateUsersRoles,
        existingCustomClaims,
        proposedCustomClaims: nextCustomClaims,
        existingUsersRoles: rolesFromUsers,
        proposedUsersRoles: willUpdateUsersRoles ? nextRoles : rolesFromUsers,
      },
      null,
      args.pretty ? 2 : 0,
    ),
  );

  if (!args.apply) return;

  await auth.setCustomUserClaims(uid, nextCustomClaims);

  if (willUpdateUsersRoles) {
    await usersRef.set({ roles: nextRoles }, { merge: true });
  }

  // eslint-disable-next-line no-console
  console.log('SuperAdmin update applied. User must re-authenticate to refresh their ID token.');
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to set SuperAdmin:', error?.message ?? error);
  process.exitCode = 1;
});

