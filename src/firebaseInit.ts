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
  const debugToken = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN as string | undefined;
  const siteKey = import.meta.env.VITE_APPCHECK_SITE_KEY as string | undefined;
  const isCypress = typeof window !== 'undefined' && Boolean((window as Window & { Cypress?: unknown }).Cypress);

  const roarConfigWithAppCheck = {
    ...roarConfig,
    ...(siteKey ? { siteKey } : {}),
    ...(debugToken ? { debugToken } : {}),
  };

  const firekit = new RoarFirekit({
    roarConfig: roarConfigWithAppCheck,
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
    siteKey: siteKey,
    debugToken: emulatorConfig || isCypress ? 'test-debug-token' : debugToken,
  });
  return await firekit.init();
}
