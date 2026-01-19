#!/usr/bin/env node
import 'dotenv/config';

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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

function ensureAnySuperAdminRole(roles) {
  const has = roles.some((r) => r.siteId === 'any' && r.role === 'super_admin');
  return has ? roles : [...roles, { siteId: 'any', role: 'super_admin', siteName: 'any' }];
}

function parseArgs(argv) {
  const args = {
    email: undefined,
    projectId:
      process.env.E2E_FIREBASE_PROJECT_ID ||
      process.env.FIREBASE_PROJECT_ID ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCLOUD_PROJECT ||
      'hs-levante-admin-dev',
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--email') args.email = argv[++i];
    else if (a === '--project-id') args.projectId = argv[++i];
  }

  if (!args.email) throw new Error('Missing --email');
  return args;
}

const { email, projectId } = parseArgs(process.argv.slice(2));

initializeApp({
  projectId,
  credential: applicationDefault(),
});

const auth = getAuth();
const db = getFirestore();

const user = await auth.getUserByEmail(email);
const uid = user.uid;
const existingClaims = user.customClaims ?? {};

const usersRef = db.collection('users').doc(uid);
const usersSnap = await usersRef.get();
const usersDoc = usersSnap.exists ? usersSnap.data() : null;

const rolesFromUsers = normalizeRoles(usersDoc?.roles);
const rolesFromClaims = normalizeRoles(existingClaims?.roles);
const baseRoles = rolesFromUsers.length > 0 ? rolesFromUsers : rolesFromClaims;
const nextRoles = ensureAnySuperAdminRole(baseRoles);

const rolesSet = Array.from(new Set(nextRoles.map((r) => r.role)));
const { siteRoles, siteNames } = buildRoleMaps(nextRoles);

const mergedClaims = {
  ...existingClaims,
  admin: true,
  super_admin: true,
  useNewPermissions: Boolean(existingClaims?.useNewPermissions ?? true),
  rolesSet,
  roles: nextRoles,
  siteRoles,
  siteNames,
  roarUid: existingClaims.roarUid ?? uid,
  adminUid: existingClaims.adminUid ?? uid,
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

const hasSuperAdminRole = rolesFromUsers.some((r) => r.siteId === 'any' && r.role === 'super_admin');
if (!hasSuperAdminRole) {
  await usersRef.set(
    {
      roles: nextRoles,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

console.log(`[make-superadmin] Updated ${email} (uid=${uid}) in ${projectId}`);
