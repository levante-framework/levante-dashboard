import levanteFirebaseConfig from '@/config/firebaseLevante';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, Firestore, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, Functions, getFunctions } from 'firebase/functions';

export interface FirebaseServiceConfig {
  apiKey: string;
  appId: string;
  authDomain: string;
  messagingSenderId: string;
  projectId: string;
  storageBucket: string;
}

interface EmulatorConnection {
  host: string;
  port: number;
}

export interface EmulatorConfig {
  auth: EmulatorConnection;
  firestore: EmulatorConnection;
  functions: EmulatorConnection;
  hub?: EmulatorConnection;
  logging?: EmulatorConnection;
  tasks?: EmulatorConnection;
  ui?: EmulatorConnection;
}

const APP_NAME = 'admin';

export class FirebaseService {
  static app: FirebaseApp | null = null;
  static auth: Auth;
  static db: Firestore;
  static functions: Functions;

  private constructor() {}

  static initialize(
    config: FirebaseServiceConfig = levanteFirebaseConfig.admin,
    emulatorConfig?: EmulatorConfig,
  ): FirebaseApp {
    if (FirebaseService.app) return FirebaseService.app;

    const existing = getApps().find((app) => app.name === APP_NAME);
    FirebaseService.app = existing ? getApp(APP_NAME) : initializeApp(config, APP_NAME);
    FirebaseService.auth = getAuth(FirebaseService.app);
    FirebaseService.db = getFirestore(FirebaseService.app);
    FirebaseService.functions = getFunctions(FirebaseService.app);

    if (import.meta.env.VITE_EMULATOR && emulatorConfig) {
      connectAuthEmulator(FirebaseService.auth, `http://${emulatorConfig.auth.host}:${emulatorConfig.auth.port}`);
      connectFirestoreEmulator(FirebaseService.db, emulatorConfig.firestore.host, emulatorConfig.firestore.port);
      connectFunctionsEmulator(FirebaseService.functions, emulatorConfig.functions.host, emulatorConfig.functions.port);
    }

    return FirebaseService.app;
  }
}
