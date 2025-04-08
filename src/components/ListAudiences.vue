<template>
  <PvToast />
  <main class="container main">
    <section class="main-body">
      <div class="flex flex-column mb-5">
        <div class="flex justify-content-between mb-2">
          <div class="flex align-items-center gap-3">
            <div class="admin-page-header mr-4">Audiences</div>
             <PvButton
              class="bg-primary text-white border-none p-2 ml-auto"
              @click="addUsers"
            >
              Add Users
            </PvButton>
            <PvButton
              class="bg-primary text-white border-none p-2 ml-auto"
              @click="newAudience"
            >
              New Audience
            </PvButton>
          </div>
        </div>
      </div>
      <PvTabView v-if="claimsLoaded" v-model:active-index="activeIndex" lazy class="mb-7">
        <PvTabPanel v-for="orgType in orgHeaders" :key="orgType" :header="orgType.header">
          <div class="grid column-gap-3 mt-2">
            <div
              v-if="activeOrgType === 'schools' || activeOrgType === 'classes'"
              class="col-12 md:col-6 lg:col-3 xl:col-3 mt-3"
            >
              <PvFloatLabel>
                <PvSelect
                  v-model="selectedDistrict"
                  input-id="district"
                  :options="allDistricts"
                  option-label="name"
                  option-value="id"
                  :loading="isLoadingDistricts"
                  class="w-full"
                  data-cy="dropdown-parent-district"
                />
                <label for="district">District</label>
              </PvFloatLabel>
            </div>
            <div v-if="orgType.id === 'classes'" class="col-12 md:col-6 lg:col-3 xl:col-3 mt-3">
              <PvFloatLabel>
                <PvSelect
                  v-model="selectedSchool"
                  input-id="school"
                  :options="allSchools"
                  option-label="name"
                  option-value="id"
                  :loading="isLoadingSchools"
                  class="w-full"
                  data-cy="dropdown-parent-school"
                />
                <label for="school">School</label>
              </PvFloatLabel>
            </div>
          </div>
          <RoarDataTable
            v-if="tableData"
            :key="tableKey"
            :columns="tableColumns"
            :data="tableData"
            sortable
            :loading="isLoading || isFetching"
            :allow-filtering="false"
            @export-all="exportAll"
            @selected-org-id="showCode"
            @export-org-users="(orgId) => exportOrgUsers(orgId)"
            @edit-button="onEditButtonClick($event)"
          />
          <AppSpinner v-else />
        </PvTabPanel>
      </PvTabView>
      <AppSpinner v-else />
    </section>
    <section class="flex mt-8 justify-content-end">
      <PvDialog
        v-model:visible="isDialogVisible"
        dialog-title="text-primary"
        :style="{ width: '50rem' }"
        :draggable="false"
      >
        <template #header>
          <h1 class="text-primary font-bold m-0">Invitation</h1>
        </template>
        <p class="font-bold text-lg">Link:</p>
        <PvInputGroup>
          <PvInputText
            style="width: 70%"
            :value="`https://roar.education/register/?code=${activationCode}`"
            autocomplete="off"
            readonly
          />
          <PvButton
            class="bg-primary border-none p-2 text-white hover:bg-red-900"
            @click="copyToClipboard(`https://roar.education/register/?code=${activationCode}`)"
          >
            <i class="pi pi-copy p-2"></i>
          </PvButton>
        </PvInputGroup>
        <p class="font-bold text-lg">Code:</p>
        <PvInputGroup class="mt-3">
          <PvInputText
            style="width: 70%"
            :value="activationCode"
            autocomplete="off"
            data-cy="input-text-activation-code"
            readonly
          />
          <PvButton
            class="bg-primary border-none p-2 text-white hover:bg-red-900"
            data-cy="button-copy-invitation"
            @click="copyToClipboard(activationCode)"
          >
            <i class="pi pi-copy p-2"></i>
          </PvButton>
        </PvInputGroup>
        <div class="flex justify-content-end">
          <PvButton
            class="mt-3 bg-primary border-none border-round p-3 text-white hover:bg-red-900"
            @click="closeDialog"
            >Close</PvButton
          >
        </div>
      </PvDialog>
    </section>
  </main>
  <RoarModal
    title="Edit Organization"
    subtitle="Modify or add organization information"
    :is-enabled="isEditModalEnabled"
    @modal-closed="closeEditModal"
  >
    <EditOrgsForm :org-id="currentEditOrgId" :org-type="activeOrgType" @update:org-data="localOrgData = $event" />
    <template #footer>
      <div>
        <div class="flex gap-2">
          <PvButton
            tabindex="0"
            class="border-none border-round bg-white text-primary p-2 hover:surface-200"
            text
            label="Cancel"
            outlined
            @click="closeEditModal"
          ></PvButton>
          <PvButton
            tabindex="0"
            class="border-none border-round bg-primary text-white p-2 hover:surface-400"
            label="Save"
            @click="updateOrgData"
            ><i v-if="isSubmitting" class="pi pi-spinner pi-spin"></i
          ></PvButton>
        </div>
      </div>
    </template>
  </RoarModal>
