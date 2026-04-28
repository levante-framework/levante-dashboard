<template>
  <main class="container main">
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
        <div v-if="newUsers && !validationErrors" class="mb-3">
          <CsvTable :keys="['id', 'userType', 'month', 'year', 'school', 'class', 'cohort']" :rows="newUsers" />

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

    <!-- Bulk create users modal -->
    <PvDialog
      v-model:visible="showBulkCreateUsersModal"
      modal
      header="Creating users"
      :closable="false"
      :close-on-escape="false"
      :draggable="false"
      :style="{ width: 'min(32rem, 90vw)' }"
      data-cy="dialog-bulk-create-users"
    >
      <div class="flex flex-column align-items-center gap-3 py-4">
        <AppSpinner />
        <p class="m-0 text-center text-gray-700 line-height-3">
          This step runs on the server and can take several minutes for large files. Please keep this tab open until it
          finishes.
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
import { computed, nextTick, ref, toRaw, watch } from 'vue';
import { useRouter } from 'vue-router';
import type { ZodIssue } from 'zod'; // @TODO: replace this w/ makeCustomIssue when published
import {
  AddUserCsvHeaderSchema,
  UserCsvSchema,
  UserCsvType,
  combineUserCsvIssues,
} from '@levante-framework/levante-zod';
import AppSpinner from '@/components/AppSpinner.vue';
import CsvTable from '@/components/CsvTable.vue';
import CsvUploader from '@/components/CsvUploader.vue';
import AddUsersInfo from '@/components/userInfo/AddUsersInfo.vue';
import { NORMALIZED_USER_CSV_HEADERS, USER_CSV_HEADERS } from '@/constants/csv';
import { CreateUsersPayload, usersRepository } from '@/firebase/repositories/UsersRepository';
import { normalizeToLowercase } from '@/helpers';
import { parseCsvFile, unparseCsvFile } from '@/helpers/csv';
import { fetchOrgByName } from '@/helpers/query/orgs';
import { normalizeUserTypeForBackend } from '@/helpers/userType';
import { logger } from '@/logger';
import { useAuthStore } from '@/store/auth';
import { useLevanteStore } from '@/store/levante';

const authStore = useAuthStore();
const { currentSite, currentSiteName } = storeToRefs(authStore);
const isAllSitesSelected = computed(() => currentSite.value === 'any');

const levanteStore = useLevanteStore();
const { hasUserConfirmed } = storeToRefs(levanteStore);
const { setHasUserConfirmed, setShouldUserConfirm } = levanteStore;

const router = useRouter();

const isSubmitting = ref(false);
const parsedData = ref<Record<string, string>[] | null>(null);
const registeredUsers = ref<UserCsvType | null>(null);
const showBulkCreateUsersModal = ref(false);
const status = ref<{ message: string; severity: string } | null>(null);
const statusRef = ref<HTMLElement | null>(null);
const uploadedFile = ref<File | null>(null);
const validatedData = ref<UserCsvType | null>(null);
const validationErrors = ref<{
  headers: string[];
  keys: string[];
  rows: Record<string, unknown>[];
  showDownloadButton: boolean;
} | null>(null);

const newUsers = computed(() => {
  return validatedData.value?.filter((user) => {
    return !user.uid || user.uid === '';
  });
});

const resetUserProgress = () => {
  isSubmitting.value = false;
  parsedData.value = null;
  registeredUsers.value = null;
  showBulkCreateUsersModal.value = false;
  status.value = null;
  uploadedFile.value = null;
  validatedData.value = null;
  validationErrors.value = null;

  // Reset user confirmation
  setHasUserConfirmed(false);
};

watch(hasUserConfirmed, (userConfirmed) => {
  if (userConfirmed) resetUserProgress();
});

