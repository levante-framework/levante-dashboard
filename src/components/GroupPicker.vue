<template>
  <div class="grid">
    <div class="col-12 md:col-8">
      <PvPanel class="m-0 p-0 h-full">
        <template #header>
          <div class="flex align-items-center font-bold">
            Select {{ forParentOrg ? 'Parent Site' : 'Group(s)' }}
            <span class="required-asterisk text-red-500 ml-1">*</span>
          </div>
        </template>
        <PvTabView v-if="claimsLoaded" v-model:active-index="activeIndex" class="m-0 p-0 org-tabs" lazy>
          <PvTabPanel v-for="orgType in orgHeaders" :key="orgType" :header="orgType.header">
            <div class="grid column-gap-3">
              <div
                v-if="activeOrgType === 'schools' || activeOrgType === 'classes'"
                class="col-6 md:col-5 lg:col-5 xl:col-5 mt-3"
              >
                <PvFloatLabel>
                  <PvSelect
                    id="district"
                    v-model="selectedDistrict"
                    input-id="district"
                    :options="allDistricts"
                    option-label="name"
                    option-value="id"
                    :loading="isLoadingDistricts"
                    class="w-full"
                    data-cy="dropdown-selected-district"
                  />
                  <label for="district">Select from Site</label>
                </PvFloatLabel>
              </div>
              <div v-if="orgType.id === 'classes'" class="col-6 md:col-5 lg:col-5 xl:col-5 mt-3">
                <PvFloatLabel>
                  <PvSelect
                    id="school"
                    v-model="selectedSchool"
                    input-id="school"
                    :options="allSchools"
                    option-label="name"
                    option-value="id"
                    :loading="isLoadingSchools"
                    class="w-full"
                    data-cy="dropdown-selected-school"
                  />
                  <label for="school">Select from school</label>
                </PvFloatLabel>
              </div>
            </div>
            <div class="card flex justify-content-center">
              <PvListbox
                v-model="selectedOrgs[activeOrgType]"
                :options="orgData"
                :multiple="!forParentOrg"
                :meta-key-selection="false"
                option-label="name"
                class="w-full"
                list-style="max-height:20rem"
                checkmark
              >
              </PvListbox>
            </div>
          </PvTabPanel>
        </PvTabView>
      </PvPanel>
    </div>
    <div v-if="!forParentOrg" class="col-12 md:col-4">
      <PvPanel class="h-full">
        <template #header>
          <div class="flex align-items-center font-bold">
            Selected Groups
            <span class="required-asterisk text-red-500 ml-1">*</span>
          </div>
        </template>
        <PvScrollPanel style="width: 100%; height: 26rem">
          <div v-for="orgKey in Object.keys(selectedOrgs)" :key="orgKey">
            <div v-if="selectedOrgs[orgKey].length > 0">
              <b>{{ _capitalize(convertToGroupName(orgKey)) }}:</b>
              <PvChip
                v-for="org in selectedOrgs[orgKey]"
                :key="org.id"
                class="m-1 surface-200 p-2 text-black border-round"
                removable
                :label="org.name"
                @remove="remove(org, orgKey)"
              />
            </div>
          </div>
        </PvScrollPanel>
      </PvPanel>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted, watch, toRaw } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { storeToRefs } from 'pinia';
import _capitalize from 'lodash/capitalize';
import _get from 'lodash/get';
import _head from 'lodash/head';
import PvChip from 'primevue/chip';
import PvSelect from 'primevue/select';
import PvListbox from 'primevue/listbox';
import PvPanel from 'primevue/panel';
import PvScrollPanel from 'primevue/scrollpanel';
import PvTabPanel from 'primevue/tabpanel';
import PvTabView from 'primevue/tabview';
import { useAuthStore } from '@/store/auth';
import { orgFetcher, orgFetchAll } from '@/helpers/query/orgs';
import { orderByDefault } from '@/helpers/query/utils';
import useUserClaimsQuery from '@/composables/queries/useUserClaimsQuery';
import useDistrictsListQuery from '@/composables/queries/useDistrictsListQuery';
import PvFloatLabel from 'primevue/floatlabel';
import { convertToGroupName } from '@/helpers';

interface OrgItem {
  id: string;
  name: string;
  districtId?: string;
  schoolId?: string;
  schools?: any[];
  classes?: any[];
}

interface OrgCollection {
  districts: OrgItem[];
  schools: OrgItem[];
  classes: OrgItem[];
  groups: OrgItem[];
  families: OrgItem[];
  [key: string]: OrgItem[];
}

interface OrgHeader {
  header: string;
  id: string;
}

interface Props {
  orgs?: Partial<OrgCollection>;
  forParentOrg?: boolean;
}

interface Emits {
  selection: [orgs: OrgCollection];
}

const initialized = ref<boolean>(false);
const authStore = useAuthStore();
const { roarfirekit } = storeToRefs(authStore);

