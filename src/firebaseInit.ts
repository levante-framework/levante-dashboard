import { RoarFirekit } from '@levante-framework/firekit';
import { AuthPersistence } from '@levante-framework/firekit/lib/firestore/util';
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
      markRawConfig: {
        auth: false,
        db: false,
        functions: false,
      },
      verboseLogging: isLevante ? false : true,
    });

    // Initialize roarfirekit
    await roarfirekit.init();
    console.log('Roarfirekit initialized successfully');

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