<template>
  <LevanteSpinner v-if="isLoadingSyncStatus" fullscreen />
  <main v-else-if="isSyncStatusError" class="container main">
    <section class="main-body">
      <PvMessage :closable="false" severity="error" icon="pi pi-exclamation-circle">
        Unable to load sync status. Please refresh the page. If the problem persists, contact support.
      </PvMessage>
    </section>
  </main>
  <main v-else class="container main">
    <section class="main-body">
      <AddUsersInfo />

      <PvDivider class="my-5" />

      <!-- Status message -->
      <div class="navbar-offset" ref="statusRef">
        <PvMessage
          v-if="status"
          class="mb-3"
          :closable="false"
          :icon="status.severity === 'success' ? 'pi pi-check-circle' : 'pi pi-exclamation-circle'"
          :pt="{ transition: { css: false, appear: false } }"
          :severity="status.severity"
        >
          {{ status.message }}
        </PvMessage>
      </div>

      <div class="m-0 mb-3 p-3 pb-0 bg-gray-100 border-1 border-gray-200 border-round">
        <!-- CSV uploader -->
        <CsvUploader
          :disabled="isAllSitesSelected"
          :uploadedFile="uploadedFile"
          disabledMessage="Select a site to add users"
          data-cy="upload-add-users-csv"
          @upload="onFileUpload"
        />

        <!-- Errors datatable -->
        <div v-if="validationErrors" class="mb-3">
          <CsvTable :headers="validationErrors.headers" :keys="validationErrors.keys" :rows="validationErrors.rows" />
          <PvButton v-if="validationErrors.showDownloadButton" label="Download Error CSV" @click="downloadErrors" />
        </div>

        <!-- Rows datatable -->
        <div v-if="unregisteredUsers && !validationErrors" class="mb-3">
          <CsvTable
            :keys="['id', 'userType', 'month', 'year', 'school', 'class', 'cohort']"
            :rows="unregisteredUsers"
          />

          <div class="submit-container">
            <div v-if="registeredUsers" class="button-group">
              <PvButton label="Continue to Link Users" icon="pi pi-link" @click="router.push({ name: 'Link Users' })" />
              <PvButton
                label="Download Users"
                icon="pi pi-download"
                variant="outlined"
                class="download-button"
                data-cy="button-download-users"
                @click="downloadRegisteredUsers"
              />
            </div>
            <PvButton
              v-else
              v-tooltip.bottom="isAllSitesSelected ? 'Please select a specific site to add users' : ''"
              :label="isSubmitting ? 'Adding Users' : 'Add Users from Uploaded File'"
              :icon="isSubmitting ? 'pi pi-spin pi-spinner' : ''"
              :disabled="isSubmitting || isAllSitesSelected"
              data-testid="start-adding-button"
              data-cy="button-add-users-from-file"
              @click="submitUsers"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- Sync pending modal -->
    <PvDialog
      :visible="showSyncPendingModal || hasPendingSyncStatus"
      modal
      header="Updating users..."
      :closable="false"
      :close-on-escape="false"
      :draggable="false"
      :style="{ width: 'min(32rem, 90vw)' }"
      data-cy="dialog-bulk-create-users"
    >
      <div class="flex flex-column align-items-center gap-3 py-4">
        <AppSpinner />
        <p class="m-0 text-center text-gray-700 line-height-3">
          This step runs on the server and can take several minutes for sites with many users or many assignments.
        </p>
      </div>
    </PvDialog>
  </main>
</template>

