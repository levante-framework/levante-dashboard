import { contextLinesIntegration, extraErrorDataIntegration } from '@sentry/integrations';
import * as Sentry from '@sentry/vue';
import type { App } from 'vue';
import { isLevante } from '@/constants';
import { useAuthStore } from '@/store/auth';
import { formattedLocale, languageOptions } from './translations/i18n';

const language = formattedLocale;

type SentryEventLike = {
  message?: string;
  logentry?: { message?: string };
  exception?: { values?: Array<{ type?: string; value?: string }> };
};

function eventTextHaystacks(event: SentryEventLike): string[] {
  return [
    event.message,
    event.logentry?.message,
    ...(event.exception?.values ?? []).flatMap((exception) => [exception.type, exception.value]),
  ].filter((value): value is string => typeof value === 'string');
}

function isCrossOriginVueRefSecurityError(event: SentryEventLike): boolean {
  return eventTextHaystacks(event).some((text) => text.includes('__v_isRef') && text.includes('cross-origin frame'));
}

export function initSentry(app: App) {
  // skip if levante instance
  let dsn: string;
  let regex: RegExp;
  let tracePropagationTargets: (string | RegExp)[];
  if (isLevante) {
    dsn = 'https://458fd3b1207c12df79f554b94f22833f@o4507250485035008.ingest.us.sentry.io/4508480347832320';
    regex = /https:\/\/hs-levante-admin-dev(--pr\d+-\w+)?\.web\.app/;
    tracePropagationTargets = [
      'https://hs-levante-admin-prod.web.app/**/*',
      'https://hs-levante-admin-dev.web.app/**/*',
      regex,
    ];
  } else {
    dsn = 'https://f15e3ff866394e93e00514b42113d03d@o4505913837420544.ingest.us.sentry.io/4506820782129152';
    regex = /https:\/\/roar-staging(--pr\d+-\w+)?\.web\.app/;
    tracePropagationTargets = ['localhost:5173', 'https://roar.education/**/*', regex];
  }

  const authStore = useAuthStore();

  Sentry.init({
    app,
    dsn,
    environment:
      (import.meta.env.VITE_FIREBASE_PROJECT ?? 'PROD').toUpperCase() === 'DEV' ? 'development' : 'production',
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
      }),
      Sentry.browserTracingIntegration(),
      Sentry.feedbackIntegration({
        showBranding: false,
        showName: false,
        showEmail: false,
        colorScheme: 'light',
        formTitle: languageOptions[language]?.translations?.sentryForm?.formTitle || 'Report a bug',
        buttonLabel: languageOptions[language]?.translations?.sentryForm?.buttonLabel || 'Submit',
        cancelButtonLabel: languageOptions[language]?.translations?.sentryForm?.cancelButtonLabel || 'Cancel',
        submitButtonLabel: languageOptions[language]?.translations?.sentryForm?.submitButtonLabel || 'Submit',
        namePlaceholder: languageOptions[language]?.translations?.sentryForm?.namePlaceholder || 'Name',
        emailPlaceholder: languageOptions[language]?.translations?.sentryForm?.emailPlaceholder || 'Email',
        messageLabel: languageOptions[language]?.translations?.sentryForm?.messageLabel || 'Message',
        messagePlaceholder: languageOptions[language]?.translations?.sentryForm?.messagePlaceholder || 'Message',
      }),
      contextLinesIntegration(),
      extraErrorDataIntegration(),
    ],
    attachStacktrace: true,
    sendDefaultPii: false,
    // Performance Monitoring
    tracesSampleRate: 0.2, // Capture 20% of the transactions
    tracePropagationTargets,
    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    ignoreErrors: [/Failed to read a named property '__v_isRef' from 'Window'/],
    beforeSend(event) {
      if (isCrossOriginVueRefSecurityError(event)) {
        return null;
      }

      delete event.user?.ip_address;

      if (event.contexts?.geo) {
        delete event.contexts.geo;
      }

      // Drop benign Firestore permission-denied errors raised while unauthenticated
      // (auth-transition / signout race). Genuine denials for signed-in users are kept.
      const isPermissionDenied = (event.exception?.values ?? []).some(
        (value) => typeof value.value === 'string' && /Missing or insufficient permissions/i.test(value.value),
      );
      if (isPermissionDenied && !authStore.isAuthenticated()) {
        return null;
      }

      return event;
    },
  });

  Sentry.setTag('commitSHA', import.meta.env.VITE_APP_VERSION);

  // Set the user's language as a tag
  Sentry.setTag('user.language', language);
  // Set user information if authenticated
  if (authStore.isAuthenticated() && authStore.userData) {
    Sentry.setUser({
      id: authStore.userData.uid,
      email: authStore.userData.email,
    });
  }
}
