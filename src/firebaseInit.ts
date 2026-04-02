import { RoarFirekit } from '@levante-framework/firekit';
import { AuthPersistence } from '@levante-framework/firekit/lib/firestore/util';
import levanteFirebaseConfig from './config/firebaseLevante';
import { isLevante } from './helpers';
import firebaseJSON from '../firebase.json';

const emulatorConfig = import.meta.env.VITE_EMULATOR ? firebaseJSON.emulators : undefined;

interface FirekitProjectConfig {
  apiKey: string;
  appId: string;
  authDomain?: string;
  messagingSenderId: string;
  projectId: string;
  storageBucket: string;
}

interface FirekitConfig {
  app?: FirekitProjectConfig;
  admin?: FirekitProjectConfig;
}

const normalizeProjectConfig = (config?: FirekitProjectConfig): FirekitProjectConfig | undefined => {
  if (!config?.projectId) return config;

  const normalizedAuthDomain = config.authDomain?.trim() || `${config.projectId}.firebaseapp.com`;
  return { ...config, authDomain: normalizedAuthDomain };
};

const normalizeRoarConfig = (config: FirekitConfig): FirekitConfig => {
  const normalizedAppConfig = normalizeProjectConfig(config.app);
  const normalizedAdminConfig = normalizeProjectConfig(config.admin ?? normalizedAppConfig);

  return {
    ...config,
    app: normalizedAppConfig,
    admin: normalizedAdminConfig,
  };
};

const roarConfig = normalizeRoarConfig(levanteFirebaseConfig as FirekitConfig);

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
