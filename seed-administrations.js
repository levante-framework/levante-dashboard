const admin = require('firebase-admin');

// Initialize Firebase Admin SDK for emulator
admin.initializeApp({
  projectId: 'hs-levante-admin-dev',
});

// Connect to Firestore emulator
const db = admin.firestore();
db.settings({
  host: 'localhost:8180',
  ssl: false,
});

async function seedAdministrations() {
  console.log('Starting to seed administrations...');

  const administrations = [
    {
      id: 'test-admin-1',
      name: 'Test Administration 1',
      publicName: 'Test Administration 1',
      dates: {
        start: new Date('2024-01-01').toISOString(),
        end: new Date('2024-12-31').toISOString(),
        created: new Date().toISOString(),
      },
      assessments: [
        {
          variantId: 'hearts-and-flowers-default',
          variantName: 'default',
          taskId: 'hearts-and-flowers',
          params: {
            storeItemId: false,
            maxTime: 8,
            sequentialStimulus: true,
            numberOfTrials: 21,
            keyHelpers: true,
            stimulusBlocks: 3,
            corpus: null,
            numOfPracticeTrials: 3,
            sequentialPractice: true,
            skipInstructions: true,
            taskName: 'hearts-and-flowers',
            buttonLayout: 'default',
            age: null,
            language: 'en',
            maxIncorrect: 100,
          },
        },
      ],
      assignedOrgs: {
        districts: ['test-district-1'],
        schools: ['test-school-1'],
        classes: [],
        groups: ['test-group-1'],
        families: [],
      },
      testData: false,
      stats: {
        total: {
          assignment: {
            started: 0,
            completed: 0,
            assigned: 0,
          },
          'hearts-and-flowers': {
            assigned: 0,
          },
        },
      },
    },
    {
      id: 'test-admin-2',
      name: 'Test Administration 2',
      publicName: 'Test Administration 2',
      dates: {
        start: new Date('2024-01-01').toISOString(),
        end: new Date('2024-12-31').toISOString(),
        created: new Date().toISOString(),
      },
      assessments: [
        {
          variantId: 'swr-default',
          variantName: 'default',
          taskId: 'swr',
          params: {
            storeItemId: false,
            maxTime: 8,
            sequentialStimulus: true,
            numberOfTrials: 21,
            keyHelpers: true,
            stimulusBlocks: 3,
            corpus: null,
            numOfPracticeTrials: 3,
            sequentialPractice: true,
            skipInstructions: true,
            taskName: 'swr',
            buttonLayout: 'default',
            age: null,
            language: 'en',
            maxIncorrect: 100,
          },
        },
      ],
      assignedOrgs: {
        districts: ['test-district-1'],
        schools: ['test-school-1'],
        classes: [],
        groups: ['test-group-1'],
        families: [],
      },
      testData: false,
      stats: {
        total: {
          assignment: {
            started: 0,
            completed: 0,
            assigned: 0,
          },
          'swr': {
            assigned: 0,
          },
        },
      },
    },
  ];

  try {
    for (const admin of administrations) {
      console.log(`Creating administration: ${admin.name}`);
      await db.collection('administrations').doc(admin.id).set(admin);
      console.log(`✓ Created administration: ${admin.name}`);
    }
    
    console.log('✓ All administrations seeded successfully!');
  } catch (error) {
    console.error('Error seeding administrations:', error);
  }
}

seedAdministrations().then(() => {
  console.log('Seeding complete');
  process.exit(0);
}).catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
}); 