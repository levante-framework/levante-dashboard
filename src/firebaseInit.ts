import { RoarFirekit } from '@levante-framework/firekit';
import type { RoarConfig } from '@levante-framework/firekit/lib/interfaces';
import { AuthPersistence } from '@levante-framework/firekit/lib/firestore/util';
import levanteFirebaseConfig from './config/firebaseLevante';
import { isLevante } from './helpers';
import { getPerformance } from 'firebase/performance';
import { initializeApp, FirebaseApp } from 'firebase/app';

// Cast the config for RoarFirekit
const roarConfigForFirekit = levanteFirebaseConfig as unknown as RoarConfig;

// Initialize the main Firebase App instance separately for Performance Monitoring
// Ensure the app config part of levanteFirebaseConfig matches FirebaseConfig requirements
let appInstance: FirebaseApp | null = null;
try {
  // Assuming levanteFirebaseConfig.app holds the correct config for the 'app' project
  // We might need to cast this part too if types don't align perfectly
  appInstance = initializeApp(levanteFirebaseConfig.app, 'app-for-perf'); // Use a unique name if needed
  console.log('Core Firebase App initialized for Performance Monitoring.');
} catch (error) {
  console.error('Error initializing core Firebase App:', error);
  // Decide how to handle this error - maybe prevent Firekit/Perf init?
}

export async function initNewFirekit(): Promise<RoarFirekit> {
  const persistence = AuthPersistence.session;

  // Initialize RoarFirekit using its own config logic
  const firekit = new RoarFirekit({
    roarConfig: roarConfigForFirekit,
    authPersistence: persistence,
    dbPersistence: false, // Keep this based on the last working version
    markRawConfig: {
      auth: false,
      db: false,
      functions: false,
    },
    verboseLogging: isLevante ? false : true,
  });

  await firekit.init();

  // Initialize Firebase Performance Monitoring using the separately initialized app
  if (appInstance) {
    try {
      getPerformance(appInstance);
      console.log('Firebase Performance Monitoring initialized.');
    } catch (error) {
      console.error('Error initializing Firebase Performance Monitoring:', error);
    }
  } else {
    console.warn('Skipping Firebase Performance Monitoring initialization due to core app init failure.');
  }

  return firekit;
}
