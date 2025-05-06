interface EmulatorPorts {
  db: number;
  auth: number;
  functions: number;
}

interface FirebaseConfig {
  projectId: string;
  apiKey: string;
  siteKey: string;
  debugToken?: string;
  emulatorPorts?: EmulatorPorts;
}

declare const config: {
  app: FirebaseConfig;
  admin: FirebaseConfig;
  siteKey?: string;
  debugToken?: string;
};

export default config; 