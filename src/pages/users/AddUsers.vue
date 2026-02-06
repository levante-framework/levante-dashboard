<template>
  <main class="container main">
    <section class="main-body">
      <!--Upload file section-->
      <AddUsersInfo />

      <PvDivider class="my-5" />

      <div class="m-0 mb-5 p-3 bg-gray-100 border-1 border-gray-200 border-round">
        <div class="flex align-items-center gap-3">
          <PvFileUpload
            :choose-label="
              isFileUploaded && !errorMissingColumns && !errorUsers.length
                ? 'Choose Another CSV File'
                : 'Choose CSV File'
            "
            :show-cancel-button="false"
            :show-upload-button="false"
            auto
            accept=".csv"
            custom-upload
            mode="basic"
            name="addUsersFile[]"
            @uploader="onFileUpload($event)"
          />
          <span v-if="isFileUploaded" class="text-gray-500">File: {{ uploadedFile?.name }}</span>
          <span v-else class="text-gray-500">No file chosen</span>
        </div>

        <div v-if="isFileUploaded && !errorMissingColumns && !errorUsers.length">
          <div v-if="hasMultipleSites" class="mt-3 mb-4 p-3 bg-yellow-100 border-1 border-yellow-300 border-round">
            <div class="flex align-items-center gap-2">
              <i class="pi pi-exclamation-triangle text-yellow-600"></i>
              <span class="text-yellow-800 font-semibold">
                Multiple sites detected. Users will only be created for the currently selected site.
              </span>
            </div>
          </div>
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
              <template #body="{ data, field }">
                <span>{{ data[field] }}</span>
              </template>
            </PvColumn>
          </PvDataTable>

          <div class="submit-container">
            <div v-if="registeredUsers.length" class="button-group">
              <PvButton label="Continue to Link Users" icon="pi pi-link" @click="router.push({ name: 'Link Users' })" />
              <PvButton
                label="Download Users"
                icon="pi pi-download"
                variant="outlined"
                class="download-button"
                @click="downloadCSV"
              />
            </div>
            <PvButton
              v-else
              v-tooltip.bottom="isAllSitesSelected ? 'Please select a specific site to add users' : ''"
              :label="activeSubmit ? 'Adding Users' : 'Add Users from Uploaded File'"
              :icon="activeSubmit ? 'pi pi-spin pi-spinner' : ''"
              :disabled="activeSubmit || isAllSitesSelected"
              data-testid="start-adding-button"
              @click="submitUsers"
            />
          </div>
        </div>
      </div>

      <!-- Datatable of error children -->
      <div v-if="showErrorTable" class="error-container">
        <div class="error-header">
          <h3>Rows with Errors</h3>
        </div>
        <PvDataTable
          ref="errorTable"
          :value="errorUsers"
          show-gridlines
          export-filename="error-datatable-export"
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
            <template #body="{ data, field }">
              <span>{{ data[field] }}</span>
            </template>
          </PvColumn>
        </PvDataTable>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, toRaw, watch, nextTick, computed } from 'vue';
import { csvFileToJson, normalizeToLowercase } from '@/helpers';
import _cloneDeep from 'lodash/cloneDeep';
import _forEach from 'lodash/forEach';
import _capitalize from 'lodash/capitalize';
import _isEmpty from 'lodash/isEmpty';
import _startCase from 'lodash/startCase';
import _chunk from 'lodash/chunk';
import { useToast } from 'primevue/usetoast';
import AddUsersInfo from '@/components/userInfo/AddUsersInfo.vue';
import { useAuthStore } from '@/store/auth';
import { pluralizeFirestoreCollection } from '@/helpers';
import { fetchOrgByName } from '@/helpers/query/orgs';
import PvButton from 'primevue/button';
import PvColumn from 'primevue/column';
import PvDataTable from 'primevue/datatable';
import PvDivider from 'primevue/divider';
import PvFileUpload from 'primevue/fileupload';
import { useRouter } from 'vue-router';
import { TOAST_DEFAULT_LIFE_DURATION } from '@/constants/toasts';
import { logger } from '@/logger';
import { storeToRefs } from 'pinia';
import { validateAddUsersFileUpload } from '@levante-framework/levante-zod';

const authStore = useAuthStore();
const { currentSite, currentSiteName, shouldUsePermissions } = storeToRefs(authStore);
const { createUsers } = authStore;
const toast = useToast();

