import * as Sentry from '@sentry/vue';
import posthogInstance from '@/plugins/posthog';
// Get package info
import packageJson from '../package.json';

interface UserData {
  uid: string;
  email: string;
  // Add other user properties you might want to track
  [key: string]: any; // Allow other properties
}

interface NavigatorUABrandVersion {
  brand: string;
  version: string;
}

interface NavigatorUAData {
  brands?: NavigatorUABrandVersion[];
  mobile?: boolean;
  platform?: string;
  getHighEntropyValues?: (hints: string[]) => Promise<Record<string, unknown>>;
}

interface NavigatorWithUAData extends Navigator {
  userAgentData?: NavigatorUAData;
}

const HIGH_ENTROPY_HINTS = ['architecture', 'bitness', 'model', 'platformVersion', 'fullVersionList', 'wow64'] as const;

const isProduction = import.meta.env.MODE === 'production';
// const isProduction = import.meta.env.VITE_FIREBASE_PROJECT==='PROD'; // can be used for more accurate logging

// Get app and core-tasks versions
const appVersion = packageJson.version;
const coreTasksVersion = packageJson.dependencies['@levante-framework/core-tasks'].replace('^', '');
const commitHash = import.meta.env.VITE_APP_VERSION;
let currentUser: UserData | null = null;
let currentProperties: Record<string, any> = {};
let clientHintsPromise: Promise<void> | null = null;

function setAdditionalProperties(properties: Record<string, any>): void {
  currentProperties = {
    ...currentProperties,
    ...properties,
  };
}

function clearUserScopedProperties(): void {
  const { clientHints } = currentProperties;
  currentProperties = clientHints ? { clientHints } : {};
}

/**
 * Logs an event for analytics.
 * In production, sends the event to PostHog.
 * Otherwise, logs to the console.
 *
 * @param name - The name of the event.
 * @param properties - Optional properties associated with the event.
 */
function capture(name: string, properties?: Record<string, any>, force: boolean = false): void {
  const extra = {
    appVersion,
    coreTasksVersion,
    commitHash,
    ...properties,
    ...currentProperties,
  };
  if (isProduction || force) {
    // Assuming posthogInstance might be the mock object in dev, check for capture existence
    if (typeof posthogInstance.capture === 'function') {
      posthogInstance.capture(name, extra);
    }
  } else {
    console.info('[Logger Event]', name, extra ?? '');
  }
}

/**
 * Logs an error.
 * In production, sends the error to Sentry.
 * Otherwise, logs to the console.
 *
 * @param error - The error object (Error or unknown).
 * @param context - Optional additional context for Sentry.
 */
function error(error: Error | unknown, context?: Record<string, any>, force: boolean = false): void {
  const extra = {
    appVersion,
    coreTasksVersion,
    commitHash,
    ...context,
    ...currentProperties,
  };
  if (isProduction || force) {
    Sentry.captureException(error, { extra });
  } else {
    console.error('[Logger Error]', error, extra ?? '');
  }
}

/**
 * Sets user information for analytics and error reporting.
 * In production, identifies the user in PostHog and Sentry.
 * If null is passed, resets user data in PostHog and Sentry.
 * Otherwise, logs to the console.
 *
 * @param userData - An object containing user information (e.g., uid, email) or null to reset.
 */
function setUser(userData: UserData | null, force: boolean = false): void {
  if (isProduction || force) {
    if (userData) {
      // Check for identify existence on posthogInstance due to mock in dev
      // Only set identify if the user has changed since this is a backend call
      if (typeof posthogInstance.identify === 'function' && currentUser?.uid !== userData.uid) {
        posthogInstance.identify(userData.uid, {
          email: userData.email,
        });
      }
      const { uid, email } = userData;
      Sentry.setUser({ id: uid, email });
      currentUser = userData;
    } else {
      // Check for reset existence on posthogInstance due to mock in dev
      if (typeof posthogInstance.reset === 'function' && currentUser?.uid) {
        posthogInstance.reset();
      }
      Sentry.setUser(null);
      currentUser = null;
      clearUserScopedProperties();
    }
  } else {
    if (userData) {
      console.info('[Logger SetUser]', userData);
    } else {
      console.info('[Logger ResetUser]');
      clearUserScopedProperties();
    }
  }
}

/**
 * Collect low-entropy UA Client Hints plus high-entropy values when available.
 * Never throws; missing API/fields are omitted. Does not show a user permission prompt.
 */
async function enrichClientHints(): Promise<void> {
  if (clientHintsPromise) return clientHintsPromise;

  clientHintsPromise = (async () => {
    try {
      const uaData = (navigator as NavigatorWithUAData).userAgentData;
      if (!uaData) return;

      const clientHints: Record<string, unknown> = {};
      if (Array.isArray(uaData.brands)) clientHints.brands = uaData.brands;
      if (typeof uaData.mobile === 'boolean') clientHints.mobile = uaData.mobile;
      if (typeof uaData.platform === 'string' && uaData.platform) clientHints.platform = uaData.platform;

      if (typeof uaData.getHighEntropyValues === 'function') {
        try {
          const highEntropy = await uaData.getHighEntropyValues([...HIGH_ENTROPY_HINTS]);
          if (highEntropy && typeof highEntropy === 'object') {
            for (const key of HIGH_ENTROPY_HINTS) {
              const value = highEntropy[key];
              if (value !== undefined && value !== null && value !== '') {
                clientHints[key] = value;
              }
            }
          }
        } catch {
          // Policy denial or unsupported hints — keep low-entropy values only.
        }
      }

      if (Object.keys(clientHints).length > 0) {
        setAdditionalProperties({ clientHints });
      }
    } catch {
      // Never let telemetry enrichment break the app.
    }
  })();

  return clientHintsPromise;
}

export const logger = {
  capture,
  error,
  setUser,
  setAdditionalProperties,
  enrichClientHints,
};
