import 'dotenv/config';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import fs from 'node:fs/promises';
import path from 'node:path';

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
  const claimsRef = db.collection('userClaims').doc(uid);
  const claimsSnap = await claimsRef.get();

  const backupDir = path.join(process.cwd(), 'cypress', 'tmp');
  await fs.mkdir(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `userClaims-backup-${uid}.json`);
  await fs.writeFile(backupPath, JSON.stringify(claimsSnap.data() ?? null, null, 2));

  await claimsRef.set(
    {
      claims: {
        roles: FieldValue.delete(),
        rolesSet: FieldValue.delete(),
        siteRoles: FieldValue.delete(),
        siteNames: FieldValue.delete(),
        admin: FieldValue.delete(),
        super_admin: FieldValue.delete(),
        adminOrgs: FieldValue.delete(),
        minimalAdminOrgs: FieldValue.delete(),
      },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  console.log(
    JSON.stringify(
      {
        projectId: args.projectId,
        email: args.email,
        uid,
        removedFields: [
          'claims.roles',
          'claims.rolesSet',
          'claims.siteRoles',
          'claims.siteNames',
          'claims.admin',
          'claims.super_admin',
          'claims.adminOrgs',
          'claims.minimalAdminOrgs',
        ],
        backupPath,
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
