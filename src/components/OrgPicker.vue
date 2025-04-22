<template>
  <div class="grid">
    <div class="col-12 md:col-8">
      <PvPanel class="m-0 p-0 h-full" :header="`Select ${forParentOrg ? 'Parent Audience' : 'Audience'}`">
        <PvTabView v-if="claimsLoaded" v-model:activeIndex="activeIndex" class="m-0 p-0 org-tabs" lazy>
          <PvTabPanel v-for="orgHeader in Object.values(orgHeaders)" :key="orgHeader.id" :header="orgHeader.header">
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
                  <label for="district">Select from district</label>
                </PvFloatLabel>
              </div>
              <div v-if="activeOrgType === 'classes'" class="col-6 md:col-5 lg:col-5 xl:col-5 mt-3">
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
                v-if="activeOrgType"
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
              <div v-else class="p-4 text-center">Select a tab to view organizations.</div>
            </div>
          </PvTabPanel>
        </PvTabView>
      </PvPanel>
    </div>
    <div v-if="!forParentOrg" class="col-12 md:col-4">
      <PvPanel class="h-full" header="Selected audience">
        <PvScrollPanel style="width: 100%; height: 26rem">
          <div v-for="orgKey in Object.keys(selectedOrgs) as OrgType[]" :key="orgKey">
            <div v-if="selectedOrgs[orgKey]?.length > 0">
              <b>{{ _capitalize(orgKey) }}:</b>
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
import { reactive, ref, computed, onMounted, watch, toRaw, defineEmits } from 'vue';
import type { Ref, ComputedRef, Reactive } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import type { UseQueryReturnType, QueryObserverOptions } from '@tanstack/vue-query';
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
import type { OrgData } from '@/helpers/query/orgs';
import { orderByDefault } from '@/helpers/query/utils';
import useUserClaimsQuery from '@/composables/queries/useUserClaimsQuery';
import useDistrictsListQuery from '@/composables/queries/useDistrictsListQuery';
import PvFloatLabel from 'primevue/floatlabel';

type OrgType = 'districts' | 'schools' | 'classes' | 'groups' | 'families';

type SelectedOrgs = {
  [key in OrgType]: OrgData[];
};

interface Props {
  orgs?: Partial<SelectedOrgs>;
  forParentOrg?: boolean;
  showAllOrgs?: boolean;
}

interface OrgHeader {
  header: string;
  id: OrgType;
}

interface MinimalAdminOrgs {
  districts?: string[];
  schools?: string[];
  classes?: string[];
  groups?: string[];
  families?: string[];
}

interface UserClaimsData {
  claims?: {
    super_admin?: boolean;
    minimalAdminOrgs?: MinimalAdminOrgs;
  };
}

const initialized: Ref<boolean> = ref(false);
const authStore = useAuthStore();
const { roarfirekit } = storeToRefs(authStore);

const selectedDistrict: Ref<string | undefined> = ref(undefined);
const selectedSchool: Ref<string | undefined> = ref(undefined);

const props = withDefaults(defineProps<Props>(), {
  orgs: () => ({}),
  forParentOrg: false,
  showAllOrgs: false,
});

const emit = defineEmits<{ (e: 'selection', orgs: SelectedOrgs): void }>();

const selectedOrgs: Reactive<SelectedOrgs> = reactive({
  districts: [], 
  schools: [],
  classes: [],
  groups: [],
  families: [],
});

const computedOrgsProp: ComputedRef<Partial<SelectedOrgs>> = computed(() => {
  return props.orgs ?? {};
});

watch(
  computedOrgsProp,
  (newOrgsFromProp) => {
    (Object.keys(selectedOrgs) as OrgType[]).forEach((key) => {
      selectedOrgs[key] = Array.isArray(newOrgsFromProp[key]) ? newOrgsFromProp[key]! : [];
    });
  },
  { immediate: true, deep: true },
);

watch(
  selectedOrgs,
  (newValue) => {
    emit('selection', toRaw(newValue));
  },
  { deep: true } 
);

const userClaimsOptions: QueryObserverOptions<UserClaimsData | null, Error> = {
  enabled: initialized.value,
  queryKey: ['userClaims'],
};
const { isLoading: isLoadingClaims, data: userClaims }: UseQueryReturnType<UserClaimsData | null, Error> = useUserClaimsQuery(userClaimsOptions);

const isSuperAdmin: ComputedRef<boolean> = computed(() => Boolean(userClaims.value?.claims?.super_admin));
const adminOrgs: ComputedRef<MinimalAdminOrgs | undefined> = computed(() => userClaims.value?.claims?.minimalAdminOrgs);