</template>
<script setup lang="ts">
import { ref, computed, onMounted, watch, watchEffect, Ref } from 'vue';
import * as Sentry from '@sentry/vue';
import { storeToRefs } from 'pinia';
import { useToast } from 'primevue/usetoast';
import { useRouter } from 'vue-router';
import PvButton from 'primevue/button';
import PvDialog from 'primevue/dialog';
import PvSelect from 'primevue/select';
import PvInputGroup from 'primevue/inputgroup';
import PvInputText from 'primevue/inputtext';
import PvTabPanel from 'primevue/tabpanel';
import PvTabView from 'primevue/tabview';
import PvToast from 'primevue/toast';
import _get from 'lodash/get';
import _head from 'lodash/head';
import _kebabCase from 'lodash/kebabCase';
import { useAuthStore } from '@/store/auth';
import { orgFetchAll } from '@/helpers/query/orgs';
import { fetchUsersByOrg, countUsersByOrg } from '@/helpers/query/users';
import { orderByDefault, exportCsv, fetchDocById } from '@/helpers/query/utils';
import useUserType from '@/composables/useUserType';
import useUserClaimsQuery from '@/composables/queries/useUserClaimsQuery';
import useDistrictsListQuery from '@/composables/queries/useDistrictsListQuery';
import useDistrictSchoolsQuery from '@/composables/queries/useDistrictSchoolsQuery';
import useOrgsTableQuery from '@/composables/queries/useOrgsTableQuery';
import EditOrgsForm from './EditOrgsForm.vue';
import RoarModal from './modals/RoarModal.vue';
import { CSV_EXPORT_MAX_RECORD_COUNT } from '@/constants/csvExport';
import { TOAST_SEVERITIES, TOAST_DEFAULT_LIFE_DURATION } from '@/constants/toasts.ts';
import RoarDataTable from '@/components/RoarDataTable.vue';
import PvFloatLabel from 'primevue/floatlabel';
import { District } from '@/types/district';
import { SingularOrgType } from '@/types/organization';

interface TableDataItem {
  id: string;
  name: string;
  userCount: number;
  routeParams: {
    orgType: string;
    orgId: string;
    orgName: string;
    tooltip: string;
  };
}

interface TableColumn {
  field?: string;
  header: string;
  dataType?: string;
  pinned?: boolean;
  sort?: boolean;
  link?: boolean;
  routeName?: string;
  routeTooltip?: string;
  routeLabel?: string;
  routeIcon?: string;
  button?: boolean;
  eventName?: string;
  buttonIcon?: string;
  buttonLabel?: string;
  routeParams?: (row: any) => Record<string, string>;
}

interface UserClaims {
  claims?: {
    minimalAdminOrgs?: {
      districts?: any[];
      schools?: any[];
      classes?: any[];
      groups?: any[];
      families?: any[];
    };
  };
}

