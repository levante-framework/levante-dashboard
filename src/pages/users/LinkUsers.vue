<template>
  <main class="container main">
    <section class="main-body">
      <LinkUsersInfo />

      <PvDivider class="my-5" />

      <PvMessage v-if="inlineFileError" severity="error" class="mb-3" :closable="false">
        {{ inlineFileError }}
      </PvMessage>

      <div class="m-0 mb-5 p-3 bg-gray-100 border-1 border-gray-200 border-round">
        <div class="flex align-items-center gap-3">
          <PvFileUpload
            :choose-label="uploadedFile ? 'Choose Another CSV File' : 'Choose CSV File'"
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
          <span v-if="uploadedFile" class="text-gray-500">File: {{ uploadedFile?.name }}</span>
          <span v-else class="text-gray-500">No file chosen</span>
        </div>

        <p v-if="showCsvSourceNote && isFileUploaded" class="csv-source-note m-0 mt-2 mb-0 text-gray-600 text-sm">
          {{ CSV_SOURCE_NOTE_TEXT }}
        </p>

        <div v-if="isFileUploaded">
          <PvDataTable
            ref="dataTable"
            :value="displayTableRows"
            show-gridlines
            :row-hover="true"
            :resizable-columns="true"
            paginator
            :always-show-paginator="false"
            :rows="10"
            class="datatable"
          >
            <PvColumn v-if="showCauseOfErrorColumn" key="cause-of-error" field="error">
              <template #header>
                <div class="col-header">
                  <b>Cause of Error</b>
                </div>
              </template>
              <template #body="{ data, field }">
                <span v-if="data[field]">{{ data[field] }}</span>
              </template>
            </PvColumn>
            <PvColumn v-for="col of allFields" :key="col.field" :field="col.field">
              <template #header>
                <div class="col-header">
                  <b>{{ col.header }}</b>
                </div>
              </template>
              <template #body="{ data, field }">
                <span>{{ data[field] }}</span>
              </template>
            </PvColumn>
          </PvDataTable>

          <div class="submit-container">
            <PvButton
              :label="activeSubmit ? 'Linking Users' : 'Start Linking'"
              :icon="activeSubmit ? 'pi pi-spin pi-spinner' : 'pi pi-link'"
              :disabled="startLinkingDisabled"
              @click="submitUsers"
            />
          </div>
        </div>
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
import { TOAST_DEFAULT_LIFE_DURATION } from '@/constants/toasts';
import PvDivider from 'primevue/divider';
import PvMessage from 'primevue/message';
import { validateCsvHeaders, validateLinkUsersCsv } from '@levante-framework/levante-zod';
import { useLevanteStore } from '@/store/levante';
import { storeToRefs } from 'pinia';
import { REGISTERED_USERS_CSV_MARKER } from '@/constants/registeredUsersCsv';

const CSV_SOURCE_NOTE_TEXT =
  'Note: this file was not detected as the registered-users export from Add Users (missing watermark column). You can still proceed if id, userType, and uid match that format.';

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
const rowIssuesByIndex = ref({});
const activeSubmit = ref(false);
const inlineFileError = ref(null);
const csvSourceVerified = ref(true);

const allFields = [
  { field: 'id', header: 'ID', dataType: 'string' },
  { field: 'userType', header: 'User Type', dataType: 'string' },
  { field: 'caregiverId', header: 'Caregiver ID', dataType: 'string' },
  { field: 'teacherId', header: 'Teacher ID', dataType: 'string' },
  { field: 'uid', header: 'UID', dataType: 'string' },
];

function getFieldValue(user, fieldName) {
  const field = Object.keys(user).find((key) => key.toLowerCase() === fieldName.toLowerCase());
  return field ? user[field] : undefined;
}

const showCsvSourceNote = computed(
  () => rawUserFile.value.length > 0 && !csvSourceVerified.value && !inlineFileError.value,
);

const showCauseOfErrorColumn = computed(() =>
  Object.values(rowIssuesByIndex.value).some((msg) => msg != null && String(msg).trim() !== ''),
);

const displayTableRows = computed(() =>
  rawUserFile.value.map((user, rowIndex) => ({
    error: rowIssuesByIndex.value[rowIndex] ?? '',
    id: previewCell(user, 'id'),
    userType: previewCell(user, 'usertype'),
    caregiverId: previewCell(user, 'caregiverid'),
    teacherId: previewCell(user, 'teacherid'),
    uid: previewCell(user, 'uid'),
  })),
);

const startLinkingDisabled = computed(() => activeSubmit.value || isAllSitesSelected.value);

