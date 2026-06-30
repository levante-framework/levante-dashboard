<template>
  <div class="flex flex-column gap-4 p-4">
    <div class="flex flex-column gap-2">
      <h2 class="text-xl font-bold m-0">Parameter summary</h2>
      <p class="text-md text-gray-500 m-0">
        Browse all task variants and their configured parameters across the platform.
      </p>
    </div>

    <div class="flex flex-wrap align-items-center justify-content-between gap-3">
      <PvSelectButton v-model="viewMode" :options="viewModes" />
      <span v-if="variantSummaries?.length" class="text-sm text-gray-500">
        {{ variantSummaries.length }} variant{{ variantSummaries.length === 1 ? '' : 's' }}
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
      <span class="text-red-800">Unable to load variants. Please try again.</span>
    </div>

    <div
      v-else-if="!variantSummaries?.length"
      class="flex align-items-center gap-2 p-3 surface-100 border-round border-1 border-200"
    >
      <i class="pi pi-info-circle text-gray-500" />
      <span>No variants found.</span>
    </div>

    <template v-else>
      <div v-if="viewMode === 'Grouped by task'" class="flex flex-column gap-4">
        <section
          v-for="group in groupedVariants"
          :key="group.taskId"
          class="surface-50 border-1 border-200 border-round p-4 flex flex-column gap-3"
        >
          <div class="flex flex-wrap align-items-center justify-content-between gap-2">
            <div>
              <h3 class="text-lg font-semibold m-0">{{ group.taskName }}</h3>
              <p class="text-sm text-gray-500 m-0 mt-1">{{ group.taskId }}</p>
            </div>
            <span class="text-sm text-gray-500">
              {{ group.variants.length }} variant{{ group.variants.length === 1 ? '' : 's' }}
            </span>
          </div>

          <div class="flex flex-column gap-3">
            <article
              v-for="variant in group.variants"
              :key="`${group.taskId}-${variant.id}`"
              class="surface-0 border-1 border-200 border-round p-3"
            >
              <VariantSummaryDetails :variant="variant" />
            </article>
          </div>
        </section>
      </div>

      <div v-else class="flex flex-column gap-3">
        <article
          v-for="variant in sortedVariants"
          :key="`${variant.taskId}-${variant.id}`"
          class="surface-50 border-1 border-200 border-round p-4"
        >
          <VariantSummaryDetails :variant="variant" show-task />
        </article>
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
import VariantSummaryDetails from '@/components/tasks/VariantSummaryDetails.vue';
import type { VariantSummary } from '@/types/task';

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

function compareVariants(a: VariantSummary, b: VariantSummary): number {
  const taskCompare = (a.taskName || a.taskId).localeCompare(b.taskName || b.taskId);
  if (taskCompare !== 0) return taskCompare;
  return (a.name || a.id).localeCompare(b.name || b.id);
}

const sortedVariants = computed(() => [...(variantSummaries.value ?? [])].sort(compareVariants));

const groupedVariants = computed(() => {
  const groups = new Map<string, { taskId: string; taskName: string; variants: VariantSummary[] }>();

  for (const variant of sortedVariants.value) {
    const existing = groups.get(variant.taskId);
    if (existing) {
      existing.variants.push(variant);
      continue;
    }
    groups.set(variant.taskId, {
      taskId: variant.taskId,
      taskName: variant.taskName || variant.taskId,
      variants: [variant],
    });
  }

  return [...groups.values()].sort((a, b) => a.taskName.localeCompare(b.taskName));
});
</script>
