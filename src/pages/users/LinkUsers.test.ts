import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { mount } from '@vue/test-utils';
import * as Papa from 'papaparse';
import { createPinia, setActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import Tooltip from 'primevue/tooltip';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import { useAuthStore } from '@/store/auth';
import LinkUsers from './LinkUsers.vue';

// ─── Logger ───────────────────────────────────────────────────────────────────
//
// The real logger pulls in PostHog and Sentry, which fail to initialise in
// JSDOM. Stubbing the surface used by submitUsers keeps the environment quiet.

vi.mock('@/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// ─── Stores ───────────────────────────────────────────────────────────────────
//
// Mocked stores return real Vue refs so that Pinia's storeToRefs() can
// recognise them and pass them through unchanged. Without real refs,
// storeToRefs returns an empty object and all destructured values are
// undefined, causing a crash during component setup.

vi.mock('@/store/auth', () => ({
  useAuthStore: vi.fn(),
}));

const { setShouldUserConfirmMock } = vi.hoisted(() => ({
  setShouldUserConfirmMock: vi.fn(),
}));

vi.mock('@/store/levante', () => ({
  useLevanteStore: vi.fn(() => ({
    setShouldUserConfirm: setShouldUserConfirmMock,
  })),
}));

// ─── Link-users mutation ────────────────────────────────────────────────────────
//
// The component calls `linkUsers(params, { onError, onSuccess })`. Hoisted so
// each test can drive the callbacks via a bespoke mock implementation.

const { linkUsersMock } = vi.hoisted(() => ({
  linkUsersMock: vi.fn(),
}));

vi.mock('@/composables/mutations/useLinkUsersMutation', () => ({
  default: () => ({ mutate: linkUsersMock }),
}));

// ─── Test helpers ─────────────────────────────────────────────────────────────

const createAuthStoreMock = (overrides: Record<string, unknown> = {}) => ({
  currentSite: ref('site-id-123'),
  currentSiteName: ref('site-id-123'),
  ...overrides,
});

const createMockFile = (content: string, filename = 'test.csv', type = 'text/csv') => {
  return new File([content], filename, { type });
};

const mockFileUploadEvent = (content: string) => ({
  files: [createMockFile(content)],
});

// ─── Mount helper ─────────────────────────────────────────────────────────────

const mountLinkUsers = () =>
  mount(LinkUsers, {
    global: {
      plugins: [
        PrimeVue,
        ToastService,
        [VueQueryPlugin, { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) }],
      ],
      directives: { tooltip: Tooltip },
      stubs: {
        LinkUsersInfo: true,
        CsvUploader: true,
        CsvTable: true,
        PvDivider: true,
        PvMessage: true,
      },
    },
  });

// ─── Shared CSV fixtures ──────────────────────────────────────────────────────

// A child linked to one caregiver and one teacher, both present in the file.
// Every row carries a uid, as a Link Users CSV always does.
const VALID_CSV = [
  'id,userType,caregiverId,teacherId,uid',
  'child-1,child,care-1,teach-1,uid-child-1',
  'care-1,caregiver,,,uid-care-1',
  'teach-1,teacher,,,uid-teach-1',
].join('\n');

const MISSING_HEADERS_CSV = ['id,userType', 'child-1,child'].join('\n');

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LinkUsers Page', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    setShouldUserConfirmMock.mockReset();
    linkUsersMock.mockReset();
    vi.mocked(useAuthStore).mockReset();
    vi.mocked(useAuthStore).mockReturnValue(createAuthStoreMock() as any);
  });

  describe('onFileUpload', () => {
    it('handles a valid CSV upload', async () => {
      const vm = mountLinkUsers().vm as any;

      await vm.onFileUpload(mockFileUploadEvent(VALID_CSV));

      expect(vm.validationErrors).toBeNull();
      expect(vm.validatedData).not.toBeNull();
      expect(vm.validatedData).toHaveLength(3);

      const [child, caregiver, teacher] = vm.validatedData;

      // Zod splits the *Id columns into arrays and keeps userType verbatim.
      expect(child.userType).toBe('child');
      expect(child.id).toBe('child-1');
      expect(child.uid).toBe('uid-child-1');
      expect(child.caregiverId).toEqual(['care-1']);
      expect(child.teacherId).toEqual(['teach-1']);

      expect(caregiver.userType).toBe('caregiver');
      expect(caregiver.id).toBe('care-1');
      expect(teacher.userType).toBe('teacher');
      expect(teacher.id).toBe('teach-1');

      expect(vm.status).toEqual({
        message: 'File successfully uploaded. See table for summary of users to be linked.',
        severity: 'success',
      });
    });

    it('resets component state at the start of each upload', async () => {
      const vm = mountLinkUsers().vm as any;

      await vm.onFileUpload(mockFileUploadEvent(VALID_CSV));
      expect(vm.validatedData).not.toBeNull();
      expect(vm.validationErrors).toBeNull();

      await vm.onFileUpload(mockFileUploadEvent(MISSING_HEADERS_CSV));

      // The first upload's validatedData must be gone.
      expect(vm.validatedData).toBeNull();
      expect(vm.validationErrors).not.toBeNull();
      expect(vm.validationErrors.rows).toEqual(
        expect.arrayContaining([
          { message: 'caregiverId: Missing required header' },
          { message: 'teacherId: Missing required header' },
          { message: 'uid: Missing required header' },
        ]),
      );
    });

    it('handles validation errors when no file is provided', async () => {
      const vm = mountLinkUsers().vm as any;

      await vm.onFileUpload({ files: [] });

      expect(vm.status).toEqual({ message: 'No file uploaded.', severity: 'error' });
      expect(vm.validatedData).toBeNull();
      expect(vm.validationErrors).toBeNull();
    });

    it('handles validation errors when the file is empty', async () => {
      const vm = mountLinkUsers().vm as any;

      const HEADER_ONLY_CSV = 'id,userType,caregiverId,teacherId,uid';
      await vm.onFileUpload(mockFileUploadEvent(HEADER_ONLY_CSV));

      expect(vm.status).toEqual({
        message: 'The uploaded file contains no users. Please add at least one user and upload again.',
        severity: 'error',
      });
      expect(vm.validatedData).toBeNull();
      expect(vm.validationErrors).toBeNull();
    });

    it('handles validation errors when the file is malformed', async () => {
      const vm = mountLinkUsers().vm as any;

      // An unterminated quoted field makes Papa emit parse errors, so
      // parseCsvFile resolves to null and onFileUpload bails out.
      const MALFORMED_CSV = ['id,userType', '1,"child'].join('\n');
      await vm.onFileUpload(mockFileUploadEvent(MALFORMED_CSV));

      expect(vm.status).toEqual({
        message:
          'The uploaded file could not be read. If you used a spreadsheet app, please "Save as" or "Export" to CSV and upload again.',
        severity: 'error',
      });
      expect(vm.validatedData).toBeNull();
      expect(vm.validationErrors).toBeNull();
    });

    it('handles validation errors when required headers are missing', async () => {
      const vm = mountLinkUsers().vm as any;

      await vm.onFileUpload(mockFileUploadEvent(MISSING_HEADERS_CSV));

      expect(vm.status).toEqual({
        message: 'The uploaded file is invalid. See table for details.',
        severity: 'error',
      });
      expect(vm.validatedData).toBeNull();
      expect(vm.validationErrors).not.toBeNull();

      // Header-level errors never need a downloadable CSV, so the flag is false.
      expect(vm.validationErrors.showDownloadButton).toBe(false);
      expect(vm.validationErrors.rows).toEqual(
        expect.arrayContaining([
          { message: 'caregiverId: Missing required header' },
          { message: 'teacherId: Missing required header' },
          { message: 'uid: Missing required header' },
        ]),
      );
    });

    it('handles site validation errors', async () => {
      const vm = mountLinkUsers().vm as any;

      // When the CSV includes a 'site' column, each non-empty value must match
      // the currently selected site ('site-id-123' per the auth store mock).
      const CSV_WRONG_SITE = [
        'id,userType,caregiverId,teacherId,uid,site',
        'child-1,child,care-1,,uid-child-1,wrong-site',
        'care-1,caregiver,,,uid-care-1,wrong-site',
      ].join('\n');
      await vm.onFileUpload(mockFileUploadEvent(CSV_WRONG_SITE));

      expect(vm.status).toEqual({
        message: 'The uploaded file is invalid. See table for details.',
        severity: 'error',
      });
      expect(vm.validatedData).toBeNull();
      expect(vm.validationErrors).not.toBeNull();
      expect(vm.validationErrors.showDownloadButton).toBe(true);
      expect(vm.validationErrors.rows).toEqual([{ message: 'site: Must match the selected site', rowNums: [2, 3] }]);
    });

    it('accepts rows whose site column matches or is empty', async () => {
      const vm = mountLinkUsers().vm as any;

      const csv = [
        'id,userType,caregiverId,teacherId,uid,site',
        'child-1,child,care-1,,uid-child-1,site-id-123',
        'care-1,caregiver,,,uid-care-1,',
      ].join('\n');
      await vm.onFileUpload(mockFileUploadEvent(csv));

      expect(vm.validationErrors).toBeNull();
      expect(vm.validatedData).toHaveLength(2);
    });

    it('reports a row-level zod error with a downloadable CSV', async () => {
      const vm = mountLinkUsers().vm as any;

      // Empty uid fails nonEmptyString() → Zod issue at path [0, 'uid'].
      const CSV_EMPTY_UID = [
        'id,userType,caregiverId,teacherId,uid',
        'child-1,child,care-1,,',
        'care-1,caregiver,,,uid-care-1',
      ].join('\n');
      await vm.onFileUpload(mockFileUploadEvent(CSV_EMPTY_UID));

      expect(vm.status).toEqual({
        message: 'The uploaded file is invalid. See table for details.',
        severity: 'error',
      });
      expect(vm.validatedData).toBeNull();
      expect(vm.validationErrors).not.toBeNull();
      expect(vm.validationErrors.showDownloadButton).toBe(true);
      expect(vm.validationErrors.rows).toEqual([{ message: 'uid: Required', rowNums: [2] }]);
    });

    it('flags adult rows that carry links', async () => {
      const vm = mountLinkUsers().vm as any;

      // A caregiver row must not have a caregiverId/teacherId.
      const csv = [
        'id,userType,caregiverId,teacherId,uid',
        'child-1,child,care-1,,uid-child-1',
        'care-1,caregiver,care-x,,uid-care-1',
      ].join('\n');
      await vm.onFileUpload(mockFileUploadEvent(csv));

      expect(vm.validatedData).toBeNull();
      expect(vm.validationErrors.rows).toEqual([
        { message: 'caregiverId: Only child rows may have a caregiverId', rowNums: [3] },
      ]);
    });

    it('filters out children missing both caregiverId and teacherId', async () => {
      const vm = mountLinkUsers().vm as any;

      // child-2 has no links → dropped. care-1 is only referenced by child-1,
      // teach-1 by child-1 → both retained. All three remaining rows survive.
      const csv = [
        'id,userType,caregiverId,teacherId,uid',
        'child-1,child,care-1,teach-1,uid-child-1',
        'child-2,child,,,uid-child-2',
        'care-1,caregiver,,,uid-care-1',
        'teach-1,teacher,,,uid-teach-1',
      ].join('\n');
      await vm.onFileUpload(mockFileUploadEvent(csv));

      expect(vm.validationErrors).toBeNull();
      expect(vm.validatedData).toHaveLength(3);
      expect(vm.validatedData.map((u: { id: string }) => u.id)).toEqual(['child-1', 'care-1', 'teach-1']);
    });

    it('drops adults not linked to any retained child', async () => {
      const vm = mountLinkUsers().vm as any;

      // teach-1 is referenced by no child row → dropped from validatedData.
      const csv = [
        'id,userType,caregiverId,teacherId,uid',
        'child-1,child,care-1,,uid-child-1',
        'care-1,caregiver,,,uid-care-1',
        'teach-1,teacher,,,uid-teach-1',
      ].join('\n');
      await vm.onFileUpload(mockFileUploadEvent(csv));

      expect(vm.validationErrors).toBeNull();
      expect(vm.validatedData.map((u: { id: string }) => u.id)).toEqual(['child-1', 'care-1']);
    });

    it('errors when no child row provides a caregiverId or teacherId', async () => {
      const vm = mountLinkUsers().vm as any;

      // The only child has no links, so after filtering nothing remains.
      const csv = ['id,userType,caregiverId,teacherId,uid', 'child-1,child,,,uid-child-1'].join('\n');
      await vm.onFileUpload(mockFileUploadEvent(csv));

      expect(vm.validatedData).toBeNull();
      expect(vm.status).toEqual({
        message: 'At least one child row must include a caregiverId and/or a teacherId to link users.',
        severity: 'error',
      });
    });

    it('strips the errors column before validating', async () => {
      const vm = mountLinkUsers().vm as any;

      const csv = [
        'id,userType,caregiverId,teacherId,uid,errors',
        'child-1,child,care-1,,uid-child-1,uid: Required',
        'care-1,caregiver,,,uid-care-1,',
      ].join('\n');
      await vm.onFileUpload(mockFileUploadEvent(csv));

      expect(vm.validationErrors).toBeNull();
      expect(vm.validatedData).toHaveLength(2);
      expect(vm.validatedData[0]).not.toHaveProperty('errors');
    });

    describe('setShouldUserConfirm', () => {
      const wasCalledWithTrue = () => setShouldUserConfirmMock.mock.calls.some(([value]) => value === true);

      it('is called with true after a successful upload', async () => {
        const vm = mountLinkUsers().vm as any;

        await vm.onFileUpload(mockFileUploadEvent(VALID_CSV));

        expect(vm.validatedData).not.toBeNull();
        expect(wasCalledWithTrue()).toBe(true);
      });

      it('is not called with true when validation fails', async () => {
        const vm = mountLinkUsers().vm as any;

        await vm.onFileUpload(mockFileUploadEvent(MISSING_HEADERS_CSV));

        expect(wasCalledWithTrue()).toBe(false);
      });
    });
  });

  describe('downloadErrors', () => {
    it('does nothing when parsedData or validationErrors are absent', async () => {
      const createObjectURL = vi.spyOn(URL, 'createObjectURL');

      const vm = mountLinkUsers().vm as any;

      // Fresh mount — both refs null.
      vm.downloadErrors();
      expect(createObjectURL).not.toHaveBeenCalled();

      // Valid upload — parsedData populated but validationErrors null.
      await vm.onFileUpload(mockFileUploadEvent(VALID_CSV));
      expect(vm.validationErrors).toBeNull();
      vm.downloadErrors();
      expect(createObjectURL).not.toHaveBeenCalled();

      createObjectURL.mockRestore();
    });

    it('creates a CSV blob annotated with per-row errors and triggers download', async () => {
      const vm = mountLinkUsers().vm as any;

      // Row 2 (idx 0): empty uid → one error. Row 3 (idx 1): valid adult.
      const csv = [
        'id,userType,caregiverId,teacherId,uid',
        'child-1,child,care-1,,',
        'care-1,caregiver,,,uid-care-1',
      ].join('\n');
      await vm.onFileUpload(mockFileUploadEvent(csv));
      expect(vm.validationErrors).not.toBeNull();

      const createObjectURL = vi.fn((_blob: Blob) => 'mock-blob-url');
      const appendChildMock = vi.fn();
      const removeChildMock = vi.fn();
      const clickMock = vi.fn();
      const originalCreateElement = document.createElement.bind(document);

      global.URL.createObjectURL = createObjectURL;
      document.createElement = vi.fn((tag: string) => {
        const el = originalCreateElement(tag);
        if (tag === 'a') el.click = clickMock;
        return el;
      });
      global.document.body.appendChild = appendChildMock;
      global.document.body.removeChild = removeChildMock;

      vm.downloadErrors();

      expect(createObjectURL).toHaveBeenCalledOnce();
      const blob = createObjectURL.mock.calls[0]?.[0];
      expect(blob).toBeInstanceOf(Blob);
      expect(blob?.type).toBe('text/csv;charset=utf-8;');

      expect(appendChildMock).toHaveBeenCalledOnce();
      expect(clickMock).toHaveBeenCalledOnce();
      expect(removeChildMock).toHaveBeenCalledOnce();
      const link = appendChildMock.mock.calls[0]?.[0] as HTMLAnchorElement;
      expect(link.getAttribute('href')).toBe('mock-blob-url');
      expect(link.getAttribute('download')).toMatch(/^test__errors-\d{8}-\d{4}\.csv$/);

      const csvText = await blob!.text();
      const parsed = Papa.parse<Record<string, string>>(csvText, {
        header: true,
        skipEmptyLines: 'greedy',
      });
      expect(parsed.errors).toEqual([]);
      expect(parsed.meta.fields).toContain('errors');

      const rows = parsed.data;
      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({ id: 'child-1', errors: 'uid: Required' });
      expect(rows[1]).toMatchObject({ id: 'care-1', errors: '' });

      document.createElement = originalCreateElement;
    });
  });

  describe('submitUsers', () => {
    // Drives onFileUpload(VALID_CSV) then submitUsers, so validatedData is
    // populated before submission. Returns the component vm.
    const uploadValidAndSubmit = async () => {
      const vm = mountLinkUsers().vm as any;
      await vm.onFileUpload(mockFileUploadEvent(VALID_CSV));
      expect(vm.validatedData).not.toBeNull();
      await vm.submitUsers();
      return vm;
    };

    it('returns early when there is no validated data to submit', async () => {
      const vm = mountLinkUsers().vm as any;

      await vm.submitUsers();

      expect(vm.status).toEqual({
        message: 'Please fix the errors in your CSV file before submitting.',
        severity: 'error',
      });
      expect(vm.isSubmitting).toBe(false);
      expect(linkUsersMock).not.toHaveBeenCalled();
    });

    it('returns early when no specific site is selected', async () => {
      vi.mocked(useAuthStore).mockReturnValue(
        createAuthStoreMock({ currentSite: ref('any'), currentSiteName: ref('Test Site') }) as any,
      );

      const vm = mountLinkUsers().vm as any;
      await vm.onFileUpload(mockFileUploadEvent(VALID_CSV));
      expect(vm.validatedData).not.toBeNull();

      await vm.submitUsers();

      expect(vm.status).toEqual({
        message: 'Please select a site before adding users.',
        severity: 'error',
      });
      expect(vm.isSubmitting).toBe(false);
      expect(linkUsersMock).not.toHaveBeenCalled();
    });

    it('calls linkUsers with the mapped params on valid data', async () => {
      linkUsersMock.mockImplementation((_params: unknown, { onSuccess }: any) => onSuccess());

      const vm = await uploadValidAndSubmit();

      expect(linkUsersMock).toHaveBeenCalledOnce();
      const [payload] = linkUsersMock.mock.calls[0] ?? [];
      expect(payload.siteId).toBe('site-id-123');
      expect(payload.users).toHaveLength(3);
      expect(payload.users[0]).toEqual({
        userType: 'child',
        id: 'child-1',
        uid: 'uid-child-1',
        caregiverId: ['care-1'],
        teacherId: ['teach-1'],
      });
      // Adult rows omit the caregiverId/teacherId keys entirely.
      expect(payload.users[1]).toEqual({ userType: 'caregiver', id: 'care-1', uid: 'uid-care-1' });
      expect(payload.users[2]).toEqual({ userType: 'teacher', id: 'teach-1', uid: 'uid-teach-1' });

      // vm returned by uploadValidAndSubmit reflects the onSuccess result.
      expect(vm.status).toEqual({ message: 'Users linked successfully.', severity: 'success' });
    });

    it('resets progress and reports success on the success callback', async () => {
      linkUsersMock.mockImplementation((_params: unknown, { onSuccess }: any) => onSuccess());

      const vm = await uploadValidAndSubmit();

      expect(vm.status).toEqual({ message: 'Users linked successfully.', severity: 'success' });
      expect(vm.isSubmitting).toBe(false);
      expect(vm.validatedData).toBeNull();
      expect(vm.uploadedFile).toBeNull();
    });

    it('maps an id-hash-mismatch app-error to per-row validation errors', async () => {
      linkUsersMock.mockImplementation((_params: unknown, { onError }: any) =>
        onError({
          code: 'app-error',
          error: {
            code: 'functions/invalid-argument',
            details: { code: 'id-hash-mismatch', uids: ['uid-child-1'] },
          },
        }),
      );

      const vm = await uploadValidAndSubmit();

      expect(vm.status).toEqual({
        message: 'Failed to link users. Please fix the errors in your CSV file and try again.',
        severity: 'error',
      });
      expect(vm.validationErrors.rows).toEqual([
        { message: 'id|uid: Does not match previously registered user', rowNums: [2] },
      ]);
      expect(vm.isSubmitting).toBe(false);
    });

    it('maps a users-site-mismatch app-error to per-row validation errors', async () => {
      linkUsersMock.mockImplementation((_params: unknown, { onError }: any) =>
        onError({
          code: 'app-error',
          error: {
            code: 'functions/invalid-argument',
            details: { code: 'users-site-mismatch', siteId: 'site-id-123', uids: ['uid-care-1'] },
          },
        }),
      );

      const vm = await uploadValidAndSubmit();

      expect(vm.validationErrors.rows).toEqual([
        { message: 'uid: User does not exist in the selected site', rowNums: [3] },
      ]);
    });

    it('maps a not-found/users app-error to per-row validation errors', async () => {
      linkUsersMock.mockImplementation((_params: unknown, { onError }: any) =>
        onError({
          code: 'app-error',
          error: {
            code: 'functions/not-found',
            details: { code: 'users', uids: ['uid-teach-1'] },
          },
        }),
      );

      const vm = await uploadValidAndSubmit();

      expect(vm.validationErrors.rows).toEqual([{ message: 'uid: User does not exist in the database', rowNums: [4] }]);
    });

    it('shows a generic message for a schema app-error', async () => {
      linkUsersMock.mockImplementation((_params: unknown, { onError }: any) =>
        onError({
          code: 'app-error',
          error: {
            code: 'functions/invalid-argument',
            details: { code: 'schema', issues: [] },
          },
        }),
      );

      const vm = await uploadValidAndSubmit();

      expect(vm.status).toEqual({
        message: 'Failed to link users due to an unexpected error. Please contact support.',
        severity: 'error',
      });
      // No per-row errors are produced for the schema case.
      expect(vm.validationErrors).toBeNull();
    });

    it('shows a permission-denied message', async () => {
      linkUsersMock.mockImplementation((_params: unknown, { onError }: any) =>
        onError({ code: 'app-error', error: { code: 'functions/permission-denied', details: { code: 'auth' } } }),
      );

      const vm = await uploadValidAndSubmit();

      expect(vm.status).toEqual({
        message: 'Failed to link users due to insufficient permissions. Please contact support.',
        severity: 'error',
      });
    });

    it('shows an expired-session message on an unauthenticated app-error', async () => {
      linkUsersMock.mockImplementation((_params: unknown, { onError }: any) =>
        onError({ code: 'app-error', error: { code: 'functions/unauthenticated', details: { code: 'auth' } } }),
      );

      const vm = await uploadValidAndSubmit();

      expect(vm.status).toEqual({
        message: 'Failed to link users due to an expired session. Please sign in again and retry.',
        severity: 'error',
      });
      expect(vm.isSubmitting).toBe(false);
    });

    it('shows a generic failure message for an unrecognized failure', async () => {
      linkUsersMock.mockImplementation((_params: unknown, { onError }: any) =>
        onError({ code: 'error', error: new Error('boom') }),
      );

      const vm = await uploadValidAndSubmit();

      expect(vm.status).toEqual({
        message: 'Failed to link users. Please try again. If the problem persists, contact support.',
        severity: 'error',
      });
      expect(vm.validationErrors).toBeNull();
      expect(vm.isSubmitting).toBe(false);
    });
  });

  describe('watchers', () => {
    it('resets progress when the selected site changes', async () => {
      const currentSite = ref('site-id-123');
      vi.mocked(useAuthStore).mockReturnValue(createAuthStoreMock({ currentSite }) as any);

      const vm = mountLinkUsers().vm as any;
      await vm.onFileUpload(mockFileUploadEvent(VALID_CSV));
      expect(vm.validatedData).not.toBeNull();
      expect(vm.uploadedFile).not.toBeNull();

      currentSite.value = 'different-site';
      await nextTick();

      expect(vm.validatedData).toBeNull();
      expect(vm.uploadedFile).toBeNull();
      expect(vm.status).toBeNull();
    });

    it('does not reset progress when the site changes during submission', async () => {
      const currentSite = ref('site-id-123');
      vi.mocked(useAuthStore).mockReturnValue(createAuthStoreMock({ currentSite }) as any);

      const vm = mountLinkUsers().vm as any;
      await vm.onFileUpload(mockFileUploadEvent(VALID_CSV));
      expect(vm.validatedData).not.toBeNull();

      vm.isSubmitting = true;
      currentSite.value = 'different-site';
      await nextTick();

      expect(vm.validatedData).not.toBeNull();
    });
  });

  describe('UI', () => {
    it('disables the CSV uploader when all sites are selected', () => {
      vi.mocked(useAuthStore).mockReturnValue(
        createAuthStoreMock({ currentSite: ref('any'), currentSiteName: ref('') }) as any,
      );

      const wrapper = mountLinkUsers();
      const vm = wrapper.vm as any;

      expect(vm.isAllSitesSelected).toBe(true);

      const csvUploader = wrapper.findComponent({ name: 'CsvUploader' });
      expect(csvUploader.exists()).toBe(true);
      expect(csvUploader.props('disabled')).toBe(true);
    });

    it('passes the validated rows to the rows datatable', async () => {
      const wrapper = mountLinkUsers();
      const vm = wrapper.vm as any;

      await vm.onFileUpload(mockFileUploadEvent(VALID_CSV));
      await nextTick();

      const csvTable = wrapper.findComponent({ name: 'CsvTable' });
      expect(csvTable.exists()).toBe(true);
      expect(csvTable.props('rows')).toEqual(vm.validatedData);
    });
  });
});
