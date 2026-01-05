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
import _useSchoolsQuery from '@/composables/queries/_useSchoolsQuery';
import useOrgsTableQuery from '@/composables/queries/useOrgsTableQuery';
import { convertToGroupName } from '@/helpers';
import { orderByDefault } from '@/helpers/query/utils';
import { useAuthStore } from '@/store/auth';
import _capitalize from 'lodash/capitalize';
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
}

interface Emits {
  selection: [orgs: OrgCollection];
}

const authStore = useAuthStore();
const { currentSite } = storeToRefs(authStore);

const emit = defineEmits<Emits>();
const props = defineProps<Props>();

const activeHeader = ref('districts');
const orderBy = ref(orderByDefault);
const selectedSchool = ref<string | undefined>(undefined);
const selectedOrgs = reactive<OrgCollection>({
  districts: [],
  schools: [],
  classes: [],
  groups: [],
  families: [],
});

const orgHeaders = computed(() => [
  { value: 'districts', label: 'Sites' },
  { value: 'schools', label: 'Schools' },
  { value: 'classes', label: 'Classes' },
  { value: 'groups', label: 'Cohorts' },
]);

const { data: orgsData, isLoading: isLoadingOrgsData } = useOrgsTableQuery(
  activeHeader,
  currentSite,
  selectedSchool,
  orderBy,
  false, // includeCreators = false for GroupPicker
);

const { isLoading: isLoadingSchoolsData, data: schoolsData } = _useSchoolsQuery(currentSite);

const removeSelectedOrg = (orgHeader: string, selectedOrg: OrgItem) => {
  const rawSelectedOrgs = toRaw(selectedOrgs);

  if (Array.isArray(rawSelectedOrgs[orgHeader])) {
    selectedOrgs[orgHeader] = (selectedOrgs[orgHeader] ?? []).filter((org) => org.id !== selectedOrg.id);
  } else {
    selectedOrgs[orgHeader] = [];
  }
};

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
  () => [orgsData.value, activeHeader.value] as const,
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
      if (activeHeader.value && orgsData.value) {
        syncSelectedOrgsWithOrgData(activeHeader.value, orgsData.value);
      }
    }
  },
  { immediate: true, deep: true },
);

watch(selectedOrgs, (newSelectedOrgs) => {
  emit('selection', newSelectedOrgs || selectedOrgs);
});
</script>

<style lang="scss">
.selected-groups-scroll-panel {
  height: 20rem;
}
</style>
