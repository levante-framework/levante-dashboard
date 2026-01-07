<template>
  <div class="flex gap-3 w-full">
    <PvPanel class="w-full">
      <template #header>
        <div class="flex align-items-center font-bold">
          Select Group(s)
          <span class="required-asterisk ml-1">*</span>
        </div>
      </template>

        <PvTabs v-model:value="activeOrgTypeValue" lazy class="m-0 p-0 org-tabs">
          <PvTabList>
            <PvTab v-for="orgType in orgHeaders" :key="orgType.id" :value="orgType.id">{{ orgType.header }}</PvTab>
          </PvTabList>
          <PvTabPanels>
            <PvTabPanel v-for="orgType in orgHeaders" :key="orgType.id" :value="orgType.id">
              <div class="grid column-gap-3 mt-2">
                <div
                  v-if="!shouldUsePermissions && orgType.id !== 'districts'"
                  class="col-6 md:col-5 lg:col-5 xl:col-5 mt-3"
                >
                  <PvFloatLabel>
                    <PvSelect
                      v-model="selectedDistrict"
                      input-id="district"
                      :options="districtOptions"
                      option-label="name"
                      option-value="id"
                      :loading="isLoadingDistricts"
                      class="w-full"
                      data-cy="dropdown-selected-district"
                      showClear
                    />
                    <label for="district">Select site</label>
                  </PvFloatLabel>
                </div>

                <div v-if="orgType.id === 'classes'" class="col-6 md:col-5 lg:col-5 xl:col-5 mt-3">
                  <PvFloatLabel>
                    <PvSelect
                      v-model="selectedSchool"
                      :loading="isLoadingSchools"
                      :options="allSchools"
                      class="w-full"
                      data-cy="dropdown-selected-school"
                      input-id="school"
                      option-label="name"
                      option-value="id"
                      showClear
                    />
                    <label for="school">Select school</label>
                  </PvFloatLabel>
                </div>
              </div>
              <div class="card flex justify-content-center">
                <PvListbox
                  v-model="selectedOrgs[activeOrgType]"
                  :options="orgData"
                  :multiple="!forParentOrg"
                  :meta-key-selection="false"
                  :empty-message="isLoadingOrgData ? 'Loading options...' : 'No available options'"
                  option-label="name"
                  class="w-full"
                  list-style="max-height:20rem"
                  checkmark
                >
                </PvListbox>
              </div>
            </PvTabPanel>
          </PvTabPanels>
        </PvTabs>
      </PvPanel>
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
import _useDistrictsQuery from '@/composables/queries/_useDistrictsQuery';
import _useSchoolsQuery from '@/composables/queries/_useSchoolsQuery';
import useOrgsTableQuery from '@/composables/queries/useOrgsTableQuery';
import { convertToGroupName } from '@/helpers';
import { orderByDefault } from '@/helpers/query/utils';
import { useAuthStore } from '@/store/auth';
import _capitalize from 'lodash/capitalize';
import _get from 'lodash/get';
import _head from 'lodash/head';
import { storeToRefs } from 'pinia';
import PvChip from 'primevue/chip';
import PvFloatLabel from 'primevue/floatlabel';
import PvListbox from 'primevue/listbox';
import PvPanel from 'primevue/panel';
import PvScrollPanel from 'primevue/scrollpanel';
import PvSelect from 'primevue/select';
import PvTab from 'primevue/tab';
import PvTabList from 'primevue/tablist';
import PvTabPanel from 'primevue/tabpanel';
import PvTabPanels from 'primevue/tabpanels';
import PvTabs from 'primevue/tabs';
import { computed, reactive, ref, toRaw, watch } from 'vue';

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
  [key: string]: OrgItem[];
}

interface Props {
  orgs?: Partial<OrgCollection>;
  forParentOrg?: boolean;
}

interface Emits {
  selection: [orgs: OrgCollection];
}

const authStore = useAuthStore();
const { currentSite, shouldUsePermissions, userClaims } = storeToRefs(authStore);
const { isUserSuperAdmin } = authStore;

const emit = defineEmits<Emits>();
const props = withDefaults(defineProps<Props>(), {
  orgs: undefined,
  forParentOrg: false,
});

const claimsLoaded = computed(() => !!userClaims.value?.claims);

