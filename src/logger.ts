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

interface ErrorContext {
  tags?: Record<string, string>;
  [key: string]: unknown;
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

function isPlainContext(value: unknown): value is ErrorContext {
  return value !== null && typeof value === 'object' && !(value instanceof Error) && !Array.isArray(value);
}

function buildException(message: string, cause?: Error | unknown): Error {
  if (cause instanceof Error) {
    const wrapped = new Error(message, { cause });
    wrapped.name = cause.name;
    return wrapped;
  }
  if (cause !== undefined) {
    return new Error(`${message}: ${String(cause)}`);
  }
  return new Error(message);
}

/**
 * Logs an error to Sentry (production) or the console (dev).
 *
 * Preferred:
 *   logger.error('Failed to load groups', err, { tags: { operation: 'list-groups' } })
 *
 * Legacy (still supported):
 *   logger.error(err, { context: { function: '...' } })
 *   logger.error('Something failed', { extraField: 1 })
 */
function error(message: string, cause?: Error | unknown, context?: ErrorContext, force?: boolean): void;
function error(error: Error | unknown, context?: ErrorContext, force?: boolean): void;
function error(
  messageOrError: string | Error | unknown,
  causeOrContext?: Error | unknown | ErrorContext,
  contextOrForce?: ErrorContext | boolean,
  forceArg = false,
): void {
  let message: string | undefined;
  let cause: Error | unknown | undefined;
  let context: ErrorContext | undefined;
  let force = forceArg;

  if (typeof messageOrError === 'string') {
    message = messageOrError;
    if (typeof contextOrForce === 'boolean') {
      force = contextOrForce;
      if (isPlainContext(causeOrContext)) {
        context = causeOrContext;
      } else {
        cause = causeOrContext;
      }
    } else if (isPlainContext(causeOrContext) && contextOrForce === undefined) {
      context = causeOrContext;
    } else if (causeOrContext !== undefined && isPlainContext(contextOrForce)) {
      cause = causeOrContext;
      context = contextOrForce;
    } else if (causeOrContext !== undefined) {
      cause = causeOrContext;
    }
  } else {
    cause = messageOrError;
    if (typeof causeOrContext === 'boolean') {
      force = causeOrContext;
    } else if (isPlainContext(causeOrContext)) {
      context = causeOrContext;
      if (typeof contextOrForce === 'boolean') force = contextOrForce;
    }
  }

  const { tags, ...rest } = context ?? {};
  const extra = {
    appVersion,
    coreTasksVersion,
    commitHash,
    ...rest,
    ...currentProperties,
  };
  const exception = message !== undefined ? buildException(message, cause) : cause;

  if (isProduction || force) {
    Sentry.captureException(exception, { extra, tags });
  } else {
    console.error('[Logger Error]', message ?? exception, cause !== undefined && message ? cause : '', extra ?? '');
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
