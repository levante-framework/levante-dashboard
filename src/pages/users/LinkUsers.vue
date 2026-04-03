<template>
  <main class="container main">
    <section class="main-body">
      <LinkUsersInfo />

      <PvDivider class="my-5" />
      <PvMessage v-if="validationErrors.length" severity="error" class="mt-3 mb-3">
        <p class="m-0 mb-2">
          There are errors in the file you tried to upload, <code>{{ uploadedFile?.name || 'selected file' }}</code>. Please fix the listed errors and
          try again.
        </p>
        <ul class="m-0 pl-3">
          <li v-for="(error, index) in validationErrors" :key="`${index}-${error}`">
            <span v-html="error"></span>
          </li>
        </ul>
      </PvMessage>

      <PvMessage
        v-if="linkingAttemptError"
        severity="error"
        closable
        class="mt-3 mb-3"
        @close="linkingAttemptError = ''"
      >
        <p class="m-0 mb-2">
          Linking was attempted but did not complete for <code>{{ uploadedFile?.name || 'your file' }}</code>.
        </p>
        <p class="m-0">Error: {{ linkingAttemptError }}</p>
      </PvMessage>

      <PvMessage v-if="lastLinkedFileName" severity="success" closable class="mb-4">
        Linking successful with file <code>{{ lastLinkedFileName }}</code>.
        Click below to upload another file.
      </PvMessage>

      <div class="m-0 mb-5 p-3 bg-gray-100 border-1 border-gray-200 border-round">
        <div class="flex align-items-center gap-3">
          <PvFileUpload
            :choose-label="isFileUploaded && !errorUsers.length ? 'Choose Another CSV File' : 'Choose CSV File'"
            :empty-label="'Test'"
            :show-cancel-button="false"
            :show-upload-button="false"
            :disabled="isAllSitesSelected"
            auto
            accept=".csv"
            custom-upload
            mode="basic"
            name="linkUsersFile[]"
            @uploader="onFileUpload($event)"
          />
          <span v-if="isFileUploaded" class="text-gray-500">File: {{ uploadedFile?.name }}</span>
          <span v-else class="text-gray-500">
            {{ isAllSitesSelected ? 'Select a site to link users' : 'No file chosen' }}
          </span>
        </div>


        <div v-if="isFileUploaded && !errorUsers.length">
          <PvDataTable
            ref="dataTable"
            :value="rawUserFile"
            show-gridlines
            :row-hover="true"
            :resizable-columns="true"
            paginator
            :always-show-paginator="false"
            :rows="10"
            class="datatable"
          >
            <PvColumn v-for="col of allFields" :key="col.field" :field="col.field">
              <template #header>
                <div class="col-header">
                  <b>{{ col.header }}</b>
                </div>
              </template>
              <template #body="{ data }">
                <span>{{ formatPreviewCell(data, col.field) }}</span>
              </template>
            </PvColumn>
          </PvDataTable>

          <div class="submit-container">
            <PvButton
              :label="activeSubmit ? 'Linking Users' : 'Start Linking'"
              :icon="activeSubmit ? 'pi pi-spin pi-spinner' : 'pi pi-link'"
              :disabled="activeSubmit || isAllSitesSelected"
              @click="submitUsers"
            />
          </div>
        </div>
      </div>

      <div v-if="showErrorTable && errorUsers.length" class="error-container">
        <div class="error-header">
          <h3>Rows with Errors</h3>
        </div>
        <PvDataTable
          ref="errorTable"
          :value="errorUsers"
          show-gridlines
          :row-hover="true"
          :resizable-columns="true"
          paginator
          :always-show-paginator="false"
          :rows="10"
          class="datatable"
        >
          <PvColumn v-for="col of errorUserColumns" :key="col.field" :field="col.field">
            <template #header>
              {{ col.header }}
            </template>
          </PvColumn>
        </PvDataTable>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, toRaw, watch, computed } from 'vue';
import { csvFileToJson } from '@/helpers';
import { normalizeUserTypeForBackend } from '@/helpers/userType';
import { useToast } from 'primevue/usetoast';
import { useAuthStore } from '@/store/auth';
import LinkUsersInfo from '@/components/userInfo/LinkUsersInfo.vue';
import PvButton from 'primevue/button';
import PvColumn from 'primevue/column';
import PvDataTable from 'primevue/datatable';
import PvFileUpload from 'primevue/fileupload';
import PvMessage from 'primevue/message';
import _forEach from 'lodash/forEach';
import _startCase from 'lodash/startCase';
import _isEmpty from 'lodash/isEmpty';
import { TOAST_DEFAULT_LIFE_DURATION } from '@/constants/toasts';
import PvDivider from 'primevue/divider';
import { validateLinkUsersCsv, validateCsvHeaders } from '@levante-framework/levante-zod';
import { useLevanteStore } from '@/store/levante';
import { storeToRefs } from 'pinia';

