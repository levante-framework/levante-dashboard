import { RoarFirekit } from '@levante-framework/firekit';
import { AuthPersistence } from '@levante-framework/firekit/lib/firestore/util';
import levanteFirebaseConfig from './config/firebaseLevante';
import { isLevante } from './helpers';
import firebaseJSON from '../firebase.json';

const emulatorConfig = import.meta.env.VITE_EMULATOR ? firebaseJSON.emulators : undefined;

const roarConfig = levanteFirebaseConfig;

export async function initNewFirekit(): Promise<RoarFirekit> {
  const firekit = new RoarFirekit({
    roarConfig,
    emulatorConfig,
    dbPersistence: false,
    authPersistence: AuthPersistence.session,
    markRawConfig: {
      auth: false,
      db: false,
      functions: false,
    },
    verboseLogging: isLevante ? false : true,
  });
  return await firekit.init();
}
