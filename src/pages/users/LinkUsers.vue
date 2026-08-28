<template>
  <main class="container main">
    <section class="main-body">
      <LinkUsersInfo />

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
          disabledMessage="Select a site to link users"
          data-cy="upload-link-users-csv"
          @upload="onFileUpload"
        />

        <!-- Errors datatable -->
        <div v-if="validationErrors" class="mb-3">
          <CsvTable :headers="validationErrors.headers" :keys="validationErrors.keys" :rows="validationErrors.rows" />
          <PvButton v-if="validationErrors.showDownloadButton" label="Download Error CSV" @click="downloadErrors" />
        </div>

        <!-- Rows datatable -->
        <div v-if="validatedData && !validationErrors" class="mb-3">
          <CsvTable
            :keys="['id', 'userType', 'caregiverId', 'teacherId', 'uid']"
            :rows="validatedData"
          />

          <div class="submit-container">
            <PvButton
              v-tooltip.bottom="isAllSitesSelected ? 'Please select a specific site to link users' : ''"
              :label="isSubmitting ? 'Linking Users' : 'Link Users from Uploaded File'"
              :icon="isSubmitting ? 'pi pi-spin pi-spinner' : ''"
              :disabled="isSubmitting || isAllSitesSelected"
              data-cy="button-link-users-submit"
              @click="submitUsers"
            />
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import {
  combineUsersCsvIssues,
  type LinkUsersCsv,
  LinkUsersCsvHeaderSchema,
  LinkUsersCsvSchema,
  LinkUsersParamsSchema,
  makeCustomIssue,
  type ZodIssue,
} from '@levante-framework/levante-zod';
import _cloneDeep from 'lodash/cloneDeep';
import { storeToRefs } from 'pinia';
import PvButton from 'primevue/button';
import PvDivider from 'primevue/divider';
import type { FileUploadUploaderEvent } from 'primevue/fileupload';
import PvMessage from 'primevue/message';
import { computed, nextTick, ref, toRaw, watch } from 'vue';
import CsvTable from '@/components/CsvTable.vue';
import CsvUploader from '@/components/CsvUploader.vue';
import LinkUsersInfo from '@/components/userInfo/LinkUsersInfo.vue';
import useLinkUsersMutation from '@/composables/mutations/useLinkUsersMutation';
import { NORMALIZED_USER_CSV_HEADERS } from '@/constants/csv';
import { normalizeToLowercase } from '@/helpers';
import { deriveNextCsvFilename, downloadCsv, parseCsvFile, unparseCsvFile } from '@/helpers/csv';
import { logger } from '@/logger';
import { useAuthStore } from '@/store/auth';
import { useLevanteStore } from '@/store/levante';

const authStore = useAuthStore();
const { currentSite, currentSiteName } = storeToRefs(authStore);
const isAllSitesSelected = computed(() => currentSite.value === 'any');
const selectedSiteId = computed(() => currentSite.value ?? '');

const levanteStore = useLevanteStore();
const { setShouldUserConfirm } = levanteStore;

const { mutate: linkUsers } = useLinkUsersMutation();

const isSubmitting = ref(false);
const parsedData = ref<Record<string, string>[] | null>(null);
const status = ref<{ message: string; severity: string } | null>(null);
const statusRef = ref<HTMLElement | null>(null);
const uploadedFile = ref<File | null>(null);
const validatedData = ref<LinkUsersCsv | null>(null);
const validationErrors = ref<{
  headers: string[];
  keys: string[];
  rows: Record<string, unknown>[];
  showDownloadButton: boolean;
} | null>(null);

const resetUserProgress = () => {
  isSubmitting.value = false;
  parsedData.value = null;
  status.value = null;
  uploadedFile.value = null;
  validatedData.value = null;
  validationErrors.value = null;

  // Reset user confirmation
  setShouldUserConfirm(false);
};

watch(currentSite, () => {
  if (isSubmitting.value) return;
  resetUserProgress();
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
  const validatedHeaders = LinkUsersCsvHeaderSchema.safeParse(headers);
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
  const validated = LinkUsersCsvSchema.safeParse(parsed);
  const issues = combineUsersCsvIssues([...(validated.error?.issues ?? []), ...siteIssues]);
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

  // Filter out children that don't have caregiverId and/or teacherId, and
  // caregivers/teachers that aren't linked to any children
  const adultIds = new Set<string>();
  const filtered = validated
    .data!.filter((user) => {
      if (user.userType === 'child') {
        if (!user.caregiverId.length && !user.teacherId.length) {
          return false;
        }
        user.caregiverId.forEach((id) => {
          adultIds.add(id);
        });
        user.teacherId.forEach((id) => {
          adultIds.add(id);
        });
      }
      return true;
    })
    .filter((user) => {
      if (user.userType !== 'child') {
        return adultIds.has(user.id);
      }
      return true;
    });
  if (!filtered.length) {
    status.value = {
      message: 'At least one child row must include a caregiverId and/or a teacherId to link users.',
      severity: 'error',
    };
    return;
  }

  // Validation succeeded
  validatedData.value = filtered;
  status.value = {
    message: 'File successfully uploaded. See table for summary of users to be linked.',
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
  console.log('submitUsers', validatedData.value);

  // Ensure the user data is valid
  if (!validatedData.value) {
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

  // Prepare the parameters for the linkUsers request
  const users = _cloneDeep(toRaw(validatedData.value));
  const params = LinkUsersParamsSchema.safeParse({
    siteId,
    users: users.map((user) => ({
      userType: user.userType,
      id: user.id,
      uid: user.uid,
      ...(user.userType === 'child' ? { caregiverId: user.caregiverId } : {}),
      ...(user.userType === 'child' ? { teacherId: user.teacherId } : {}),
    })),
  });
  if (!params.success) {
    logger.error(
      new Error('LinkUsersParamsSchema parse failed unexpectedly', {
        cause: params.error,
      }),
      {
        tags: {
          component: 'LinkUsers',
        },
      },
    );
    status.value = { message: 'An unexpected error occurred. Please contact support.', severity: 'error' };
    isSubmitting.value = false;
    return;
  }

  // TODO: improve error handling
  linkUsers(params.data, {
    onError: (error) => {
      logger.error(new Error('Failed to link users', { cause: error }), {
        tags: {
          component: 'LinkUsers',
          code: error && typeof error === 'object' && 'code' in error ? String(error.code) : 'unknown',
        },
        siteId,
        userCount: params.data.users.length,
      });
      status.value = { message: 'Failed to link users. Please try again.', severity: 'error' };
      isSubmitting.value = false;
    },
    onSuccess: () => {
      resetUserProgress();
      status.value = { message: 'Users linked successfully.', severity: 'success' };
    },
  });
};
</script>

<style scoped>
.navbar-offset {
  scroll-margin-top: var(--navbar-height, 5rem);
}

.submit-container {
  margin-top: 1rem;
}
</style>
