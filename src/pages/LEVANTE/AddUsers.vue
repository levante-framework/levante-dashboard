<template>
  <main class="container main">
    <section class="main-body">
      <!--Upload file section-->
      <AddUsersInfo />

      <PvDivider />

      <div v-if="!isFileUploaded || errorUsers.length" class="text-gray-500 mb-2 surface-100 border-round p-2">
        <PvFileUpload
          name="massUploader[]"
          custom-upload
          accept=".csv"
          class="bg-primary mb-2 p-3 w-2 text-white border-none border-round h-3rem m-0 hover:bg-red-900"
          auto
          :show-upload-button="false"
          :show-cancel-button="false"
          @uploader="onFileUpload($event)"
        >
          <template #empty>
            <div class="flex justify-center items-center text-gray-500">
              <p>Click choose or drag your CSV file here to upload.</p>
            </div>
          </template>
        </PvFileUpload>
      </div>

      <div v-if="isFileUploaded && !errorMissingColumns && !errorUsers.length">
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
          <div v-if="registeredUsers.length" class="button-group">
            <PvButton
              label="Continue to Link Users"
              class="continue-button"
              icon="pi pi-link"
              @click="router.push({ name: 'Link Users' })"
            />
            <PvButton
              label="Download Users"
              class="download-button"
              icon="pi pi-download"
              @click="downloadCSV"
            />
          </div>
          <PvButton
            v-else
            :label="activeSubmit ? 'Adding Users' : 'Start Adding'"
            :icon="activeSubmit ? 'pi pi-spin pi-spinner' : ''"
            :disabled="activeSubmit"
            class="bg-primary mb-2 p-3 w-2 text-white border-none border-round h-3rem m-0 hover:bg-red-900"
            data-testid="start-adding-button"
            @click="submitUsers"
          />
        </div>
      </div>

      <!-- Error messages section -->
      <div v-if="showErrorTable" class="error-container">
        <div class="error-messages">
          <p v-for="(error, index) in errorMessages" :key="index" class="error-message">
            <i>{{ error }}</i>
          </p>
        </div>
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
          </PvColumn>
        </PvDataTable>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, toRaw, watch, nextTick } from 'vue';
import { csvFileToJson } from '@/helpers';
import _cloneDeep from 'lodash/cloneDeep';
import _forEach from 'lodash/forEach';
import _isEmpty from 'lodash/isEmpty';
import _startCase from 'lodash/startCase';
import _chunk from 'lodash/chunk';
import { useToast } from 'primevue/usetoast';
import AddUsersInfo from '@/components/LEVANTE/AddUsersInfo.vue';
import { useAuthStore } from '@/store/auth';
import { pluralizeFirestoreCollection } from '@/helpers';
import { fetchOrgByName } from '@/helpers/query/orgs';
import PvButton from 'primevue/button';
import PvColumn from 'primevue/column';
import PvDataTable from 'primevue/datatable';
import PvDivider from 'primevue/divider';
import PvFileUpload from 'primevue/fileupload';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const toast = useToast();
const isFileUploaded = ref(false);
const rawUserFile = ref({});
const registeredUsers = ref([]);

// Primary Table & Dropdown refs
const dataTable = ref();

