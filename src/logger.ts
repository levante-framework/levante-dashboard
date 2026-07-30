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

const isProduction = import.meta.env.MODE === 'production';
// const isProduction = import.meta.env.VITE_FIREBASE_PROJECT==='PROD'; // can be used for more accurate logging

// Get app and core-tasks versions
const appVersion = packageJson.version;
const coreTasksVersion = packageJson.dependencies['@levante-framework/core-tasks'].replace('^', '');
const commitHash = import.meta.env.VITE_APP_VERSION;
let currentUser: UserData | null = null;
let currentProperties: Record<string, any> = {};

function setAdditionalProperties(properties: Record<string, any>): void {
  currentProperties = {
    ...currentProperties,
    ...properties,
  };
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
 * Logs an error to Sentry (production) or the console (dev).
 *
 * @example
 * logger.error(new Error('Failed to load groups', { cause: err }), {
 *   tags: { function: 'listGroups' },
 * });
 */
function error(
  exception: Error,
  context?: {
    tags?: Record<string, string>;
    [key: string]: unknown;
  },
  force = false,
) {
  const { tags, ...rest } = context ?? {};
  const extra = {
    appVersion,
    coreTasksVersion,
    commitHash,
    ...rest,
    ...currentProperties,
  };

  if (isProduction || force) {
    Sentry.captureException(exception, { extra, tags });
  } else {
    console.error('[Logger Error]', exception, extra);
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
      currentProperties = {};
    }
  } else {
    if (userData) {
      console.info('[Logger SetUser]', userData);
    } else {
      console.info('[Logger ResetUser]');
      currentProperties = {};
    }
  }
}

export const logger = {
  capture,
  error,
  setUser,
  setAdditionalProperties,
};