const levanteStore = useLevanteStore();
const { hasUserConfirmed } = storeToRefs(levanteStore);
const { setHasUserConfirmed, setShouldUserConfirm } = levanteStore;
const authStore = useAuthStore();
const { currentSite } = storeToRefs(authStore);
const isAllSitesSelected = computed(() => currentSite.value === 'any');
const toast = useToast();
const isFileUploaded = ref(false);
const uploadedFile = ref(null);
const rawUserFile = ref([]);
const errorUsers = ref([]);
const errorUserColumns = ref([]);
const activeSubmit = ref(false);
const showErrorTable = ref(false);
const validationErrors = ref([]);
const lastLinkedFileName = ref('');
const linkingAttemptError = ref('');

// LINKING
// Required columns: id, userType, uid, caregiverId, teacherId
// Optional columns: school, class, cohort, email

function formatPreviewCell(data, field) {
  const key = Object.keys(data).find((k) => k.toLowerCase() === field.toLowerCase());
  if (key === undefined) return '';
  const val = data[key];
  if (val === null || val === undefined) return '';
  if (Array.isArray(val)) return val.join(', ');
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

const allFields = [
  {
    field: 'id',
    header: 'id',
    dataType: 'string',
  },
  {
    field: 'userType',
    header: 'userType',
    dataType: 'string',
  },
  {
    field: 'caregiverId',
    header: 'caregiverId',
    dataType: 'string',
  },
  {
    field: 'teacherId',
    header: 'teacherId',
    dataType: 'string',
  },
  {
    field: 'school',
    header: 'school',
    dataType: 'string',
  },
  {
    field: 'class',
    header: 'class',
    dataType: 'string',
  },
  {
    field: 'cohort',
    header: 'cohort',
    dataType: 'string',
  },
  {
    field: 'uid',
    header: 'uid',
    dataType: 'string',
  },
  {
    field: 'email',
    header: 'email',
    dataType: 'string',
  },
];

const resetUserProgress = () => {
  isFileUploaded.value = false;
  uploadedFile.value = null;
  showErrorTable.value = false;
  errorUsers.value = [];
  errorUserColumns.value = [];
  validationErrors.value = [];
  lastLinkedFileName.value = '';
  linkingAttemptError.value = '';

  setHasUserConfirmed(false);
};

const hasAnyLinkingData = (users) =>
  users.some((user) => {
    const userTypeField = Object.keys(user).find((key) => key.toLowerCase() === 'usertype');
    const userType = userTypeField && user[userTypeField] ? String(user[userTypeField]).trim().toLowerCase() : '';
    if (userType !== 'child') return false;

    const caregiverIdField = Object.keys(user).find((key) => key.toLowerCase() === 'caregiverid');
    const teacherIdField = Object.keys(user).find((key) => key.toLowerCase() === 'teacherid');

    const hasCaregiverId =
      caregiverIdField &&
      String(user[caregiverIdField] ?? '')
        .split(',')
        .map((id) => id.trim())
        .some((id) => id !== '');

    const hasTeacherId =
      teacherIdField &&
      String(user[teacherIdField] ?? '')
        .split(',')
        .map((id) => id.trim())
        .some((id) => id !== '');

    return hasCaregiverId || hasTeacherId;
  });

const onFileUpload = async (event) => {
  resetUserProgress();

  // Read the file
  const file = event.files[event.files.length - 1];
  uploadedFile.value = file;

  const parsedData = await csvFileToJson(file);
  const filteredData = parsedData.filter((user) => {
    if (!user || typeof user !== 'object') return false;
    const keys = Object.keys(user);
    if (keys.length === 0) return false;
    const hasAnyValue = keys.some((key) => {
      const val = user[key];
      if (val === null || val === undefined) return false;
      const strVal = String(val).trim();
      return strVal !== '';
    });
    return hasAnyValue;
  });

  if (!filteredData || filteredData.length === 0) {
    validationErrors.value = ['The uploaded file contains no data'];
    return;
  }

  rawUserFile.value = filteredData;

  const firstRow = toRaw(rawUserFile.value[0]);
  const headers = Object.keys(firstRow);
  const requiredHeaders = ['id', 'usertype', 'uid', 'caregiverid', 'teacherid'];

  const headerValidation = validateCsvHeaders(headers, requiredHeaders);
  const currentValidationErrors = [];

  if (!headerValidation.success) {
    const missingHeaders = headerValidation.errors.map((e) => e.field).join(', ');
    currentValidationErrors.push(`Missing required column(s): <code>${missingHeaders}</code>`);
  }

  if (!hasAnyLinkingData(filteredData)) {
    currentValidationErrors.push('At least one child row must include a <code>caregiverId</code> and/or a <code>teacherId</code> to link users.');
  }

  if (currentValidationErrors.length) {
    validationErrors.value = currentValidationErrors;
    return;
  }
  validationErrors.value = [];

  const validation = validateLinkUsersCsv(filteredData);

  const usersWithZodErrors = new Set();

  if (!validation.success) {
    const errorsByUser = new Map();
    validation.errors.forEach((error) => {
      const userIndex = error.row - 1;
      if (userIndex >= 0 && userIndex < filteredData.length) {
        const user = filteredData[userIndex];
        usersWithZodErrors.add(user);
        if (!errorsByUser.has(user)) {
          errorsByUser.set(user, []);
        }
        const fieldName = error.field === 'usertype' ? 'userType' : error.field;
        errorsByUser.get(user).push(`${fieldName}: ${error.message}`);
      }
    });
    errorsByUser.forEach((errors, user) => {
      addErrorUser(user, errors.join('; '));
    });
  }

  validateUsers(usersWithZodErrors);

  if (errorUsers.value.length === 0) {
    isFileUploaded.value = true;
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'File Successfully Uploaded',
      life: TOAST_DEFAULT_LIFE_DURATION,
    });

    // Wait for user confirmation before changing the selected site
    setShouldUserConfirm(true);
  }
};