const isAllSitesSelected = computed(() => shouldUsePermissions.value && currentSite.value === 'any');

const isFileUploaded = ref(false);
const uploadedFile = ref(null);
const rawUserFile = ref({});
const registeredUsers = ref([]);
const hasMultipleSites = ref(false);

// Primary Table & Dropdown refs
const dataTable = ref();

// One or the other of the following columns is required:
// 'cohort', | 'site', 'school', 'class'

// Month and Year are required only for 'child' or 'student' users
const allFields = [
  {
    field: 'userType',
    header: 'User Type',
    dataType: 'string',
  },
  {
    field: 'month',
    header: 'Month',
    dataType: 'number',
  },
  {
    field: 'year',
    header: 'Year',
    dataType: 'number',
  },
  {
    field: 'cohort',
    header: 'Cohort',
    dataType: 'string',
  },
  {
    field: 'school',
    header: 'School',
    dataType: 'string',
  },
  {
    field: 'class',
    header: 'Class',
    dataType: 'string',
  },
];

// Error Users Table refs
const errorTable = ref();
const errorUsers = ref([]);
const errorUserColumns = ref([]);
const errorMessage = ref('');
const showErrorTable = ref(false);
const errorMissingColumns = ref(false);

const activeSubmit = ref(false);

const router = useRouter();

watch(
  errorUsers,
  () => {
    // Scroll to bottom of page after error table is displayed
    // Using nextTick to ensure the error table is rendered otherwise the scroll
    // happens before the table is rendered
    nextTick(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
  },
  { deep: true },
);

// Functions supporting the uploader
const onFileUpload = async (event) => {
  uploadedFile.value = null;
  errorUsers.value = [];
  errorUserColumns.value = [];
  showErrorTable.value = false;
  errorMessage.value = '';
  errorTable.value = null;
  errorMissingColumns.value = false;
  isFileUploaded.value = false;
  registeredUsers.value = [];
  activeSubmit.value = false;
  hasMultipleSites.value = false;

  const file = event.files[event.files.length - 1];
  uploadedFile.value = file;

  const parsedData = await csvFileToJson(file);

  if (!parsedData || parsedData.length === 0) {
    toast.add({
      severity: 'error',
      summary: 'Error: Empty File',
      detail: 'The uploaded file contains no data',
      life: TOAST_DEFAULT_LIFE_DURATION,
    });
    return;
  }

  const validation = validateAddUsersFileUpload(parsedData, shouldUsePermissions.value);

  if (validation.headerErrors && validation.headerErrors.length > 0) {
    const missingHeaders = validation.headerErrors.map((e) => e.field).join(', ');
    toast.add({
      severity: 'error',
      summary: 'Error: Missing Column',
      detail: `Missing required column(s): ${missingHeaders}`,
      life: TOAST_DEFAULT_LIFE_DURATION,
    });
    errorMissingColumns.value = true;
    return;
  }

  rawUserFile.value = validation.data;
  hasMultipleSites.value = validation.hasMultipleSites;

  if (validation.errors.length > 0) {
    validation.errors.forEach(({ user, error }) => {
      addErrorUser(user, error);
    });
    toast.add({
      severity: 'error',
      summary: 'Validation Errors. See below for details.',
      life: TOAST_DEFAULT_LIFE_DURATION,
    });
  } else {
    isFileUploaded.value = true;
    errorMissingColumns.value = false;
    showErrorTable.value = false;
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'File Successfully Uploaded',
      life: TOAST_DEFAULT_LIFE_DURATION,
    });
  }
};