const activeIndex = ref(0);
const orderBy = ref(orderByDefault);
const selectedDistrict = ref<string | undefined>(undefined);
const selectedSchool = ref<string | undefined>(undefined);
const selectedOrgs = reactive<OrgCollection>({
  districts: [],
  schools: [],
  classes: [],
  groups: [],
  families: [],
});

const orgHeaders = computed(() => {
  return {
    districts: { header: 'Sites', id: 'districts' },
    schools: { header: 'Schools', id: 'schools' },
    classes: { header: 'Classes', id: 'classes' },
    groups: { header: 'Cohorts', id: 'groups' },
  };
});

const activeOrgType = computed({
  get() {
    return Object.keys(orgHeaders.value)[activeIndex.value];
  },
  set(value) {
    const keys = Object.keys(orgHeaders.value);
    activeIndex.value = keys.indexOf(value);
  },
});

const activeOrgTypeValue = activeOrgType;

const selectedSite = computed(() => (shouldUsePermissions.value ? currentSite.value : selectedDistrict.value));

const { data: districtsData, isLoading: isLoadingDistricts } = _useDistrictsQuery({
  enabled: !shouldUsePermissions.value,
});

watch(districtsData, (newDistrictsData) => {
  if (newDistrictsData && !isUserSuperAdmin()) {
    selectedDistrict.value = _get(_head(newDistrictsData), 'id');
  }
});

const { data: schoolsData, isLoading: isLoadingSchools } = _useSchoolsQuery(selectedSite);

watch(schoolsData, (newSchoolsData) => {
  if (newSchoolsData && !isUserSuperAdmin()) {
    selectedSchool.value = _get(_head(newSchoolsData), 'id');
  }
});

const districtOptions = districtsData;
const allSchools = schoolsData;

const {
  data: orgData,
  isLoading: isLoadingOrgData,
  isFetching: isFetchingOrgData,
} = useOrgsTableQuery(activeOrgType, selectedSite, selectedSchool, orderBy, {
  enabled: claimsLoaded,
});

const removeSelectedOrg = (orgHeader: string, selectedOrg: OrgItem) => {
  const rawSelectedOrgs = toRaw(selectedOrgs);

  if (Array.isArray(rawSelectedOrgs[orgHeader])) {
    selectedOrgs[orgHeader] = (selectedOrgs[orgHeader] ?? []).filter((org) => org.id !== selectedOrg.id);
  } else {
    selectedOrgs[orgHeader] = [];
  }
};

const remove = (org: OrgItem, orgKey: string) => removeSelectedOrg(orgKey, org);

const syncSelectedOrgsWithOrgData = (orgType: string, options: OrgItem[] | undefined) => {
  if (!options || options.length === 0) return;
  const key = orgType as keyof OrgCollection;
  const currentSelected = selectedOrgs[key];
  if (currentSelected && currentSelected.length > 0) {
    const optionMap = new Map(options.map((option: OrgItem) => [option.id, option]));
    selectedOrgs[key] = currentSelected
      .map((org: OrgItem) => optionMap.get(org.id))
      .filter((org: OrgItem | undefined): org is OrgItem => org !== undefined);
  }
};

watch(
  () => [orgData.value, activeOrgType.value] as const,
  ([options, orgType]) => {
    syncSelectedOrgsWithOrgData(orgType, options);
  },
);

watch(
  () => props.orgs,
  (newOrgs) => {
    if (newOrgs) {
      if (newOrgs.districts) selectedOrgs.districts = [...(newOrgs.districts ?? [])];
      if (newOrgs.schools) selectedOrgs.schools = [...(newOrgs.schools ?? [])];
      if (newOrgs.classes) selectedOrgs.classes = [...(newOrgs.classes ?? [])];
      if (newOrgs.groups) selectedOrgs.groups = [...(newOrgs.groups ?? [])];
      if (activeOrgType.value && orgData.value) {
        syncSelectedOrgsWithOrgData(activeOrgType.value, orgData.value);
      }
    }
  },
  { immediate: true, deep: true },
);

watch(selectedOrgs, (newSelectedOrgs) => {
  emit('selection', newSelectedOrgs || selectedOrgs);
});

const isLoadingOrgDataCombined = computed(() => Boolean(isLoadingOrgData.value || isFetchingOrgData.value));

// Template expects these names
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const isLoadingDistrictsCombined = isLoadingDistricts;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const isLoadingSchoolsCombined = isLoadingSchools;
</script>

<style lang="scss">
.selected-groups-scroll-panel {
  height: 20rem;
}
</style>
