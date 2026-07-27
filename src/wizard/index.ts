import { useLevanteStore } from "@/store/levante";
import { Config, Driver, driver as driverjs, DriveStep } from "driver.js";
import { storeToRefs } from "pinia";

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
}: RunDriverOptions = {}) => {
  const levanteStore = useLevanteStore();
  const { wizardSteps } = storeToRefs(levanteStore);
  const isDismissed = localStorage.getItem(localStorageKey);

  if (!force && isDismissed?.toLowerCase() === localStorageValue) return;

  const defaultConfig = {
    popoverClass: "djs-levante-theme",
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
