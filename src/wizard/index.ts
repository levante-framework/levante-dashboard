import { type Config, type Driver, type DriveStep, driver as driverjs } from 'driver.js';
import { storeToRefs } from 'pinia';
import { LEVANTE_TRANSLATIONS } from '@/constants/bucket';
import { logger } from '@/logger';
import { useLevanteStore } from '@/store/levante';

interface RunDriverOptions {
  config?: Config;
  driver?: Driver;
  force?: boolean;
  steps?: Array<DriveStep>;
}

const localStorageKey = 'levanteTourDismissed';
const localStorageValue = 'true';

export const runWizard = ({ config = {}, driver = driverjs(), force = false, steps = [] }: RunDriverOptions = {}) => {
  const levanteStore = useLevanteStore();
  const { wizardSteps } = storeToRefs(levanteStore);
  const isDismissed = localStorage.getItem(localStorageKey);

  if (!force && isDismissed?.toLowerCase() === localStorageValue) return;

  const defaultConfig = {
    popoverClass: 'djs-levante-theme',
    onDestroyed: () => dismissWizard(),
    ...config,
  };

  driver.setConfig({
    ...defaultConfig,
    steps: wizardSteps.value || steps || config.steps,
  });

  driver.drive();
};

export const dismissWizard = () => {
  localStorage.setItem(localStorageKey, localStorageValue);
};

const remoteCache = new Map<string, Array<DriveStep>>();

export const fetchWizardSteps = async (wizard: string) => {
  if (!wizard.trim().length) return null;

  const filename = wizard.replace(/\.json$/, '');
  const cached = remoteCache.get(filename);
  if (cached) return cached;

  const url = `${LEVANTE_TRANSLATIONS}/wizards/${filename}.json`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data || typeof data !== 'object') return null;

    const levanteStore = useLevanteStore();
    const { setWizardSteps } = levanteStore;
    setWizardSteps(data as Array<DriveStep>);
    remoteCache.set(filename, data as Array<DriveStep>);

    return data;
  } catch (error) {
    logger.capture('Failed to fetch wizard steps', { error });
    return null;
  }
};
