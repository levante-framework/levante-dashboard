import { RoarFirekit } from '@levante-framework/firekit';
import { AuthPersistence } from '@levante-framework/firekit/lib/firestore/util';
import firebaseJSON from '../firebase.json';
import levanteFirebaseConfig from './config/firebaseLevante';
import { isLevante } from './constants';

const emulatorConfig = import.meta.env.VITE_EMULATOR ? firebaseJSON.emulators : undefined;

const roarConfig = levanteFirebaseConfig;

export async function initNewFirekit(): Promise<RoarFirekit> {
  const firekit = new RoarFirekit({
    roarConfig,
    emulatorConfig,
    dbPersistence: false,
    authPersistence: AuthPersistence.session,
    // This firekit instance is stored in a Vue ref, so mark the Firebase SDK
    // objects raw to stop Vue from deep-proxying them. Proxying auth in
    // particular breaks its internal token-refresh timers, silently expiring
    // sessions.
    markRawConfig: {
      auth: true,
      db: true,
      functions: true,
    },
    verboseLogging: !isLevante,
  });
  return await firekit.init();
}