watch(
  [status],
  () => {
    // Scroll to bottom of page after datatable is displayed
    // NB: nextTick ensures datatable is rendered before scroll
    nextTick(() => {
      statusRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  },
  { deep: true },
);

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
  setShouldUserConfirm(true); // Wait for user confirmation before changing the selected site

  // Parse the file
  const _parsedData = await parseCsvFile(file, {
    normalizedHeaders: NORMALIZED_USER_CSV_HEADERS,
    omitColumns: ['errors'],
  });
  if (!_parsedData) {
    status.value = {
      message:
        'The uploaded file could not be read. If you used a spreadsheet app, please "Save as" or "Export" to CSV and upload again.',
      severity: 'error',
    };
    return;
  }
  if (_parsedData.length === 0) {
    status.value = { message: 'The uploaded file contains no users. Please add at least one user and upload again.', severity: 'error' };
    return;
  }
  parsedData.value = _parsedData;

  // Validate all required headers are present
  const headers = Object.keys(_parsedData[0] ?? {});
  const headerValidation = AddUserCsvHeaderSchema.safeParse(headers);
  if (!headerValidation.success) {
    status.value = { message: 'The uploaded file is invalid. See table for details.', severity: 'error' };
    validationErrors.value = {
      headers: ['Validation Errors'],
      keys: ['message'],
      rows: headerValidation.error.issues.map((issue) => {
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
    _parsedData.forEach((row, idx) => {
      // Must match the selected site
      if (row.site && row.site !== currentSiteName.value) {
        siteIssues.push({
          code: 'custom',
          message: `Must match the selected site`,
          path: [idx, 'site'],
          input: row.site,
        });
      }
    });
  }

  // Validate w/ zod schema
  const validated = UserCsvSchema.safeParse(_parsedData);
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

  // Validation succeeded
  validatedData.value = validated.data!;
  status.value = {
    message: 'File successfully uploaded. See table for summary of users to be added.',
    severity: 'success',
  };
};

const downloadErrors = () => {
  if (!parsedData.value || !validationErrors.value) return;

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

  const csv = unparseCsvFile(mapped);

  // Initiate download
  downloadCSV(URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })), 'add-users-errors.csv');
};

const downloadCSV = (csvUrl: string, filename = 'registered-users.csv') => {
  // Create Download Link
  const link = document.createElement('a');
  link.setAttribute('href', csvUrl);
  link.setAttribute('download', filename);
  document.body.appendChild(link); // Required for Firefox

  // Trigger the Download
  link.click();

  // Cleanup
  document.body.removeChild(link);
};

const submitUsers = async () => {
  isSubmitting.value = true;

  // Ensure the user data is valid
  if (validationErrors.value || !validatedData.value) {
    status.value = { message: 'Please fix the errors in your CSV file before submitting.', severity: 'error' };
    isSubmitting.value = false;
    return;
  }

  // Ensure a site is selected
  const selectedSiteId = currentSite.value;
  if (!selectedSiteId || isAllSitesSelected.value) {
    status.value = { message: 'Please select a site before adding users.', severity: 'error' };
    isSubmitting.value = false;
    return;
  }

  // Ensure there are users to be registered (those with empty uid)
  const usersToBeRegistered = _cloneDeep(toRaw(validatedData.value))
    .map((user, idx) => ({
      user: { ...user },
      userIdx: idx,
    }))
    .filter(({ user }) => !user.uid || user.uid === '');
  if (usersToBeRegistered.length === 0) {
    status.value = { message: 'All users in the file have already been registered.', severity: 'info' };
    isSubmitting.value = false;
    return;
  }

  // Ensure the orgs referenced in the user data exist
  const getOrgId = createOrgIdResolver();
  const usersWithErrors: { field: string; message: string; value: string }[] = [];
  for (const { user } of usersToBeRegistered) {
    const orgInfo: Record<'sites' | 'schools' | 'classes' | 'cohorts', string[]> = {
      sites: [selectedSiteId],
      schools: [],
      classes: [],
      cohorts: [],
    };

    // Get firestore ids for schools
    for (const schoolName of user.school) {
      try {
        const schoolId = await getOrgId('schools', schoolName, selectedSiteId);
        orgInfo.schools.push(schoolId);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        usersWithErrors.push({
          field: 'school',
          message,
          value: schoolName,
        });
      }
    }

    // Get firestore ids for classes
    for (const className of user.class) {
      let classFound = false;
      for (const schoolId of orgInfo.schools) {
        try {
          const classId = await getOrgId('classes', className, selectedSiteId, schoolId);
          orgInfo.classes.push(classId);
          classFound = true;
          break;
        } catch {
          continue;
        }
      }
      if (!classFound) {
        usersWithErrors.push({
          field: 'class',
          message: `Does not exist in selected site`,
          value: className,
        });
      }
    }

    // Get firestore ids for cohorts
    for (const cohortName of user.cohort) {
      try {
        const cohortId = await getOrgId(
          'groups', // NB: the backend expects groups for cohorts
          cohortName,
          selectedSiteId,
        );
        orgInfo.cohorts.push(cohortId);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        usersWithErrors.push({
          field: 'cohort',
          message: message,
          value: cohortName,
        });
      }
    }

    // The backend expects districts and groups for site and cohort respectively
    user.orgIds = {
      districts: orgInfo.sites,
      schools: orgInfo.schools,
      classes: orgInfo.classes,
      groups: orgInfo.cohorts,
    };
  }
  if (usersWithErrors.length > 0) {
    const orgErrors: Record<string, string[]> = {};
    usersWithErrors.forEach(({ field, message, value }) => {
      const key = `${field}: ${message}`;
      if (!orgErrors[key]) {
        orgErrors[key] = [];
      }
      if (!orgErrors[key].includes(value)) {
        orgErrors[key].push(value);
      }
    });
    status.value = { message: 'Please fix the errors in your CSV file before submitting.', severity: 'error' };
    validationErrors.value = {
      headers: ['Validation Errors', 'Affected Values'],
      keys: ['message', 'value'],
      rows: Object.entries(orgErrors).map(([message, value]) => ({ message, value: value.join(', ') })),
      showDownloadButton: false,
    };
    isSubmitting.value = false;
    return;
  }

  // Chunk and run: Not a transactional operation so partial success is possible
  // TODO: Add some retry operations to handle partial successes
  // @AB: This operation MUST be a transaction. E.g., if one chunk succeeds, one fails, and then the user
  // resubmits the file, the backend cannot know which users were successfully created and which failed
  // because `id` is not stored.
  showBulkCreateUsersModal.value = true;
  try {
    const chunkResults = (await runWithConcurrency(_chunk(usersToBeRegistered, 25), async (chunk) => {
      // Ensure each user has the proper userType field name for the backend
      const processedUsers = chunk.map(({ user }) => {
        const processedUser: Record<string, unknown> = { ...user };

        // Find the userType field (case-insensitive)
        const userTypeField = Object.keys(user).find((key) => key.toLowerCase() === 'usertype');

        // Ensure the key is exactly 'userType' and handle potential casing issues
        if (userTypeField) {
          const userTypeValue = user[userTypeField];
          // Set the key to 'userType' regardless of original casing
          processedUser.userType = userTypeValue;
          // Remove the original field if the casing was different
          if (userTypeField !== 'userType') {
            delete processedUser[userTypeField];
          }

          if (typeof userTypeValue === 'string') {
            processedUser.userType = normalizeUserTypeForBackend(userTypeValue);
          }
        }

        return processedUser;
      });

      const createUsersPayload: CreateUsersPayload = {
        users: processedUsers,
        siteId: selectedSiteId,
      };

      return await usersRepository.createUsers(createUsersPayload);
    })) as { status: string; message: string; data: Record<string, string>[] }[];

    const createUserResults = chunkResults.flatMap((result) => {
      if (result == null || typeof result !== 'object') return [];
      const payload = result.data !== undefined ? result.data : result;
      if (Array.isArray(payload)) return payload;
      if (payload && typeof payload === 'object' && Array.isArray(payload.data)) return payload.data;
      return [];
    });

    // Merging the registered users with the validated data
    // assuming the order of the registered users is the same as the order of usersToBeRegistered
    // TODO: the response of the create user should come back with an id
    // that can be mapped to validatedData
    const mergedUsers = _cloneDeep(toRaw(validatedData.value));
    createUserResults.forEach((createdUser, resultIdx) => {
      const userIdx = usersToBeRegistered[resultIdx]!.userIdx;
      mergedUsers[userIdx] = {
        ...mergedUsers[userIdx]!,
        email: createdUser.email ?? '',
        password: createdUser.password ?? '',
        uid: createdUser.uid ?? '',
      };
    });
    registeredUsers.value = mergedUsers;
    status.value = { message: 'Users created successfully.', severity: 'success' };
    downloadRegisteredUsers();
  } catch (error) {
    logger.error('Error Registering Users', { error });
    const message = error instanceof Error ? error.message : String(error);
    status.value = { message: `Error creating users: ${message}`, severity: 'error' };
  } finally {
    isSubmitting.value = false;
    showBulkCreateUsersModal.value = false;
  }
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

  // @TODO: Refactor this to use a firebase function instead of a direct firestore SDK call
  const getOrgId: GetOrgId = async (orgType, orgName, parentDistrictId, parentSchoolId) => {
    const normalizedOrgName = normalizeToLowercase(orgName);

    // Include parent IDs in cache key to avoid cross-site conflicts
    let cacheKey = normalizedOrgName;
    if (parentDistrictId) cacheKey += `__${parentDistrictId}`;
    if (parentSchoolId) cacheKey += `__${parentSchoolId}`;

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

/**
 * Runs parallel workers on chunks of data.
 * @param chunks The data chunks to process.
 * @param worker The function to run on each chunk.
 * @param limit The maximum number of concurrent workers.
 * @returns The worker results.
 */
const runWithConcurrency = async <T, R>(
  chunks: T[],
  worker: (chunk: T) => Promise<R>,
  limit: number = 2,
): Promise<R[]> => {
  const results = new Array(chunks.length);
  let nextIdx = 0;

  async function runner() {
    while (nextIdx < chunks.length) {
      const currentIdx = nextIdx;
      nextIdx = nextIdx + 1;
      results[currentIdx] = await worker(chunks[currentIdx]!);
    }
  }

  const runnerCount = Math.min(limit, chunks.length);
  const runners = Array.from({ length: runnerCount }, () => runner());

  await Promise.all(runners);

  return results;
};

const downloadRegisteredUsers = () => {
  if (!registeredUsers.value || registeredUsers.value.length === 0) return;

  // Convert objects to CSV string
  const csvString = unparseCsvFile(toRaw(registeredUsers.value), USER_CSV_HEADERS);

  // Initiate download
  downloadCSV(URL.createObjectURL(new Blob([csvString], { type: 'text/csv;charset=utf-8;' })));
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
