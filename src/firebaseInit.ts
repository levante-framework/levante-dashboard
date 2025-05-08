// Set important emulator environment variables at the top of the file - before imports
if (typeof window !== 'undefined' && typeof process === 'undefined' && import.meta.env.DEV) {
  // Check if user has toggled emulators in localStorage
  const useEmulators = localStorage.getItem('useEmulators');

  // If explicitly set to false, don't use emulators, otherwise use them in dev mode
  if (useEmulators !== 'false') {
    // Read custom ports from localStorage if available
    const firestorePort = localStorage.getItem('firestorePort') || '8180';
    const authPort = localStorage.getItem('authPort') || '9199';
    const functionsPort = localStorage.getItem('functionsPort') || '5102';
    const emulatorHost = localStorage.getItem('emulatorHost') || '127.0.0.1';

    // Force Firebase Auth to use the emulator at the global level
    window.FIREBASE_EMULATOR_MODE = true;
    window.FIREBASE_AUTH_EMULATOR_HOST = `${emulatorHost}:${authPort}`;
    window.FIRESTORE_EMULATOR_HOST = `${emulatorHost}:${firestorePort}`;
    window.FUNCTIONS_EMULATOR_HOST = `${emulatorHost}:${functionsPort}`;

    // Add dedicated console messages to confirm emulator variables are set
    console.log(
      "%c DEVELOPMENT MODE: Using Firebase Emulators ",
      "background: #FFA000; color: #fff; font-weight: bold;",
    );
    console.log("FIREBASE_EMULATOR_MODE:", window.FIREBASE_EMULATOR_MODE);
    console.log(
      "FIREBASE_AUTH_EMULATOR_HOST:",
      window.FIREBASE_AUTH_EMULATOR_HOST,
    );
    console.log("FIRESTORE_EMULATOR_HOST:", window.FIRESTORE_EMULATOR_HOST);
    console.log("FUNCTIONS_EMULATOR_HOST:", window.FUNCTIONS_EMULATOR_HOST);
  } else {
    console.log(
      "%c DEVELOPMENT MODE: Emulators disabled by user setting ",
      "background: #FFA000; color: #fff; font-weight: bold;",
    );
  }
} else if (typeof process !== 'undefined' && import.meta.env.DEV) {
  // For Node.js environment, also check localStorage if available
  let useEmulators = true; // Default to true in dev mode

  // Check if we can access localStorage via globalThis
  if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
    const stored = globalThis.localStorage.getItem('useEmulators');
    if (stored === 'false') {
      useEmulators = false;
    }
  }

  if (useEmulators) {
    // Read custom ports if available
    let firestorePort = '8180';
    let authPort = '9199';
    let functionsPort = '5102';
    let emulatorHost = '127.0.0.1';

    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      firestorePort = globalThis.localStorage.getItem('firestorePort') || firestorePort;
      authPort = globalThis.localStorage.getItem('authPort') || authPort;
      functionsPort = globalThis.localStorage.getItem('functionsPort') || functionsPort;
      emulatorHost = globalThis.localStorage.getItem('emulatorHost') || emulatorHost;
    }

    process.env.FIREBASE_EMULATOR_MODE = 'true';
    process.env.FIREBASE_AUTH_EMULATOR_HOST = `${emulatorHost}:${authPort}`;
    process.env.FIRESTORE_EMULATOR_HOST = `${emulatorHost}:${firestorePort}`;
    process.env.FUNCTIONS_EMULATOR_HOST = `${emulatorHost}:${functionsPort}`;

    // Add dedicated console messages to confirm emulator variables are set
    console.log('NODE DEVELOPMENT MODE: Setting emulator environment variables');
    console.log('FIREBASE_EMULATOR_MODE:', process.env.FIREBASE_EMULATOR_MODE);
    console.log('FIREBASE_AUTH_EMULATOR_HOST:', process.env.FIREBASE_AUTH_EMULATOR_HOST);
    console.log('FIRESTORE_EMULATOR_HOST:', process.env.FIRESTORE_EMULATOR_HOST);
    console.log('FUNCTIONS_EMULATOR_HOST:', process.env.FUNCTIONS_EMULATOR_HOST);
  } else {
    console.log('NODE DEVELOPMENT MODE: Emulators disabled by user setting');
  }
}

