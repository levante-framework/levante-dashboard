import { FirebaseApp, FirebaseOptions, getApp, initializeApp } from 'firebase/app';
import { Auth, connectAuthEmulator, getAuth, User } from 'firebase/auth';
import { connectFirestoreEmulator, Firestore, getFirestore } from 'firebase/firestore';
import {
  connectFunctionsEmulator,
  Functions,
  getFunctions,
  httpsCallable,
  HttpsCallableResult,
} from 'firebase/functions';
import { FirebaseStorage, getStorage } from 'firebase/storage';
import firebaseJSON from '../../firebase.json';

const config = {
  dev: {
    apiKey: 'AIzaSyCOzRA9a2sDHtVlX7qnszxrgsRCBLyf5p0',
    appId: '1:41590333418:web:3468a7caadab802d6e5c93',
    authDomain: 'hs-levante-admin-dev.firebaseapp.com',
    messagingSenderId: '41590333418',
    projectId: 'hs-levante-admin-dev',
    storageBucket: 'hs-levante-admin-dev.appspot.com',
  },
  prod: {
    apiKey: 'AIzaSyCcnmBCojjK0_Ia87f0SqclSOihhKVD3f8',
    appId: '1:348449903279:web:a1b9dad734e2237c7ffa5a',
    authDomain: 'hs-levante-admin-prod.firebaseapp.com',
    messagingSenderId: '348449903279',
    projectId: 'hs-levante-admin-prod',
    storageBucket: 'hs-levante-admin-prod.appspot.com',
  },
};

interface EmulatorConfig {
  auth: { host: string; port: number };
  firestore: { host: string; port: number };
  functions: { host: string; port: number };
  hub?: { host: string; port: number };
  logging?: { host: string; port: number };
  ui?: { host: string; port: number };
}

interface FirebaseProject {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  functions: Functions;
  storage: FirebaseStorage;
  user?: User;
}

interface FirebaseServiceConfig {
  apiKey: string;
  appId: string;
  authDomain: string;
  messagingSenderId: string;
  projectId: string;
  storageBucket: string;
  debugToken?: string;
  measurementId?: string;
  siteKey?: string;
}

interface FirebaseServiceOptions {
  config: FirebaseServiceConfig;
  emulatorConfig?: EmulatorConfig;
  enableFirestorePersistence?: boolean;
  name?: string;
}

function safeInitializeApp(config: FirebaseServiceConfig, name: string): FirebaseApp {
  try {
    const app = getApp(name);
    const existing = app.options;
    const same =
      existing.apiKey === config.apiKey &&
      existing.projectId === config.projectId &&
      (existing.authDomain ?? '') === (config.authDomain ?? '') &&
      (existing.storageBucket ?? '') === (config.storageBucket ?? '');

    if (!same) throw new Error(`Existing Firebase app "${name}" has different configuration.`);

    return app;
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err?.code === 'app/no-app') return initializeApp(config as FirebaseOptions, name);
    throw error;
  }
}

export class FirebaseService {
  private _config: FirebaseServiceConfig;
  private _emulatorConfig?: EmulatorConfig;
  private _initialized = false;
  private _name: string;
  private _project: FirebaseProject | null = null;

  constructor({ config, emulatorConfig, name = 'admin' }: FirebaseServiceOptions) {
    this._config = config;
    this._emulatorConfig = emulatorConfig;
    this._name = name;
  }

  private _ensureInitialized(): void {
    if (!this._initialized || !this._project) {
      throw new Error('FirebaseService is not initialized. Call init() first.');
    }
  }

  get initialized(): boolean {
    return this._initialized;
  }

  get project(): FirebaseProject | null {
    return this._project;
  }

  get app(): FirebaseApp | null {
    return this._project?.app ?? null;
  }

  get auth(): Auth | null {
    return this._project?.auth ?? null;
  }

  get db(): Firestore | null {
    return this._project?.db ?? null;
  }

  get functions(): Functions | null {
    return this._project?.functions ?? null;
  }

  get storage(): FirebaseStorage | null {
    return this._project?.storage ?? null;
  }

  get user(): User | undefined {
    return this._project?.user;
  }

  async init(): Promise<this> {
    if (this._initialized && this._project) {
      return this;
    }

    if (this._emulatorConfig) {
      const app = initializeApp(
        {
          projectId: 'demo-emulator',
          apiKey: this._config.apiKey,
        },
        this._name,
      );
      const auth = getAuth(app);
      const db = getFirestore(app);
      const functions = getFunctions(app);
      const storage = getStorage(app);

      connectFirestoreEmulator(db, this._emulatorConfig.firestore.host, this._emulatorConfig.firestore.port);
      connectFunctionsEmulator(functions, this._emulatorConfig.functions.host, this._emulatorConfig.functions.port);
      connectAuthEmulator(auth, `http://${this._emulatorConfig.auth.host}:${this._emulatorConfig.auth.port}`);

      this._project = {
        app,
        auth,
        db,
        functions,
        storage,
      };
    } else {
      const app = safeInitializeApp(this._config, this._name);
      const auth = getAuth(app);
      const db = getFirestore(app);
      const functions = getFunctions(app);
      const storage = getStorage(app);

      this._project = {
        app,
        auth,
        db,
        functions,
        storage,
      };
    }

    this._initialized = true;

    return this;
  }

  // Cloud Functions
  // They can be moved to separate folders as members of subclasses
  async getAdministrations() {
    this._ensureInitialized();

    const getAdministrationCallable = httpsCallable(this.functions!, 'getAdministrations');

    const response = (await getAdministrationCallable({
      idsOnly: false,
      restrictToOpenAdministrations: false,
      testData: false,
    })) as HttpsCallableResult<{ status: string; data?: unknown }>;

    return response.data.data ?? [];
  }
}

const emulatorConfig = import.meta.env.VITE_EMULATOR ? firebaseJSON.emulators : undefined;
const mode: 'dev' | 'prod' = import.meta.env.VITE_FIREBASE_PROJECT === 'DEV' ? 'dev' : 'prod';
export const firebaseService = new FirebaseService({ config: config[mode], emulatorConfig });
