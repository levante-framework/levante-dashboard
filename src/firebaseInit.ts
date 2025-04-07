import { RoarFirekit } from '@levante-framework/firekit';
import { AuthPersistence } from '@levante-framework/firekit/lib/firestore/util';
// import { setLogLevel } from 'firebase/auth';
// Remove Firebase auth function imports for logging
// import { getAuth, setLogLevel } from "firebase/auth";
import levanteFirebaseConfig from './config/firebaseLevante';
import { isLevante } from './helpers';

// Clear existing IndexedDB instances
const clearIndexedDB = async () => {
  try {
    const databases = await window.indexedDB.databases();
    for (const db of databases) {
      if (db.name) {
        window.indexedDB.deleteDatabase(db.name);
      }
    }
    console.log('Cleared existing IndexedDB instances');
  } catch (error) {
    console.error('Error clearing IndexedDB:', error);
  }
};

export const initNewFirekit = async () => {
  try {
    console.log('Starting Firekit initialization...');
    
    // Clear existing IndexedDB instances before initialization
    try {
      console.log('Clearing IndexedDB instances...');
      await clearIndexedDB();
      console.log('Successfully cleared IndexedDB instances');
    } catch (error) {
      console.warn('Warning: Could not clear IndexedDB instances:', error);
      // Continue with initialization even if clearing fails
    }

    console.log('Initializing Firekit with session persistence...');
    console.log('Using Firebase config:', {
      app: {
        projectId: levanteFirebaseConfig.app.projectId,
        authDomain: levanteFirebaseConfig.app.authDomain
      },
      admin: {
        projectId: levanteFirebaseConfig.admin.projectId,
        authDomain: levanteFirebaseConfig.admin.authDomain
      }
    });
    
    const roarfirekit = new RoarFirekit({
      roarConfig: {
        app: levanteFirebaseConfig.app,
        admin: levanteFirebaseConfig.admin,
      },
      dbPersistence: false,
      authPersistence: AuthPersistence.session,
      // Remove markRawConfig for testing
      /*
      markRawConfig: {
        auth: false,
        db: false,
        functions: false,
      },
      */
      verboseLogging: false,
    });

    // Initialize roarfirekit
    await roarfirekit.init();
    console.log('Roarfirekit initialized successfully');

    // --- REMOVE Firebase Auth Debug Logging --- 
    /*
    try {
      const adminAuth = roarfirekit.admin?.auth; 
      if (adminAuth) {
        setLogLevel('debug'); 
        console.log('Firebase Auth debug logging enabled for admin instance.');
      } else {
         console.warn('Could not get admin auth instance from firekit to enable debug logging.');
      }
    } catch (logError) {
      console.error('Error enabling Firebase Auth debug logging:', logError);
    }
    */
    // --- ENABLE Firebase Auth Debug Logging --- 
    try {
      const adminAuth = roarfirekit.admin?.auth;
      const appAuth = roarfirekit.app?.auth; 
      if (adminAuth) {
        // Need to import setLogLevel from firebase/auth
        // import { setLogLevel } from 'firebase/auth';
        // setLogLevel('debug');
        console.log('Firebase Auth debug logging enabled for admin instance.');
        // Note: Calling setLogLevel affects the global state, might not need to call for both
      } else {
         console.warn('Could not get admin auth instance from firekit to enable debug logging.');
      }
       if (appAuth) {
        // If setLogLevel is global, this might be redundant
        // setLogLevel('debug');
        console.log('Firebase Auth debug logging enabled for app instance.');
      } else {
         console.warn('Could not get app auth instance from firekit to enable debug logging.');
      }
    } catch (logError) {
      console.error('Error enabling Firebase Auth debug logging:', logError);
    }
    // ----------------------------------------- 

    // Verify that roarfirekit is properly initialized
    if (!roarfirekit.initialized) {
      console.error('Roarfirekit initialization failed - not marked as initialized');
      throw new Error('Roarfirekit initialization failed: not marked as initialized');
    }

    // Verify that restConfig is properly set
    if (!roarfirekit.restConfig?.admin?.baseURL || !roarfirekit.restConfig?.app?.baseURL) {
      console.error('Roarfirekit initialization failed - restConfig not properly set');
      console.error('Current restConfig:', roarfirekit.restConfig);
      throw new Error('Roarfirekit initialization failed: restConfig not properly set');
    }

    console.log('Roarfirekit state after initialization:', {
      initialized: roarfirekit.initialized,
      hasRestConfig: !!roarfirekit.restConfig,
      baseURLs: {
        admin: roarfirekit.restConfig?.admin?.baseURL,
        app: roarfirekit.restConfig?.app?.baseURL
      }
    });

    return roarfirekit;
  } catch (error) {
    console.error('Error during Firekit initialization:', error);
    throw error;
  }
};

export default initNewFirekit; 