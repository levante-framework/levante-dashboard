import process from 'node:process';

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function parseArgs(argv) {
  const args = {
    projectId: 'hs-levante-admin-prod',
    uid: undefined,
    email: undefined,
    includePermissionsDoc: true,
    format: 'json',
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

    if (arg === '--no-permissions-doc') {
      args.includePermissionsDoc = false;
      continue;
    }

    if (arg === '--format' && next) {
      if (next === 'json' || next === 'table') args.format = next;
      i += 1;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      // eslint-disable-next-line no-console
      console.log(`
Usage:
  node scripts/admin/inspect-admin-access.mjs --project-id <firebase-project-id> (--uid <uid> | --email <email>) [--format json|table] [--no-permissions-doc]

What it does:
  - Resolves the target user (by uid or email) in Firebase Auth
  - Prints:
    - Firebase Auth custom claims (user.customClaims)
    - Firestore doc: userClaims/<uid> (typically drives UI gating + shouldUsePermissions)
    - Firestore doc: users/<uid> (includes roles[] used by the new permissions system)
    - Firestore doc: system/permissions (global permissions matrix; optional)

Auth:
  - Uses Application Default Credentials (ADC). Ensure one of these is set up:
    - GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
    - or \`gcloud auth application-default login\` on a machine with access.

Examples:
  node scripts/admin/inspect-admin-access.mjs --project-id hs-levante-admin-prod --email someone@levante.org
  node scripts/admin/inspect-admin-access.mjs --project-id hs-levante-admin-dev --uid <uid> --format table
`);
      process.exit(0);
    }
  }

  if (!args.uid && !args.email) {
    throw new Error('Missing required identifier: provide --uid <uid> or --email <email>');
  }

  return args;
}

async function safeGetDoc(firestore, path) {
  try {
    const snap = await firestore.doc(path).get();
    return snap.exists ? snap.data() : null;
  } catch (error) {
    return { _error: error?.message ?? String(error) };
  }
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

  const [userClaimsDoc, userDoc, permissionsDoc] = await Promise.all([
    safeGetDoc(firestore, `userClaims/${uid}`),
    safeGetDoc(firestore, `users/${uid}`),
    args.includePermissionsDoc ? safeGetDoc(firestore, `system/permissions`) : Promise.resolve(undefined),
  ]);

  const output = {
    projectId: args.projectId,
    user: {
      uid,
      email: user.email ?? undefined,
      displayName: user.displayName ?? undefined,
      disabled: user.disabled ?? undefined,
      customClaims: user.customClaims ?? {},
    },
    firestore: {
      userClaims: userClaimsDoc ?? null,
      users: userDoc ?? null,
      ...(args.includePermissionsDoc ? { system_permissions: permissionsDoc ?? null } : {}),
    },
  };

  if (args.format === 'table') {
    // eslint-disable-next-line no-console
    console.log(`Project: ${output.projectId}`);
    // eslint-disable-next-line no-console
    console.table([
      {
        uid: output.user.uid,
        email: output.user.email,
        super_admin_customClaim: Boolean(output.user.customClaims?.super_admin),
        super_admin_userClaimsDoc: Boolean(output.firestore.userClaims?.claims?.super_admin),
        useNewPermissions_userClaimsDoc: Boolean(output.firestore.userClaims?.claims?.useNewPermissions),
        rolesCount_usersDoc: Array.isArray(output.firestore.users?.roles) ? output.firestore.users.roles.length : undefined,
      },
    ]);
    return;
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to inspect admin access:', error?.message ?? error);
  process.exitCode = 1;
});