const orgHeaders: ComputedRef<Record<OrgType, OrgHeader>> = computed(() => {
  const headers: Partial<Record<OrgType, OrgHeader>> = {};
  const adminOrgData = adminOrgs.value ?? {};
  const canShow = (orgType: keyof MinimalAdminOrgs) => (adminOrgData[orgType]?.length ?? 0) > 0;

  const allPossibleHeaders: Record<OrgType, OrgHeader> = { 
      districts: { header: 'Sites', id: 'districts' },
      schools: { header: 'Schools', id: 'schools' },
      classes: { header: 'Classes', id: 'classes' },
      groups: { header: 'Groups', id: 'groups' },
      families: { header: 'Families', id: 'families' },
  };

  if (props.showAllOrgs) {
    return allPossibleHeaders;
  }

  if (props.forParentOrg) {
    headers.districts = allPossibleHeaders.districts;
    headers.groups = allPossibleHeaders.groups;
  } else if (isSuperAdmin.value) {
    return allPossibleHeaders;
  } else {
    if (canShow('districts')) {
        headers.districts = allPossibleHeaders.districts;
        headers.schools = allPossibleHeaders.schools;
        headers.classes = allPossibleHeaders.classes;
    }
    if (canShow('schools') && !headers.schools) {
        headers.schools = allPossibleHeaders.schools;
        headers.classes = allPossibleHeaders.classes;
    }
    if (canShow('classes') && !headers.classes) {
        headers.classes = allPossibleHeaders.classes;
    }
    if (canShow('groups')) {
        headers.groups = allPossibleHeaders.groups;
    }
    if (canShow('families')) {
       headers.families = allPossibleHeaders.families;
    } 
  }
  return headers as Record<OrgType, OrgHeader>;
});

const activeIndex: Ref<number> = ref(0);
const activeOrgType: ComputedRef<OrgType | undefined> = computed(() => {
  const keys = Object.keys(orgHeaders.value) as OrgType[];
  return keys.length > activeIndex.value ? keys[activeIndex.value] : undefined;
});

const claimsLoaded: ComputedRef<boolean> = computed(() => initialized.value && !isLoadingClaims.value);

const districtOptions: QueryObserverOptions<OrgData[], Error> = {
    enabled: claimsLoaded.value,
    queryKey: ['districtsList'],
};
const { isLoading: isLoadingDistricts, data: allDistricts }: UseQueryReturnType<OrgData[], Error> = useDistrictsListQuery(districtOptions);

const schoolQueryEnabled: ComputedRef<boolean> = computed(() => {
  return claimsLoaded.value && selectedDistrict.value !== undefined;
});

const schoolQueryOptions: QueryObserverOptions<OrgData[], Error> = {
    queryKey: ['schoolsForDistrict', selectedDistrict], 
    queryFn: () => orgFetcher(
        'schools',
        selectedDistrict.value ?? null, 
        isSuperAdmin.value,
        adminOrgs.value,
        ['name', 'id']
    ),
    enabled: schoolQueryEnabled.value,
};
const { isLoading: isLoadingSchools, data: allSchools }: UseQueryReturnType<OrgData[], Error> = useQuery(schoolQueryOptions);

const orgDataOptions: QueryObserverOptions<OrgData[], Error> = {
  queryKey: ['orgData', activeOrgType, selectedDistrict, selectedSchool, isSuperAdmin, adminOrgs],
  queryFn: async () => {
    const currentOrgType = activeOrgType.value;
    if (!currentOrgType) return [];

    if (currentOrgType === 'districts') {
      return allDistricts.value ?? [];
    }
    if (currentOrgType === 'schools') {
      if (!selectedDistrict.value) return [];
      return await orgFetcher(currentOrgType, selectedDistrict.value, isSuperAdmin.value, adminOrgs.value, ['name', 'id']);
    }
    if (currentOrgType === 'classes') {
      if (!selectedSchool.value) return [];
      return await orgFetcher(currentOrgType, selectedSchool.value, isSuperAdmin.value, adminOrgs.value, ['name', 'id']);
    }
    if (currentOrgType === 'groups' || currentOrgType === 'families') {
        return await orgFetchAll(ref(currentOrgType), ref(null), ref(null), ref(orderByDefault), isSuperAdmin, adminOrgs, ref(['name', 'id']));
    }
    return [];
  },
  enabled: claimsLoaded.value,
};
const { isLoading: isLoadingOrgData, data: orgData }: UseQueryReturnType<OrgData[], Error> = useQuery(orgDataOptions);

function remove(org: OrgData, orgKey: OrgType): void {
  const currentSelection = selectedOrgs[orgKey];
  if (currentSelection) {
    const index = currentSelection.findIndex((o) => o.id === org.id);
    if (index > -1) {
      currentSelection.splice(index, 1);
    }
  }
}

let unsubscribe: (() => void) | undefined;
const init = () => {
  if (unsubscribe) unsubscribe();
  initialized.value = true;
};

unsubscribe = authStore.$subscribe((_mutation, state) => {
  if (state.roarfirekit?.restConfig) init();
});

onMounted(() => {
  if (roarfirekit.value?.restConfig) init();
});

watch(
  [allDistricts, allSchools],
  ([districts, schools]) => {
    if (!selectedDistrict.value && (districts?.length ?? 0) > 0) {
      selectedDistrict.value = _head(districts)?.id;
    }
    if (!selectedSchool.value && (schools?.length ?? 0) > 0) {
      selectedSchool.value = _head(schools)?.id;
    }
  },
  { immediate: true }
);
</script>

<style lang="scss">
.org-tabs .p-tabview-nav {
  @apply justify-start;
}

.p-tabview-panel {
  @apply m-0 p-0;
}

.p-listbox .p-listbox-list .p-listbox-item.p-highlight {
    background-color: var(--primary-100);
    color: var(--primary-color);
}
</style>