// One or the other of the following columns is required:
// 'group', | 'district', 'school', 'class'

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
    field: 'group',
    header: 'Group',
    dataType: 'string',
  },
  {
    field: 'district',
    header: 'District',
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

// Add errorMessages ref
const errorMessages = ref([]);

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

// Validation helper functions
const validateFile = (file) => {
  if (!file) {
    throw new Error('No file selected');
  }
  return file;
};

const validateColumns = (columns, userType) => {
  const missingColumns = [];
  
  // Check required columns
  if (!columns.includes('usertype')) {
    missingColumns.push('userType');
  }

  // Check conditional columns for child users
  if (userType === 'child') {
    if (!columns.includes('month')) missingColumns.push('Month');
    if (!columns.includes('year')) missingColumns.push('Year');
  }

  // Check group or district+school
  const hasGroup = columns.includes('group');
  const hasDistrict = columns.includes('district');
  const hasSchool = columns.includes('school');
  
  if (!hasGroup && (!hasDistrict || !hasSchool)) {
    missingColumns.push('Group OR District and School');
  }

  return missingColumns;
};

const validateUserData = (user) => {
  const errors = [];
  const userTypeField = Object.keys(user).find(key => key.toLowerCase() === 'usertype');
  
  if (!userTypeField) {
    errors.push('Missing userType');
    return errors;
  }

  const userType = user[userTypeField].toLowerCase();
  
  // Validate based on user type
  if (userType === 'child') {
    const monthField = Object.keys(user).find(key => key.toLowerCase() === 'month');
    const yearField = Object.keys(user).find(key => key.toLowerCase() === 'year');
    
    if (!monthField || !user[monthField]) errors.push('month');
    if (!yearField || !user[yearField]) errors.push('year');
  }

  // Check for group or district and school
  const groupField = Object.keys(user).find(key => key.toLowerCase() === 'group');
  const districtField = Object.keys(user).find(key => key.toLowerCase() === 'district');
  const schoolField = Object.keys(user).find(key => key.toLowerCase() === 'school');
  
  if (!groupField || !user[groupField]) {
    if (!districtField || !user[districtField] || !schoolField || !user[schoolField]) {
      errors.push('group OR district and school');
    }
  }

  return errors;
};

// Main upload handler
const onFileUpload = async (event) => {
  // Reset all states
  rawUserFile.value = {};
  errorUsers.value = [];
  errorUserColumns.value = [];
  showErrorTable.value = false;
  errorMessage.value = '';
  errorTable.value = null;
  errorMissingColumns.value = false;
  errorMessages.value = [];
  registeredUsers.value = [];
  isFileUploaded.value = false;

  try {
    // 1. Validate and parse file
    const file = validateFile(event.files[0]);
    const parsedData = await csvFileToJson(file);
    
    if (!parsedData || parsedData.length === 0) {
      throw new Error('The uploaded file contains no data');
    }

    // 2. Store parsed data
    rawUserFile.value = parsedData;
    const firstRow = toRaw(parsedData[0]);
    const allColumns = Object.keys(firstRow).map(col => col.toLowerCase());

    // 3. Check for child users
    const hasChild = parsedData.some(user => {
      const userType = Object.keys(user).find(key => key.toLowerCase() === 'usertype');
      return userType && user[userType].toLowerCase() === 'child';
    });

    // 4. Validate columns
    const missingColumns = validateColumns(allColumns, hasChild ? 'child' : 'other');
    if (missingColumns.length > 0) {
      errorMissingColumns.value = true;
      throw new Error(`Missing required column(s): ${missingColumns.join(', ')}`);
    }

    // 5. Validate each user's data
    parsedData.forEach((user, index) => {
      const errors = validateUserData(user, index);
      if (errors.length > 0) {
        addErrorUser(user, `Missing Field(s): ${errors.join(', ')}`);
      }
    });

    // 6. Handle validation results
    if (errorUsers.value.length > 0) {
      showErrorTable.value = true;
      toast.add({
        severity: 'error',
        summary: 'Validation Errors',
        detail: 'Some rows contain errors. Please check the error table below.',
        life: 5000,
      });
    } else {
      isFileUploaded.value = true;
      errorMissingColumns.value = false;
      showErrorTable.value = false;
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'File Successfully Uploaded',
        life: 3000,
      });
    }

  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message,
      life: 5000,
    });
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

