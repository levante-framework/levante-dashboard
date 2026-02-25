<template>
  <main class="container main">
    <section class="main-body">
      <LinkUsersInfo />

      <PvDivider class="my-5" />

      <div class="m-0 mb-5 p-3 bg-gray-100 border-1 border-gray-200 border-round">
        <div class="flex align-items-center gap-3">
          <PvFileUpload
            :choose-label="isFileUploaded && !errorUsers.length ? 'Choose Another CSV File' : 'Choose CSV File'"
            :empty-label="'Test'"
            :show-cancel-button="false"
            :show-upload-button="false"
            auto
            accept=".csv"
            custom-upload
            mode="basic"
            name="linkUsersFile[]"
            @uploader="onFileUpload($event)"
          />
          <span v-if="isFileUploaded" class="text-gray-500">File: {{ uploadedFile?.name }}</span>
          <span v-else class="text-gray-500">No file chosen</span>
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

      <div v-if="showErrorTable" class="error-container">
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
import { useToast } from 'primevue/usetoast';
import { useAuthStore } from '@/store/auth';
import LinkUsersInfo from '@/components/userInfo/LinkUsersInfo.vue';
import PvButton from 'primevue/button';
import PvColumn from 'primevue/column';
import PvDataTable from 'primevue/datatable';
import PvFileUpload from 'primevue/fileupload';
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

// LINKING
// Required: id, userType, uid
// Optional: parentId, teacherId

const allFields = [
  {
    field: 'id',
    header: 'ID',
    dataType: 'string',
  },
  {
    field: 'userType',
    header: 'User Type',
    dataType: 'string',
  },
  {
    field: 'caregiverId',
    header: 'Caregiver ID',
    dataType: 'string',
  },
  {
    field: 'teacherId',
    header: 'Teacher ID',
    dataType: 'string',
  },
  {
    field: 'uid',
    header: 'UID',
    dataType: 'string',
  },
];

const resetUserProgress = () => {
  isFileUploaded.value = false;
  uploadedFile.value = null;
  showErrorTable.value = false;

  // Reset user confirmation
  setHasUserConfirmed(false);
};

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
    toast.add({
      severity: 'error',
      summary: 'Error: Empty File',
      detail: 'The uploaded file contains no data',
      life: TOAST_DEFAULT_LIFE_DURATION,
    });
    return;
  }

  rawUserFile.value = filteredData;

  const firstRow = toRaw(rawUserFile.value[0]);
  const headers = Object.keys(firstRow);
  const requiredHeaders = ['id', 'usertype', 'uid'];

  const headerValidation = validateCsvHeaders(headers, requiredHeaders);
  if (!headerValidation.success) {
    const missingHeaders = headerValidation.errors.map((e) => e.field).join(', ');
    toast.add({
      severity: 'error',
      summary: 'Error: Missing Column',
      detail: `Missing required column(s): ${missingHeaders}`,
      life: TOAST_DEFAULT_LIFE_DURATION,
    });
    return;
  }

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

  try {
    const normalizedUsers = toRaw(rawUserFile.value).map((user) => {
      const normalizedUser = {};

      const idField = Object.keys(user).find((key) => key.toLowerCase() === 'id');
      const userTypeField = Object.keys(user).find((key) => key.toLowerCase() === 'usertype');
      const uidField = Object.keys(user).find((key) => key.toLowerCase() === 'uid');

      if (idField) normalizedUser.id = user[idField];
      if (userTypeField) {
        const userTypeValue = user[userTypeField];
        normalizedUser.userType = userTypeValue.toLowerCase() === 'caregiver' ? 'parent' : userTypeValue;
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
    isFileUploaded.value = false;

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Users linked successfully',
      life: TOAST_DEFAULT_LIFE_DURATION,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: `Failed to link users: ${error.message}. Please try again.`,
      life: TOAST_DEFAULT_LIFE_DURATION,
    });
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
  // If there are no error users yet, generate the
  //  columns before displaying the table.
  if (_isEmpty(errorUserColumns.value)) {
    errorUserColumns.value = generateColumns(user);
    errorUserColumns.value.unshift({
      dataType: 'string',
      field: 'error',
      header: 'Cause of Error',
    });
    showErrorTable.value = true;
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
