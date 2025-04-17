import { createApp, type App, type Plugin } from 'vue';
import { Buffer } from 'buffer';
import { initSentry } from './sentry';
import PvTooltip from 'primevue/tooltip';
import AppComponent from './App.vue';
import AppSpinner from './components/AppSpinner.vue';
import plugins from './plugins';
import './styles.css';

declare global {
  var Buffer: typeof Buffer;
}

type PluginWithOptions = [Plugin, Record<string, unknown>];
type AppPlugin = Plugin | PluginWithOptions;

/**
 * Create Vue App
 *
 * @returns {App<Element>}
 */
export const createAppInstance = (): App<Element> => {
  const app = createApp(AppComponent);

  // Register all app plugins.
  plugins.forEach((plugin: AppPlugin) => {
    if (Array.isArray(plugin)) {
      const [pluginInstance, options] = plugin as PluginWithOptions;
      app.use(pluginInstance, options);
    } else {
      app.use(plugin);
    }
  });

  // Register plugins.

  // Register global components.
  app.component('AppSpinner', AppSpinner);

  // Register global directives.
  app.directive('tooltip', PvTooltip);

  // Register global variables.
  globalThis.Buffer = Buffer;

  if (process.env.NODE_ENV === 'production') {
    initSentry(app);
  }

  return app;
};

/**
 * Mount App
 *
 * @returns {void}
 */
export const mountApp = (): void => {
  const app = createAppInstance();
  app.mount('#app');
}; 