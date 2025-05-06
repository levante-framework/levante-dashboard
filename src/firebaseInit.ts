// Set important emulator environment variables at the top of the file - before imports
if (typeof window !== 'undefined' && typeof process === 'undefined' && import.meta.env.DEV) {
  // Force Firebase Auth to use the emulator at the global level
  window.FIREBASE_EMULATOR_MODE = true;
  window.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9199";
  window.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8180";
  window.FUNCTIONS_EMULATOR_HOST = "127.0.0.1:5102";
  
  // Add dedicated console messages to confirm emulator variables are set
  console.log('%c DEVELOPMENT MODE: Using Firebase Emulators ', 'background: #FFA000; color: #fff; font-weight: bold;');
  console.log('FIREBASE_EMULATOR_MODE:', window.FIREBASE_EMULATOR_MODE);
  console.log('FIREBASE_AUTH_EMULATOR_HOST:', window.FIREBASE_AUTH_EMULATOR_HOST);
  console.log('FIRESTORE_EMULATOR_HOST:', window.FIRESTORE_EMULATOR_HOST);
  console.log('FUNCTIONS_EMULATOR_HOST:', window.FUNCTIONS_EMULATOR_HOST);
} else if (typeof process !== 'undefined' && import.meta.env.DEV) {
  // For Node.js environment
  process.env.FIREBASE_EMULATOR_MODE = 'true';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9199";
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8180";
  process.env.FUNCTIONS_EMULATOR_HOST = "127.0.0.1:5102";
  
  // Add dedicated console messages to confirm emulator variables are set
  console.log('NODE DEVELOPMENT MODE: Setting emulator environment variables');
  console.log('FIREBASE_EMULATOR_MODE:', process.env.FIREBASE_EMULATOR_MODE);
  console.log('FIREBASE_AUTH_EMULATOR_HOST:', process.env.FIREBASE_AUTH_EMULATOR_HOST);
  console.log('FIRESTORE_EMULATOR_HOST:', process.env.FIRESTORE_EMULATOR_HOST);
  console.log('FUNCTIONS_EMULATOR_HOST:', process.env.FUNCTIONS_EMULATOR_HOST);
}

import { RoarFirekit } from '@levante-framework/firekit';
import baseConfig from './config/firebaseLevante';
import { isLevante } from './helpers';
import { browserSessionPersistence, inMemoryPersistence, setPersistence } from 'firebase/auth';
import { connectFirestoreEmulator } from 'firebase/firestore';
import { connectAuthEmulator } from 'firebase/auth';
import type { FirebaseConfig, LiveFirebaseConfig } from '@levante-framework/firekit/lib/firestore/util';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Add import for the emulator setup helper
import { initTestUserFromEmulator } from './helpers/emulatorSetup';

// Type for the actual Firebase config object
interface ActualFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

// Add global types for window properties
declare global {
  interface Window {
    FIREBASE_EMULATOR_MODE?: boolean;
    FIRESTORE_EMULATOR_HOST?: string;
    FIREBASE_AUTH_EMULATOR_HOST?: string;
    FUNCTIONS_EMULATOR_HOST?: string;
  }
}

