import { RoarFirekit } from '@levante-framework/firekit';
import levanteFirebaseConfig from './config/firebaseLevante';
import { isLevante } from './helpers';

// Define a local enum/object matching firekit's expected values
enum AuthPersistence {
  session = 'session',
  // Add other persistence types if needed (e.g., local, none)
}

const roarConfig = levanteFirebaseConfig;

export async function initNewFirekit(): Promise<RoarFirekit> {
  const firekit = new RoarFirekit({
    roarConfig,
    authPersistence: AuthPersistence.session, // Use local enum
    dbPersistence: true, // Add required property
    markRawConfig: {
      auth: false,
      db: false,
      functions: false,
    },
    verboseLogging: isLevante ? false : true,

    // siteKey and debugToken seem unsupported by the current RoarFirekit constructor type
    // siteKey: roarConfig?.siteKey,
    // debugToken: roarConfig?.debugToken,
  });
  return await firekit.init();
}
