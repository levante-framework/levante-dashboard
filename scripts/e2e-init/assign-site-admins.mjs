import { readFileSync } from 'node:fs';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeRoles(roles) {
  if (!Array.isArray(roles)) return [];
  return roles
    .map((r) => ({
      siteId: String(r?.siteId ?? '').trim(),
      role: String(r?.role ?? '').trim(),
      siteName: typeof r?.siteName === 'string' ? r.siteName.trim() : '',
    }))
    .filter((r) => r.siteId && r.role);
}

function dedupeRoles(roles) {
  const map = new Map();
  for (const r of roles) {
    map.set(`${r.siteId}:${r.role}`, r);
  }
  return Array.from(map.values());
}

function buildRoleMaps(roles) {
  const siteRoles = {};
  const siteNames = {};
  for (const r of roles) {
    if (!siteRoles[r.siteId]) siteRoles[r.siteId] = [];
    if (!siteRoles[r.siteId].includes(r.role)) siteRoles[r.siteId].push(r.role);
    if (r.siteName) siteNames[r.siteId] = r.siteName;
    else if (!(r.siteId in siteNames)) siteNames[r.siteId] = r.siteId;
  }
  return { siteRoles, siteNames };
}

async function getDistrictByNormalizedName(db, name) {
  const normalizedName = normalizeName(name);
  const snap = await db.collection('districts').where('normalizedName', '==', normalizedName).limit(2).get();
  if (snap.empty) return null;
  if (snap.size > 1) {
    throw new Error(`Expected at most 1 district with normalizedName="${normalizedName}", found ${snap.size}`);
  }
  return snap.docs[0];
}

async function readPayload(inputPath) {
  if (inputPath) {
    return JSON.parse(readFileSync(inputPath, 'utf-8'));
  }
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf-8').trim();
  if (!raw) throw new Error('Missing JSON payload on stdin');
  return JSON.parse(raw);
}

function parseArgs(argv) {
  const args = { inputPath: undefined, projectId: undefined };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--input') args.inputPath = argv[++i];
    else if (a === '--project-id') args.projectId = argv[++i];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const payload = await readPayload(args.inputPath);
const projectId =
  args.projectId ||
  payload?.projectId ||
  process.env.E2E_FIREBASE_PROJECT_ID ||
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT;

if (!projectId) throw new Error('Missing project id');
if (!Array.isArray(payload?.users) || payload.users.length === 0) {
  throw new Error('Missing users list in payload');
}

initializeApp({
  projectId,
  credential: applicationDefault(),
});

const db = getFirestore();
const auth = getAuth();

for (const user of payload.users) {
  const email = String(user?.email ?? '').trim();
  if (!email) throw new Error('Missing user email');
  const sites = Array.isArray(user?.sites) ? user.sites : [];
  if (sites.length === 0) throw new Error(`Missing sites for ${email}`);

  const siteDocs = await Promise.all(
    sites.map(async (siteName) => {
      const doc = await getDistrictByNormalizedName(db, siteName);
      if (!doc) throw new Error(`No site found for "${siteName}"`);
      return { id: doc.id, name: doc.data()?.name ?? siteName };
    }),
  );

  const authUser = await auth.getUserByEmail(email);
  const uid = authUser.uid;
  const usersRef = db.collection('users').doc(uid);
  const usersSnap = await usersRef.get();
  const usersDoc = usersSnap.exists ? usersSnap.data() : null;

  const rolesFromUsers = normalizeRoles(usersDoc?.roles);
  const rolesFromClaims = normalizeRoles(authUser.customClaims?.roles);
  const baseRoles = rolesFromUsers.length > 0 ? rolesFromUsers : rolesFromClaims;

  const nextRoles = dedupeRoles([
    ...baseRoles,
    ...siteDocs.map((site) => ({ siteId: site.id, siteName: site.name, role: 'site_admin' })),
  ]);

  const rolesSet = Array.from(new Set(nextRoles.map((r) => r.role)));
  const { siteRoles, siteNames } = buildRoleMaps(nextRoles);
  const existingClaims = authUser.customClaims ?? {};
  const hasAdminRole = rolesSet.some((role) => ['admin', 'site_admin', 'super_admin'].includes(role));

  const mergedClaims = {
    ...existingClaims,
    admin: existingClaims.admin ?? hasAdminRole,
    super_admin: existingClaims.super_admin ?? false,
    useNewPermissions: existingClaims.useNewPermissions ?? true,
    rolesSet,
    roles: nextRoles,
    siteRoles,
    siteNames,
    roarUid: existingClaims.roarUid ?? uid,
    adminUid: existingClaims.adminUid ?? uid,
    assessmentUid: existingClaims.assessmentUid ?? uid,
  };

  await auth.setCustomUserClaims(uid, mergedClaims);

  await db
    .collection('userClaims')
    .doc(uid)
    .set(
      {
        claims: mergedClaims,
        lastUpdated: Date.now(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  await usersRef.set(
    {
      roles: nextRoles,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  console.log(`[assign-site-admins] updated ${email} (uid=${uid}) in ${projectId}`);
}
