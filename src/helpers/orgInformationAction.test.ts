import { describe, expect, it, vi } from 'vitest';
import { orgInformationAction, orgInformationLoadingAction } from './orgInformationAction';

describe('orgInformationAction', () => {
  it('shows a green checkmark when the information is complete', () => {
    expect(orgInformationAction('complete', 'school', vi.fn())).toEqual({
      name: 'information',
      icon: 'pi pi-check',
      status: 'success',
      tooltip: 'Information for this school is complete',
      callback: null,
    });
  });

  it('names the site in the complete tooltip', () => {
    expect(orgInformationAction('complete', 'site', vi.fn())?.tooltip).toBe('Information for this site is complete');
  });

  it.each(['not-started', 'incomplete'] as const)('shows a red pulsing icon when the status is %s', (progress) => {
    const openForm = vi.fn();

    expect(orgInformationAction(progress, 'site', openForm)).toEqual({
      name: 'information',
      icon: 'pi pi-info-circle',
      status: 'error',
      pulse: true,
      tooltip: 'Site information is missing',
      callback: openForm,
    });
  });

  it('shows nothing when the status is missing or failed', () => {
    expect(orgInformationAction(undefined, 'school', vi.fn())).toBeNull();
  });
});

describe('orgInformationLoadingAction', () => {
  it('shows a spinner while the status is loading', () => {
    expect(orgInformationLoadingAction()).toMatchObject({ icon: 'pi pi-spinner pi-spin', callback: null });
  });
});
