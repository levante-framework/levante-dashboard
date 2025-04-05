<script setup lang="ts">
import { ref, computed, onMounted, watch, watchEffect } from 'vue';
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
      routeParams: (row) => ({
        orgType: activeOrgType.value,
        orgId: row.id,
        orgName: row.name
      })
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

// ... rest of the existing code ...
</script>
// ... existing code ... 