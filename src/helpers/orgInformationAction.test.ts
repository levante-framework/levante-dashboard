import { describe, expect, it, vi } from 'vitest';
import { orgInformationAction, orgInformationLoadingAction } from './orgInformationAction';

describe('orgInformationAction', () => {
  it('shows an eye that opens the read-only view when the information is complete', () => {
    const openForm = vi.fn();
    const openView = vi.fn();

    expect(orgInformationAction('complete', 'school', openForm, openView)).toEqual({
      name: 'information',
      icon: 'pi pi-eye',
      status: 'success',
      tooltip: 'Information for this school is complete',
      callback: openView,
    });
  });

  it('names the site in the complete tooltip', () => {
    expect(orgInformationAction('complete', 'site', vi.fn(), vi.fn())?.tooltip).toBe(
      'Information for this site is complete',
    );
  });

  it.each(['not-started', 'incomplete'] as const)('shows a red pulsing icon when the status is %s', (progress) => {
    const openForm = vi.fn();

    expect(orgInformationAction(progress, 'site', openForm, vi.fn())).toEqual({
      name: 'information',
      icon: 'pi pi-info-circle',
      status: 'error',
      pulse: true,
      tooltip: 'Site information is missing',
      callback: openForm,
    });
  });

  it('shows nothing when the status is missing or failed', () => {
    expect(orgInformationAction(undefined, 'school', vi.fn(), vi.fn())).toBeNull();
  });
});

describe('orgInformationLoadingAction', () => {
  it('shows a spinner while the status is loading', () => {
    expect(orgInformationLoadingAction()).toMatchObject({ icon: 'pi pi-spinner pi-spin', callback: null });
  });
});
