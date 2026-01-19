import 'dotenv/config';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function parseArgs(argv) {
  const args = { projectId: undefined, email: undefined };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--project-id') args.projectId = argv[++i];
    else if (a === '--email') args.email = argv[++i];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.projectId) throw new Error('Missing --project-id');
  if (!args.email) throw new Error('Missing --email');

  initializeApp({
    projectId: args.projectId,
    credential: applicationDefault(),
  });

  const auth = getAuth();
  const db = getFirestore();
  const user = await auth.getUserByEmail(args.email);
  const uid = user.uid;

  const userSnap = await db.collection('users').doc(uid).get();
  const claimsSnap = await db.collection('userClaims').doc(uid).get();

  const payload = {
    projectId: args.projectId,
    email: args.email,
    uid,
    authUser: {
      disabled: user.disabled,
      emailVerified: user.emailVerified,
      displayName: user.displayName ?? null,
      customClaims: user.customClaims ?? null,
      providerData: user.providerData?.map((p) => ({
        providerId: p.providerId,
        uid: p.uid,
        email: p.email ?? null,
      })),
    },
    userDoc: userSnap.exists ? userSnap.data() : null,
    userClaimsDoc: claimsSnap.exists ? claimsSnap.data() : null,
  };

  console.log(JSON.stringify(payload, null, 2));
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exit(1);
});