export async function initNewFirekit(): Promise<RoarFirekit> {
  let configToUse: { app: FirebaseConfig; admin: FirebaseConfig };

  // If in development mode (using vite dev server), use emulator config
  if (import.meta.env.DEV) {
    console.log('%c INITIALIZING FIREKIT WITH EMULATORS ', 'background: #4CAF50; color: #fff; font-weight: bold;');
    
    // Set environment variables for emulators first - redundant but safe
    if (typeof window !== 'undefined') {
      window.FIREBASE_EMULATOR_MODE = true;
      window.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9199";
      window.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8180";
      window.FUNCTIONS_EMULATOR_HOST = "127.0.0.1:5102";
    }
    
    const appBaseConfig = baseConfig.app as unknown as ActualFirebaseConfig;
    const adminBaseConfig = baseConfig.admin as unknown as ActualFirebaseConfig;

    // Use the real API key for initialization, but we'll redirect auth to emulators
    const appConfig: LiveFirebaseConfig = {
      projectId: appBaseConfig.projectId,
      apiKey: appBaseConfig.apiKey,
      siteKey: "demo-site-key",
      authDomain: appBaseConfig.authDomain,
      storageBucket: appBaseConfig.storageBucket,
      messagingSenderId: appBaseConfig.messagingSenderId,
      appId: appBaseConfig.appId,
    };

    const adminConfig: LiveFirebaseConfig = {
      projectId: adminBaseConfig.projectId,
      apiKey: adminBaseConfig.apiKey,
      siteKey: "demo-site-key",
      authDomain: adminBaseConfig.authDomain,
      storageBucket: adminBaseConfig.storageBucket,
      messagingSenderId: adminBaseConfig.messagingSenderId,
      appId: adminBaseConfig.appId,
    };

    configToUse = {
      app: appConfig,
      admin: adminConfig,
    };
    
    // Create a custom options object that specifically tells Firekit to use emulators in development mode
    const firekitOptions = {
      roarConfig: configToUse,
      dbPersistence: false,
      // When using emulators, set authPersistence to undefined instead of null to match the expected type
      authPersistence: undefined,
      markRawConfig: {
        auth: false,
        db: false,
        functions: false,
      },
      verboseLogging: true, // Enable verbose logging in dev mode
      // THIS IS IMPORTANT - properly configure emulator use
      useEmulators: true,
      emulatorHosts: {
        auth: "http://127.0.0.1:9199",
        firestore: "127.0.0.1:8180",
        functions: "127.0.0.1:5102"
      }
    };

    try {
      console.log('Initializing Firekit with emulator configuration', firekitOptions);
      const firekit = new RoarFirekit(firekitOptions);
      const instance = await firekit.init();
      console.log('Firekit initialized successfully with emulators', instance);
      
      // Initialize the test user ID if possible
      try {
        // Try with admin auth first if available
        if (instance.admin?.auth) {
          await initTestUserFromEmulator(instance.admin.auth);
        }
      } catch (error) {
        console.warn('Error initializing test user ID:', error);
      }
      
      return instance;
    } catch (error) {
      console.error('Error initializing Firekit with emulators:', error);
      throw error;
    }
  } else {
    // Production mode configuration
    console.log('PRODUCTION/BUILD MODE: Connecting to live Firebase');
    
    const appBaseConfig = baseConfig.app as unknown as ActualFirebaseConfig;
    const adminBaseConfig = baseConfig.admin as unknown as ActualFirebaseConfig;

    const appConfig: LiveFirebaseConfig = {
      projectId: appBaseConfig.projectId,
      apiKey: appBaseConfig.apiKey,
      siteKey: "demo-site-key",
      authDomain: appBaseConfig.authDomain,
      storageBucket: appBaseConfig.storageBucket,
      messagingSenderId: appBaseConfig.messagingSenderId,
      appId: appBaseConfig.appId,
    };

    const adminConfig: LiveFirebaseConfig = {
      projectId: adminBaseConfig.projectId,
      apiKey: adminBaseConfig.apiKey,
      siteKey: "demo-site-key",
      authDomain: adminBaseConfig.authDomain,
      storageBucket: adminBaseConfig.storageBucket,
      messagingSenderId: adminBaseConfig.messagingSenderId,
      appId: adminBaseConfig.appId,
    };

    configToUse = {
      app: appConfig,
      admin: adminConfig,
    };
    
    // Production configuration
    const firekitOptions = {
      roarConfig: configToUse,
      dbPersistence: false,
      authPersistence: browserSessionPersistence as any,
      markRawConfig: {
        auth: false,
        db: false,
        functions: false,
      },
      verboseLogging: isLevante ? false : true,
      useEmulators: false
    };
    
    try {
      const firekit = new RoarFirekit(firekitOptions);
      const instance = await firekit.init();
      console.log('Firekit initialized successfully');
      return instance;
    } catch (error) {
      console.error('Error initializing Firekit:', error);
      throw error;
    }
  }
}
