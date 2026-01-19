import 'dotenv/config';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function parseArgs(argv) {
  const args = { projectId: undefined, siteName: undefined, schoolName: undefined, className: undefined };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--project-id') args.projectId = argv[++i];
    else if (a === '--site-name') args.siteName = argv[++i];
    else if (a === '--school-name') args.schoolName = argv[++i];
    else if (a === '--class-name') args.className = argv[++i];
  }
  return args;
}

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase();
}

async function queryByName(collection, name, field = 'name') {
  if (!name) return [];
  const snap = await collection.where(field, '==', name).limit(20).get();
  return snap.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
}

async function queryByNormalizedName(collection, name) {
  if (!name) return [];
  const normalizedName = normalizeName(name);
  const snap = await collection.where('normalizedName', '==', normalizedName).limit(20).get();
  return snap.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.projectId) throw new Error('Missing --project-id');
  if (!args.siteName || !args.schoolName || !args.className) {
    throw new Error('Missing --site-name, --school-name, or --class-name');
  }

  initializeApp({
    projectId: args.projectId,
    credential: applicationDefault(),
  });

  const db = getFirestore();
  const districts = db.collection('districts');
  const schools = db.collection('schools');
  const classes = db.collection('classes');

  const siteMatches = [
    ...(await queryByName(districts, args.siteName)),
    ...(await queryByNormalizedName(districts, args.siteName)),
  ];

  const dedupSite = new Map(siteMatches.map((m) => [m.id, m]));
  const siteResults = Array.from(dedupSite.values());

  const siteSummary = siteResults.map((s) => ({
    id: s.id,
    name: s.data?.name ?? null,
    normalizedName: s.data?.normalizedName ?? null,
  }));

  const schoolByName = [
    ...(await queryByName(schools, args.schoolName)),
    ...(await queryByNormalizedName(schools, args.schoolName)),
  ];

  const dedupSchool = new Map(schoolByName.map((m) => [m.id, m]));
  const schoolResults = Array.from(dedupSchool.values()).map((s) => ({
    id: s.id,
    name: s.data?.name ?? null,
    normalizedName: s.data?.normalizedName ?? null,
    districtId: s.data?.districtId ?? null,
  }));

  const classByName = [
    ...(await queryByName(classes, args.className)),
    ...(await queryByNormalizedName(classes, args.className)),
  ];

  const dedupClass = new Map(classByName.map((m) => [m.id, m]));
  const classResults = Array.from(dedupClass.values()).map((c) => ({
    id: c.id,
    name: c.data?.name ?? null,
    normalizedName: c.data?.normalizedName ?? null,
    districtId: c.data?.districtId ?? null,
    schoolId: c.data?.schoolId ?? null,
  }));

  const siteSchoolPairs = [];
  for (const site of siteResults) {
    const siteId = site.id;
    const schoolInSite = schoolResults.filter((s) => s.districtId === siteId);
    for (const school of schoolInSite) {
      const classesInCombo = classResults.filter(
        (c) => c.districtId === siteId && c.schoolId === school.id,
      );
      siteSchoolPairs.push({
        siteId,
        siteName: site.data?.name ?? null,
        schoolId: school.id,
        schoolName: school.name ?? null,
        classCount: classesInCombo.length,
        classIds: classesInCombo.map((c) => c.id),
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        projectId: args.projectId,
        siteName: args.siteName,
        schoolName: args.schoolName,
        className: args.className,
        sites: siteSummary,
        schools: schoolResults,
        classes: classResults,
        siteSchoolPairs,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exit(1);
});
