import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { deriveNextCsvFilename, downloadCsv, unparseCsvFile } from '@/helpers/csv';
import { logger } from '@/logger';
import ListUsers from './ListUsers.vue';

// ─── Toast ──────────────────────────────────────────────────────────────────
// Stub the composable directly so toast.add calls are observable without
// mounting PrimeVue's ToastService.

const { toastAddMock } = vi.hoisted(() => ({ toastAddMock: vi.fn() }));
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add: toastAddMock }) }));

// ─── Data fetching / mutation ─────────────────────────────────────────────────

vi.mock('@/composables/queries/useGetUsersByOrgQuery', () => ({ default: vi.fn() }));
vi.mock('@/composables/queries/useGetUserOverviewQuery', () => ({ useGetUserOverviewQuery: vi.fn() }));
vi.mock('@/composables/mutations/useUpdateUsersInfoMutation', () => ({ default: vi.fn() }));

// ─── Store ────────────────────────────────────────────────────────────────────
// The component only reads authStore.isFirekitInit() (for the query's enabled
// guard), so a minimal stub suffices.

vi.mock('@/store/auth', () => ({ useAuthStore: vi.fn(() => ({ isFirekitInit: () => true })) }));

// ─── Logger ───────────────────────────────────────────────────────────────────
// The real logger pulls in PostHog/Sentry which fail to init in JSDOM.

vi.mock('@/logger', () => ({ logger: { error: vi.fn() } }));

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Stub the CSV helpers to observe the export wiring without touching the DOM,
// and the label/singularize helpers for deterministic output.

vi.mock('@/helpers/csv', async (importActual) => ({
  unparseCsvFile: vi.fn(() => 'csv-content'),
  deriveNextCsvFilename: vi.fn((name: string) => `${name}.csv`),
  downloadCsv: vi.fn(),
  // Keep the real sanitizer so filename assertions exercise actual behavior.
  sanitizeCsvFilename: (await importActual<typeof import('@/helpers/csv')>()).sanitizeCsvFilename,
}));

vi.mock('@/helpers/childLabels', () => ({
  getChildLabel: vi.fn((index?: number) => (index == null ? '' : `label-${index}`)),
}));

vi.mock('@/helpers', () => ({
  singularizeFirestoreCollection: vi.fn((type: string) => `singular-${type}`),
  normalizeToLowercase: (str = '') => str.trim().toLowerCase(),
}));

// ─── Child components ─────────────────────────────────────────────────────────
// Mocked at the module level so their (heavy) dependency graphs — e.g.
// @bdelab/roar-utils, which fails to resolve in the test env — are never loaded.

vi.mock('@/components/RoarDataTable.vue', () => ({ default: { name: 'RoarDataTable', render: () => null } }));
vi.mock('@/components/modals/RoarModal.vue', () => ({ default: { name: 'RoarModal', render: () => null } }));
vi.mock('@/components/EditUserForm.vue', () => ({ default: { name: 'EditUserForm', render: () => null } }));
vi.mock('@/components/AppSpinner.vue', () => ({ default: { name: 'AppSpinner', render: () => null } }));

import useUpdateUsersInfoMutation from '@/composables/mutations/useUpdateUsersInfoMutation';
import { useGetUserOverviewQuery } from '@/composables/queries/useGetUserOverviewQuery';
import useGetUsersByOrgQuery from '@/composables/queries/useGetUsersByOrgQuery';

const mutateAsyncMock = vi.fn();

// The slice of the component's setup surface the tests read from `wrapper.vm`.
interface ListUsersVm {
  nonAdminUsers: Array<{ uid: string; userType: string; childLabel: string }>;
  activeTab: 'active' | 'inactive';
  activeUsers: Array<{ uid: string }>;
  inactiveUsers: Array<{ uid: string }>;
  searchQuery: string;
  usersByTab: Record<'active' | 'inactive', Array<{ uid: string }>>;
  childrenCount: number;
  caregiversCount: number;
  teachersCount: number;
  displayOrgType: string;
  currentEditUser: Record<string, unknown> | null;
  showEditModal: boolean;
  pendingUserUpdate: { uid: string; archived: boolean; disabled: boolean } | null;
  isUserDirty: boolean;
  onEditButtonClick: (user: Record<string, unknown>) => void;
  onEditModalClosed: () => void;
  submitUpdateUsersInfo: () => Promise<void>;
  downloadAllUsers: () => void;
  downloadSelectedUsers: (rows: Record<string, unknown>[]) => void;
}

const setUsers = (users: Record<string, unknown>[]) => {
  vi.mocked(useGetUsersByOrgQuery).mockReturnValue({
    isLoading: ref(false),
    isFetching: ref(false),
    data: ref({ users }),
    isError: ref(false),
  } as unknown as ReturnType<typeof useGetUsersByOrgQuery>);
};