const selectedDistrict = ref<string | undefined>(undefined);
const selectedSchool = ref<string | undefined>(undefined);

const props = withDefaults(defineProps<Props>(), {
  orgs: () => ({
    districts: [],
    schools: [],
    classes: [],
    groups: [],
    families: [],
  }),
  forParentOrg: false,
});

const selectedOrgs = reactive<OrgCollection>({
  districts: [],
  schools: [],
  classes: [],
  groups: [],
  families: [],
});

// Declare computed property to watch for changes in props.orgs
const computedOrgsProp = computed((): Partial<OrgCollection> => {
  return props.orgs ?? {};
});

// Watch for changes in computedOrgsProp and update selectedOrgs
watch(
  () => computedOrgsProp.value,
  (orgs) => {
    selectedOrgs.districts = orgs.districts ?? [];
    selectedOrgs.schools = orgs.schools ?? [];
    selectedOrgs.classes = orgs.classes ?? [];
    selectedOrgs.groups = orgs.groups ?? [];
    selectedOrgs.families = orgs.families ?? [];
  },
  { immediate: true, deep: true },
);

const { isLoading: isLoadingClaims, data: userClaims } = useUserClaimsQuery({
  enabled: initialized,
});

const isSuperAdmin = computed((): boolean => Boolean(userClaims.value?.claims?.super_admin));
const adminOrgs = computed(() => userClaims.value?.claims?.adminOrgs);

const orgHeaders = computed((): Record<string, OrgHeader> => {
  if (props.forParentOrg) {
    return {
      districts: { header: 'Sites', id: 'districts' },
    };
  }

  return {
    districts: { header: 'Sites', id: 'districts' },
    schools: { header: 'Schools', id: 'schools' },
    classes: { header: 'Classes', id: 'classes' },
    groups: { header: 'Cohorts', id: 'groups' },
  };
});

const activeIndex = ref<number>(0);
const activeOrgType = computed((): string => {
  return Object.keys(orgHeaders.value)[activeIndex.value];
});

const claimsLoaded = computed((): boolean => initialized.value && !isLoadingClaims.value);

const { isLoading: isLoadingDistricts, data: allDistricts } = useDistrictsListQuery({
  enabled: claimsLoaded,
});

const schoolQueryEnabled = computed((): boolean => {
  return claimsLoaded.value && selectedDistrict.value !== undefined;
});

const { isLoading: isLoadingSchools, data: allSchools } = useQuery({
  queryKey: ['schools', selectedDistrict],
  queryFn: () => orgFetcher('schools', selectedDistrict, isSuperAdmin, adminOrgs),
  placeholderData: (previousData) => previousData,
  enabled: schoolQueryEnabled,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

const { data: orgData } = useQuery({
  queryKey: ['orgs', activeOrgType, selectedDistrict, selectedSchool],
  queryFn: () =>
    orgFetchAll(activeOrgType, selectedDistrict, selectedSchool, ref(orderByDefault), isSuperAdmin, adminOrgs, [
      'id',
      'name',
      'districtId',
      'schoolId',
      'schools',
      'classes',
    ]),
  placeholderData: (previousData) => previousData,
  enabled: claimsLoaded,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// reset selections when changing tabs if forParentOrg is true
watch(activeOrgType, () => {
  if (props.forParentOrg) {
    // Reset all selections
    Object.keys(selectedOrgs).forEach((key) => {
      if (key in selectedOrgs) {
        selectedOrgs[key as keyof OrgCollection] = [];
      }
    });
  }
});

const remove = (org: OrgItem, orgKey: keyof OrgCollection): void => {
  const rawSelectedOrgs = toRaw(selectedOrgs);
  if (Array.isArray(rawSelectedOrgs[orgKey])) {
    selectedOrgs[orgKey] = selectedOrgs[orgKey].filter((_org) => _org.id !== org.id);
  } else {
    selectedOrgs[orgKey] = [];
  }
};

let unsubscribe: (() => void) | undefined;
const init = (): void => {
  if (unsubscribe) unsubscribe();
  initialized.value = true;
};

unsubscribe = authStore.$subscribe(async (mutation, state) => {
  if ((state.roarfirekit as any)?.restConfig) init();
});

onMounted((): void => {
  if ((roarfirekit.value as any)?.restConfig) init();
});

watch(allDistricts, (newValue) => {
  selectedDistrict.value = _get(_head(newValue), 'id');
});

watch(allSchools, (newValue) => {
  selectedSchool.value = _get(_head(newValue), 'id');
});

const emit = defineEmits<Emits>();

watch(selectedOrgs, (newValue) => {
  emit('selection', newValue);
});
</script>

<style>
.p-checkbox-box.p-highlight {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

g {
  color: black;
}
.p-icon.p-chip-remove-icon {
  margin-left: 0.5rem;
}

.org-tabs .p-tabview-nav {
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
}

.org-tabs .p-tabview-nav li {
  flex: 0 0 auto;
  min-width: fit-content;
}
</style>
