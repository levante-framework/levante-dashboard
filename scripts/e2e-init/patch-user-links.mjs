import { readFileSync } from 'node:fs';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const inputPath = process.argv[2];
if (!inputPath) throw new Error('Missing path to link-users debug JSON');

const payload = JSON.parse(readFileSync(inputPath, 'utf-8'));
const requestUsers =
  payload?.requestBody?.data?.users ||
  payload?.requestBody?.data?.userData?.users ||
  payload?.requestBody?.data?.userData?.userData?.users;

if (!Array.isArray(requestUsers) || requestUsers.length === 0) {
  throw new Error('No users found in link-users payload');
}

const projectId = payload?.requestBody?.data?.siteId
  ? 'hs-levante-admin-dev'
  : 'hs-levante-admin-dev';

initializeApp({
  projectId,
  credential: applicationDefault(),
});

const db = getFirestore();
const idToUid = new Map(requestUsers.map((user) => [user.id, user.uid]));

const updates = requestUsers
  .filter((user) => user.userType === 'child')
  .map((child) => {
    const parentUid = child.parentId ? idToUid.get(child.parentId) : null;
    const teacherUid = child.teacherId ? idToUid.get(child.teacherId) : null;
    return {
      uid: child.uid,
      parentUid,
      teacherUid,
    };
  });

await Promise.all(
  updates.map(async ({ uid, parentUid, teacherUid }) => {
    const update = {
      ...(parentUid ? { parentId: parentUid } : {}),
      ...(teacherUid ? { teacherId: teacherUid } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await db.collection('users').doc(uid).set(update, { merge: true });
  }),
);

console.log(`[patch-user-links] updated ${updates.length} child users in ${projectId}`);
