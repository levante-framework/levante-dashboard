<template>
  <PvPanel class="add-users-panel">
    <template #header>
      <div class="panel-header-content flex align-items-center justify-content-start gap-2">
        <span class="p-panel-title">Add users</span>
        <DocsButton href="https://researcher.levante-network.org/dashboard/add-users" label="Documentation" />
      </div>
    </template>
    <div class="info-message-container">
      <i class="pi pi-exclamation-circle"></i>
      <p>
        Users are added to groups. You cannot add users without first
        <router-link :to="{ name: 'ListGroups' }">creating their group(s)</router-link>.
      </p>
    </div>

    <div class="how-to-section">
      <h3>How to Add Users</h3>
      <div class="text-md text-gray-500 mb-1 line-height-3">
        Before adding users, read the
        <a href="https://researcher.levante-network.org/dashboard/add-users" target="_blank" rel="noopener noreferrer"
          >add users documentation</a
        >. Use the template below to prepare your first user information file.
      </div>
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
      <h2>User Information File Requirements</h2>
      <p>
        Formatting requirements for your user information file are detailed in the table below. For more information,
        refer to the
        <a href="https://researcher.levante-network.org/dashboard/add-users" target="_blank" rel="noopener noreferrer"
          >add users documentation</a
        >.
      </p>

      <PvAccordion v-model:value="fileRequirementsAccordionValue" class="mb-4">
        <PvAccordionPanel value="requirements">
          <PvAccordionHeader>View requirements table and notes</PvAccordionHeader>
          <PvAccordionContent>
            <PvDataTable :value="fileRequirementsTableData" show-gridlines class="requirements-table mb-4">
              <PvColumn field="column" header="Column" body-class="text-left" header-class="text-left">
                <template #body="{ data }">
                  <code class="column-name-code">{{ data.column }}</code>
                </template>
              </PvColumn>
              <PvColumn field="required" header="Value required?" body-class="text-left" header-class="text-left" />
              <PvColumn field="definition" header="Definition" body-class="text-left" header-class="text-left" />
              <PvColumn field="details" header="Details" body-class="text-left" header-class="text-left" />
            </PvDataTable>
            <p>Notes:</p>
            <ul>
              <li>Reminder: Users either belong to a School and Class OR a Cohort.</li>
              <li>
                Complete the appropriate column(s) according to the users' Group membership (School and Class OR
                Cohort).
              </li>
              <li>
                Caregivers and teachers must belong to the same group(s) as the children to which they are linked in
                order to receive the correct surveys.
              </li>
            </ul>
          </PvAccordionContent>
        </PvAccordionPanel>
      </PvAccordion>

      <PvAccordion v-model:value="siteColumnAccordionValue" class="mb-6">
        <PvAccordionPanel value="site-column">
          <PvAccordionHeader>What if my user file has a site column?</PvAccordionHeader>
          <PvAccordionContent>
            <p>
              Previously, <code>site</code> was a required column in the user information file. Now it is no longer
              required, because all users will be added to the site chosen within the site selector on the top right of
              the dashboard. If <code>site</code> exists in your spreadsheet and its values do not match the selected
              site, you will see a warning. We recommend having a separate user information file for each site.
            </p>
          </PvAccordionContent>
        </PvAccordionPanel>
      </PvAccordion>

      <p>
        Below is an example of what your CSV/spreadsheet should look like. Column names must match exactly. Columns with
        names that do not match exactly, including any additional columns, will not be processed or stored.
      </p>

      <div class="csv-example-image-container">
        <img
          id="add-users-example-image"
          :src="LEVANTE_STATIC_ASSETS_URL + '/add_users_example_with_permissions.png'"
          alt="Add Users CSV Example "
          class="csv-example-image"
        />
      </div>
      <p>
        Once you have uploaded a valid file and clicked "Add Users", the platform will automatically download a
        <code>registered-users.csv</code> file with login information and LEVANTE <code>uid</code>s for each user.
      </p>
    </div>
  </PvPanel>
</template>

<script setup lang="ts">
import { LEVANTE_STATIC_ASSETS_URL } from '@/constants/bucket';
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

const fileRequirementsAccordionValue = ref(null);
const siteColumnAccordionValue = ref(null);

const fileRequirementsTableData = [
  {
    column: 'id',
    required: 'Yes',
    definition: 'Project id; A lab- or site-specific user identifier',
    details: 'Often a study acronym and a number. Example: hkl_012',
  },
  {
    column: 'userType',
    required: 'Yes',
    definition: 'Type of dashboard user',
    details: 'Must be one of “child”, “caregiver”, or “teacher”',
  },
  {
    column: 'month',
    required: 'Yes, for child users only',
    definition: 'Month the child user was born',
    details: 'A number from 1 to 12. Example: 5 for May',
  },
  {
    column: 'year',
    required: 'Yes, for child users only',
    definition: 'Year the child user was born',
    details: 'Four-digit year. Example: 2017',
  },
  {
    column: 'caregiverId',
    required: 'For linking step only',
    definition: 'id of the child’s caregiver',
    details:
      'If you are ready to link users, you can include these fields in your new user information CSV file. If you are not ready, you can leave this field blank until later.',
  },
  {
    column: 'teacherId',
    required: 'For linking step only',
    definition: 'id of the child’s teacher',
    details:
      'If you are ready to link users, you can include these fields in your new user information CSV file. If you are not ready, you can leave this field blank until later.',
  },
  {
    column: 'school',
    required: 'See notes',
    definition: 'Relevant school name you created in the “Add Groups” step.',
    details: 'Example: LEVANTE School',
  },
  {
    column: 'class',
    required: 'See notes',
    definition: 'Relevant class name you created in the “Add Groups” step.',
    details: 'Example: Class A',
  },
  {
    column: 'cohort',
    required: 'See notes',
    definition: 'Relevant cohort name you created in the “Add Groups” step.',
    details: 'Example: How Kids Learn Study',
  },
];

const generateTemplateFile = () => {
  const headers = ['id', 'userType', 'month', 'year', 'caregiverId', 'teacherId', 'school', 'class', 'cohort'];
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

.panel-header-content :deep(.docs-button) {
  font-size: 0.875rem;
  padding: 0.375rem 0.75rem;
}

.file-requirements-section h2 {
  font-weight: var(--p-panel-title-font-weight);
}

.requirements-table :deep(td),
.requirements-table :deep(th),
.requirements-table :deep([data-pc-section='bodycell']),
.requirements-table :deep([data-pc-section='columnheader']) {
  text-align: left !important;
}

.requirements-table :deep([data-pc-section='columnheadercontent']) {
  justify-content: flex-start !important;
}

.requirements-table :deep(.column-name-code) {
  font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace;
  font-size: 0.9em;
  padding: 0.2em 0.4em;
  background-color: #f1f3f4;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
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

  .csv-example-image {
    width: auto;
    max-height: 180px;
    max-width: 90%;
    display: block;
  }
}
</style>