function previewCell(user, fieldLc) {
  const v = getFieldValue(user, fieldLc);
  if (v === undefined || v === null) return '';
  return String(v);
}

function appendRowIssue(rowIndex, message) {
  if (message == null || message === '') return;
  const prev = rowIssuesByIndex.value[rowIndex];
  rowIssuesByIndex.value = {
    ...rowIssuesByIndex.value,
    [rowIndex]: prev ? `${prev}; ${message}` : message,
  };
}

function findRowIndexForId(users, id) {
  const target = String(id ?? '').trim();
  if (!target) return -1;
  return users.findIndex((user) => String(getFieldValue(user, 'id') ?? '').trim() === target);
}

function verifyCsvSource(users) {
  const markerKey = REGISTERED_USERS_CSV_MARKER.toLowerCase();
  return users.every((row) => {
    const col = Object.keys(row).find((k) => k.toLowerCase() === markerKey);
    if (!col) return false;
    return String(row[col]).trim() === REGISTERED_USERS_CSV_MARKER;
  });
}

function formatCsvValidationField(field) {
  if (field === 'usertype') return 'userType';
  return field;
}

function resetValidationState() {
  inlineFileError.value = null;
  rowIssuesByIndex.value = {};
  csvSourceVerified.value = true;
}

const resetUserProgress = () => {
  isFileUploaded.value = false;
  uploadedFile.value = null;
  rawUserFile.value = [];
  resetValidationState();
  setHasUserConfirmed(false);
};

const onFileUpload = async (event) => {
  resetUserProgress();

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
    inlineFileError.value = 'The uploaded file contains no data.';
    return;
  }

  rawUserFile.value = filteredData;

  const firstRow = toRaw(rawUserFile.value[0]);
  const headers = Object.keys(firstRow);
  const requiredHeaders = ['id', 'usertype', 'uid'];

  const headerValidation = validateCsvHeaders(headers, requiredHeaders);
  if (!headerValidation.success) {
    const missingHeaders = headerValidation.errors.map((e) => e.field).join(', ');
    inlineFileError.value = `Missing required column(s): ${missingHeaders}`;
    rawUserFile.value = [];
    return;
  }

  csvSourceVerified.value = verifyCsvSource(filteredData);

  const validation = validateLinkUsersCsv(filteredData);

  if (!validation.success) {
    const errorsByRow = new Map();
    validation.errors.forEach((error) => {
      const userIndex = error.row - 1;
      if (userIndex < 0 || userIndex >= filteredData.length) return;
      if (!errorsByRow.has(userIndex)) errorsByRow.set(userIndex, []);
      const fieldLabel = formatCsvValidationField(error.field);
      errorsByRow.get(userIndex).push(`${fieldLabel}: ${error.message}`);
    });
    const sortedIndices = [...errorsByRow.keys()].sort((a, b) => a - b);
    sortedIndices.forEach((idx) => {
      appendRowIssue(idx, errorsByRow.get(idx).join('; '));
    });
  } else {
    validateUsers();
    const linkSummary = getExtendedMissingLinkData(filteredData);
    linkSummary.summaryRows.forEach((row) => {
      const idx = findRowIndexForId(filteredData, row.id);
      if (idx >= 0) appendRowIssue(idx, row.issue);
    });
  }

  isFileUploaded.value = true;

  const hasRowIssues = Object.keys(rowIssuesByIndex.value).length > 0;
  if (hasRowIssues) {
    toast.add({
      severity: 'warn',
      summary: 'Review your file',
      detail: 'Some rows have issues listed under Cause of Error.',
      life: TOAST_DEFAULT_LIFE_DURATION,
    });
  } else {
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'File successfully uploaded',
      life: TOAST_DEFAULT_LIFE_DURATION,
    });
  }

  setShouldUserConfirm(true);
};

const validateUsers = () => {
  const userMap = new Map(
    toRaw(rawUserFile.value).map((user) => {
      const idField = Object.keys(user).find((key) => key.toLowerCase() === 'id');
      return [idField ? user[idField].toString() : '', user];
    }),
  );

  rawUserFile.value.forEach((user, rowIndex) => {
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
      appendRowIssue(rowIndex, `Missing Field(s): ${missingFields.join(', ')}`);
    }
  });
};

