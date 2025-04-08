<template>
  <main class="container main">
    <section class="main-body">
      <div>
        <div class="flex flex-column">
          <div class="flex flex-row flex-wrap align-items-center justify-content-between mb-3 gap-3">
            <div class="flex flex-column gap-2">
              <div class="flex align-items-center flex-wrap gap-3 mb-2">
                <div class="admin-page-header">All Assignments</div>
              </div>
              <div class="text-md text-gray-500">This page lists all the assignments that are administered to your users.</div>
              <div class="text-md text-gray-500">You can view and monitor completion and create new bundles of tasks, surveys, and questionnaires to be administered as assignments.</div>
            </div>
            <div class="flex align-items-center gap-2 mt-2">
              <div class="flex gap-3 align-items-stretch justify-content-start">
                <div class="flex flex-column gap-1">
                  <small id="search-help" class="text-gray-400">Search by name</small>
                  <div class="flex align-items-center">
                    <PvInputGroup>
                      <PvAutoComplete
                        v-model="searchInput"
                        placeholder="Search Assignments"
                        :suggestions="searchSuggestions"
                        data-cy="search-input"
                        @complete="autocomplete"
                        @keyup.enter="onSearch"
                      />
                      <PvButton
                        icon="pi pi-search"
                        class="text-xs bg-primary border-none text-white pl-3 pr-3"
                        @click="onSearch"
                      />
                    </PvInputGroup>
                  </div>
                </div>
              </div>

              <div class="flex flex-column gap-1">
                <small for="dd-sort" class="text-gray-400">Sort by</small>
                <PvSelect
                  v-model="sortKey"
                  input-id="dd-sort"
                  :options="sortOptions"
                  option-label="label"
                  data-cy="dropdown-sort-administrations"
                  @change="onSortChange($event)"
                />
              </div>
            </div>
          </div>

          <div
            v-if="search.length > 0"
            class="flex align-items-center gap-3 text-gray-700 px-4 py-3 my-1 bg-gray-100 rounded"
          >
            <div>
              You searched for <strong>{{ search }}</strong>
            </div>
            <PvButton
              text
              class="text-xs p-2 border-none border-round text-primary hover:surface-200"
              @click="clearSearch"
            >
              Clear Search
            </PvButton>
          </div>
        </div>

        <div v-if="!isAuthStoreReady || isLoadingAdministrations" class="loading-container">
          <AppSpinner class="mb-4" />
          <span class="uppercase font-light text-sm text-gray-600">
            <template v-if="fetchTestAdministrations">Fetching Test Administrations</template>
            <template v-else>Fetching Administrations</template>
          </span>
        </div>
        <div v-else>
          <PvBlockUI :blocked="isFetchingAdministrations">
            <PvDataView
              :key="dataViewKey"
              :value="filteredAdministrations"
              paginator
              paginator-position="both"
              :total-records="filteredAdministrations?.length"
              :rows="pageLimit"
              :rows-per-page-options="[3, 5, 10, 25]"
              data-key="id"
              :sort-order="sortOrder"
              :sort-field="sortField"
            >
              <template #list="slotProps">
                <div class="mb-2 w-full">
                  <CardAdministration
                    v-for="item in slotProps.items"
                    :id="item.id"
                    :key="item.id"
                    :title="getTitle(item, isSuperAdmin)"
                    :stats="item.stats"
                    :dates="item.dates"
                    :assignees="item.assignedOrgs"
                    :assessments="item.assessments"
                    :public-name="item.publicName ?? item.name"
                    :show-params="isSuperAdmin"
                    :is-super-admin="isSuperAdmin"
                    data-cy="h2-card-admin-title"
                  />
                </div>
              </template>
              <template #empty>
                <div>
                  {{
                    isLevante
                      ? 'There are no administrations to display. You can create an administration by navigating to the' +
                        ' Create administration page from the dropdown menu.'
                      : 'There are no administrations to display. Please contact a lab administrator to add you as an admin' +
                        ' to an administration.'
                  }}
                </div>
              </template>
            </PvDataView>
          </PvBlockUI>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, ComputedRef } from 'vue';