<script setup lang="ts">
import _chunk from 'lodash/chunk';
import _cloneDeep from 'lodash/cloneDeep';
import { storeToRefs } from 'pinia';
import PvButton from 'primevue/button';
import PvDialog from 'primevue/dialog';
import PvDivider from 'primevue/divider';
import type { FileUploadUploaderEvent } from 'primevue/fileupload';
import PvMessage from 'primevue/message';
import { useToast } from 'primevue/usetoast';
import { useQueryClient } from '@tanstack/vue-query';
import { computed, nextTick, ref, toRaw, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  AddUserCsvHeaderSchema,
  CreateUsersParamsSchema,
  UserCsvSchema,
  UserCsvType,
  combineUserCsvIssues,
  makeCustomIssue,
  type ZodIssue,
} from '@levante-framework/levante-zod';
import AppSpinner from '@/components/AppSpinner.vue';
import CsvTable from '@/components/CsvTable.vue';
import CsvUploader from '@/components/CsvUploader.vue';
import LevanteSpinner from '@/components/LevanteSpinner.vue';
import AddUsersInfo from '@/components/userInfo/AddUsersInfo.vue';
import useSignOutMutation from '@/composables/mutations/useSignOutMutation';
import { useGetSyncStatusQuery } from '@/composables/queries/useGetSyncStatusQuery';
import { NORMALIZED_USER_CSV_HEADERS, USER_CSV_HEADERS } from '@/constants/csv';
import { SITE_OVERVIEW_QUERY_KEY, SYNC_STATUS_QUERY_KEY } from '@/constants/queryKeys';
import { TOAST_DEFAULT_LIFE_DURATION, TOAST_SEVERITIES } from '@/constants/toasts';
import { normalizeToLowercase } from '@/helpers';
import { deriveNextCsvFilename, downloadCsv, parseCsvFile, unparseCsvFile } from '@/helpers/csv';
import { fetchOrgByName } from '@/helpers/query/orgs';
import { logger } from '@/logger';
import { useAuthStore } from '@/store/auth';
import { useLevanteStore } from '@/store/levante';

const authStore = useAuthStore();
const { currentSite, currentSiteName, roarfirekit } = storeToRefs(authStore);
const isAllSitesSelected = computed(() => currentSite.value === 'any');
const selectedSiteId = computed(() => currentSite.value ?? '');

const {
  data: syncStatus,
  isLoading: isLoadingSyncStatus,
  isError: isSyncStatusError,
} = useGetSyncStatusQuery(selectedSiteId, () => !isAllSitesSelected.value);
const hasPendingSyncStatus = computed(
  () => !!syncStatus.value && (syncStatus.value.assignments.pending > 0 || syncStatus.value.users.pending > 0),
);

const levanteStore = useLevanteStore();
const { setShouldUserConfirm } = levanteStore;

// @TODO: createUsers is called directly rather than through a mutation composable (unlike
// useUpsertAdministrationMutation etc.), so cache invalidation has to be done manually here
// instead of in onSuccess. Consider implementing useCreateUsersMutation composable.
const queryClient = useQueryClient();

const router = useRouter();

const { mutate: signOut } = useSignOutMutation();

const toast = useToast();

const isSubmitting = ref(false);
const parsedData = ref<Record<string, string>[] | null>(null);
const registeredUsers = ref<UserCsvType | null>(null);
const showSyncPendingModal = ref(false);
const status = ref<{ message: string; severity: string } | null>(null);
const statusRef = ref<HTMLElement | null>(null);
const unregisteredToValidated = ref<number[] | null>(null);
const unregisteredUsers = ref<UserCsvType | null>(null);
const uploadedFile = ref<File | null>(null);
const validatedData = ref<UserCsvType | null>(null);
const validationErrors = ref<{
  headers: string[];
  keys: string[];
  rows: Record<string, unknown>[];
  showDownloadButton: boolean;
} | null>(null);

const resetUserProgress = () => {
  isSubmitting.value = false;
  parsedData.value = null;
  registeredUsers.value = null;
  showSyncPendingModal.value = false;
  status.value = null;
  unregisteredToValidated.value = null;
  unregisteredUsers.value = null;
  uploadedFile.value = null;
  validatedData.value = null;
  validationErrors.value = null;

  // Reset user confirmation
  setShouldUserConfirm(false);
};