function generateColumns(rawJson) {
  let columns = [];
  const columnValues = Object.keys(rawJson);
  _forEach(columnValues, (col) => {
    // Hide orgIds column
    if (col === 'orgIds') return;

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

async function submitUsers() {
  // Check if there are any errors before proceeding
  if (errorUsers.value.length > 0) {
    toast.add({
      severity: 'error',
      summary: 'Cannot Submit',
      detail: 'Please fix the errors in your CSV file before submitting',
      life: 5000,
    });
    return;
  }

  // Reset error users
  activeSubmit.value = true;
  errorUsers.value = [];
  errorUserColumns.value = [];
  showErrorTable.value = false;
  errorMessage.value = '';

  // Get users to be registered (those with empty uid)
  const usersToBeRegistered = _cloneDeep(toRaw(rawUserFile.value))
    .map((user, index) => ({
      user,
      index,
    }))
    .filter(({ user }) => !user.uid || user.uid === '');
  const usersWithErrors = [];

  // If no users to register, show message and return
  if (usersToBeRegistered.length === 0) {
    toast.add({
      severity: 'info',
      summary: 'No New Users to Register',
      detail: 'All users in the file have already been registered',
      life: TOAST_DEFAULT_LIFE_DURATION,
    });
    activeSubmit.value = false;
    return;
  }

  const siteName = currentSiteName.value;

  if (!siteName || isAllSitesSelected.value) {
    toast.add({
      severity: 'error',
      summary: 'Cannot Submit',
      detail: 'Please select a specific site before adding users',
      life: TOAST_DEFAULT_LIFE_DURATION,
    });
    activeSubmit.value = false;
    return;
  }

  let selectedSiteId;
  try {
    selectedSiteId = await getOrgId('districts', siteName, ref(undefined), ref(undefined));
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Invalid Site',
      detail: error.message,
      life: TOAST_DEFAULT_LIFE_DURATION,
    });
    activeSubmit.value = false;
    return;
  }

  for (const { user, index } of usersToBeRegistered) {
    try {
      // Find fields case-insensitively
      const schoolField = Object.keys(user).find((key) => key.toLowerCase() === 'school');
      const classField = Object.keys(user).find((key) => key.toLowerCase() === 'class');
      const cohortField = Object.keys(user).find((key) => key.toLowerCase() === 'cohort');

      const schools = schoolField
        ? user[schoolField]
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s)
        : [];

      const classes = classField
        ? user[classField]
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s)
        : [];

      const cohorts = cohortField
        ? user[cohortField]
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s)
        : [];

      const orgNameMap = {
        school: schools,
        class: classes,
        cohort: cohorts,
      };

      // Pluralized because of a ROAR change to the createUsers function.
      // Only groups are allowed to be an array however, we've only been using one group per user.
      // TODO: Figure out if we want to allow multiple orgs
      const orgInfo = {
        sites: [selectedSiteId],
        schools: [],
        classes: [],
        cohorts: [],
      };

      // If orgType is a given column, check if the name is
      //   associated with a valid id. If so, add the id to
      //   the sendObject. If not, reject user
      for (const [orgType, orgNames] of Object.entries(orgNameMap)) {
        if (orgNames && orgNames.length > 0) {
          try {
            if (orgType === 'school') {
              // Need a site for schools - try each school in the selected site
              if (!selectedSiteId) {
                throw new Error('Schools specified but no site provided');
              }
              for (const schoolName of orgNames) {
                const schoolId = await getOrgId(
                  pluralizeFirestoreCollection(orgType),
                  schoolName,
                  ref({ id: selectedSiteId }),
                  ref(undefined),
                );
                orgInfo.schools.push(schoolId);
              }
            } else if (orgType === 'class') {
              // Need site and school for classes - try each class with each school in the selected site
              if (!selectedSiteId || schools.length === 0) {
                throw new Error('Classes must be within schools. Classes specified but no school provided');
              }
              for (const className of orgNames) {
                let classFound = false;
                for (const schoolName of schools) {
                  try {
                    const schoolId = await getOrgId('schools', schoolName, ref({ id: selectedSiteId }), ref(undefined));
                    const classId = await getOrgId(
                      pluralizeFirestoreCollection(orgType),
                      className,
                      ref({ id: selectedSiteId }),
                      ref({ id: schoolId }),
                    );
                    orgInfo.classes.push(classId);
                    classFound = true;
                    break;
                  } catch {
                    continue;
                  }
                }
                if (!classFound) {
                  throw new Error(`Class '${className}' not found in the selected school(s)`);
                }
              }
            } else if (orgType === 'cohort') {
              for (const cohortName of orgNames) {
                const cohortId = await getOrgId(
                  pluralizeFirestoreCollection('groups'),
                  cohortName,
                  ref({ id: currentSite.value }),
                  ref(undefined),
                );
                orgInfo.cohorts.push(cohortId);
              }
            }
          } catch (error) {
            // Add the user to the error list with the specific organization error
            usersWithErrors.push({
              user,
              index,
              error: `Invalid ${_capitalize(orgType)}: ${error.message}`,
            });
            break; // Break out of the orgType loop for this user
          }
        }
      }

      if (!_isEmpty(orgInfo)) {
        // The backend expects districts and groups for site and cohort respectively
        orgInfo.districts = orgInfo.sites;
        delete orgInfo.sites;
        orgInfo.groups = orgInfo.cohorts;
        delete orgInfo.cohorts;
        user.orgIds = orgInfo;
      } else if (!usersWithErrors.some((err) => err.user === user)) {
        // Only add this error if the user doesn't already have an error
        usersWithErrors.push({
          user,
          index,
          error: 'No valid organization information found',
        });
      }
    } catch (error) {
      usersWithErrors.push({
        user,
        index,
        error: error.message,
      });
    }
  }

  // If there are any errors, display them and return
  if (usersWithErrors.length > 0) {
    // Generate columns from the first user if needed
    if (_isEmpty(errorUserColumns.value)) {
      errorUserColumns.value = generateColumns(usersWithErrors[0].user);
      errorUserColumns.value.unshift({
        dataType: 'string',
        field: 'error',
        header: 'Cause of Error',
      });
    }

    // Add all users with errors to the error table
    usersWithErrors.forEach(({ user, error }) => {
      addErrorUser(user, error);
    });

    showErrorTable.value = true;
    activeSubmit.value = false;
    return;
  }
  // TODO: Figure out deadline-exceeded error with 700+ users. (Registration works fine, creates all documents but the client recieves the error)
  const chunkedUsersToBeRegistered = _chunk(usersToBeRegistered, 700);

  for (const users of chunkedUsersToBeRegistered) {
    try {
      // Ensure each user has the proper userType field name for the backend
      const processedUsers = users.map(({ user }) => {
        const processedUser = { ...user };

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

          // *** Add check to convert 'caregiver' value to 'parent' ***
          if (typeof userTypeValue === 'string' && userTypeValue.toLowerCase() === 'caregiver') {
            processedUser.userType = 'parent';
          }
        }

        return processedUser;
      });

      const createUsersPayload = {
        users: processedUsers,
      };

      if (shouldUsePermissions.value && currentSite.value && currentSite.value !== 'any') {
        createUsersPayload.siteId = currentSite.value;
      } else if (processedUsers.length > 0 && processedUsers[0].orgIds?.districts?.length > 0) {
        createUsersPayload.siteId = processedUsers[0].orgIds.districts[0];
      }

      const res = await createUsers(createUsersPayload);
      logger.capture('Admin: Add Users', { processedUsers });
      const currentRegisteredUsers = res.data.data;

      // Update only the newly registered users
      currentRegisteredUsers.forEach((registeredUser, index) => {
        const originalIndex = users[index].index;
        if (originalIndex < rawUserFile.value.length) {
          // Preserve all existing user data and update with new registration data
          rawUserFile.value[originalIndex] = {
            ...rawUserFile.value[originalIndex],
            email: registeredUser.email,
            password: registeredUser.password,
            uid: registeredUser.uid,
          };
        }
      });

      registeredUsers.value.push(...currentRegisteredUsers);

      toast.add({
        severity: 'success',
        summary: 'User Creation Successful',
        life: TOAST_DEFAULT_LIFE_DURATION,
      });
      convertUsersToCSV();
    } catch (error) {
      logger.error('Error Registering Users', { processedUsers: users, error });

      toast.add({
        severity: 'error',
        summary: 'Error registering users: ' + error.message,
        life: TOAST_DEFAULT_LIFE_DURATION,
      });
    }
  }

  /* We want to clear this flag whether we got an error or not */
  activeSubmit.value = false;
}