import { storeToRefs } from 'pinia';
import PvAutoComplete from 'primevue/autocomplete';
import PvBlockUI from 'primevue/blockui';
import PvButton from 'primevue/button';
import PvDataView from 'primevue/dataview';
import PvSelect from 'primevue/select';
import PvInputGroup from 'primevue/inputgroup';
import { useAuthStore } from '@/store/auth';
// @ts-ignore - Suppress persistent type error
import { orderByDefault, OrderBy } from '@/helpers/query/utils';
// @ts-ignore - Suppress missing declaration file warning
import { getTitle } from '@/helpers/query/administrations.js';
import useUserType from '@/composables/useUserType';
import useUserClaimsQuery from '@/composables/queries/useUserClaimsQuery';
import useAdministrationsListQuery from '@/composables/queries/useAdministrationsListQuery';
import CardAdministration from '@/components/CardAdministration.vue';
import { isLevante } from '@/helpers';
import { Administration } from '@/types/administration';

interface SortOption {
  label: string;
  // @ts-ignore - Suppress persistent type error
  value: OrderBy[];
}

interface UserClaims {
  claims?: {
    roarUid?: string;
    super_admin?: boolean;
    admin?: boolean;
    minimalAdminOrgs?: Record<string, string[]>;
  };
}

interface UserTypeInfo {
  userType: ComputedRef<string | undefined>;
  isAdmin: ComputedRef<boolean>;
  isParticipant: ComputedRef<boolean>;
  isSuperAdmin: ComputedRef<boolean>;
}

const pageLimit = ref(10);
const page = ref(0);

// @ts-ignore - Suppress persistent type error
const orderBy = ref<OrderBy[]>(orderByDefault);
const searchSuggestions = ref<string[]>([]);
const searchTokens = ref<string[]>([]);
const searchInput = ref('');
const search = ref('');

const filteredAdministrations = ref<Administration[]>([]);
const fetchTestAdministrations = ref(false);

const authStore = useAuthStore();
// Use store readiness directly
const { roarfirekit, isReady: isAuthStoreReady } = storeToRefs(authStore);

console.log('[HomeAdmin Setup] Store isReady:', isAuthStoreReady.value);

// Enable queries based on store readiness
const { data: userClaims, isFetching: isFetchingClaims, status: claimsStatus } = useUserClaimsQuery({
  enabled: isAuthStoreReady, 
  queryKey: ['userClaims'],
});

// Watch the userClaims data from this component's perspective
watch(userClaims, (newClaims) => {
  console.log('[HomeAdmin] userClaims watcher triggered. New claims:', newClaims);
}, { immediate: true });

const userTypeInfo = useUserType(userClaims) as UserTypeInfo;
const isSuperAdmin = userTypeInfo.isSuperAdmin;

const generateAutoCompleteSearchTokens = () => {
  if (!administrations.value?.length) return;

  for (const item of administrations.value) {
    searchTokens.value.push(...item.name.toLowerCase().split(' '));
  }

  searchTokens.value = [...new Set(searchTokens.value)];
};

// Enable query based on store readiness
console.log('[HomeAdmin Setup] Calling useAdministrationsListQuery. Store isReady:', isAuthStoreReady.value);
const {
  isLoading: isLoadingAdministrations,
  isFetching: isFetchingAdministrations,
  data: administrations,
} = useAdministrationsListQuery(orderBy, fetchTestAdministrations.value, {
  enabled: isAuthStoreReady, 
});

// Watch administrations data (keep immediate: true if needed for initial population)
watch(administrations, (newAdmins) => {
  console.log('[HomeAdmin] administrations watcher triggered. Store ready:', isAuthStoreReady.value, 'New admins:', newAdmins);
  if (!isAuthStoreReady.value || !newAdmins) return; // Ensure store is ready before processing

  generateAutoCompleteSearchTokens();

  if (!search.value) {
    filteredAdministrations.value = newAdmins;
  } else {
    filteredAdministrations.value = newAdmins.filter((item) =>
      item.name.toLowerCase().includes(search.value.toLowerCase()),
    );
  }
}, { immediate: true }); // Keep immediate if needed, but guard with isAuthStoreReady