const submitUsers = async () => {
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

  try {
    const filteredUsers = toRaw(rawUserFile.value).filter((user) => isUserLinkable(user));
    const normalizedUsers = filteredUsers.map((user) => {
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

      const markerKey = REGISTERED_USERS_CSV_MARKER.toLowerCase();
      Object.keys(user).forEach((key) => {
        const lowerCaseKey = key.toLowerCase();
        if (
          !['id', 'usertype', 'uid', 'caregiverid', 'teacherid', 'parentid'].includes(lowerCaseKey) &&
          lowerCaseKey !== markerKey
        ) {
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

function parseIdList(value) {
  if (value === null || value === undefined) return [];
  return String(value)
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id);
}

function getUserTypeValue(user) {
  const userTypeValue = getFieldValue(user, 'usertype');
  if (!userTypeValue) return '';
  return String(userTypeValue).trim().toLowerCase();
}

function isUserLinkable(user) {
  const userTypeValue = getUserTypeValue(user);
  if (userTypeValue !== 'child') return true;
  const caregiverIds = parseIdList(getFieldValue(user, 'caregiverid'));
  const teacherIds = parseIdList(getFieldValue(user, 'teacherid'));
  return caregiverIds.length > 0 || teacherIds.length > 0;
}

function getExtendedMissingLinkData(users) {
  const linkedCaregiverIds = new Set();
  const linkedTeacherIds = new Set();
  let childRowsWithoutLinks = 0;
  let childrenWithoutCaregiver = 0;
  let childrenWithoutTeacher = 0;
  const summaryRows = [];

  users.forEach((user) => {
    if (getUserTypeValue(user) !== 'child') return;

    const idVal = String(getFieldValue(user, 'id') ?? '').trim();
    const caregiverIds = parseIdList(getFieldValue(user, 'caregiverid'));
    const teacherIds = parseIdList(getFieldValue(user, 'teacherid'));

    if (caregiverIds.length === 0) childrenWithoutCaregiver += 1;
    if (teacherIds.length === 0) childrenWithoutTeacher += 1;

    if (caregiverIds.length === 0 && teacherIds.length === 0) {
      childRowsWithoutLinks += 1;
      summaryRows.push({
        id: idVal,
        userType: 'child',
        issue: 'No caregiver or teacher links (skipped when linking)',
      });
    } else {
      if (caregiverIds.length === 0) {
        summaryRows.push({
          id: idVal,
          userType: 'child',
          issue: 'No caregiver link',
        });
      }
      if (teacherIds.length === 0) {
        summaryRows.push({
          id: idVal,
          userType: 'child',
          issue: 'No teacher link',
        });
      }
    }

    caregiverIds.forEach((id) => linkedCaregiverIds.add(id));
    teacherIds.forEach((id) => linkedTeacherIds.add(id));
  });

  const caregiversWithoutLinks = users.filter((user) => {
    const userTypeValue = getUserTypeValue(user);
    if (userTypeValue !== 'caregiver' && userTypeValue !== 'parent') return false;
    const idValue = String(getFieldValue(user, 'id') ?? '').trim();
    if (!idValue) return false;
    return !linkedCaregiverIds.has(idValue);
  }).length;

  const teachersWithoutLinks = users.filter((user) => {
    const userTypeValue = getUserTypeValue(user);
    if (userTypeValue !== 'teacher') return false;
    const idValue = String(getFieldValue(user, 'id') ?? '').trim();
    if (!idValue) return false;
    return !linkedTeacherIds.has(idValue);
  }).length;

  users.forEach((user) => {
    const userTypeValue = getUserTypeValue(user);
    const idValue = String(getFieldValue(user, 'id') ?? '').trim();
    if (!idValue) return;
    if ((userTypeValue === 'caregiver' || userTypeValue === 'parent') && !linkedCaregiverIds.has(idValue)) {
      summaryRows.push({
        id: idValue,
        userType: 'caregiver',
        issue: 'Not referenced by any child row',
      });
    }
    if (userTypeValue === 'teacher' && !linkedTeacherIds.has(idValue)) {
      summaryRows.push({
        id: idValue,
        userType: 'teacher',
        issue: 'Not referenced by any child row',
      });
    }
  });

  return {
    childRowsWithoutLinks,
    childrenWithoutCaregiver,
    childrenWithoutTeacher,
    caregiversWithoutLinks,
    teachersWithoutLinks,
    summaryRows,
  };
}

watch(hasUserConfirmed, (userConfirmed) => {
  if (userConfirmed) resetUserProgress();
});
</script>

<style scoped>
.extra-height {
  min-height: 33vh;
}

.col-header {
  display: flex;
  flex-direction: column;
}

.submit-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  margin: 1rem 0 0;
  align-items: flex-start;
}

.datatable {
  border: 1px solid var(--surface-d);
  border-radius: 5px;
  margin: 1rem 0 0;
}

.csv-source-note {
  font-style: italic;
}
</style>
