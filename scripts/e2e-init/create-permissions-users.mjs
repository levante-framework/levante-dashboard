#!/usr/bin/env node
import 'dotenv/config';

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';

function parseArgs(argv) {
  const args = {
    siteName: 'ai-tests',
    projectId: undefined,
    outCreds: 'bug-tests/site.ai-tests.creds.json',
    force: false,
    adminEmail: process.env.E2E_AI_ADMIN_EMAIL || 'ai-admin@levante.test',
    adminPassword: process.env.E2E_AI_ADMIN_PASSWORD,
    siteAdminEmail: process.env.E2E_AI_SITE_ADMIN_EMAIL || 'ai-site-admin@levante.test',
    siteAdminPassword: process.env.E2E_AI_SITE_ADMIN_PASSWORD,
    researchAssistantEmail: process.env.E2E_AI_RESEARCH_ASSISTANT_EMAIL || 'ai-research-assistant@levante.test',
    researchAssistantPassword: process.env.E2E_AI_RESEARCH_ASSISTANT_PASSWORD,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--site-name') args.siteName = argv[++i];
    else if (a === '--project-id') args.projectId = argv[++i];
    else if (a === '--out-creds') args.outCreds = argv[++i];
    else if (a === '--force') args.force = true;
    else if (a === '--admin-email') args.adminEmail = argv[++i];
    else if (a === '--admin-password') args.adminPassword = argv[++i];
    else if (a === '--site-admin-email') args.siteAdminEmail = argv[++i];
    else if (a === '--site-admin-password') args.siteAdminPassword = argv[++i];
    else if (a === '--research-assistant-email') args.researchAssistantEmail = argv[++i];
    else if (a === '--research-assistant-password') args.researchAssistantPassword = argv[++i];
  }

  return args;
}

function normalizeToLowercase(input) {
  return String(input).trim().toLowerCase();
}

async function getDistrictByNormalizedName(db, normalizedName) {
  const snap = await db.collection('districts').where('normalizedName', '==', normalizedName).limit(2).get();
  if (snap.empty) return null;
  if (snap.size > 1) {
    throw new Error(`Expected at most 1 district with normalizedName="${normalizedName}", found ${snap.size}`);
  }
  return snap.docs[0];
}

function isSafeEmail(email) {
  return email.toLowerCase().includes('ai-') || email.toLowerCase().endsWith('@levante.test');
}

async function upsertAdminUser({ projectId, districtId, siteName, email, password, role, force }) {
  if (!role) throw new Error('Missing role for admin user');
  if (!email) throw new Error('Missing admin email');
  const effectivePassword = password || `AI1-${crypto.randomBytes(24).toString('base64url')}`;

  if (!isSafeEmail(email) && !force) {
    throw new Error(`Refusing to delete/recreate non-e2e admin user "${email}". Use --force to override.`);
  }

  const auth = getAuth();
  let existingUid = null;
  try {
    const u = await auth.getUserByEmail(email);
    existingUid = u.uid;
  } catch {
    // ignore not-found
  }

  if (existingUid) {
    await auth.deleteUser(existingUid);
  }

  const created = await auth.createUser({
    email,
    password: effectivePassword,
    displayName: email.split('@')[0],
    emailVerified: true,
  });

  const db = getFirestore();
  const uid = created.uid;

  const roles = [role];
  const siteRoles = { [districtId]: roles };
  const siteNames = { [districtId]: siteName };

  await db.collection('users').doc(uid).set(
    {
      email,
      name: { first: 'AI', middle: '', last: 'Admin' },
      displayName: email.split('@')[0],
      roles: [{ siteId: districtId, siteName, role }],
      testData: true,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const orgs = {
    districts: [districtId],
    sites: [districtId],
    schools: [],
    classes: [],
    groups: [],
    families: [],
  };

  await db.collection('userClaims').doc(uid).set(
    {
      claims: {
        super_admin: false,
        admin: true,
        useNewPermissions: true,
        roarUid: uid,
        adminUid: uid,
        adminOrgs: orgs,
        minimalAdminOrgs: orgs,
        roles,
        rolesSet: roles,
        siteRoles,
        siteNames,
      },
      testData: true,
      lastUpdated: Date.now(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await auth.setCustomUserClaims(uid, {
    super_admin: false,
    admin: true,
    useNewPermissions: true,
    roarUid: uid,
    adminUid: uid,
    adminOrgs: orgs,
    minimalAdminOrgs: orgs,
    roles,
    rolesSet: roles,
    siteRoles,
    siteNames,
  });

  console.log(`[e2e-init] created ${role} user (${email}) for site "${siteName}" (uid=${uid}) in ${projectId}`);
  return { uid, email, password: effectivePassword, role };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const envProject =
    process.env.E2E_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT;

  const viteProject = process.env.VITE_FIREBASE_PROJECT;
  const isDev = viteProject === 'DEV' || (args.projectId || envProject) === 'hs-levante-admin-dev';

  if (!args.force && !isDev) {
    throw new Error(
      'Refusing to run outside DEV. Set VITE_FIREBASE_PROJECT=DEV or pass --project-id hs-levante-admin-dev. (Use --force to override)',
    );
  }

  const projectId = args.projectId || envProject || 'hs-levante-admin-dev';

  initializeApp({
    projectId,
    credential: applicationDefault(),
  });

  const db = getFirestore();
  const siteName = args.siteName;
  const normalizedName = normalizeToLowercase(siteName);
  const districtDoc = await getDistrictByNormalizedName(db, normalizedName);
  if (!districtDoc) {
    throw new Error(`No site found with normalizedName="${normalizedName}". Create the site first.`);
  }

  const districtId = districtDoc.id;

  const users = {
    admin: await upsertAdminUser({
      projectId,
      districtId,
      siteName,
      email: args.adminEmail,
      password: args.adminPassword,
      role: 'admin',
      force: args.force,
    }),
    site_admin: await upsertAdminUser({
      projectId,
      districtId,
      siteName,
      email: args.siteAdminEmail,
      password: args.siteAdminPassword,
      role: 'site_admin',
      force: args.force,
    }),
    research_assistant: await upsertAdminUser({
      projectId,
      districtId,
      siteName,
      email: args.researchAssistantEmail,
      password: args.researchAssistantPassword,
      role: 'research_assistant',
      force: args.force,
    }),
  };

  const creds = {
    projectId,
    siteName,
    districtId,
    createdAt: new Date().toISOString(),
    users,
    notes: { useNewPermissions: true },
  };

  if (args.outCreds) {
    await fs.writeFile(args.outCreds, JSON.stringify(creds, null, 2));
    console.log(`[e2e-init] wrote ${args.outCreds}`);
  }

  console.log('[e2e-init] export these for task-permissions:');
  console.log(`export E2E_FIREBASE_PROJECT_ID=${projectId}`);
  console.log(`export E2E_SITE_NAME=${siteName}`);
  console.log(`export E2E_AI_ADMIN_EMAIL=${users.admin.email}`);
  console.log(`export E2E_AI_ADMIN_PASSWORD=${users.admin.password}`);
  console.log(`export E2E_AI_SITE_ADMIN_EMAIL=${users.site_admin.email}`);
  console.log(`export E2E_AI_SITE_ADMIN_PASSWORD=${users.site_admin.password}`);
  console.log(`export E2E_AI_RESEARCH_ASSISTANT_EMAIL=${users.research_assistant.email}`);
  console.log(`export E2E_AI_RESEARCH_ASSISTANT_PASSWORD=${users.research_assistant.password}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