interface Roarfirekit {
  restConfig?: {
    apiKey?: string;
  };
}

const router = useRouter();
const initialized = ref(false);
const selectedDistrict = ref<string | undefined>(undefined);
const selectedSchool = ref<string | undefined>(undefined);
const orderBy = ref(orderByDefault);
const activationCode = ref<string | null>(null);
const isDialogVisible = ref(false);
const toast = useToast();
const isEditModalEnabled = ref(false);
const currentEditOrgId = ref<string | null>(null);
const localOrgData = ref<any>(null);
const isSubmitting = ref(false);

const tableData = ref<TableDataItem[]>([]);

const tableColumns = computed<TableColumn[]>(() => {
  const columns: TableColumn[] = [
    { field: 'name', header: 'Name', dataType: 'string', pinned: true, sort: true },
  ];

  if (['districts', 'schools'].includes(activeOrgType.value)) {
    columns.push();
  }

  columns.push(
    {
      header: 'Users',
      link: true,
      routeName: 'ListUsers',
      routeTooltip: 'View users',
      routeLabel: 'Users',
      routeIcon: 'pi pi-user',
      sort: false,
      routeParams: (row) => {
        if (!row?.id) {
          console.warn('Missing required data for route params:', row);
          return { orgType: '', orgId: '', orgName: '' };
        }
        return {
          orgType: activeOrgType.value,
          orgId: row.id,
          orgName: row.name || 'Unnamed Organization'
        };
      }
    },
    {
      header: 'Edit',
      button: true,
      eventName: 'edit-button',
      buttonIcon: 'pi pi-pencil',
      sort: false,
    },
    {
      header: 'Export Users',
      buttonLabel: 'Export Users',
      button: true,
      eventName: 'export-org-users',
      buttonIcon: 'pi pi-download mr-2',
      sort: false,
    },
  );

  return columns;
});

watchEffect(() => {
  if (selectedDistrict.value) {
    selectedSchool.value = undefined;
  }
});

const addUsers = () => {
  router.push({ name: 'Add Users' });
};

const newAudience = () => {
  router.push({ name: 'CreateAudience' });
};

const authStore = useAuthStore();
const { roarfirekit } = storeToRefs(authStore) as { roarfirekit: Ref<Roarfirekit> };

const { data: userClaims } = useUserClaimsQuery({
  enabled: computed(() => Boolean(roarfirekit.value?.restConfig?.apiKey)),
  queryKey: ['userClaims']
}) as { data: Ref<UserClaims> };

const { isSuperAdmin } = useUserType(userClaims);
const adminOrgs = computed(() => userClaims.value?.claims?.minimalAdminOrgs);

const orgHeaders = computed(() => {
  if (!userClaims?.value?.claims) {
    return {};
  }

  const headers = {
    districts: { header: 'Districts', id: 'districts' },
    schools: { header: 'Schools', id: 'schools' },
    classes: { header: 'Classes', id: 'classes' },
    groups: { header: 'Groups', id: 'groups' },
    families: { header: 'Families', id: 'families' },
  };

  if (isSuperAdmin.value) return headers;

  const result: Record<string, { header: string; id: string }> = {};
  const adminOrgsValue = adminOrgs.value || {};

  if ((adminOrgsValue.districts ?? []).length > 0) {
    result.districts = { header: 'Districts', id: 'districts' };
    result.schools = { header: 'Schools', id: 'schools' };
    result.classes = { header: 'Classes', id: 'classes' };
  }
  if ((adminOrgsValue.schools ?? []).length > 0) {
    result.schools = { header: 'Schools', id: 'schools' };
    result.classes = { header: 'Classes', id: 'classes' };
  }
  if ((adminOrgsValue.classes ?? []).length > 0) {
    result.classes = { header: 'Classes', id: 'classes' };
  }
  if ((adminOrgsValue.groups ?? []).length > 0) {
    result.groups = { header: 'Groups', id: 'groups' };
  }
  if ((adminOrgsValue.families ?? []).length > 0) {
    result.families = { header: 'Families', id: 'families' };
  }
  return result;
});

