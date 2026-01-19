import { readFileSync } from 'node:fs';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const inputPath = process.argv[2];
if (!inputPath) throw new Error('Missing path to orgs JSON');

const payload = JSON.parse(readFileSync(inputPath, 'utf-8'));
const { projectId, users } = payload ?? {};

if (!projectId) throw new Error('Missing projectId in payload');
if (!Array.isArray(users) || users.length === 0) throw new Error('Missing users list in payload');

initializeApp({
  projectId,
  credential: applicationDefault(),
});

const db = getFirestore();
const auth = getAuth();

await Promise.all(
  users.map(async (user) => {
    if (!user?.uid) return;
    const normalizedUserType = user.userType === 'caregiver' ? 'parent' : user.userType;
    const update = {
      orgIds: user.orgIds ?? {},
      districtId: user.districtId ?? null,
      siteId: user.siteId ?? null,
      ...(normalizedUserType ? { userType: normalizedUserType } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await db.collection('users').doc(user.uid).set(update, { merge: true });

    if (user.siteId) {
      const claims = {
        useNewPermissions: true,
        roles: ['participant'],
        rolesSet: ['participant'],
        siteRoles: { [user.siteId]: ['participant'] },
        siteNames: { [user.siteId]: user.siteName ?? '' },
        roarUid: user.uid,
        adminUid: user.uid,
        assessmentUid: user.uid,
      };
      await auth.setCustomUserClaims(user.uid, claims);
      await db.collection('userClaims').doc(user.uid).set(
        {
          claims: {
            ...claims,
          },
          lastUpdated: Date.now(),
        },
        { merge: true },
      );
    }
  }),
);

console.log(`[patch-user-orgs] updated ${users.length} users in ${projectId}`);
