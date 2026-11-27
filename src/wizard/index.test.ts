import type { Driver, DriveStep } from 'driver.js';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clickBeforeRefreshMs, registerWizardNextClick, runWizard } from './index';

type OnNextClick = NonNullable<NonNullable<DriveStep['popover']>['onNextClick']>;
type HighlightStarted = NonNullable<DriveStep['onHighlightStarted']>;

const createGroupSelector = '[data-wizard="create-group"]';
const accordionSelector = '[data-wizard="requirements-accordion"][aria-expanded="false"]';

const cleanups: Array<() => void> = [];

function createDriver() {
  return {
    setConfig: vi.fn(),
    drive: vi.fn(),
    refresh: vi.fn(),
  };
}

type TestDriver = ReturnType<typeof createDriver>;

function registerNextClick(element: string, onNextClick: OnNextClick) {
  const unregister = registerWizardNextClick(element, onNextClick);
  cleanups.push(unregister);
  return unregister;
}

function run(driver: TestDriver, steps: Array<DriveStep>) {
  runWizard({ driver: driver as unknown as Driver, force: true, steps });
}

function configuredSteps(driver: TestDriver): Array<DriveStep> {
  const config = driver.setConfig.mock.calls[0]?.[0] as { steps?: Array<DriveStep> } | undefined;
  if (!config?.steps) throw new Error('runWizard did not configure steps');
  return config.steps;
}

function stepAt(driver: TestDriver, index: number): DriveStep {
  const step = configuredSteps(driver)[index];
  if (!step) throw new Error(`missing configured step ${index}`);
  return step;
}

function highlight(step: DriveStep, driver: TestDriver) {
  const start = step.onHighlightStarted;
  if (!start) throw new Error('expected onHighlightStarted');
  start(undefined, step, { driver } as unknown as Parameters<HighlightStarted>[2]);
}

function collapsedAccordionHeader(): HTMLButtonElement {
  const header = document.createElement('button');
  header.setAttribute('data-wizard', 'requirements-accordion');
  header.setAttribute('aria-expanded', 'false');
  document.body.appendChild(header);
  return header;
}