const activeIndex = ref(0);
const activeOrgType = computed(() => {
  return Object.keys(orgHeaders.value)[activeIndex.value];
});

const claimsLoaded = computed(() => !!userClaims?.value?.claims);

const { isLoading: isLoadingDistricts, data: allDistricts } = useDistrictsListQuery({
  enabled: claimsLoaded,
});

const schoolQueryEnabled = computed(() => {
  return claimsLoaded.value && !!selectedDistrict.value;
});

const { isLoading: isLoadingSchools, data: allSchools } = useDistrictSchoolsQuery(selectedDistrict, {
  enabled: schoolQueryEnabled,
});

const {
  isLoading,
  isFetching,
  data: orgData,
} = useOrgsTableQuery(activeOrgType, selectedDistrict, selectedSchool, orderBy, {
  enabled: claimsLoaded,
});

const copyToClipboard = (text: string) => {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      toast.add({
        severity: TOAST_SEVERITIES.SUCCESS,
        summary: 'Hoorah!',
        detail: 'Your code has been successfully copied to clipboard!',
        life: TOAST_DEFAULT_LIFE_DURATION,
      });
    })
    .catch(() => {
      toast.add({
        severity: TOAST_SEVERITIES.ERROR,
        summary: 'Error!',
        detail: 'Your code has not been copied to clipboard! \n Please try again',
        life: TOAST_DEFAULT_LIFE_DURATION,
      });
    });
};

const exportAll = async () => {
  const exportData = await orgFetchAll(
    activeOrgType,
    selectedDistrict,
    selectedSchool,
    orderBy,
    isSuperAdmin,
    adminOrgs,
  );
  exportCsv(exportData, `roar-${activeOrgType.value}.csv`);
};

/**
 * Exports users of a given organization type to a CSV file.
 *
 * @NOTE In order to avoid overly large exports, the function will allow exports up to a predefined limit (currently
 * 10,000 records). To avoid running a large and potentially unecessary query, we first run an aggregation query to
 * verify that the export is within the limit.
 *
 * @TODO Replace this logic with a server driven export, for example a cloud function that generate a download link for
 * the user, effectively allowing complete and large exports.
 *
 * @param {Object} orgType - The organization type object.
 * @param {string} orgType.id - The ID of the organization type.
 * @param {string} orgType.name - The name of the organization type.
 *
 * @returns {Promise<void>} - A promise that resolves when the export is complete.
 */
const exportOrgUsers = async (orgType: { id: string; name: string }) => {
  try {
    const userCount = await countUsersByOrg(activeOrgType.value, orgType.id, orderBy);

    if (userCount === 0) {
      toast.add({
        severity: 'error',
        summary: 'Export Failed',
        detail: 'No users found for the organization.',
        life: 3000,
      });
      return;
    }

    if (userCount > CSV_EXPORT_MAX_RECORD_COUNT) {
      toast.add({
        severity: 'error',
        summary: 'Export Failed',
        detail: 'Too many users to export. Please filter the users by selecting a smaller org type.',
        life: 3000,
      });
      return;
    }

    const users = await fetchUsersByOrg(activeOrgType.value, orgType.id, userCount, ref(0), orderBy);

    const computedExportData = users.map((user) => ({
      Username: _get(user, 'username'),
      Email: _get(user, 'email'),
      FirstName: _get(user, 'name.first'),
      LastName: _get(user, 'name.last'),
      Grade: _get(user, 'studentData.grade'),
      Gender: _get(user, 'studentData.gender'),
      DateOfBirth: _get(user, 'studentData.dob'),
      UserType: _get(user, 'userType'),
      ell_status: _get(user, 'studentData.ell_status'),
      iep_status: _get(user, 'studentData.iep_status'),
      frl_status: _get(user, 'studentData.frl_status'),
      race: _get(user, 'studentData.race'),
      hispanic_ethnicity: _get(user, 'studentData.hispanic_ethnicity'),
      home_language: _get(user, 'studentData.home_language'),
    }));

    exportCsv(computedExportData, `${_kebabCase(orgType.name)}-users-export.csv`);

    toast.add({
      severity: 'success',
      summary: 'Export Successful',
      detail: 'Users have been exported successfully!',
      life: 3000,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Export Failed',
      detail: error.message,
      life: 3000,
    });
    Sentry.captureException(error);
  }
};