const mountListUsers = (props: Record<string, string> = {}) => {
  const wrapper = mount(ListUsers, {
    props: { orgType: 'districts', orgId: 'org-1', orgName: 'My Org', ...props },
    global: {
      plugins: [PrimeVue],
      stubs: { RoarDataTable: true, RoarModal: true, EditUserForm: true, AppSpinner: true, PvButton: true },
    },
  });
  return wrapper.vm as unknown as ListUsersVm;
};

describe('ListUsers Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useUpdateUsersInfoMutation).mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: ref(false),
    } as unknown as ReturnType<typeof useUpdateUsersInfoMutation>);
    vi.mocked(useGetUserOverviewQuery).mockReturnValue({
      data: ref(undefined),
      isLoading: ref(false),
    } as unknown as ReturnType<typeof useGetUserOverviewQuery>);
    setUsers([]);
  });

  describe('computed user lists and counts', () => {
    it('excludes admins, maps child labels, and counts by user type', () => {
      setUsers([
        { uid: 'a', userType: 'admin', childLabelIndex: 1 },
        { uid: 'b', userType: 'child', childLabelIndex: 2 },
        { uid: 'c', userType: 'caregiver' },
        { uid: 'd', userType: 'teacher' },
        { uid: 'e', userType: 'child' },
      ]);

      const vm = mountListUsers();

      expect(vm.nonAdminUsers).toHaveLength(4);
      expect(vm.nonAdminUsers.every((u) => u.userType !== 'admin')).toBe(true);
      expect(vm.nonAdminUsers[0]).toMatchObject({ uid: 'b', childLabel: 'label-2' });

      expect(vm.childrenCount).toBe(2);
      expect(vm.caregiversCount).toBe(1);
      expect(vm.teachersCount).toBe(1);
    });
  });

  describe('active / inactive tabs', () => {
    it('splits users into active (archived and disabled both false) and inactive (either true)', () => {
      setUsers([
        { uid: 'active-1', userType: 'child', archived: false, disabled: false },
        { uid: 'archived-1', userType: 'child', archived: true, disabled: false },
        { uid: 'disabled-1', userType: 'caregiver', archived: false, disabled: true },
        { uid: 'both-1', userType: 'teacher', archived: true, disabled: true },
      ]);

      const vm = mountListUsers();

      expect(vm.activeUsers.map((u) => u.uid)).toEqual(['active-1']);
      expect(vm.inactiveUsers.map((u) => u.uid)).toEqual(['archived-1', 'disabled-1', 'both-1']);
    });

    it('defaults to the active tab', () => {
      expect(mountListUsers().activeTab).toBe('active');
    });

    it('exports the inactive users with an inactive-scoped filename when that tab is active', () => {
      setUsers([{ uid: 'archived-1', userType: 'child', email: 'e', archived: true, disabled: false }]);
      const vm = mountListUsers();
      vm.activeTab = 'inactive';

      vm.downloadAllUsers();

      expect(deriveNextCsvFilename).toHaveBeenCalledWith('My-Org-inactive-users', { timestamp: expect.any(Date) });
      expect(downloadCsv).toHaveBeenCalledWith('csv-content', 'My-Org-inactive-users.csv');
    });
  });

  describe('search filter', () => {
    it('matches the query (debounced) against visible column values within the active tab', async () => {
      vi.useFakeTimers();
      try {
        setUsers([
          { uid: 'abc', userType: 'child', email: 'kid@example.com', archived: false, disabled: false },
          { uid: 'xyz', userType: 'teacher', email: 'teacher@example.com', archived: false, disabled: false },
        ]);
        const vm = mountListUsers();

        expect(vm.usersByTab.active.map((u) => u.uid)).toEqual(['abc', 'xyz']);

        vm.searchQuery = 'teacher';
        await vi.advanceTimersByTimeAsync(300);

        expect(vm.usersByTab.active.map((u) => u.uid)).toEqual(['xyz']);
      } finally {
        vi.useRealTimers();
      }
    });

    it('exports the whole tab table (ignoring the active search) with an unfiltered filename', async () => {
      vi.useFakeTimers();
      try {
        setUsers([
          { uid: 'abc', userType: 'child', email: 'kid@example.com', archived: false, disabled: false },
          { uid: 'xyz', userType: 'teacher', email: 'teacher@example.com', archived: false, disabled: false },
        ]);
        const vm = mountListUsers();

        vm.searchQuery = 'teacher';
        await vi.advanceTimersByTimeAsync(300);
        expect(vm.usersByTab.active.map((u) => u.uid)).toEqual(['xyz']);

        vm.downloadAllUsers();

        const [rows] = vi.mocked(unparseCsvFile).mock.calls[0] ?? [];
        expect(rows).toHaveLength(2);
        expect(deriveNextCsvFilename).toHaveBeenCalledWith('My-Org-active-users', {
          timestamp: expect.any(Date),
        });
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('displayOrgType', () => {
    it('maps districts to "Site"', () => {
      expect(mountListUsers({ orgType: 'districts' }).displayOrgType).toBe('Site');
    });

    it('maps groups to "Cohort"', () => {
      expect(mountListUsers({ orgType: 'groups' }).displayOrgType).toBe('Cohort');
    });

    it('falls back to the singularized collection for other org types', () => {
      expect(mountListUsers({ orgType: 'schools' }).displayOrgType).toBe('singular-schools');
    });
  });

  describe('edit modal state', () => {
    it('opens the modal with the clicked user', () => {
      const vm = mountListUsers();
      const user = { uid: 'b', userType: 'child', archived: false, disabled: false, email: 'e' };

      vm.onEditButtonClick(user);

      expect(vm.currentEditUser).toEqual(user);
      expect(vm.showEditModal).toBe(true);
    });

    it('clears all edit state on close', () => {
      const vm = mountListUsers();
      vm.onEditButtonClick({ uid: 'b', userType: 'child', archived: false, disabled: false, email: 'e' });
      vm.pendingUserUpdate = { uid: 'b', archived: true, disabled: false };
      vm.isUserDirty = true;

      vm.onEditModalClosed();

      expect(vm.showEditModal).toBe(false);
      expect(vm.currentEditUser).toBeNull();
      expect(vm.pendingUserUpdate).toBeNull();
      expect(vm.isUserDirty).toBe(false);
    });
  });

  describe('submitUpdateUsersInfo', () => {
    it('does nothing when there is no pending update', async () => {
      const vm = mountListUsers();

      await vm.submitUpdateUsersInfo();

      expect(mutateAsyncMock).not.toHaveBeenCalled();
    });

    it('sends the pending update, toasts success, and closes the modal', async () => {
      mutateAsyncMock.mockResolvedValue({});
      const vm = mountListUsers();
      vm.currentEditUser = { uid: 'b', userType: 'child', archived: false, disabled: false, email: 'e' };
      vm.showEditModal = true;
      vm.pendingUserUpdate = { uid: 'b', archived: true, disabled: false };

      await vm.submitUpdateUsersInfo();

      expect(mutateAsyncMock).toHaveBeenCalledWith({ users: [{ uid: 'b', archived: true, disabled: false }] });
      expect(toastAddMock).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
      expect(vm.showEditModal).toBe(false);
      expect(vm.currentEditUser).toBeNull();
      expect(vm.pendingUserUpdate).toBeNull();
    });

    it('logs with the uid and toasts an error while keeping the modal open on failure', async () => {
      const boom = new Error('boom');
      mutateAsyncMock.mockRejectedValue(boom);
      const vm = mountListUsers();
      vm.currentEditUser = { uid: 'b', userType: 'child', archived: false, disabled: false, email: 'e' };
      vm.showEditModal = true;
      vm.pendingUserUpdate = { uid: 'b', archived: true, disabled: false };

      await vm.submitUpdateUsersInfo();

      expect(logger.error).toHaveBeenCalledTimes(1);
      const [error, context] = vi.mocked(logger.error).mock.calls[0] ?? [];
      expect(error?.cause).toBe(boom);
      expect(context).toMatchObject({ uid: 'b', tags: { composable: 'useUpdateUsersInfoMutation' } });
      expect(toastAddMock).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
      expect(vm.showEditModal).toBe(true);
    });
  });

  describe('CSV export', () => {
    it('warns and skips download when there are no rows', () => {
      const vm = mountListUsers();

      vm.downloadAllUsers();

      expect(toastAddMock).toHaveBeenCalledWith(expect.objectContaining({ severity: 'warn' }));
      expect(unparseCsvFile).not.toHaveBeenCalled();
      expect(downloadCsv).not.toHaveBeenCalled();
    });

    it('exports all users with header-keyed rows and a sanitized, timestamped filename', () => {
      setUsers([{ uid: 'b', userType: 'child', email: 'e', childLabelIndex: 2, archived: false, disabled: false }]);
      const vm = mountListUsers();

      vm.downloadAllUsers();

      const [rows] = vi.mocked(unparseCsvFile).mock.calls[0] ?? [];
      expect(rows?.[0]).toEqual({
        UID: 'b',
        'User Login': 'e',
        'User Type': 'child',
        'Child Label': 'label-2',
        Archived: false,
        Disabled: false,
      });
      expect(deriveNextCsvFilename).toHaveBeenCalledWith('My-Org-active-users', { timestamp: expect.any(Date) });
      expect(downloadCsv).toHaveBeenCalledWith('csv-content', 'My-Org-active-users.csv');
    });

    it('exports the rows passed by the table for a selected-users export', () => {
      const vm = mountListUsers();

      vm.downloadSelectedUsers([{ uid: 'x', userType: 'child', email: 'e2' }]);

      expect(deriveNextCsvFilename).toHaveBeenCalledWith('My-Org-selected-users', { timestamp: expect.any(Date) });
      expect(downloadCsv).toHaveBeenCalledWith('csv-content', 'My-Org-selected-users.csv');
    });
  });
});
