import { RoarFirekit } from '@levante-framework/firekit';
import levanteFirebaseConfig from './config/firebaseLevante';
import { isLevante } from './helpers';
import firebaseJSON from '../firebase.json';

const emulatorConfig = (() => {
  if (!import.meta.env.VITE_EMULATOR) return undefined;

  const base = firebaseJSON.emulators;
  const proxyPort = Number(import.meta.env.VITE_EMULATOR_PROXY_PORT as string);
  if (!Number.isFinite(proxyPort) || proxyPort <= 0) return base;

  return {
    ...base,
    auth: { ...(base as any).auth, port: proxyPort },
    firestore: { ...(base as any).firestore, port: proxyPort },
    functions: { ...(base as any).functions, port: proxyPort },
  };
})();

const roarConfig = levanteFirebaseConfig;

export async function initNewFirekit(): Promise<RoarFirekit> {
  const firekit = new RoarFirekit({
    roarConfig,
    emulatorConfig,
    authPersistence: 'session',
    markRawConfig: {
      auth: false,
      db: false,
      functions: false,
    },
    verboseLogging: isLevante ? false : true,

    // The site key is used for app check token verification
    // The debug token is used to bypass app check for local development
    siteKey: roarConfig?.siteKey,
    debugToken: emulatorConfig ? 'test-debug-token' : roarConfig?.debugToken,
  });
  return await firekit.init();
}
