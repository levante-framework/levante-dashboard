import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, Functions, httpsCallable, HttpsCallableResult } from 'firebase/functions';

export const ADMIN_APP_NAME = 'admin';

export interface AdminAppConfig {
  projectId: string;
  apiKey: string;
}

export interface EmulatorEndpoints {
  auth?: { host: string; port: number };
  firestore?: { host: string; port: number };
  functions?: { host: string; port: number };
}

export class FirebaseFunctionsClient {
  private static adminApp: FirebaseApp | null = null;

  static getAdminApp(): FirebaseApp {
    if (!FirebaseFunctionsClient.adminApp) {
      const existing = getApps().find((a) => a.name === ADMIN_APP_NAME);
      if (existing) {
        FirebaseFunctionsClient.adminApp = existing;
      } else {
        throw new Error(
          `Firebase admin app not initialized. Call FirebaseFunctionsClient.initAdminApp() first (e.g. from firebaseInit).`,
        );
      }
    }
    return FirebaseFunctionsClient.adminApp;
  }

  static initAdminApp(config: AdminAppConfig, emulatorConfig?: EmulatorEndpoints): FirebaseApp {
    const existing = getApps().find((a) => a.name === ADMIN_APP_NAME);
    if (existing) {
      FirebaseFunctionsClient.adminApp = existing;
      return existing;
    }
    const app = initializeApp(
      {
        projectId: config.projectId,
        apiKey: config.apiKey,
      },
      ADMIN_APP_NAME,
    );
    FirebaseFunctionsClient.adminApp = app;

    if (emulatorConfig) {
      const db = getFirestore(app);
      const auth = getAuth(app);
      const functions = getFunctions(app);
      if (emulatorConfig.firestore) {
        connectFirestoreEmulator(
          db,
          emulatorConfig.firestore.host,
          emulatorConfig.firestore.port,
        );
      }
      if (emulatorConfig.auth) {
        connectAuthEmulator(
          auth,
          `http://${emulatorConfig.auth.host}:${emulatorConfig.auth.port}`,
        );
      }
      if (emulatorConfig.functions) {
        connectFunctionsEmulator(
          functions,
          emulatorConfig.functions.host,
          emulatorConfig.functions.port,
        );
      }
    }

    return app;
  }

  protected getFunctions(): Functions {
    return getFunctions(FirebaseFunctionsClient.getAdminApp());
  }

  call<T = unknown, R = unknown>(name: string, data?: T): Promise<HttpsCallableResult<R>> {
    const functions = this.getFunctions();
    const callable = httpsCallable<T, R>(functions, name);
    return callable(data);
  }
}