// Import the RoarFirekit class directly
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
  
  // Check if emulators should be used
  const useEmulators = import.meta.env.DEV && 
                      (localStorage.getItem('useEmulators') !== 'false');

  console.log('%c ===== FIREKIT INITIALIZATION START ===== ', 'background: #3f51b5; color: #fff; font-size: 14px; padding: 4px; border-radius: 4px; font-weight: bold;');
  console.log('%c Emulators enabled:', 'font-weight: bold;', useEmulators);
  
  // If in development mode and emulators are enabled, use emulator config
  if (import.meta.env.DEV && useEmulators) {
    console.log('%c INITIALIZING FIREKIT WITH EMULATORS ', 'background: #4CAF50; color: #fff; font-weight: bold;');
    
    // Read emulator settings from localStorage or use defaults
    const firestorePort = localStorage.getItem('firestorePort') || '8180';
    const authPort = localStorage.getItem('authPort') || '9199';
    const functionsPort = localStorage.getItem('functionsPort') || '5102';
    const emulatorHost = localStorage.getItem('emulatorHost') || '127.0.0.1';
    
    // Set environment variables for emulators
    if (typeof window !== 'undefined') {
      window.FIREBASE_EMULATOR_MODE = true;
      window.FIREBASE_AUTH_EMULATOR_HOST = `${emulatorHost}:${authPort}`;
      window.FIRESTORE_EMULATOR_HOST = `${emulatorHost}:${firestorePort}`;
      window.FUNCTIONS_EMULATOR_HOST = `${emulatorHost}:${functionsPort}`;
      
      console.log('%c Window emulator variables set:', 'font-weight: bold;', {
        FIREBASE_EMULATOR_MODE: window.FIREBASE_EMULATOR_MODE,
        FIREBASE_AUTH_EMULATOR_HOST: window.FIREBASE_AUTH_EMULATOR_HOST,
        FIRESTORE_EMULATOR_HOST: window.FIRESTORE_EMULATOR_HOST,
        FUNCTIONS_EMULATOR_HOST: window.FUNCTIONS_EMULATOR_HOST
      });
    } else {
      console.warn('Window object not available, cannot set emulator variables on window');
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
    
    console.log('%c Firebase config being used:', 'font-weight: bold;', {
      projectId: appConfig.projectId,
      authDomain: appConfig.authDomain,
      // Don't log sensitive data like API keys
    });
    
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
      // THIS IS IMPORTANT - properly configure emulator use with the custom settings
      useEmulators: true,
      emulatorHost,
      emulatorPorts: {
        db: parseInt(firestorePort),
        auth: parseInt(authPort),
        functions: parseInt(functionsPort)
      }
    };

    try {
      console.log('%c Initializing Firekit with emulator configuration', 'background: #FFA000; color: #fff; font-weight: bold;', firekitOptions);
      const firekit = new RoarFirekit(firekitOptions);
      
      console.log('%c Calling firekit.init()', 'font-weight: bold;');
      const instance = await firekit.init();
      console.log('%c Firekit initialized successfully with emulators', 'background: #4CAF50; color: #fff; font-weight: bold;', instance);
      
      // Initialize the test user ID if possible
      try {
        // Try with admin auth first if available
        if (instance.admin?.auth) {
          console.log('%c Initializing test user from emulator', 'font-weight: bold;');
          await initTestUserFromEmulator(instance.admin.auth);
          console.log('%c Test user initialized successfully', 'font-weight: bold;');
        } else {
          console.warn('Admin auth not available, cannot initialize test user');
        }
      } catch (error) {
        console.warn('Error initializing test user ID:', error);
      }
      
      console.log('%c ===== FIREKIT INITIALIZATION COMPLETE ===== ', 'background: #3f51b5; color: #fff; font-size: 14px; padding: 4px; border-radius: 4px; font-weight: bold;');
      return instance;
    } catch (error) {
      console.error('%c Error initializing Firekit with emulators:', 'background: #F44336; color: #fff; font-weight: bold;', error);
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
