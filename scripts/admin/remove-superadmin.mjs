import process from 'node:process';

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function parseArgs(argv) {
  const args = {
    projectId: 'hs-levante-admin-prod',
    apply: false,
    emails: [],
    uids: [],
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === '--project-id' && next) {
      args.projectId = next;
      i += 1;
      continue;
    }

    if (arg === '--apply') {
      args.apply = true;
      continue;
    }

    if (arg === '--email' && next) {
      args.emails.push(next);
      i += 1;
      continue;
    }

    if (arg === '--uid' && next) {
      args.uids.push(next);
      i += 1;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      // eslint-disable-next-line no-console
      console.log(`
Usage:
  node scripts/admin/remove-superadmin.mjs --project-id <firebase-project-id> [--email a@b.com]... [--uid <uid>]... [--apply]

What it does:
  - Demotes targets by clearing SuperAdmin access:
    - Firebase Auth custom claims: sets super_admin=false (and removes super_admin from role mappings when present)
    - Firestore: sets userClaims/<uid>.claims.super_admin=false (if doc exists)
    - Firestore: removes { siteId: "any", role: "super_admin" } from users/<uid>.roles (if doc exists)

Safety:
  - Dry-run by default. Only writes when --apply is provided.

Auth:
  - Uses Application Default Credentials (ADC). Ensure one of these is set up:
    - GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
    - or \`gcloud auth application-default login\` on a machine with access.
`);
      process.exit(0);
    }
  }

  if (args.emails.length === 0 && args.uids.length === 0) {
    throw new Error('Provide at least one --email or --uid');
  }

  return args;
}

function normalizeRoles(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((r) => ({
      siteId: String(r?.siteId ?? ''),
      role: String(r?.role ?? ''),
      siteName: typeof r?.siteName === 'string' ? r.siteName : '',
    }))
    .filter((r) => r.siteId && r.role);
}

function removeAnySuperAdminRole(roles) {
  return normalizeRoles(roles).filter((r) => !(r.siteId === 'any' && r.role === 'super_admin'));
}

function buildRoleMaps(roles) {
  const siteRoles = {};
  const siteNames = {};

  for (const r of roles) {
    if (!siteRoles[r.siteId]) siteRoles[r.siteId] = [];
    if (!siteRoles[r.siteId].includes(r.role)) siteRoles[r.siteId].push(r.role);

    if (typeof r.siteName === 'string' && r.siteName.trim()) siteNames[r.siteId] = r.siteName.trim();
    else if (!(r.siteId in siteNames)) siteNames[r.siteId] = r.siteId;
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

  const targets = [];

  for (const email of args.emails) {
    try {
      const user = await auth.getUserByEmail(email);
      targets.push({ kind: 'email', email, uid: user.uid, authUser: user });
    } catch (error) {
      targets.push({ kind: 'email', email, uid: null, authUser: null, authError: error?.message ?? String(error) });
    }
  }

  for (const uid of args.uids) {
    if (targets.some((t) => t.uid === uid)) continue;
    try {
      const user = await auth.getUser(uid);
      targets.push({ kind: 'uid', uid, email: user.email ?? undefined, authUser: user });
    } catch (error) {
      targets.push({ kind: 'uid', uid, email: undefined, authUser: null, authError: error?.message ?? String(error) });
    }
  }

  const results = [];

  for (const t of targets) {
    const uid = t.uid;

    const userClaimsRef = uid ? firestore.doc(`userClaims/${uid}`) : null;
    const usersRef = uid ? firestore.doc(`users/${uid}`) : null;

    const [userClaimsSnap, usersSnap] = uid
      ? await Promise.all([userClaimsRef.get(), usersRef.get()])
      : [null, null];

    const existingUserClaims = userClaimsSnap?.exists ? userClaimsSnap.data() : null;
    const existingUsersDoc = usersSnap?.exists ? usersSnap.data() : null;

    const existingUsersRoles = normalizeRoles(existingUsersDoc?.roles);
    const nextUsersRoles = removeAnySuperAdminRole(existingUsersRoles);

    const existingCustomClaims = t.authUser?.customClaims ?? null;
    const existingClaimRoles = normalizeRoles(existingCustomClaims?.roles);
    const nextClaimRoles = removeAnySuperAdminRole(existingClaimRoles);
    const { siteRoles, siteNames } = buildRoleMaps(nextClaimRoles);
    const rolesSet = Array.from(new Set(nextClaimRoles.map((r) => r.role)));

    const nextCustomClaims = existingCustomClaims
      ? {
          ...existingCustomClaims,
          super_admin: false,
          roles: nextClaimRoles,
          rolesSet,
          siteRoles,
          siteNames,
        }
      : null;

    const willWriteAuth = Boolean(args.apply && t.authUser && nextCustomClaims);
    const willWriteUserClaims = Boolean(
      args.apply && uid && userClaimsSnap?.exists && existingUserClaims?.claims?.super_admin === true,
    );
    const willWriteUsersRoles = Boolean(
      args.apply && uid && usersSnap?.exists && existingUsersRoles.length !== nextUsersRoles.length,
    );

    if (willWriteAuth) {
      await auth.setCustomUserClaims(uid, nextCustomClaims);
    }

    if (willWriteUserClaims) {
      await userClaimsRef.set(
        {
          claims: {
            ...(existingUserClaims?.claims ?? {}),
            super_admin: false,
          },
        },
        { merge: true },
      );
    }

    if (willWriteUsersRoles) {
      await usersRef.set({ roles: nextUsersRoles }, { merge: true });
    }

    results.push({
      projectId: args.projectId,
      input: { kind: t.kind, email: t.email, uid: t.uid },
      apply: args.apply,
      auth: {
        hasAuthUser: Boolean(t.authUser),
        authError: t.authError,
        super_admin_before: existingCustomClaims?.super_admin,
        super_admin_after: nextCustomClaims?.super_admin,
        rolesCount_before: existingCustomClaims ? existingClaimRoles.length : null,
        rolesCount_after: existingCustomClaims ? nextClaimRoles.length : null,
      },
      firestore: {
        userClaims_exists: Boolean(userClaimsSnap?.exists),
        userClaims_super_admin_before: existingUserClaims?.claims?.super_admin,
        userClaims_super_admin_after: userClaimsSnap?.exists ? false : null,
        users_exists: Boolean(usersSnap?.exists),
        users_rolesCount_before: usersSnap?.exists ? existingUsersRoles.length : null,
        users_rolesCount_after: usersSnap?.exists ? nextUsersRoles.length : null,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ projectId: args.projectId, apply: args.apply, count: results.length, results }, null, 2));
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to remove SuperAdmin:', error?.message ?? error);
  process.exitCode = 1;
});