const tableKey = ref(0);
watch([selectedDistrict, selectedSchool], () => {
  tableKey.value += 1;
});

watch([orgData, isLoading, activeOrgType], async ([newOrgData, newIsLoading, newActiveOrgType]) => {
  if (newIsLoading || !newActiveOrgType) {
    tableData.value = [];
    return;
  }

  try {
    if (!newOrgData || !Array.isArray(newOrgData)) {
      console.warn('Invalid orgData:', newOrgData);
      tableData.value = [];
      return;
    }

    const mappedData = await Promise.all(
      newOrgData.map(async (org) => {
        if (!org?.id) {
          console.warn('Invalid organization data:', org);
          return null;
        }
        
        const userCount = await countUsersByOrg(newActiveOrgType, org.id);
        return {
          id: org.id,
          name: org.name || 'Unnamed Organization',
          userCount: userCount || 0,
          routeParams: {
            orgType: newActiveOrgType,
            orgId: org.id,
            orgName: org.name || 'Unnamed Organization'
          }
        };
      })
    );

    tableData.value = mappedData.filter(Boolean);
    console.log('Updated table data:', tableData.value);
  } catch (error) {
    console.error('Error mapping organization data:', error);
    tableData.value = [];
  }
}, );

const showCode = async (selectedOrg) => {
  const orgInfo = await fetchDocById(activeOrgType.value, selectedOrg.id);
  if (orgInfo?.currentActivationCode) {
    activationCode.value = orgInfo.currentActivationCode;
    isDialogVisible.value = true;
  }
};

const onEditButtonClick = (event) => {
  isEditModalEnabled.value = true;
  currentEditOrgId.value = _get(event, 'id', null);
};

const closeEditModal = () => {
  isEditModalEnabled.value = false;
  currentEditOrgId.value = null;
};

const closeDialog = () => {
  isDialogVisible.value = false;
};

const updateOrgData = async () => {
  isSubmitting.value = true;
  await roarfirekit.value
    .createOrg(
      activeOrgType.value,
      localOrgData.value,
      _get(localOrgData.value, 'testData', false),
      _get(localOrgData.value, 'demoData', false),
      currentEditOrgId.value,
    )
    .then(() => {
      closeEditModal();
      toast.add({
        severity: TOAST_SEVERITIES.SUCCESS,
        summary: 'Updated',
        detail: 'Organization data updated successfully!',
        life: TOAST_DEFAULT_LIFE_DURATION,
      });
    })
    .catch((error) => {
      toast.add({
        severity: TOAST_SEVERITIES.ERROR,
        summary: 'Unexpected error',
        detail: `Unexpected error occurred: ${error.message}`,
        life: TOAST_DEFAULT_LIFE_DURATION,
      });
      Sentry.captureException(error);
    })
    .finally(() => {
      isSubmitting.value = false;
    });
};

let unsubscribe;
const initTable = () => {
  if (unsubscribe) unsubscribe();
  initialized.value = true;
};

unsubscribe = authStore.$subscribe(async (mutation, state) => {
  if (state.roarfirekit?.restConfig) {
    initTable();
  }
});

onMounted(() => {
  if (roarfirekit.value?.restConfig) {
    initTable();
  }
});

watch(allDistricts, (newValue) => {
  selectedDistrict.value = _get(_head(newValue), 'id');
});

watch(allSchools, (newValue) => {
  selectedSchool.value = _get(_head(newValue), 'id');
});
</script>