async function invalidateSyncStatus() {
  await queryClient.invalidateQueries({ queryKey: [SYNC_STATUS_QUERY_KEY, selectedSiteId.value] });
}

watch(currentSite, () => {
  if (isSubmitting.value) return;
  resetUserProgress();
});

watch(hasPendingSyncStatus, (isPending) => {
  if (!isPending) showSyncPendingModal.value = false;
});

watch(status, () => {
  // Scroll to bottom of page after datatable is displayed
  // NB: nextTick ensures datatable is rendered before scroll
  nextTick(() => {
    statusRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

const onFileUpload = async (event: FileUploadUploaderEvent) => {
  // Reset all error states and data
  resetUserProgress();

  // Read the file (if multiple files, use the last one)
  const files = Array.isArray(event.files) ? event.files : [event.files];
  const file = files[files.length - 1];
  if (!file) {
    status.value = { message: 'No file uploaded.', severity: 'error' };
    return;
  }
  uploadedFile.value = file;

  // Parse the file
  const parsed = await parseCsvFile(file, {
    normalizedHeaders: NORMALIZED_USER_CSV_HEADERS,
    omitColumns: ['errors'],
  });
  if (!parsed) {
    status.value = {
      message:
        'The uploaded file could not be read. If you used a spreadsheet app, please "Save as" or "Export" to CSV and upload again.',
      severity: 'error',
    };
    return;
  }
  if (parsed.length === 0) {
    status.value = {
      message: 'The uploaded file contains no users. Please add at least one user and upload again.',
      severity: 'error',
    };
    return;
  }
  parsedData.value = parsed;

  // Validate all required headers are present
  const headers = Object.keys(parsed[0] ?? {});
  const validatedHeaders = AddUserCsvHeaderSchema.safeParse(headers);
  if (!validatedHeaders.success) {
    status.value = { message: 'The uploaded file is invalid. See table for details.', severity: 'error' };
    validationErrors.value = {
      headers: ['Validation Errors'],
      keys: ['message'],
      rows: validatedHeaders.error.issues.map((issue) => {
        return {
          message: `${issue.path.join('.')}: ${issue.message}`,
        };
      }),
      showDownloadButton: false,
    };
    return;
  }

  // Validate site column, if present
  const siteIssues: ZodIssue[] = [];
  if (headers.includes('site')) {
    const normalizedSelectedSite = normalizeToLowercase(currentSiteName.value ?? '');
    parsed.forEach((row, idx) => {
      // Must match the selected site
      if (row.site && normalizeToLowercase(row.site) !== normalizedSelectedSite) {
        siteIssues.push(
          makeCustomIssue({
            input: row.site,
            message: `Must match the selected site`,
            path: [idx, 'site'],
          }),
        );
      }
    });
  }

  // Validate w/ zod schema
  const validated = UserCsvSchema.safeParse(parsed);
  const issues = combineUserCsvIssues([...(validated.error?.issues ?? []), ...siteIssues]);
  if (issues.length > 0) {
    // Validation failed
    status.value = { message: 'The uploaded file is invalid. See table for details.', severity: 'error' };
    validationErrors.value = {
      headers: ['Validation Errors', 'Affected Rows'],
      keys: ['message', 'rowNums'],
      rows: issues,
      showDownloadButton: true,
    };
    return;
  }

  // Validation succeeded, filter out users that already have a uid
  const unregistered = validated
    .data!.map((user, idx) => ({
      user,
      validatedIdx: idx,
    }))
    .filter(({ user }) => {
      return !user.uid;
    });
  if (unregistered.length === 0) {
    status.value = { message: 'All users in the file have already been registered.', severity: 'info' };
    return;
  }
  unregisteredUsers.value = unregistered.map(({ user }) => user);
  unregisteredToValidated.value = unregistered.map(({ validatedIdx }) => validatedIdx);

  // There are new, valid users to be added
  validatedData.value = validated.data!;
  status.value = {
    message: 'File successfully uploaded. See table for summary of users to be added.',
    severity: 'success',
  };

  // Set flag to ask user before changing the selected site
  setShouldUserConfirm(true);
};

const downloadErrors = () => {
  if (!parsedData.value || !validationErrors.value || !uploadedFile.value) return;

  // Map errors column to the rows
  const data = toRaw(parsedData.value);
  const errors = validationErrors.value.rows as { message: string; rowNums: number[] }[];
  const mapped: Record<string, string>[] = data.map((row, idx) => {
    const rowErrors: string[] = [];
    errors.forEach((error) => {
      if (error.rowNums.includes(idx + 2)) {
        rowErrors.push(error.message);
      }
    });
    return {
      ...row,
      errors: rowErrors.join('; '),
    };
  });

  // Download the Error CSV file
  const csv = unparseCsvFile(mapped);
  const filename = deriveNextCsvFilename(uploadedFile.value.name, { suffix: 'errors', timestamp: new Date() });
  downloadCsv(csv, filename);
};

const submitUsers = async () => {
  isSubmitting.value = true;

  // Ensure the user data is valid
  if (
    !unregisteredUsers.value ||
    !unregisteredToValidated.value ||
    unregisteredUsers.value.length !== unregisteredToValidated.value.length ||
    !validatedData.value
  ) {
    status.value = { message: 'Please fix the errors in your CSV file before submitting.', severity: 'error' };
    isSubmitting.value = false;
    return;
  }

  // Ensure a site is selected
  const siteId = selectedSiteId.value;
  if (!siteId || isAllSitesSelected.value) {
    status.value = { message: 'Please select a site before adding users.', severity: 'error' };
    isSubmitting.value = false;
    return;
  }

  // Clone the unregistered users and map their validated indices
  const unregistered = _cloneDeep(toRaw(unregisteredUsers.value)).map((user, idx) => ({
    user,
    validatedIdx: unregisteredToValidated.value![idx]!,
  }));

  // Ensure the orgs referenced in the user data exist
  type OrgIds = {
    sites: string[];
    schools: string[];
    classes: string[];
    cohorts: string[];
  };
  const orgIdsPerUser: OrgIds[] = [];
  const orgErrors: { field: string; validatedIdx: number }[] = [];
  const getOrgId = createOrgIdResolver();
  for (const { user, validatedIdx } of unregistered) {
    const orgIds: OrgIds = {
      sites: [siteId],
      schools: [],
      classes: [],
      cohorts: [],
    };

    // Get firestore ids for schools
    let allSchoolsFound = true;
    for (const schoolName of user.school) {
      try {
        const schoolId = await getOrgId('schools', schoolName, siteId);
        orgIds.schools.push(schoolId);
      } catch {
        allSchoolsFound = false;
        orgErrors.push({
          field: 'school',
          validatedIdx,
        });
      }
    }

    // Get firestore ids for classes
    if (allSchoolsFound) {
      for (const className of user.class) {
        let classFound = false;
        for (const schoolId of orgIds.schools) {
          try {
            const classId = await getOrgId('classes', className, siteId, schoolId);
            orgIds.classes.push(classId);
            classFound = true;
            break;
          } catch {
            continue;
          }
        }
        if (!classFound) {
          orgErrors.push({
            field: 'class',
            validatedIdx,
          });
        }
      }
    }

    // Get firestore ids for cohorts
    for (const cohortName of user.cohort) {
      try {
        const cohortId = await getOrgId(
          'groups', // NB: the backend expects groups for cohorts
          cohortName,
          siteId,
        );
        orgIds.cohorts.push(cohortId);
      } catch {
        orgErrors.push({
          field: 'cohort',
          validatedIdx,
        });
      }
    }

    orgIdsPerUser.push(orgIds);
  }
  if (orgErrors.length > 0) {
    const combinedOrgErrors: Record<string, number[]> = {};
    orgErrors.forEach(({ field, validatedIdx }) => {
      const key = `${field}: Does not exist in selected site`;
      const rowNum = validatedIdx + 2; // +2 for header row and 1-indexing
      if (!combinedOrgErrors[key]) {
        combinedOrgErrors[key] = [];
      }
      if (!combinedOrgErrors[key].includes(rowNum)) {
        combinedOrgErrors[key].push(rowNum);
      }
    });
    status.value = { message: 'Please fix the errors in your CSV file before submitting.', severity: 'error' };
    validationErrors.value = {
      headers: ['Validation Errors', 'Affected Rows'],
      keys: ['message', 'rowNums'],
      rows: Object.entries(combinedOrgErrors).map(([message, rowNums]) => ({ message, rowNums })),
      showDownloadButton: true,
    };
    isSubmitting.value = false;
    return;
  }

  // Prepare the parameters for the create users request
  const params = CreateUsersParamsSchema.safeParse({
    siteId,
    users: unregistered.map(({ user }, idx) => ({
      userType: user.userType,
      id: user.id,
      orgIds: orgIdsPerUser[idx],
      month: user.month,
      year: user.year,
    })),
  });
  if (!params.success) {
    logger.error('CreateUsersParamsSchema parse failed unexpectedly', { issues: params.error.issues });
    status.value = { message: 'An unexpected error occurred. Please contact support.', severity: 'error' };
    isSubmitting.value = false;
    return;
  }

  // Make the create users request
  const firekit = roarfirekit.value;
  if (!firekit) {
    status.value = { message: 'Unable to create users. Please refresh the page and try again.', severity: 'error' };
    isSubmitting.value = false;
    return;
  }
  showSyncPendingModal.value = true;

  // Call createUsers firebase function
  const result = await firekit.createUsers(params.data);

  if (result.code === 'success') {
    // Merge the created users with the validated data
    const mergedUsers = _cloneDeep(toRaw(validatedData.value));
    result.data.users.forEach((createdUser) => {
      const validatedIdx = unregistered.find(({ user }) => user.id === createdUser.id)?.validatedIdx;
      if (validatedIdx != null) {
        mergedUsers[validatedIdx] = {
          ...mergedUsers[validatedIdx]!,
          email: createdUser.email ?? '',
          password: createdUser.password ?? '',
          uid: createdUser.uid ?? '',
        };
      } else {
        logger.error('Unexpected created user', { uid: createdUser.uid });
      }
    });
    registeredUsers.value = mergedUsers;

    status.value = { message: 'Users created successfully.', severity: 'success' };
    setShouldUserConfirm(false);
    downloadRegisteredUsers();
    await invalidateSyncStatus();
    await queryClient.invalidateQueries({ queryKey: [SITE_OVERVIEW_QUERY_KEY, siteId] });
  } else if (result.code === 'app-error') {
    const error = result.data;
    if (error.code === 'functions/already-exists') {
      status.value = {
        message: 'One or more users already exist. Please try again with a different file.',
        severity: 'error',
      };
      const rowNumMap = validatedData.value!.reduce(
        (acc, user, idx) => {
          acc[user.id] = idx + 2; // +2 for header row and 1-indexing
          return acc;
        },
        {} as Record<string, number>,
      );
      validationErrors.value = {
        headers: ['Validation Errors', 'Affected Rows'],
        keys: ['message', 'rowNums'],
        rows: [
          {
            message: 'User already exists',
            rowNums: error.details.ids.map((id) => rowNumMap[id]),
          },
        ],
        showDownloadButton: true,
      };
    } else if (error.code === 'functions/failed-precondition') {
      status.value = {
        message: 'The server is working on other tasks. Please try again in a few minutes.',
        severity: 'error',
      };
      await invalidateSyncStatus();
    } else if (error.code === 'functions/permission-denied') {
      status.value = {
        message: 'You do not have permission to add users to this site. Please contact support.',
        severity: 'error',
      };
    } else if (error.code === 'functions/unauthenticated') {
      toast.add({
        severity: TOAST_SEVERITIES.WARN,
        summary: 'Session Expired',
        detail: 'Your session has expired. Please sign in again.',
        life: TOAST_DEFAULT_LIFE_DURATION,
      });
      signOut();
    } else {
      // The remaining app-error cases are unexpected due to preflight validation above.
      // - functions/invalid-argument/schema
      // - functions/invalid-argument/org-site-mismatch
      // - functions/not-found/orgs
      logger.error(new Error(`Unexpected createUsers app-error: ${error.code}/${error.details.code}`), error);
      status.value = {
        message:
          'An unexpected error occurred. Please refresh the page and try again. If the problem persists, contact support.',
        severity: 'error',
      };
    }
  } else {
    if (result.code === 'functions-error' || result.code === 'firebase-error') {
      logger.error(new Error(`Unexpected createUsers ${result.code}: ${result.data.code}`), result.data);
    } else if (result.code === 'error') {
      logger.error(`Unexpected createUsers error: ${result.data.message}`, {
        error: JSON.stringify(result.data, null, 2),
      });
    }
    status.value = { message: 'An unexpected error occurred. Please contact support.', severity: 'error' };
  }

  isSubmitting.value = false;
  showSyncPendingModal.value = false;
};

/**
 * Resolves org IDs by type and name.
 * @param orgType The org type to resolve.
 * @param orgName The org name to resolve.
 * @param parentDistrictId The parent district ID, if applicable.
 * @param parentSchoolId The parent school ID, if applicable.
 * @returns The ID of the org.
 * @throws An error if no org is found for the given type and name.
 */
type GetOrgId = (
  orgType: 'districts' | 'schools' | 'classes' | 'groups',
  orgName: string,
  parentDistrictId?: string,
  parentSchoolId?: string,
) => Promise<string>;

/**
 * Creates a function that resolves org IDs by type and name w/ caching.
 * @returns The org ID resolver.
 */
const createOrgIdResolver = (): GetOrgId => {
  const cache: Record<'districts' | 'schools' | 'classes' | 'groups', Record<string, string>> = {
    districts: {},
    schools: {},
    classes: {},
    groups: {},
  };

  // TODO: Refactor this to use a firebase function instead of a direct firestore SDK call
  const getOrgId: GetOrgId = async (orgType, orgName, parentDistrictId, parentSchoolId) => {
    const normalizedOrgName = normalizeToLowercase(orgName);

    // Include parent IDs in cache key to avoid cross-site conflicts.
    const cacheKey = JSON.stringify([normalizedOrgName, parentDistrictId ?? null, parentSchoolId ?? null]);

    // Check if the org is already in the cache
    if (cache[orgType][cacheKey]) {
      return cache[orgType][cacheKey]!;
    }

    // Fetch the org from the database
    const orgs = (await fetchOrgByName(orgType, normalizedOrgName, parentDistrictId, parentSchoolId)) as {
      id: string;
    }[];
    const orgId = orgs[0]?.id;
    if (!orgId) {
      throw new Error('Does not exist in selected site');
    }

    // Add the org to the cache
    cache[orgType][cacheKey] = orgId;

    return orgId;
  };

  return getOrgId;
};

const downloadRegisteredUsers = () => {
  if (!registeredUsers.value || registeredUsers.value.length === 0 || !uploadedFile.value) return;

  // Download the Registered CSV file
  const csv = unparseCsvFile(toRaw(registeredUsers.value), USER_CSV_HEADERS);
  const filename = deriveNextCsvFilename(uploadedFile.value.name, { suffix: 'registered', timestamp: new Date() });
  downloadCsv(csv, filename);
};
</script>

<style lang="scss" scoped>
.navbar-offset {
  scroll-margin-top: var(--navbar-height, 5rem);
}

.submit-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  align-items: flex-start;
}

.button-group {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1rem;
  width: auto;
}

.download-button {
  &:hover {
    background: var(--primary-color);
    color: white;
  }
}
</style>
