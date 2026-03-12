<template>
  <PvPanel header="Add users" class="add-users-panel">
    <div class="info-message-container">
      <i class="pi pi-exclamation-circle"></i>
      <p>Your site must have groups before users are added, since users are required to be in either a school/class or cohort. <router-link :to="{ name: 'ListGroups' }">Add groups</router-link> before adding users.</p>
    </div>

    <div class="how-to-section">
      <h3>How to Add Users</h3>
      <p class="flex align-items-center gap-2">
        Before you begin, please read our full documentation on adding and linking users.
        </p>
        <p>
        <DocsButton href="https://researcher.levante-network.org/dashboard/add-users" label="Add Users Documentation" />
      </p>
      <p>Before adding users, you must prepare a user information CSV file.</p>
      <div class="download-button-container">
      <PvButton
        class="download-csv-btn"
        data-testid="download-template"
        severity="primary"
        variant="outlined"
        @click="downloadTemplate"
      >
        <i class="pi pi-download"></i>
        Download CSV Template
      </PvButton>
    </div>
    </div>
    <div class="file-requirements-section">
      <h2>File Requirements</h2>
      <p>Your add users file requires certain columns to be present and restricts or requires certain values in each row. If in doubt, refer to the <a href="https://researcher.levante-network.org/dashboard/add-users" target="_blank">detailed add users documentation</a>.</p>

      <PvAccordion v-model:value="fileRequirementsAccordionValue" class="mb-4">
        <PvAccordionPanel value="requirements">
          <PvAccordionHeader>View requirements table and notes</PvAccordionHeader>
          <PvAccordionContent>
            <PvDataTable :value="fileRequirementsTableData" show-gridlines class="requirements-table mb-4">
              <PvColumn field="column" header="Column" />
              <PvColumn field="required" header="Value required?" />
              <PvColumn field="definition" header="Definition" />
              <PvColumn field="details" header="Details" />
            </PvDataTable>
            <p>Notes:</p>
            <ul>
              <li>Either a <code>cohort</code> <em>OR</em> a <code>school</code> and <code>class</code> must be listed for every user, but not both.</li>
              <li>You can complete the fields with more than one value by putting a comma between values. For example, a child with two caregivers can have "internalid_001,internalid_002" in the <code>caregiverId</code> field.</li>
              <li>Similarly, a teacher with multiple classes can have "classA,classB" in the <code>class</code> field.</li>
              <li>When adult surveys are given to a class, teachers in that class will receive class-specific surveys for each class they belong to, as well as a general survey about themselves and their school.</li>
              <li>Caregivers must belong to the same group(s) as the children they are linked to to receive the correct surveys.</li>
            </ul>
          </PvAccordionContent>
        </PvAccordionPanel>
      </PvAccordion>

    <PvAccordion v-model:value="siteColumnAccordionValue" class="mb-6">
      <PvAccordionPanel value="site-column">
        <PvAccordionHeader>What if my user file has a site column?</PvAccordionHeader>
        <PvAccordionContent>
          <p>
            Early users of the dashboard may have user csv files which include a site column. 
            This is no longer required for the add users process. 
            The site to which users are added is now determined by the site selected in the site selector (top right). 
            The Add Users process will only add users to the currently selected site, and will display a warning if your file contains a site column with values that do not match the currently selected site. 
            Users in those rows will cause the add users process to fail. We recommend splitting up your user files by site.
          </p>
        </PvAccordionContent>
      </PvAccordionPanel>
    </PvAccordion>

    <p>
      Below is an example of what your CSV/spreadsheet should look like. Only the required columns will be processed.
    </p>

    <div class="csv-example-image-container">
      <img
        v-if="!shouldUsePermissions"
        id="add-users-example-image"
        :src="LEVANTE_STATIC_ASSETS_URL + '/add_users_example.png'"
        alt="Add Users CSV Example "
        class="csv-example-image"
      />
      <img
        v-else
        id="add-users-example-image"
        :src="LEVANTE_STATIC_ASSETS_URL + '/add_users_example_with_permissions.png'"
        alt="Add Users CSV Example "
        class="csv-example-image"
      />
    </div>
    </div>
  </PvPanel>
</template>