const validateUsers = (usersWithZodErrors = new Set()) => {
  errorUsers.value = [];
  const userMap = new Map(
    toRaw(rawUserFile.value).map((user) => {
      const idField = Object.keys(user).find((key) => key.toLowerCase() === 'id');
      return [idField ? user[idField].toString() : '', user];
    }),
  );

  rawUserFile.value.forEach((user) => {
    if (usersWithZodErrors.has(user)) return;

    const missingFields = [];

    const userTypeField = Object.keys(user).find((key) => key.toLowerCase() === 'usertype');

    if (userTypeField && user[userTypeField] && user[userTypeField].toLowerCase() === 'child') {
      const caregiverIdField = Object.keys(user).find((key) => key.toLowerCase() === 'caregiverid');

      if (caregiverIdField && user[caregiverIdField] && user[caregiverIdField].trim() !== '') {
        const caregiverIds =
          typeof user[caregiverIdField] === 'string'
            ? user[caregiverIdField].split(',').map((id) => id.trim())
            : [user[caregiverIdField].toString()];

        caregiverIds.forEach((caregiverId) => {
          if (!userMap.has(caregiverId)) {
            missingFields.push(`Caregiver with ID ${caregiverId} not found`);
          } else {
            const caregiverUserTypeField = Object.keys(userMap.get(caregiverId)).find(
              (key) => key.toLowerCase() === 'usertype',
            );
            const caregiverUserTypeValue = caregiverUserTypeField
              ? userMap.get(caregiverId)[caregiverUserTypeField].toLowerCase()
              : null;

            if (!caregiverUserTypeField || caregiverUserTypeValue !== 'caregiver') {
              missingFields.push(`User with ID ${caregiverId} is not a caregiver`);
            }
          }
        });
      }

      const teacherIdField = Object.keys(user).find((key) => key.toLowerCase() === 'teacherid');

      if (teacherIdField && user[teacherIdField] && user[teacherIdField].trim() !== '') {
        const teacherIds =
          typeof user[teacherIdField] === 'string'
            ? user[teacherIdField].split(',').map((id) => id.trim())
            : [user[teacherIdField].toString()];

        teacherIds.forEach((teacherId) => {
          if (!userMap.has(teacherId)) {
            missingFields.push(`Teacher with ID ${teacherId} not found`);
          } else {
            const teacherUserTypeField = Object.keys(userMap.get(teacherId)).find(
              (key) => key.toLowerCase() === 'usertype',
            );

            if (!teacherUserTypeField || userMap.get(teacherId)[teacherUserTypeField].toLowerCase() !== 'teacher') {
              missingFields.push(`User with ID ${teacherId} is not a teacher`);
            }
          }
        });
      }
    }

    if (missingFields.length > 0) {
      addErrorUser(user, `Missing Field(s): ${missingFields.join(', ')}`);
    }
  });

  if (errorUsers.value.length > 0) {
    toast.add({
      severity: 'error',
      summary: 'Validation Errors. See below for details.',
      life: TOAST_DEFAULT_LIFE_DURATION,
    });
  }
};

