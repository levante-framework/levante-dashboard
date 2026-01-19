import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const debugPath = new URL('../../cypress/tmp/link-users-debug.json', import.meta.url);
const credsPath = new URL('../../bug-tests/site.ai-tests.creds.json', import.meta.url);
const creds = JSON.parse(readFileSync(credsPath, 'utf-8'));

const projectId = process.env.VITE_FIREBASE_PROJECT_ID || creds.projectId;
const superEmail = process.env.E2E_AI_SUPER_ADMIN_EMAIL;
const superPassword = process.env.E2E_AI_SUPER_ADMIN_PASSWORD;
const adminEmail = process.env.E2E_AI_ADMIN_EMAIL || creds.users?.admin?.email;
const adminPassword = process.env.E2E_AI_ADMIN_PASSWORD || creds.users?.admin?.password;
const siteAdminEmail = process.env.E2E_AI_SITE_ADMIN_EMAIL || creds.users?.site_admin?.email;
const siteAdminPassword = process.env.E2E_AI_SITE_ADMIN_PASSWORD || creds.users?.site_admin?.password;
const email = superEmail || adminEmail || siteAdminEmail;
const password = superPassword || adminPassword || siteAdminPassword;
const apiKey =
  process.env.VITE_FIREBASE_API_KEY ||
  process.env.FIREBASE_API_KEY ||
  process.env.VITE_FIREBASE_KEY ||
  process.env.VITE_FIREBASE_PUBLIC_API_KEY ||
  (projectId?.includes('hs-levante-admin-dev') ? 'AIzaSyCOzRA9a2sDHtVlX7qnszxrgsRCBLyf5p0' : null) ||
  (projectId?.includes('hs-levante-admin-prod') ? 'AIzaSyCcnmBCojjK0_Ia87f0SqclSOihhKVD3f8' : null);

if (!projectId) throw new Error('Missing projectId (VITE_FIREBASE_PROJECT_ID or creds)');
if (!email || !password) throw new Error('Missing site admin creds (E2E_AI_SITE_ADMIN_EMAIL/PASSWORD)');
if (!apiKey) throw new Error('Missing Firebase API key (VITE_FIREBASE_API_KEY)');

const debug = JSON.parse(readFileSync(debugPath, 'utf-8'));
const users = debug?.requestBody?.data?.users || debug?.requestBody?.data?.userData?.users || [];
const targetUid = users?.[1]?.uid;

if (!targetUid) throw new Error('No uid found in link-users-debug.json');

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

async function fetchUser(idToken, uid) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`;
  const { res, body } = await jsonFetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) throw new Error(`fetch user failed (${res.status}): ${JSON.stringify(body)}`);
  return body;
}

async function main() {
  try {
    const idToken = await signIn();
    const userDoc = await fetchUser(idToken, targetUid);
    console.log('uid:', targetUid);
    console.log('user doc:', JSON.stringify(userDoc, null, 2));
    return;
  } catch (error) {
    console.warn('REST fetch failed, falling back to admin SDK:', error.message);
  }

  initializeApp({
    projectId,
    credential: applicationDefault(),
  });
  const db = getFirestore();
  const userSnap = await db.collection('users').doc(targetUid).get();
  if (!userSnap.exists) throw new Error(`User doc not found for uid ${targetUid}`);
  const claimsSnap = await db.collection('userClaims').doc(targetUid).get();
  console.log('uid:', targetUid);
  console.log('user doc:', JSON.stringify(userSnap.data(), null, 2));
  console.log('userClaims doc:', JSON.stringify(claimsSnap.data() ?? null, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
