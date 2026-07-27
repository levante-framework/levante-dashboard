import { Config, Driver, driver as driverjs, DriveStep } from "driver.js";

interface RunDriverOptions {
  config?: Config;
  driver?: Driver;
  force?: boolean;
  steps?: Array<DriveStep>;
}

const localStorageKey = "levanteTourDismissed";
const localStorageValue = "true";

export const runWizard = ({
  config = {},
  driver = driverjs(),
  force = false,
  steps = [],
}: RunDriverOptions) => {
  const isDismissed = localStorage.getItem(localStorageKey);

  if (!force && isDismissed?.toLowerCase() === localStorageValue) return;

  const defaultConfig = {
    popoverClass: "djs-levante-theme",
    onDestroyed: () => dismissWizard(),
    ...config,
  };

  driver.setConfig({ ...defaultConfig, steps: steps || config.steps });
  driver.drive();
};

export const dismissWizard = () => {
  localStorage.setItem(localStorageKey, localStorageValue);
};
