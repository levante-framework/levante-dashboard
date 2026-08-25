// @TODO: Only setUserData is covered here; the rest of the auth store is untested.

import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@levante-framework/permissions-core', () => ({
  ROLES: { SUPER_ADMIN: 'super_admin', ADMIN: 'admin' },
}));

vi.mock('../firebaseInit', () => ({
  initNewFirekit: vi.fn(),
}));

vi.mock('@/plugins/posthog', () => ({
  default: { reset: vi.fn(), identify: vi.fn(), capture: vi.fn() },
}));

const loggerMock = vi.hoisted(() => ({
  setAdditionalProperties: vi.fn(),
  error: vi.fn(),
  setUser: vi.fn(),
}));

vi.mock('@/logger', () => ({
  logger: loggerMock,
}));

import { ROLES } from '@levante-framework/permissions-core';
import { type UserData, useAuthStore } from './auth';

const RESTRICTED_SITE_ID = '1SUxysPAgIpD8XZR3Pwh';

function makeRole(siteId: string, siteName: string, role: string = ROLES.ADMIN) {
  return { siteId, siteName, role };
}

describe('auth store — setUserData', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('stores the raw user data', () => {
    const store = useAuthStore();
    const data = { roles: [makeRole('siteA', 'Site A')] } as UserData;

    store.setUserData(data);

    expect(store.userData).toEqual(data);
  });

  it('keeps the restricted site for superadmins', () => {
    const store = useAuthStore();
    const data = {
      roles: [
        makeRole(RESTRICTED_SITE_ID, 'Audio Review', ROLES.SUPER_ADMIN),
        makeRole('siteB', 'Site B'),
      ],
    } as UserData;

    store.setUserData(data);

    expect(store.sites).toEqual([
      { siteId: RESTRICTED_SITE_ID, siteName: 'Audio Review' },
      { siteId: 'siteB', siteName: 'Site B' },
    ]);
    expect(store.currentSite).toBe(RESTRICTED_SITE_ID);
    expect(store.currentSiteName).toBe('Audio Review');
  });

  it('filters the restricted site out for non-superadmins', () => {
    const store = useAuthStore();
    const data = {
      roles: [makeRole(RESTRICTED_SITE_ID, 'Audio Review'), makeRole('siteB', 'Site B')],
    } as UserData;

    store.setUserData(data);

    expect(store.sites).toEqual([{ siteId: 'siteB', siteName: 'Site B' }]);
    expect(store.currentSite).toBe('siteB');
    expect(store.currentSiteName).toBe('Site B');
  });

  it('clears site state for a non-superadmin whose only role is the restricted site', () => {
    const store = useAuthStore();
    const data = { roles: [makeRole(RESTRICTED_SITE_ID, 'Audio Review')] } as UserData;

    store.setUserData(data);

    expect(store.sites).toEqual([]);
    expect(store.currentSite).toBeNull();
    expect(store.currentSiteName).toBeNull();
  });

  it('resets a stale persisted currentSite that points at the now-hidden site', () => {
    const store = useAuthStore();
    store.currentSite = RESTRICTED_SITE_ID;
    store.currentSiteName = 'Audio Review';

    const data = {
      roles: [makeRole(RESTRICTED_SITE_ID, 'Audio Review'), makeRole('siteB', 'Site B')],
    } as UserData;

    store.setUserData(data);

    expect(store.currentSite).toBe('siteB');
    expect(store.currentSiteName).toBe('Site B');
  });

  it('preserves a currentSite that is still visible', () => {
    const store = useAuthStore();
    store.currentSite = 'siteC';
    store.currentSiteName = 'Site C';

    const data = {
      roles: [makeRole('siteB', 'Site B'), makeRole('siteC', 'Site C')],
    } as UserData;

    store.setUserData(data);

    expect(store.currentSite).toBe('siteC');
    expect(store.currentSiteName).toBe('Site C');
  });

  it('handles user data with no roles field', () => {
    const store = useAuthStore();
    const data = {} as UserData;

    store.setUserData(data);

    expect(store.sites).toEqual([]);
    expect(store.currentSite).toBeNull();
    expect(store.currentSiteName).toBeNull();
    expect(loggerMock.setAdditionalProperties).not.toHaveBeenCalled();
  });

  it('stamps the visible role siteName when no site name is persisted', () => {
    const store = useAuthStore();
    store.currentSite = 'siteB';

    const data = {
      roles: [makeRole('siteB', 'Site B'), makeRole('siteC', 'Site C')],
    } as UserData;

    store.setUserData(data);

    expect(store.currentSiteName).toBeNull();
    expect(loggerMock.setAdditionalProperties).toHaveBeenCalledWith({ siteId: 'siteB', siteName: 'Site B' });
  });

  it('falls back to districts.current for telemetry and never stamps the restricted site', () => {
    const store = useAuthStore();
    const data = {
      roles: [makeRole(RESTRICTED_SITE_ID, 'Audio Review')],
      districts: { current: ['districtX'] },
    } as UserData;

    store.setUserData(data);

    expect(loggerMock.setAdditionalProperties).toHaveBeenCalledWith({ siteId: 'districtX' });
    expect(loggerMock.setAdditionalProperties).not.toHaveBeenCalledWith(
      expect.objectContaining({ siteName: 'Audio Review' }),
    );
  });
});
