import { RoarFirekit } from '@levante-framework/firekit';
import { AuthPersistence } from '@levante-framework/firekit/lib/firestore/util';
import levanteFirebaseConfig from './config/firebaseLevante';
import { isLevante } from './helpers';
import firebaseJSON from '../firebase.json';
import { FirebaseService } from '@/firebase/Service';

const emulatorConfig = firebaseJSON.emulators;

const roarConfig = levanteFirebaseConfig;

export function getAdminFunctions() {
  FirebaseService.initialize(levanteFirebaseConfig.admin, emulatorConfig);
  return FirebaseService.functions;
}

export async function initNewFirekit(): Promise<RoarFirekit> {
  const firekit = new RoarFirekit({
    roarConfig,
    emulatorConfig: import.meta.env.VITE_EMULATOR ? firebaseJSON.emulators : undefined,
    dbPersistence: false,
    authPersistence: AuthPersistence.session,
    markRawConfig: {
      auth: false,
      db: false,
      functions: false,
    },
    verboseLogging: isLevante ? false : true,
  });

  FirebaseService.initialize(levanteFirebaseConfig.admin, emulatorConfig);

  return await firekit.init();
}
