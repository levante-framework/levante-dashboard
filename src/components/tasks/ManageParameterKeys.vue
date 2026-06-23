<template>
  <div class="flex flex-column gap-4 p-4">
    <div class="flex flex-column gap-2">
      <h2 class="text-xl font-bold m-0">Parameter keys</h2>
      <p class="text-md text-gray-500 m-0">
        Flatten all variant parameters by key and compare where each parameter is used across tasks and variants.
      </p>
    </div>

    <div class="flex flex-wrap align-items-center justify-content-between gap-3">
      <PvSelectButton v-model="viewMode" :options="viewModes" />
      <span v-if="flatParamKeys.length" class="text-sm text-gray-500">
        {{ flatParamKeys.length }} parameter key{{ flatParamKeys.length === 1 ? '' : 's' }}
      </span>
    </div>

    <div v-if="isFetching" class="flex align-items-center gap-2 text-gray-500">
      <i class="pi pi-spin pi-spinner" />
      <span>Loading variants...</span>
    </div>

    <div
      v-else-if="isError"
      class="flex align-items-center gap-2 p-3 surface-100 border-round border-1 border-red-500"
    >
      <i class="pi pi-exclamation-triangle text-red-600" />
      <span class="text-red-800">Unable to load parameter keys. Please try again.</span>
    </div>

    <div
      v-else-if="!flatParamKeys.length"
      class="flex align-items-center gap-2 p-3 surface-100 border-round border-1 border-200"
    >
      <i class="pi pi-info-circle text-gray-500" />
      <span>No parameter keys found across the current variants.</span>
    </div>

    <template v-else>
      <div v-if="viewMode === 'Grouped by task'" class="flex flex-column gap-4">
        <section
          v-for="group in groupedParamKeys"
          :key="group.taskId"
          class="surface-50 border-1 border-200 border-round p-4 flex flex-column gap-3"
        >
          <div class="flex flex-wrap align-items-center justify-content-between gap-2">
            <div>
              <h3 class="text-lg font-semibold m-0">{{ group.taskName }}</h3>
              <p class="text-sm text-gray-500 m-0 mt-1">{{ group.taskId }}</p>
            </div>
            <span class="text-sm text-gray-500">
              {{ group.paramKeys.length }} parameter key{{ group.paramKeys.length === 1 ? '' : 's' }}
            </span>
          </div>

          <ParameterKeySummaryTable :rows="group.paramKeys" />
        </section>
      </div>

      <div v-else class="surface-50 border-1 border-200 border-round p-4">
        <ParameterKeySummaryTable :rows="flatParamKeys" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import PvSelectButton from 'primevue/selectbutton';
import { useAuthStore } from '@/store/auth';
import useVariantSummariesQuery from '@/composables/queries/useVariantSummariesQuery';
import ParameterKeySummaryTable from '@/components/tasks/ParameterKeySummaryTable.vue';
import {
  buildFlatParamKeySummary,
  buildTaskGroupedParamKeySummary,
} from '@/helpers/parameterSummary';

const viewModes = ['Grouped by task', 'Flat list'] as const;
type ViewMode = (typeof viewModes)[number];

const viewMode = ref<ViewMode>('Grouped by task');
const initialized = ref(false);
const authStore = useAuthStore();
const { roarfirekit } = storeToRefs(authStore);

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

const {
  data: variantSummaries,
  isFetching,
  isError,
} = useVariantSummariesQuery(false, {
  enabled: computed(() => initialized.value),
});

const flatParamKeys = computed(() => buildFlatParamKeySummary(variantSummaries.value ?? []));
const groupedParamKeys = computed(() => buildTaskGroupedParamKeySummary(variantSummaries.value ?? []));
</script>