const csvBlob = ref(null);
const csvURL = ref(null);

function convertUsersToCSV() {
  // Get the first user to determine headers
  const headerObj = toRaw(rawUserFile.value[0]);

  // Convert Objects to CSV String
  const csvHeader = Object.keys(headerObj).join(',') + '\n';

  // Get all users from rawUserFile (which now contains updated data for newly registered users)
  const allUsers = toRaw(rawUserFile.value);

  const csvRows = allUsers
    .map((obj) =>
      Object.values(obj)
        .map((value) => {
          if (value === null || value === undefined) return '';
          return `"${value.toString().replace(/"/g, '""')}"`;
        })
        .join(','),
    )
    .join('\n');

  const csvString = csvHeader + csvRows;

  // Create Blob from CSV String
  csvBlob.value = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

  // Create URL from Blob
  csvURL.value = URL.createObjectURL(csvBlob.value);

  // Initiate download
  downloadCSV();
}

function downloadCSV() {
  const filename = 'registered-users.csv';

  if (csvURL.value) {
    // Create Download Link
    const link = document.createElement('a');
    link.setAttribute('href', csvURL.value);
    link.setAttribute('download', filename);
    document.body.appendChild(link); // Required for Firefox

    // Trigger the Download
    link.click();

    // Cleanup
    document.body.removeChild(link);
  }
}

