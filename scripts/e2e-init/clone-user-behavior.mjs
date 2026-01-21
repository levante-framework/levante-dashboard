import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import crypto from 'node:crypto';

function parseArgs(argv) {
  const args = {
    email: undefined,
    newEmail: undefined,
    projectId: undefined,
    dev: false,
    force: false,
    password: undefined,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--email') args.email = argv[++i];
    else if (a === '--new-email') args.newEmail = argv[++i];
    else if (a === '--project-id') args.projectId = argv[++i];
    else if (a === '--dev') args.dev = true;
    else if (a === '--force') args.force = true;
    else if (a === '--password') args.password = argv[++i];
  }
  if (!args.email) throw new Error('Missing --email');
  if (!args.newEmail) throw new Error('Missing --new-email');
  return args;
}

function deepReplace(value, replacements) {
  if (Array.isArray(value)) return value.map((v) => deepReplace(v, replacements));
  if (value && typeof value === 'object') {
    const next = {};
    for (const [k, v] of Object.entries(value)) {
      next[k] = deepReplace(v, replacements);
    }
    return next;
  }
  for (const [from, to] of replacements) {
    if (value === from) return to;
  }
  return value;
}

function buildClaims(sourceClaims, newUid) {
  const next = { ...(sourceClaims || {}) };
  next.roarUid = newUid;
  next.adminUid = newUid;
  next.assessmentUid = newUid;
  return next;
}

async function cloneSubcollections({ db, sourceUid, targetUid, sourceEmail, targetEmail }) {
  const sourceRef = db.collection('users').doc(sourceUid);
  const targetRef = db.collection('users').doc(targetUid);
  const collections = await sourceRef.listCollections();
  for (const col of collections) {
    const snap = await col.get();
    if (snap.empty) continue;
    let batch = db.batch();
    let count = 0;
    for (const doc of snap.docs) {
      const data = doc.data();
      const replaced = deepReplace(data, [
        [sourceUid, targetUid],
        [sourceEmail, targetEmail],
      ]);
      batch.set(targetRef.collection(col.id).doc(doc.id), replaced, { merge: true });
      count += 1;
      if (count % 400 === 0) {
        await batch.commit();
        batch = db.batch();
      }
    }
    if (count % 400 !== 0) await batch.commit();
  }
}

const args = parseArgs(process.argv.slice(2));
const projectId =
  args.projectId ||
  (args.dev ? 'hs-levante-admin-dev' : 'hs-levante-admin-prod') ||
  process.env.E2E_FIREBASE_PROJECT_ID ||
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT;

initializeApp({
  projectId,
  credential: applicationDefault(),
});

const auth = getAuth();
const db = getFirestore();

const sourceUser = await auth.getUserByEmail(args.email);
const sourceUid = sourceUser.uid;
const sourceEmail = sourceUser.email || args.email;

let existingTarget = null;
try {
  existingTarget = await auth.getUserByEmail(args.newEmail);
} catch {}

if (existingTarget) {
  if (!args.force) throw new Error(`Target user already exists (${args.newEmail}). Use --force to replace.`);
  await auth.deleteUser(existingTarget.uid);
}

const password = args.password || `Clone-${crypto.randomBytes(18).toString('base64url')}`;
const created = await auth.createUser({
  email: args.newEmail,
  password,
  displayName: args.newEmail.split('@')[0],
  emailVerified: true,
});

const targetUid = created.uid;
const targetEmail = created.email || args.newEmail;

const sourceUserDoc = await db.collection('users').doc(sourceUid).get();
if (!sourceUserDoc.exists) throw new Error(`Missing users doc for ${sourceUid}`);
const sourceData = sourceUserDoc.data() || {};

const replacedUserData = deepReplace(sourceData, [
  [sourceUid, targetUid],
  [sourceEmail, targetEmail],
]);

await db
  .collection('users')
  .doc(targetUid)
  .set(
    {
      ...replacedUserData,
      email: targetEmail,
      displayName: created.displayName,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

const sourceClaims = sourceUser.customClaims || {};
const nextClaims = buildClaims(sourceClaims, targetUid);
await auth.setCustomUserClaims(targetUid, nextClaims);

const sourceClaimsDoc = await db.collection('userClaims').doc(sourceUid).get();
const claimsPayload = sourceClaimsDoc.exists ? sourceClaimsDoc.data() : {};
await db
  .collection('userClaims')
  .doc(targetUid)
  .set(
    {
      ...(claimsPayload || {}),
      claims: nextClaims,
      lastUpdated: Date.now(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

await cloneSubcollections({
  db,
  sourceUid,
  targetUid,
  sourceEmail,
  targetEmail,
});

console.log('[clone-user-behavior] done');
console.log(`projectId=${projectId}`);
console.log(`sourceEmail=${sourceEmail}`);
console.log(`targetEmail=${targetEmail}`);
console.log(`targetUid=${targetUid}`);
console.log(`password=${password}`);
