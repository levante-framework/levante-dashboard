import { createFirekit, RoarMergedFirekit } from '@levante-framework/firekit';
import roarConfig from './config/firebaseLevante';

// Simple environment variable detection for emulators
function shouldUseEmulators(): boolean {
  // Check Node.js environment variable
  if (typeof process !== 'undefined' && process.env?.USE_FIREBASE_EMULATORS === 'true') {
    return true;
  }
  
  // Check Vite environment variable (import.meta.env is available in Vite)
  try {
    if (import.meta.env?.VITE_USE_FIREBASE_EMULATORS === 'true') {
      return true;
    }
  } catch (e) {
    // import.meta might not be available in some contexts
  }
  
  return false;
}

export async function initNewFirekit(): Promise<RoarMergedFirekit> {
  console.log('FirebaseInit: Starting merged firekit initialization...');
  
  const useEmulators = shouldUseEmulators();
  console.log('FirebaseInit: Using emulators:', useEmulators);

  // Create merged configuration
  const mergedConfig = {
    merged: useEmulators ? {
      // EmulatorFirebaseConfig - only projectId, apiKey, siteKey, and emulator settings
      projectId: roarConfig.admin.projectId,
      apiKey: roarConfig.admin.apiKey,
      siteKey: roarConfig.admin.apiKey, // Use apiKey as siteKey for emulators
      useEmulators: true,
      emulatorHost: 'localhost',
      emulatorPorts: {
        db: 8180,      // Firestore emulator port (firebase-functions)
        auth: 9199,    // Auth emulator port (firebase-functions)
        functions: 5002 // Functions emulator port (firebase-functions)
      }
    } : {
      // LiveFirebaseConfig - full Firebase configuration
      projectId: roarConfig.admin.projectId,
      apiKey: roarConfig.admin.apiKey,
      authDomain: roarConfig.admin.authDomain,
      storageBucket: roarConfig.admin.storageBucket,
      messagingSenderId: roarConfig.admin.messagingSenderId,
      appId: roarConfig.admin.appId,
      siteKey: roarConfig.admin.apiKey
    }
  };

  console.log('FirebaseInit: Creating firekit with config:', {
    useEmulators,
    projectId: mergedConfig.merged.projectId,
    hasEmulatorPorts: !!(mergedConfig.merged as any).emulatorPorts
  });

  try {
    const firekit = await createFirekit({
      customConfig: mergedConfig,
      useMergedDatabase: true,
      verboseLogging: true,
      useEmulators: useEmulators,
      emulatorHost: 'localhost',
      emulatorPorts: useEmulators ? {
        db: 8180,
        auth: 9199,
        functions: 5002
      } : undefined
    }) as RoarMergedFirekit;

    console.log('FirebaseInit: Firekit initialized successfully:', {
      initialized: firekit.initialized,
      hasProject: !!firekit.project,
      projectAuth: !!firekit.project?.auth
    });

    return firekit;
  } catch (error) {
    console.error('FirebaseInit: Error creating/initializing firekit:', error);
    throw error;
  }
}