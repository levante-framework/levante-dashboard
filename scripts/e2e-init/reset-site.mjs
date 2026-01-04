#!/usr/bin/env node
import 'dotenv/config';

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

function parseArgs(argv) {
  const args = {
    siteName: 'ai-tests',
    projectId: undefined,
    out: 'bug-tests/site.ai-tests.json',
    outCreds: 'bug-tests/site.ai-tests.creds.json',
    yes: false,
    force: false,
    createAdminUsers: true,
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
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--out-creds') args.outCreds = argv[++i];
    else if (a === '--yes') args.yes = true;
    else if (a === '--force') args.force = true;
    else if (a === '--no-admin') args.createAdminUsers = false;
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

async function getExistingDistrictByNormalizedName(db, normalizedName) {
  const snap = await db.collection('districts').where('normalizedName', '==', normalizedName).limit(2).get();
  if (snap.empty) return null;
  if (snap.size > 1) {
    throw new Error(`Expected at most 1 district with normalizedName="${normalizedName}", found ${snap.size}`);
  }
  return snap.docs[0];
}

async function deleteAllForDistrict(db, districtId) {
  const writer = db.bulkWriter();
  let deleteCount = 0;

  async function deleteQuery(query) {
    const snap = await query.get();
    snap.docs.forEach((doc) => {
      writer.delete(doc.ref);
      deleteCount += 1;
    });
  }

  await deleteQuery(db.collection('groups').where('parentOrgId', '==', districtId));
  await deleteQuery(db.collection('classes').where('districtId', '==', districtId));
  await deleteQuery(db.collection('schools').where('districtId', '==', districtId));

  // Finally delete the district itself.
  writer.delete(db.collection('districts').doc(districtId));
  deleteCount += 1;

  await writer.close();
  return deleteCount;
}

async function resetAdminUser({ projectId, districtId, siteName, email, password, role, force }) {
  if (!role) throw new Error('Missing role for admin user');
  if (!email) throw new Error('Missing admin email');
  const effectivePassword = password || `AI1-${crypto.randomBytes(24).toString('base64url')}`;

  // Guard: don't allow destructive admin ops on arbitrary accounts unless explicitly forced.
  const safeEmail = email.toLowerCase().includes('ai-') || email.toLowerCase().endsWith('@levante.test');
  if (!safeEmail && !force) {
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

  const orgs = { districts: [districtId], schools: [], classes: [], groups: [], families: [] };
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
      },
      testData: true,
      lastUpdated: Date.now(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  console.log(`[e2e-init] created ${role} user (${email}) for site "${siteName}" (uid=${uid}) in ${projectId}`);
  return { uid, email, password: effectivePassword };
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

  if (!args.yes) {
    throw new Error(
      `This is destructive. Re-run with --yes to delete/recreate site "${args.siteName}" in project "${args.projectId || envProject || '(default)'}".`,
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

  const existing = await getExistingDistrictByNormalizedName(db, normalizedName);
  if (existing) {
    const deleted = await deleteAllForDistrict(db, existing.id);
    console.log(`[e2e-init] deleted existing site "${siteName}" (districtId=${existing.id}) and ${deleted - 1} dependent docs`);
  } else {
    console.log(`[e2e-init] no existing site "${siteName}" found; creating fresh`);
  }

  const districtRef = db.collection('districts').doc();
  await districtRef.set({
    name: siteName,
    normalizedName,
    tags: [],
    schools: [],
    classes: [],
    archivedSchools: [],
    archivedClasses: [],
    subGroups: [],
    type: 'districts',
    createdBy: 'e2e-init',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const payload = {
    projectId,
    districtId: districtRef.id,
    siteName,
    normalizedName,
    createdAt: new Date().toISOString(),
  };

  let createdAdminUser = null;
  let createdSiteAdminUser = null;
  let createdResearchAssistantUser = null;

  if (args.createAdminUsers) {
    createdAdminUser = await resetAdminUser({
      projectId,
      districtId: districtRef.id,
      siteName,
      email: args.adminEmail,
      password: args.adminPassword,
      role: 'admin',
      force: args.force,
    });
    createdSiteAdminUser = await resetAdminUser({
      projectId,
      districtId: districtRef.id,
      siteName,
      email: args.siteAdminEmail,
      password: args.siteAdminPassword,
      role: 'site_admin',
      force: args.force,
    });
    createdResearchAssistantUser = await resetAdminUser({
      projectId,
      districtId: districtRef.id,
      siteName,
      email: args.researchAssistantEmail,
      password: args.researchAssistantPassword,
      role: 'research_assistant',
      force: args.force,
    });

    payload.aiAdmin = { uid: createdAdminUser.uid, email: createdAdminUser.email, role: 'admin' };
    payload.aiSiteAdmin = { uid: createdSiteAdminUser.uid, email: createdSiteAdminUser.email, role: 'site_admin' };
    payload.aiResearchAssistant = {
      uid: createdResearchAssistantUser.uid,
      email: createdResearchAssistantUser.email,
      role: 'research_assistant',
    };
  }

  const outPath = path.resolve(process.cwd(), args.out);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');

  if (args.createAdminUsers) {
    const creds = {
      projectId,
      siteName,
      districtId: districtRef.id,
      createdAt: payload.createdAt,
      users: {
        // Note: passwords are written to this creds file only (gitignored).
        admin: { email: createdAdminUser.email, password: createdAdminUser.password, role: 'admin' },
        site_admin: { email: createdSiteAdminUser.email, password: createdSiteAdminUser.password, role: 'site_admin' },
        research_assistant: {
          email: createdResearchAssistantUser.email,
          password: createdResearchAssistantUser.password,
          role: 'research_assistant',
        },
      },
      notes: {
        useNewPermissions: true,
      },
    };
    const credsPath = path.resolve(process.cwd(), args.outCreds);
    await fs.mkdir(path.dirname(credsPath), { recursive: true });
    await fs.writeFile(credsPath, JSON.stringify(creds, null, 2) + '\n', 'utf8');
    console.log(`[e2e-init] wrote ${args.outCreds}`);
  }

  console.log(`[e2e-init] created site "${siteName}" (districtId=${districtRef.id})`);
  console.log(`[e2e-init] wrote ${args.out}`);
}

main().catch((err) => {
  console.error(`[e2e-init] ERROR: ${err?.message || err}`);
  process.exit(1);
});