const submitUsers = async () => {
  if (errorUsers.value.length > 0) {
    showErrorTable.value = true;
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Please fix all errors before submitting',
      life: TOAST_DEFAULT_LIFE_DURATION,
    });
    return;
  }

  if (!currentSite.value || isAllSitesSelected.value) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Please select a specific site before linking users',
      life: TOAST_DEFAULT_LIFE_DURATION,
    });
    return;
  }

  activeSubmit.value = true;
  showErrorTable.value = false;
  errorUsers.value = [];
  errorUserColumns.value = [];
  linkingAttemptError.value = '';

  try {
    const normalizedUsers = toRaw(rawUserFile.value).map((user) => {
      const normalizedUser = {};

      const idField = Object.keys(user).find((key) => key.toLowerCase() === 'id');
      const userTypeField = Object.keys(user).find((key) => key.toLowerCase() === 'usertype');
      const uidField = Object.keys(user).find((key) => key.toLowerCase() === 'uid');

      if (idField) normalizedUser.id = user[idField];
      if (userTypeField) {
        const userTypeValue = user[userTypeField];
        normalizedUser.userType =
          typeof userTypeValue === 'string' ? normalizeUserTypeForBackend(userTypeValue.toLowerCase()) : userTypeValue;
      }
      if (uidField) normalizedUser.uid = user[uidField];

      const caregiverIdField = Object.keys(user).find((key) => key.toLowerCase() === 'caregiverid');
      const teacherIdField = Object.keys(user).find((key) => key.toLowerCase() === 'teacherid');

      if (caregiverIdField && user[caregiverIdField]) normalizedUser.parentId = user[caregiverIdField];
      if (teacherIdField && user[teacherIdField]) normalizedUser.teacherId = user[teacherIdField];

      Object.keys(user).forEach((key) => {
        const lowerCaseKey = key.toLowerCase();
        if (!['id', 'usertype', 'uid', 'caregiverid', 'teacherid', 'parentid'].includes(lowerCaseKey)) {
          normalizedUser[key] = user[key];
        }
      });

      return normalizedUser;
    });

    await authStore.roarfirekit.linkUsers({ users: normalizedUsers, siteId: currentSite.value });
    lastLinkedFileName.value = uploadedFile.value?.name ?? '';
    isFileUploaded.value = false;
    showErrorTable.value = false;
    errorUsers.value = [];
    errorUserColumns.value = [];
    validationErrors.value = [];
    linkingAttemptError.value = '';
  } catch (error) {
    linkingAttemptError.value = error?.message
      ? `${error.message}. Please try again.`
      : 'Something went wrong. Please try again.';
  } finally {
    activeSubmit.value = false;
  }
};

function generateColumns(rawJson) {
  let columns = [];
  const columnValues = Object.keys(rawJson);
  _forEach(columnValues, (col) => {
    let dataType = typeof rawJson[col];
    if (dataType === 'object') {
      if (rawJson[col] instanceof Date) dataType = 'date';
    }
    columns.push({
      field: col,
      header: _startCase(col),
      dataType: dataType,
    });
  });
  return columns;
}

function addErrorUser(user, error) {
  if (_isEmpty(errorUserColumns.value)) {
    errorUserColumns.value = generateColumns(user);
    errorUserColumns.value.unshift({
      dataType: 'string',
      field: 'error',
      header: 'Cause of Error',
    });
  }
  // Concat the userObject with the error reason.
  errorUsers.value.push({
    ...user,
    error,
  });
}

watch(hasUserConfirmed, (userConfirmed) => {
  if (userConfirmed) resetUserProgress();
});
</script>

<style scoped>
.extra-height {
  min-height: 33vh;
}

.datatable {
  border: 1px solid var(--surface-d);
  border-radius: 5px;
  margin-top: 1rem;
}

.submit-container {
  margin-top: 1rem;
}

.error-container {
  margin-top: 2rem;
}

.error-header {
  margin-bottom: 1rem;
}
</style>