function addErrorUser(user, error) {
  // Check if this user is already in the error list
  const userKey = JSON.stringify(user);
  const alreadyExists = errorUsers.value.some((errUser) => {
    const errUserKey = JSON.stringify({ ...errUser, error: undefined });
    return errUserKey === userKey;
  });

  if (alreadyExists) {
    // Update existing error message
    const existingIndex = errorUsers.value.findIndex((errUser) => {
      const errUserKey = JSON.stringify({ ...errUser, error: undefined });
      return errUserKey === userKey;
    });
    if (existingIndex >= 0) {
      errorUsers.value[existingIndex].error += `; ${error}`;
    }
    return;
  }

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

// TODO: Refactor this to be a single call
const orgIds = {
  districts: {},
  schools: {},
  classes: {},
  groups: {},
};

/**
 * Retrieves the ID of an Group based on its type and name.
 * If the ID is not already cached, it fetches it from the server.
 *
 * @async
 * @function getOrgId
 * @param {string} orgType - The type of Group (e.g., 'districts', 'schools', 'classes', 'groups').
 * @param {string} orgName - The name of the Group.
 * @param {Object|undefined} parentDistrict - The parent district reference, if applicable.
 * @param {Object|undefined} parentSchool - The parent school reference, if applicable.
 * @returns {Promise<String>} A promise that resolves to a string representing the Group ID.
 * @throws {Error} Throws an error if no Group is found for the given type and name.
 *
 * @example
 * // Get the ID for a school
 * const schoolInfo = await getOrgId('schools', 'High School A', districtRef, undefined);
 *
 * @description
 * This function first checks if the Group ID is already cached in the `orgIds.value` object.
 * If not, it calls the `fetchOrgByName` function to retrieve the Group details from the server.
 * The fetched data is then cached for future use.
 * If no Group is found, it throws an error.
 */
const getOrgId = async (orgType, orgName, parentDistrict = ref(null), parentSchool = ref(null)) => {
  const normalizedOrgName = normalizeToLowercase(orgName);

  // For schools and classes, include parent IDs in cache key to avoid cross-site conflicts
  const parentDistrictId = parentDistrict?.value?.id || null;
  const parentSchoolId = parentSchool?.value?.id || null;
  const cacheKey =
    parentDistrictId || parentSchoolId
      ? `${normalizedOrgName}__${parentDistrictId || ''}__${parentSchoolId || ''}`
      : normalizedOrgName;

  if (orgIds[orgType][cacheKey]) return orgIds[orgType][cacheKey];

  // Array of objects. Ex: [{id: 'lut54353jkler'}]
  const orgs = await fetchOrgByName(orgType, normalizedOrgName, parentDistrict, parentSchool);

  if (orgs.length === 0) {
    if (orgType === 'districts') {
      throw new Error(`No Groups found for site '${orgName}'`);
    } else if (orgType === 'groups') {
      throw new Error(`No Groups found for cohort '${orgName}'`);
    } else {
      throw new Error(`No Groups found for ${orgType} '${orgName}'`);
    }
  }

  orgIds[orgType][cacheKey] = orgs[0].id;

  return orgs[0].id;
};
</script>

<style lang="scss" scoped>
.extra-height {
  min-height: 33vh;
}

.optional-fields {
  margin-bottom: 2rem;
}

.error-box {
  padding: 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  background-color: var(--red-300);
  border-radius: 5px;
  border: 1px solid var(--red-600);
  color: var(--red-600);
  font-weight: bold;
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

.error {
  color: red;
}

.datatable {
  border: 1px solid var(--surface-d);
  border-radius: 5px;
  margin: 1rem 0 0;
}

.error-container {
  margin-top: 1rem;
}

.error-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  padding-bottom: 0.5rem;
}

.orgs-container {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  margin-top: -1rem;
  margin-bottom: 1rem;
}

.org-dropdown {
  margin-right: 3rem;
  margin-top: 2rem;
}
</style>