const sortOptions = ref<SortOption[]>([
  {
    label: 'Name (ascending)',
    value: [
      {
        field: { fieldPath: 'name' },
        direction: 'ASCENDING',
      },
    ],
  },
  {
    label: 'Name (descending)',
    value: [
      {
        field: { fieldPath: 'name' },
        direction: 'DESCENDING',
      },
    ],
  },
  {
    label: 'Start date (ascending)',
    value: [
      {
        field: { fieldPath: 'dates.start' },
        direction: 'ASCENDING',
      },
    ],
  },
  {
    label: 'Start date (descending)',
    value: [
      {
        field: { fieldPath: 'dates.start' },
        direction: 'DESCENDING',
      },
    ],
  },
  {
    label: 'End date (ascending)',
    value: [
      {
        field: { fieldPath: 'dates.end' },
        direction: 'ASCENDING',
      },
    ],
  },
  {
    label: 'End date (descending)',
    value: [
      {
        field: { fieldPath: 'dates.end' },
        direction: 'DESCENDING',
      },
    ],
  },
  {
    label: 'Creation date (ascending)',
    value: [
      {
        field: { fieldPath: 'dates.created' },
        direction: 'ASCENDING',
      },
    ],
  },
  {
    label: 'Creation date (descending)',
    value: [
      {
        field: { fieldPath: 'dates.created' },
        direction: 'DESCENDING',
      },
    ],
  },
]);

const sortKey = ref(sortOptions.value[0]);
const sortOrder = ref<number>();
const sortField = ref<string>();
const dataViewKey = ref(0);

const clearSearch = () => {
  search.value = '';
  searchInput.value = '';
  if (administrations.value) {
    filteredAdministrations.value = administrations.value;
  }
};

const onSearch = () => {
  search.value = searchInput.value;
  if (!search.value && administrations.value) {
    filteredAdministrations.value = administrations.value;
  } else if (administrations.value) {
    filteredAdministrations.value = administrations.value.filter((item) =>
      item.name.toLowerCase().includes(search.value.toLowerCase()),
    );
  }
};

const autocomplete = () => {
  searchSuggestions.value = searchTokens.value.filter((item) => {
    return item.toLowerCase().includes(searchInput.value.toLowerCase());
  });
};

const onSortChange = (event: { value: SortOption }) => {
  dataViewKey.value += 1;
  page.value = 0;
  const value = event.value.value;
  const sortValue = event.value;

  if (!isSuperAdmin.value && sortValue.value[0].field.fieldPath === 'name') {
    sortField.value = 'publicName';
  } else {
    sortField.value = value[0].field?.fieldPath;
  }
  if (value[0].direction === 'DESCENDING') {
    sortOrder.value = -1;
  } else {
    sortOrder.value = 1;
  }

  sortKey.value = sortValue;
};
</script>

<style>
.p-autocomplete-panel {
  background: var(--surface-a);
  color: var(--text-color);
  border: 0 none;
  border-radius: var(--border-radius);
  box-shadow:
    0 0 rgba(0, 0, 0, 0),
    0 0 rgba(0, 0, 0, 0),
    0 10px 15px -3px rgba(0, 0, 0, 0.1019607843),
    0 4px 6px -2px rgba(0, 0, 0, 0.0509803922);
}

.p-autocomplete-panel .p-autocomplete-items .p-autocomplete-item {
  margin: 0;
  padding: var(--inline-spacing-larger) 1rem;
  border: 0 none;
  color: var(--text-color);
  background: transparent;
  transition: none;
  border-radius: 0;
}

.p-autocomplete-panel .p-autocomplete-items .p-autocomplete-item:hover {
  background-color: gainsboro;
}

button.p-button.p-component.p-button-icon-only.p-autocomplete-dropdown {
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 20%;
  width: 3rem;
}

.card-container {
  display: flex;
  flex-direction: row;
  margin: 0 0 2rem;
  flex: 1;
  gap: 1rem;
}

.card-wrapper {
  width: 100%;
  text-decoration: none;
  color: inherit;
}

.card-button {
  display: flex;
  justify-content: flex-end;
}

.loading-container {
  width: 100%;
  text-align: center;
}
</style>
