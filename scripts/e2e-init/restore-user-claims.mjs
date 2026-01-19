import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function parseArgs(argv) {
  const args = { projectId: undefined, email: undefined, backupPath: undefined };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--project-id') args.projectId = argv[++i];
    else if (a === '--email') args.email = argv[++i];
    else if (a === '--backup-path') args.backupPath = argv[++i];
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.projectId) throw new Error('Missing --project-id');
  if (!args.email) throw new Error('Missing --email');
  if (!args.backupPath) throw new Error('Missing --backup-path');

  const backup = JSON.parse(readFileSync(args.backupPath, 'utf8'));

  initializeApp({
    projectId: args.projectId,
    credential: applicationDefault(),
  });

  const auth = getAuth();
  const db = getFirestore();
  const user = await auth.getUserByEmail(args.email);
  const uid = user.uid;

  await db.collection('userClaims').doc(uid).set(backup, { merge: false });

  console.log(
    JSON.stringify(
      {
        projectId: args.projectId,
        email: args.email,
        uid,
        restoredFrom: args.backupPath,
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
