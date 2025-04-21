import { RoarFirekit } from '@levante-framework/firekit';
import type { RoarConfig } from '@levante-framework/firekit/lib/interfaces';
import { AuthPersistence } from '@levante-framework/firekit/lib/firestore/util';
import levanteFirebaseConfig from './config/firebaseLevante';
import { isLevante } from './helpers';
import { getPerformance, trace } from 'firebase/performance';
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

  // Get performance instance (if initialized)
  const perf = appInstance ? getPerformance(appInstance) : null;
  let firekitInitTrace: ReturnType<typeof trace> | null = null;

  if (perf) {
    firekitInitTrace = trace(perf, 'init-firekit');
    firekitInitTrace.start();
  }

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

  try {
    await firekit.init();
    // Stop trace after successful init
    if (firekitInitTrace) {
      firekitInitTrace.stop();
    }
  } catch (error) {
    console.error('Error during firekit.init():', error);
    // Stop trace even if init fails to record the duration until failure
    if (firekitInitTrace) {
      firekitInitTrace.putMetric('init_failed', 1);
      firekitInitTrace.stop();
    }
    throw error; // Re-throw error after stopping trace
  }

  // Initialize Firebase Performance Monitoring using the separately initialized app
  if (!perf) {
    console.warn('Skipping Firebase Performance Monitoring initialization due to core app init failure.');
  }

  return firekit;
}
