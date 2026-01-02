#!/usr/bin/env node
import 'dotenv/config';

import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import fs from 'node:fs/promises';
import path from 'node:path';

function parseArgs(argv) {
  const args = {
    siteName: 'ai-tests',
    projectId: undefined,
    out: 'bug-tests/site.ai-tests.json',
    yes: false,
    force: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--site-name') args.siteName = argv[++i];
    else if (a === '--project-id') args.projectId = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--yes') args.yes = true;
    else if (a === '--force') args.force = true;
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
      `Refusing to run outside DEV. Set VITE_FIREBASE_PROJECT=DEV or pass --project-id hs-levante-admin-dev. (Use --force to override)`,
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

  const outPath = path.resolve(process.cwd(), args.out);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');

  console.log(`[e2e-init] created site "${siteName}" (districtId=${districtRef.id})`);
  console.log(`[e2e-init] wrote ${args.out}`);
}

main().catch((err) => {
  console.error(`[e2e-init] ERROR: ${err?.message || err}`);
  process.exit(1);
});