async function submitUsers() {
  // Reset error users
  activeSubmit.value = true;
  errorUsers.value = [];
  errorUserColumns.value = [];
  showErrorTable.value = false;
  errorMessage.value = '';

  try {
    // Group needs to be an array of strings
    const usersToBeRegistered = _cloneDeep(toRaw(rawUserFile.value));

    // Check orgs exist
    for (const user of usersToBeRegistered) {
      try {
        // Find fields case-insensitively
        const districtField = Object.keys(user).find(key => key.toLowerCase() === 'district');
        const schoolField = Object.keys(user).find(key => key.toLowerCase() === 'school');
        const classField = Object.keys(user).find(key => key.toLowerCase() === 'class');
        const groupField = Object.keys(user).find(key => key.toLowerCase() === 'group');
        
        // Get values using the actual field names
        const district = districtField ? user[districtField] : '';
        const school = schoolField ? user[schoolField] : '';
        const _class = classField ? user[classField] : '';
        const groups = groupField ? user[groupField] : '';

        const orgNameMap = {
          district: district ?? '',
          school: school ?? '',
          class: _class ?? '',
          group: groups?.split(',') ?? [],
        };

        let orgInfo = {
          districts: '',
          schools: '',
          classes: '',
          groups: [],
        };

        for (const [orgType, orgName] of Object.entries(orgNameMap)) {
          if (orgName) {
            try {
              if (orgType === 'school') {
                const districtId = await getOrgId('districts', district);
                const schoolId = await getOrgId(pluralizeFirestoreCollection(orgType), orgName, ref(districtId), ref(undefined));
                orgInfo.schools = schoolId;
              } else if (orgType === 'class') {
                const districtId = await getOrgId('districts', district);
                const schoolId = await getOrgId('schools', school);
                const classId = await getOrgId(pluralizeFirestoreCollection(orgType), orgName, ref(districtId), ref(schoolId));
                orgInfo.classes = classId;
              } else if (orgType === 'group') {
                for (const group of orgNameMap.group) {
                  const groupId = await getOrgId(pluralizeFirestoreCollection(orgType), group, ref(undefined), ref(undefined));
                  orgInfo.groups.push(groupId);
                }
              } else {
                const districtId = await getOrgId(pluralizeFirestoreCollection(orgType), orgName, ref(undefined), ref(undefined));
                orgInfo.districts = districtId;
              }
            } catch (error) {
              addErrorUser(user, `Error: ${orgType} '${orgName}' is invalid - ${error.message}`);
              throw error; // Re-throw to skip this user
            }
          }
        }

        if (!_isEmpty(orgInfo)) {
          user.orgIds = orgInfo;
        }
      } catch (error) {
        // Skip this user and continue with others
        continue;
      }
    }

    // Filter out users that had errors during org validation
    const validUsers = usersToBeRegistered.filter(user => user.orgIds);

    if (validUsers.length === 0) {
      toast.add({
        severity: 'error',
        summary: 'No valid users to register',
        detail: 'All users had errors during organization validation',
        life: 5000,
      });
      activeSubmit.value = false;
      return;
    }

    // Split users into chunks of 700
    const chunkedUsersToBeRegistered = _chunk(validUsers, 700);

    let processedUserCount = 0;
    let failedUsers = [];

    for (const users of chunkedUsersToBeRegistered) {
      try {
        const processedUsers = users.map(user => {
          const processedUser = { ...user };
          const userTypeField = Object.keys(user).find(key => key.toLowerCase() === 'usertype');
          
          if (userTypeField && userTypeField !== 'userType') {
            processedUser.userType = user[userTypeField];
            delete processedUser[userTypeField];
          }
          
          return processedUser;
        });

        const res = await authStore.createUsers(processedUsers);
        
        if (!res.data || !res.data.data) {
          throw new Error('Invalid response from server');
        }

        const currentRegisteredUsers = res.data.data;
        
        currentRegisteredUsers.forEach((registeredUser, index) => {
          const rawUserIndex = processedUserCount + index;
          if (rawUserIndex < rawUserFile.value.length) {
            rawUserFile.value[rawUserIndex].email = registeredUser.email;
            rawUserFile.value[rawUserIndex].password = registeredUser.password;
            rawUserFile.value[rawUserIndex].uid = registeredUser.uid;
          }
        });

        registeredUsers.value.push(...currentRegisteredUsers);
        processedUserCount += currentRegisteredUsers.length;

        toast.add({
          severity: 'success',
          summary: 'User Creation Successful',
          detail: `Successfully registered ${currentRegisteredUsers.length} users`,
          life: 9000
        });

      } catch (error) {
        // Add failed users to error table
        users.forEach(user => {
          addErrorUser(user, `Registration failed: ${error.message}`);
          failedUsers.push(user);
        });

        toast.add({
          severity: 'error',
          summary: 'Error registering users',
          detail: `Failed to register ${users.length} users: ${error.message}`,
          life: 9000,
        });
      }
    }

    // If we have any registered users, convert to CSV
    if (registeredUsers.value.length > 0) {
      convertUsersToCSV();
    }

    // Show summary of results
    if (failedUsers.length > 0) {
      toast.add({
        severity: 'warn',
        summary: 'Registration Summary',
        detail: `Successfully registered ${registeredUsers.value.length} users. ${failedUsers.length} users failed. See error table for details.`,
        life: 9000,
      });
    }

  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Unexpected Error',
      detail: `An unexpected error occurred: ${error.message}`,
      life: 9000,
    });
  } finally {
    activeSubmit.value = false;
  }
}