describe('wizard steps', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    document.body.replaceChildren();
    vi.stubEnv('VITE_FIREBASE_PROJECT', 'DEV');
  });

  afterEach(() => {
    for (const cleanup of cleanups) cleanup();
    cleanups.length = 0;
    document.body.replaceChildren();
    localStorage.clear();
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  describe('static components', () => {
    it('clicks the selector from data.clickBefore when the step starts', () => {
      const header = collapsedAccordionHeader();
      const click = vi.spyOn(header, 'click');
      const driver = createDriver();

      run(driver, [{ element: '[data-wizard="requirements-table"]', data: { clickBefore: accordionSelector } }]);
      highlight(stepAt(driver, 0), driver);

      expect(click).toHaveBeenCalledOnce();
    });

    it('does not click a header that is already expanded', () => {
      const header = collapsedAccordionHeader();
      header.setAttribute('aria-expanded', 'true');
      const click = vi.spyOn(header, 'click');
      const driver = createDriver();

      run(driver, [{ element: '[data-wizard="requirements-table"]', data: { clickBefore: accordionSelector } }]);
      highlight(stepAt(driver, 0), driver);

      expect(click).not.toHaveBeenCalled();
    });

    it('does not click when the selector matches a non-HTML element', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('data-wizard', 'requirements-accordion');
      svg.setAttribute('aria-expanded', 'false');
      document.body.appendChild(svg);
      const click = vi.fn();
      (svg as unknown as { click: () => void }).click = click;
      const driver = createDriver();

      run(driver, [{ element: '[data-wizard="requirements-table"]', data: { clickBefore: accordionSelector } }]);
      highlight(stepAt(driver, 0), driver);

      expect(click).not.toHaveBeenCalled();
    });

    it('still runs a step callback that was already on the step', () => {
      const header = collapsedAccordionHeader();
      const click = vi.spyOn(header, 'click');
      const onHighlightStarted = vi.fn();
      const driver = createDriver();

      run(driver, [
        {
          element: '[data-wizard="requirements-table"]',
          data: { clickBefore: accordionSelector },
          onHighlightStarted,
        },
      ]);
      const step = stepAt(driver, 0);
      highlight(step, driver);

      expect(click).toHaveBeenCalledOnce();
      expect(onHighlightStarted).toHaveBeenCalledOnce();
      expect(onHighlightStarted.mock.calls[0]?.[1]).toBe(step);
    });

    it('refreshes the tour after the target has time to appear', () => {
      vi.useFakeTimers();
      collapsedAccordionHeader();
      const driver = createDriver();

      run(driver, [{ element: '[data-wizard="requirements-table"]', data: { clickBefore: accordionSelector } }]);
      highlight(stepAt(driver, 0), driver);

      expect(driver.refresh).not.toHaveBeenCalled();
      vi.advanceTimersByTime(clickBeforeRefreshMs - 1);
      expect(driver.refresh).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(driver.refresh).toHaveBeenCalledOnce();
    });

    it('leaves steps without a clickBefore selector unchanged', () => {
      const driver = createDriver();
      const step: DriveStep = { element: '[data-wizard="download-template"]', popover: { title: 'Download' } };

      run(driver, [step, { element: '[data-wizard="requirements-table"]', data: { clickBefore: '' } }]);
      const steps = configuredSteps(driver);

      expect(steps[0]).toEqual(step);
      expect(steps[1]?.onHighlightStarted).toBeUndefined();
    });

    it('ignores a non-string clickBefore value', () => {
      const driver = createDriver();

      run(driver, [{ element: '[data-wizard="requirements-table"]', data: { clickBefore: 1 } }]);

      expect(configuredSteps(driver)[0]?.onHighlightStarted).toBeUndefined();
    });
  });

  describe('dynamic components', () => {
    it('attaches a registered next click to the matching step', () => {
      const onNextClick: OnNextClick = vi.fn();
      registerNextClick(createGroupSelector, onNextClick);
      const driver = createDriver();

      run(driver, [
        {
          element: createGroupSelector,
          popover: { title: 'Create a group', showButtons: ['previous', 'close'] },
        },
        { element: '[data-wizard="group-type"]', popover: { title: 'Choose a group type' } },
      ]);
      const steps = configuredSteps(driver);

      expect(steps[0]?.popover?.onNextClick).toBe(onNextClick);
      expect(steps[0]?.popover?.title).toBe('Create a group');
      expect(steps[0]?.popover?.showButtons).toEqual(['previous', 'close']);
      expect(steps[1]?.popover?.onNextClick).toBeUndefined();
      expect(driver.drive).toHaveBeenCalledOnce();
    });

    it('does not attach a callback when the step element is not a selector string', () => {
      const onNextClick: OnNextClick = vi.fn();
      registerNextClick(createGroupSelector, onNextClick);
      const driver = createDriver();
      const element = document.createElement('button');

      run(driver, [{ element }]);

      expect(configuredSteps(driver)[0]?.popover?.onNextClick).toBeUndefined();
    });

    it('drops the callback after it is unregistered', () => {
      const onNextClick: OnNextClick = vi.fn();
      const unregister = registerNextClick(createGroupSelector, onNextClick);
      unregister();
      const driver = createDriver();

      run(driver, [{ element: createGroupSelector, popover: { title: 'Create a group' } }]);

      expect(configuredSteps(driver)[0]?.popover?.onNextClick).toBeUndefined();
    });

    it('keeps a newer callback when an older registration is cleaned up', () => {
      const first: OnNextClick = vi.fn();
      const second: OnNextClick = vi.fn();
      const unregisterFirst = registerNextClick(createGroupSelector, first);
      registerNextClick(createGroupSelector, second);
      unregisterFirst();
      const driver = createDriver();

      run(driver, [{ element: createGroupSelector }]);

      expect(configuredSteps(driver)[0]?.popover?.onNextClick).toBe(second);
    });

    it('can open a target that is not in the document yet and still click a static selector', () => {
      const modalTarget = document.createElement('div');
      modalTarget.setAttribute('data-wizard', 'group-type');
      const onNextClick: OnNextClick = (_element, _step, opts) => {
        document.body.appendChild(modalTarget);
        opts.driver.moveNext();
      };
      registerNextClick(createGroupSelector, onNextClick);
      collapsedAccordionHeader();
      const driver = createDriver();

      run(driver, [
        {
          element: createGroupSelector,
          popover: { title: 'Create a group' },
          data: { clickBefore: accordionSelector },
        },
      ]);
      const step = stepAt(driver, 0);
      const moveNext = vi.fn();
      step.popover?.onNextClick?.(undefined, step, { driver: { moveNext } } as unknown as Parameters<OnNextClick>[2]);

      expect(document.querySelector('[data-wizard="group-type"]')).toBe(modalTarget);
      expect(moveNext).toHaveBeenCalledOnce();
      expect(step?.onHighlightStarted).toBeTypeOf('function');
    });
  });
});
