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
    // Clear existing IndexedDB instances before initialization
    await clearIndexedDB();

    console.log('Initializing Firekit with session persistence...');
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

    console.log('Firekit instance created with session persistence, initializing...');
    await roarfirekit.init();
    console.log('Firekit initialization completed successfully');

    return roarfirekit;
  } catch (error) {
    console.error('Error initializing Firekit:', error);
    throw error;
  }
};

export default initNewFirekit; 