const csvBlob = ref(null);
const csvURL = ref(null);

function convertUsersToCSV() {
  const headerObj = toRaw(rawUserFile.value[0]);

  // Convert Objects to CSV String
  const csvHeader = Object.keys(headerObj).join(',') + '\n';
  const csvRows = rawUserFile.value
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
  // If there are no error users yet, generate the columns before displaying the table
  if (_isEmpty(errorUserColumns.value)) {
    errorUserColumns.value = generateColumns(user);
    showErrorTable.value = true;
  }
  
  // Add error message to the list
  errorMessages.value.push(error);
  
  // Add user to error table
  errorUsers.value.push(user);
}

// TODO: Refactor this to be a single call
const orgIds = {
  districts: {},
  schools: {},
  classes: {},
  groups: {},
};

  /**
 * Retrieves the ID of an organization based on its type and name.
 * If the ID is not already cached, it fetches it from the server.
 *
 * @async
 * @function getOrgId
 * @param {string} orgType - The type of organization (e.g., 'districts', 'schools', 'classes', 'groups').
 * @param {string} orgName - The name of the organization.
 * @param {Object|undefined} parentDistrict - The parent district reference, if applicable.
 * @param {Object|undefined} parentSchool - The parent school reference, if applicable.
 * @returns {Promise<String>} A promise that resolves to a string representing the organization ID.
 * @throws {Error} Throws an error if no organizations are found for the given type and name.
 *
 * @example
 * // Get the ID for a school
 * const schoolInfo = await getOrgId('schools', 'High School A', districtRef, undefined);
 *
 * @description
 * This function first checks if the organization ID is already cached in the `orgIds.value` object.
 * If not, it calls the `fetchOrgByName` function to retrieve the organization details from the server.
 * The fetched data is then cached for future use.
 * If no organizations are found, it throws an error.
 */
const getOrgId = async (orgType, orgName, parentDistrict, parentSchool) => {
  if (orgIds[orgType][orgName]) return orgIds[orgType][orgName];

  // Array of objects. Ex: [{abbreviation: 'LVT', id: 'lut54353jkler'}]
  const orgs = await fetchOrgByName(orgType, orgName, parentDistrict, parentSchool);

  if (orgs.length === 0) {
    throw new Error(`No organizations found for ${orgType} '${orgName}'`);
  }

  orgIds[orgType][orgName] = orgs[0].id;

  return orgs[0].id;
};

</script>

<style scoped>
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
  margin-top: 2rem;
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
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  font-size: 0.8rem;
  font-weight: 600;
  height: 2.5rem;
  width: auto;
}


.continue-button {
  color: white;
  border: none;
  border-radius: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  height: 3.5rem;
  width: auto;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.error {
  color: red;
}

.datatable {
  border: 1px solid var(--surface-d);
  border-radius: 5px;
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

.error-messages {
  margin-bottom: 1rem;
  padding: 0.5rem;
  background-color: var(--surface-100);
  border-radius: 5px;
  max-height: 200px;
  overflow-y: auto;
}

.error-message {
  color: var(--red-600);
  margin: 0.5rem 0;
  font-style: italic;
}
</style>
