import 'dotenv/config';
import { readFileSync } from 'node:fs';

const credsPath = new URL('../../bug-tests/site.ai-tests.creds.json', import.meta.url);
const creds = JSON.parse(readFileSync(credsPath, 'utf-8'));

const projectId = process.env.VITE_FIREBASE_PROJECT_ID || creds.projectId;
const siteId = process.env.E2E_SITE_ID || creds.districtId;
const adminEmail = process.env.E2E_AI_ADMIN_EMAIL || creds.users?.admin?.email;
const adminPassword = process.env.E2E_AI_ADMIN_PASSWORD || creds.users?.admin?.password;
const siteAdminEmail = process.env.E2E_AI_SITE_ADMIN_EMAIL || creds.users?.site_admin?.email;
const siteAdminPassword = process.env.E2E_AI_SITE_ADMIN_PASSWORD || creds.users?.site_admin?.password;
const email = adminEmail || siteAdminEmail;
const password = adminPassword || siteAdminPassword;
const apiKey =
  process.env.VITE_FIREBASE_API_KEY ||
  process.env.FIREBASE_API_KEY ||
  process.env.VITE_FIREBASE_KEY ||
  process.env.VITE_FIREBASE_PUBLIC_API_KEY ||
  (projectId?.includes('hs-levante-admin-dev') ? 'AIzaSyCOzRA9a2sDHtVlX7qnszxrgsRCBLyf5p0' : null) ||
  (projectId?.includes('hs-levante-admin-prod') ? 'AIzaSyCcnmBCojjK0_Ia87f0SqclSOihhKVD3f8' : null);

if (!projectId) throw new Error('Missing projectId (VITE_FIREBASE_PROJECT_ID or creds)');
if (!siteId) throw new Error('Missing siteId (E2E_SITE_ID or creds.districtId)');
if (!email || !password)
  throw new Error('Missing admin creds (E2E_AI_ADMIN_EMAIL/PASSWORD or E2E_AI_SITE_ADMIN_EMAIL/PASSWORD)');
if (!apiKey) throw new Error('Missing Firebase API key (VITE_FIREBASE_API_KEY)');

async function jsonFetch(url, options) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  return { res, body };
}

async function signIn() {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
  const { res, body } = await jsonFetch(url, {
    method: 'POST',
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  if (!res.ok) throw new Error(`signIn failed (${res.status}): ${JSON.stringify(body)}`);
  return body.idToken;
}

async function runQuery(idToken, field) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  const query = {
    structuredQuery: {
      from: [{ collectionId: 'groups' }],
      where: {
        fieldFilter: {
          field: { fieldPath: field },
          op: 'EQUAL',
          value: { stringValue: siteId },
        },
      },
      limit: 1,
    },
  };
  const { res, body } = await jsonFetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(query),
  });
  if (!res.ok) throw new Error(`runQuery failed (${res.status}): ${JSON.stringify(body)}`);
  const doc = Array.isArray(body) ? body.find((row) => row.document)?.document : null;
  if (!doc?.name) return null;
  return doc.name.split('/').pop();
}

async function main() {
  const idToken = await signIn();

  const groupId =
    (await runQuery(idToken, 'parentOrgId')) ||
    (await runQuery(idToken, 'districtId')) ||
    null;

  if (!groupId) {
    console.log('No groups found for site; aborting.');
    return;
  }

  const now = Date.now();
  const cohort = `e2e-cohort-${now}`;
  const caregiverType = process.env.E2E_DEBUG_CAREGIVER_TYPE || 'caregiver';
  const includeSiteId = process.env.E2E_DEBUG_INCLUDE_SITE_ID !== 'false';
  const includeSitesOrgIds = process.env.E2E_DEBUG_INCLUDE_SITES_ORGIDS !== 'false';
  const users = [
    {
      id: `e2e_child_${now}`,
      userType: 'child',
      month: '5',
      year: '2017',
      cohort,
      caregiverId: '',
      teacherId: '',
      orgIds: {
        schools: [],
        classes: [],
        districts: [siteId],
        groups: [groupId],
        families: [],
        ...(includeSitesOrgIds ? { sites: [siteId] } : {}),
      },
      isTestData: true,
      districtId: siteId,
      ...(includeSiteId ? { siteId } : {}),
    },
    {
      id: `e2e_caregiver_${now}`,
      userType: caregiverType,
      month: '5',
      year: '2017',
      cohort,
      caregiverId: '',
      teacherId: '',
      orgIds: {
        schools: [],
        classes: [],
        districts: [siteId],
        groups: [groupId],
        families: [],
        ...(includeSitesOrgIds ? { sites: [siteId] } : {}),
      },
      isTestData: true,
      districtId: siteId,
      ...(includeSiteId ? { siteId } : {}),
    },
    {
      id: `e2e_teacher_${now}`,
      userType: 'teacher',
      month: '5',
      year: '2017',
      cohort,
      caregiverId: '',
      teacherId: '',
      orgIds: {
        schools: [],
        classes: [],
        districts: [siteId],
        groups: [groupId],
        families: [],
        ...(includeSitesOrgIds ? { sites: [siteId] } : {}),
      },
      isTestData: true,
      districtId: siteId,
      ...(includeSiteId ? { siteId } : {}),
    },
  ];

  const wrapUserData = process.env.E2E_DEBUG_WRAP_USER_DATA === 'true';
  const userDataPayload = includeSiteId ? { users, siteId } : { users };
  const siteIds = includeSiteId ? [siteId] : [];
  const districtIds = includeSiteId ? [siteId] : [];
  const userDataWithIds = { ...userDataPayload, siteIds, districtIds };
  const userDataWithNested = { ...userDataWithIds, userData: userDataWithIds };
  const payload = {
    data: {
      userData: wrapUserData ? { userData: userDataPayload } : userDataWithNested,
      ...(includeSiteId ? { siteId } : {}),
      ...(includeSiteId ? { siteIds, districtIds } : {}),
      districtId: siteId,
    },
  };

  const url = `https://us-central1-${projectId}.cloudfunctions.net/createUsers`;
  const { res, body } = await jsonFetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(payload),
  });

  console.log('createUsers status:', res.status);
  console.log('createUsers response:', JSON.stringify(body, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
