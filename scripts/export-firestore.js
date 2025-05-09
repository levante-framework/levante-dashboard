const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Admin SDK for levante-admin-dev
const adminServiceAccount = require('../service-account-levante-admin-dev.json');
const adminApp = admin.initializeApp({
  credential: admin.credential.cert(adminServiceAccount),
}, 'admin');

// Initialize Admin SDK for levante-assessment-dev
const assessmentServiceAccount = require('../service-account-levante-assessment-dev.json');
const assessmentApp = admin.initializeApp({
  credential: admin.credential.cert(assessmentServiceAccount),
}, 'assessment');

async function exportCollection(db, collectionName) {
  const snapshot = await db.collection(collectionName).get();
  const data = {};
  snapshot.forEach(doc => {
    data[doc.id] = doc.data();
  });
  return data;
}

async function exportFirestore() {
  try {
    // Export from admin project
    const adminDb = adminApp.firestore();
    const adminData = {
      userClaims: await exportCollection(adminDb, 'userClaims'),
      // Add other collections as needed
    };

    // Export from assessment project
    const assessmentDb = assessmentApp.firestore();
    const assessmentData = {
      // Add assessment collections as needed
    };

    // Create export directory if it doesn't exist
    const exportDir = path.join(__dirname, '..', 'emulator_data');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    // Write data to files
    fs.writeFileSync(
      path.join(exportDir, 'admin-export.json'),
      JSON.stringify(adminData, null, 2)
    );
    fs.writeFileSync(
      path.join(exportDir, 'assessment-export.json'),
      JSON.stringify(assessmentData, null, 2)
    );

    console.log('Export completed successfully!');
  } catch (error) {
    console.error('Error exporting data:', error);
  } finally {
    // Cleanup
    await adminApp.delete();
    await assessmentApp.delete();
  }
}

exportFirestore(); 