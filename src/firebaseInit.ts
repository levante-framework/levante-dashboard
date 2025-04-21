import { RoarFirekit } from '@levante-framework/firekit';
import type { RoarConfig } from '@levante-framework/firekit/lib/interfaces';
import { AuthPersistence } from '@levante-framework/firekit/lib/firestore/util';
import levanteFirebaseConfig from './config/firebaseLevante';
import { isLevante } from './helpers';
import { getPerformance, type FirebasePerformance } from 'firebase/performance';
import { getApp } from 'firebase/app';

// Cast the config for RoarFirekit
const roarConfigForFirekit = levanteFirebaseConfig as unknown as RoarConfig;

// Define the return type for the function
interface InitResult {
  firekit: RoarFirekit;
  perf: FirebasePerformance | null;
}

export async function initNewFirekit(): Promise<InitResult> {
  const persistence = AuthPersistence.session;
  let perf: FirebasePerformance | null = null;

  const firekit = new RoarFirekit({
    roarConfig: roarConfigForFirekit,
    authPersistence: persistence,
    dbPersistence: false,
    markRawConfig: {
      auth: false,
      db: false,
      functions: false,
    },
    verboseLogging: isLevante ? false : true,
  });

  try {
    await firekit.init();

    // Initialize Performance Monitoring AFTER firekit.init()
    try {
      const defaultApp = getApp(); // Get default app (should exist now)
      perf = getPerformance(defaultApp);
      console.log('Firebase Performance Monitoring initialized after firekit.init().');
    } catch (error) {
      console.error('Error initializing Firebase Performance Monitoring after firekit.init():', error);
    }

  } catch (error) {
    console.error('Error during firekit.init():', error);
    // No trace to stop here
    throw error; // Re-throw the original init error
  }

  // Return both instances
  return { firekit, perf };
}
