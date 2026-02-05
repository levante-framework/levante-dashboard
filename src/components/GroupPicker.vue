<template>
  <div class="flex gap-3 w-full">
    <PvPanel class="w-full">
      <template #header>
        <div class="flex align-items-center font-bold">
          Select Group(s)
          <span class="required-asterisk ml-1">*</span>
        </div>
      </template>

      <PvTabs v-model:value="activeHeader">
        <PvTabList>
          <PvTab v-for="header in orgHeaders" :key="header.value" :value="header.value">{{ header.label }}</PvTab>
        </PvTabList>

        <PvTabPanels>
          <PvTabPanel v-for="header in orgHeaders" :key="header.value" :value="header.value">
            <small v-if="header.value === FIRESTORE_COLLECTIONS.DISTRICTS" class="block">
              - Selecting a <span class="font-bold">site</span> will assign all schools, classes, and cohorts within it.
            </small>

            <small v-if="header.value === FIRESTORE_COLLECTIONS.SCHOOLS" class="block">
              - Selecting a <span class="font-bold">school</span> will assign all classes within it.
            </small>

            <div v-if="header.value === FIRESTORE_COLLECTIONS.CLASSES" class="mt-3">
              <PvFloatLabel>
                <PvSelect
                  v-model="selectedSchool"
                  :loading="isLoadingSchoolsData"
                  :options="schoolOptions"
                  class="w-full"
                  data-cy="dropdown-selected-school"
                  input-id="school"
                  option-disabled="disabled"
                  option-label="name"
                  option-value="id"
                  showClear
                />
                <label for="school">Select school</label>
              </PvFloatLabel>
            </div>

            <PvListbox
              v-model="selectedOrgs[activeHeader]"
              checkmark
              class="mt-3"
              filter
              multiple
              option-disabled="disabled"
              option-label="name"
              :empty-message="isLoadingOrgsData ? 'Loading options...' : 'No available options'"
              :filter-placeholder="`Search for ${header.label}`"
              :options="!isLoadingOrgsData ? orgOptions : []"
            />
          </PvTabPanel>
        </PvTabPanels>
      </PvTabs>
    </PvPanel>

    <PvPanel class="w-full">
      <template #header>
        <div class="flex align-items-center font-bold">
          Selected Group(s)
          <span class="required-asterisk ml-1">*</span>
        </div>
      </template>

      <PvScrollPanel class="selected-groups-scroll-panel w-full">
        <div v-for="orgHeader in Object.keys(selectedOrgs)" :key="orgHeader">
          <div
            v-if="selectedOrgs[orgHeader] && selectedOrgs[orgHeader].length > 0"
            class="flex align-items-center flex-wrap gap-2 w-full mb-2"
          >
            <b>{{ _capitalize(convertToGroupName(orgHeader)) }}:</b>
            <PvChip
              v-for="selectedOrg in selectedOrgs[orgHeader]"
              :key="selectedOrg.id"
              :label="selectedOrg.name"
              removable
              class="text-sm"
              @remove="removeSelectedOrg(orgHeader, selectedOrg)"
            />
          </div>
        </div>
      </PvScrollPanel>
    </PvPanel>
  </div>
</template>

<script setup lang="ts">
import _useSchoolsQuery from '@/composables/queries/_useSchoolsQuery';
import useOrgsTableQuery from '@/composables/queries/useOrgsTableQuery';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';
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

const activeHeader = ref<string>(FIRESTORE_COLLECTIONS.DISTRICTS);
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
  { value: FIRESTORE_COLLECTIONS.DISTRICTS, label: 'Sites' },
  { value: FIRESTORE_COLLECTIONS.SCHOOLS, label: 'Schools' },
  { value: FIRESTORE_COLLECTIONS.CLASSES, label: 'Classes' },
  { value: FIRESTORE_COLLECTIONS.GROUPS, label: 'Cohorts' },
]);

const schoolOptions = ref<any>([]);
const orgOptions = ref<any>([]);

const { data: orgsData, isLoading: isLoadingOrgsData } = useOrgsTableQuery(
  activeHeader,
  currentSite,
  selectedSchool,
  orderBy,
  false, // includeCreators = false for GroupPicker
);

const { isLoading: isLoadingSchoolsData, data: schoolsData } = _useSchoolsQuery(currentSite);

const isChildOfSelectedOrg = (
  activeHeader: string,
  org: OrgItem,
  districtIds: string[],
  schoolIds: string[],
): boolean => {
  switch (activeHeader) {
    case FIRESTORE_COLLECTIONS.SCHOOLS:
      return districtIds.includes(org?.districtId);

    case FIRESTORE_COLLECTIONS.GROUPS:
      return districtIds.includes(org?.parentOrgId);

    case FIRESTORE_COLLECTIONS.CLASSES:
      return districtIds.includes(org?.districtId) || schoolIds.includes(org?.schoolId);

    default:
      return false;
  }
};

watch(
  [activeHeader, orgsData, selectedOrgs, schoolsData, selectedSchool],
  ([activeHeader, orgsData, selectedOrgs, schoolsData, selectedSchool]) => {
    if (!activeHeader || !orgsData || !selectedOrgs || !schoolsData) return;

    const districtIds = (selectedOrgs[FIRESTORE_COLLECTIONS.DISTRICTS] ?? []).map((org) => org.id);
    const schoolIds = (selectedOrgs[FIRESTORE_COLLECTIONS.SCHOOLS] ?? []).map((org) => org.id);

    const schools = schoolsData.map((school: any) =>
      isChildOfSelectedOrg(activeHeader, school, districtIds, schoolIds) ? { ...school, disabled: true } : school,
    );
    schoolOptions.value = schools;

    const orgs = orgsData.map((org: OrgItem) =>
      isChildOfSelectedOrg(activeHeader, org, districtIds, schoolIds) ? { ...org, disabled: true } : org,
    );
    const shouldHideOptions = activeHeader === FIRESTORE_COLLECTIONS.CLASSES && !selectedSchool;
    orgOptions.value = shouldHideOptions ? [] : orgs;
  },
  { deep: true },
);

const removeSelectedOrg = (orgHeader: string, selectedOrg: OrgItem) => {
  const rawSelectedOrgs = toRaw(selectedOrgs);

  if (Array.isArray(rawSelectedOrgs[orgHeader])) {
    selectedOrgs[orgHeader] = (selectedOrgs[orgHeader] ?? []).filter((org) => org.id !== selectedOrg.id);
  } else {
    selectedOrgs[orgHeader] = [];
  }
};

const syncSelectedOrgsWithOrgData = (orgType: string, options: OrgItem[] | undefined) => {
  if (!options?.length) return;

  const key = orgType as keyof OrgCollection;
  const currentSelected = selectedOrgs[key];

  if (!currentSelected?.length) return;

  const optionMap = new Map(options.map((option: OrgItem) => [option.id, option]));
  const shouldPreserveOrg = key === 'classes' && selectedSchool.value;

  selectedOrgs[key] = currentSelected
    .map((org: OrgItem) => (shouldPreserveOrg && org.schoolId !== selectedSchool.value ? org : optionMap.get(org.id)))
    .filter((org): org is OrgItem => org !== undefined);
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