<script setup>
import { LEVANTE_STATIC_ASSETS_URL } from '@/constants/bucket';
import { useAuthStore } from '@/store/auth';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import DocsButton from '@/components/DocsButton.vue';
import PvColumn from 'primevue/column';
import PvDataTable from 'primevue/datatable';
import PvPanel from 'primevue/panel';
import PvButton from 'primevue/button';
import PvAccordion from 'primevue/accordion';
import PvAccordionPanel from 'primevue/accordionpanel';
import PvAccordionHeader from 'primevue/accordionheader';
import PvAccordionContent from 'primevue/accordioncontent';

const authStore = useAuthStore();
const { shouldUsePermissions } = storeToRefs(authStore);
const fileRequirementsAccordionValue = ref(null);
const siteColumnAccordionValue = ref(null);

const fileRequirementsTableData = [
  { column: 'id', required: 'Yes', definition: 'Project id; A lab- or site-specific user identifier', details: 'Often a study acronym and a number. Example: hkl_012' },
  { column: 'userType', required: 'Yes', definition: 'Type of dashboard user', details: 'Must be one of “child”, “caregiver”, or “teacher”' },
  { column: 'month', required: 'Yes, for child users only', definition: 'Month the child user was born', details: 'A number from 1 to 12. Example: 5 for May' },
  { column: 'year', required: 'Yes, for child users only', definition: 'Year the child user was born', details: 'Four-digit year. Example: 2017' },
  { column: 'caregiverId', required: 'For linking step only', definition: 'id of the child’s caregiver', details: 'If you are ready to link users, you can include these fields in your new user information CSV file. If you are not ready, you can leave this field blank until later.' },
  { column: 'teacherId', required: 'For linking step only', definition: 'id of the child’s teacher', details: 'If you are ready to link users, you can include these fields in your new user information CSV file. If you are not ready, you can leave this field blank until later.' },
  { column: 'school', required: 'See notes', definition: 'Relevant school name you created in the “Add Groups” step.', details: 'Example: LEVANTE School' },
  { column: 'class', required: 'See notes', definition: 'Relevant class name you created in the “Add Groups” step.', details: 'Example: Class A' },
  { column: 'cohort', required: 'See notes', definition: 'Relevant cohort name you created in the “Add Groups” step.', details: 'Example: How Kids Learn Study' },
];

const generateTemplateFile = () => {
  const headers = ['id', 'userType', 'month', 'year', 'caregiverId', 'teacherId', 'site', 'school', 'class', 'cohort'];

  if (shouldUsePermissions.value) {
    const siteIndex = headers.indexOf('site');
    if (siteIndex != -1) headers.splice(siteIndex, 1);
  }

  const csvContent = headers.join(',') + '\n';
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
};

const downloadTemplate = () => {
  const blob = generateTemplateFile();
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', 'add_users_template.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
</script>

<style lang="scss" scoped>
.info-message-container {
  display: flex;
  background-color: rgb(236, 141, 124);
  border: 2px solid rgb(228, 59, 7);
  border-radius: 0.5rem;
  color: rgb(131, 32, 2);
  margin-bottom: 1rem;

  p {
    font-weight: bold;
    margin: 1rem 1rem 1rem 0;
  }

  i {
    margin: 1rem;
  }
}

.field-marker {
  color: var(--bright-red);
  font-weight: bold;
  vertical-align: super;
  font-size: 0.8em;
  margin-left: 0.1em;
}

.legend {
  line-height: 1.6;
}

.nested-list {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
  padding-left: 1.5em; /* Indent nested lists */
}

.required {
  color: var(--bright-red);
}

.add-users-panel :deep(.p-panel-header) {
  font-size: 2rem;
}

.file-requirements-section h2 {
  font-weight: var(--p-panel-title-font-weight);
}

.download-button-container {
  display: flex;
  margin: 2rem 0 0;

  .download-csv-btn {
    &:hover {
      background: var(--primary-color);
      color: white;
    }
  }
}

.how-to-section {
  background-color: #f8f9fa;
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin: 2rem 0;

  h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: var(--primary-color);
    font-size: 1.2rem;
    font-weight: bold;
  }

  .numbered-steps {
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      margin-bottom: 0.75rem;
      line-height: 1.5;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }

    li:last-child {
      margin-bottom: 0;
    }

    .step-number {
      background-color: var(--primary-color);
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      flex-shrink: 0;
    }
  }
}

.csv-example-image-container {
  display: flex;
  justify-content: center;
  overflow-x: auto;
  position: relative;
  height: 123px;

  .csv-example-image {
    width: auto;
    max-height: 108px;
    display: block;
    position: absolute;
    left: 0;
  }
}
</style>
