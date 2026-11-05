import { type Config, type Driver, type DriveStep, driver as driverjs } from 'driver.js';
import { storeToRefs } from 'pinia';
import { LEVANTE_TRANSLATIONS } from '@/constants/bucket';
import { logger } from '@/logger';
import { useLevanteStore } from '@/store/levante';

interface RunWizardOptions {
  config?: Config;
  driver?: Driver;
  force?: boolean;
  steps?: Array<DriveStep>;
}

const localStorageKey = 'levanteTourDismissed';
const localStorageValue = 'true';
const remoteCache = new Map<string, Array<DriveStep>>();

type DriveStepPopover = NonNullable<DriveStep['popover']>;
type OnNextClick = NonNullable<DriveStepPopover['onNextClick']>;

// Remote wizard steps are plain JSON and can't carry callbacks. Components register an
// `onNextClick` for a given `data-wizard` selector here, keyed by that selector, so steps
// loaded from JSON can still trigger app behavior (e.g. opening a modal) before advancing.
const nextClickByElement = new Map<string, OnNextClick>();

export const registerWizardNextClick = (element: string, onNextClick: OnNextClick): (() => void) => {
  nextClickByElement.set(element, onNextClick);
  return () => {
    if (nextClickByElement.get(element) === onNextClick) nextClickByElement.delete(element);
  };
};

const withRegisteredNextClicks = (steps: Array<DriveStep>): Array<DriveStep> =>
  steps.map((step) => {
    const onNextClick = typeof step.element === 'string' ? nextClickByElement.get(step.element) : undefined;
    if (!onNextClick) return step;
    return { ...step, popover: { ...step.popover, onNextClick } };
  });

// JSON steps can set `data.clickBefore` to a selector (for example an accordion header that is
// still collapsed). Click it when the step starts, then remeasure once the target is visible.
export const clickBeforeRefreshMs = 300;

const clickBeforeSelector = (step: DriveStep): string | undefined => {
  const selector = step.data?.clickBefore;
  return typeof selector === 'string' && selector.length > 0 ? selector : undefined;
};

const withClickBefore = (steps: Array<DriveStep>): Array<DriveStep> =>
  steps.map((step) => {
    const selector = clickBeforeSelector(step);
    if (!selector) return step;

    return {
      ...step,
      onHighlightStarted: (element, current, opts) => {
        const target = document.querySelector(selector);
        if (target instanceof HTMLElement) target.click();
        step.onHighlightStarted?.(element, current, opts);
        window.setTimeout(() => opts.driver.refresh(), clickBeforeRefreshMs);
      },
    };
  });

export const clearWizardSteps = () => {
  const levanteStore = useLevanteStore();
  const { setWizardSteps } = levanteStore;
  setWizardSteps([]);
};

export const dismissWizard = () => {
  localStorage.setItem(localStorageKey, localStorageValue);
};

export const fetchWizardSteps = async (wizard: string) => {
  if (!wizard.trim().length) return null;

  const levanteStore = useLevanteStore();
  const { setWizardSteps } = levanteStore;
  const filename = wizard.replace(/\.json$/, '');
  const cached = remoteCache.get(filename);
  if (cached) {
    setWizardSteps(cached);
    return cached;
  }

  const url = `${LEVANTE_TRANSLATIONS}/wizards/${filename}.json`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      clearWizardSteps();
      return null;
    }

    const data = await response.json();
    if (!data || typeof data !== 'object') {
      clearWizardSteps();
      return null;
    }

    setWizardSteps(data as Array<DriveStep>);
    remoteCache.set(filename, data as Array<DriveStep>);

    return data;
  } catch (error) {
    logger.capture('Failed to fetch wizard steps', { error });
    clearWizardSteps();
    return null;
  }
};

export const resolveWizardSteps = (...sources: Array<Array<DriveStep> | undefined>): Array<DriveStep> | undefined =>
  sources.find((source) => (source?.length ?? 0) > 0);

export const runWizard = ({ config = {}, driver = driverjs(), force = false, steps = [] }: RunWizardOptions = {}) => {
  if ((import.meta.env.VITE_FIREBASE_PROJECT ?? 'PROD').toUpperCase() !== 'DEV') return;

  const levanteStore = useLevanteStore();
  const { wizardSteps } = storeToRefs(levanteStore);
  const isDismissed = localStorage.getItem(localStorageKey);

  if (!force && isDismissed?.toLowerCase() === localStorageValue) return;

  const defaultConfig = {
    popoverClass: 'djs-levante-theme',
    onDestroyed: () => dismissWizard(),
    ...config,
  };

  const resolvedSteps = resolveWizardSteps(wizardSteps.value, steps, config.steps);
  if (!resolvedSteps) return;

  driver.setConfig({
    ...defaultConfig,
    skipMissingElement: true,
    steps: withClickBefore(withRegisteredNextClicks(resolvedSteps)),
  });

  driver.drive();
};
