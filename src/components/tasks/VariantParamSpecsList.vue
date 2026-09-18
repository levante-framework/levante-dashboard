<template>
  <div class="flex flex-column gap-4 p-4">
    <div class="flex flex-wrap align-items-start justify-content-between gap-3">
      <div class="flex flex-column gap-1">
        <h2 class="text-xl font-bold m-0">Variant parameter specs</h2>
        <p class="text-md text-gray-500 m-0">Catalog of allowed variant parameter names and types.</p>
      </div>
      <PvButton label="Create param spec" icon="pi pi-plus" @click="openCreate" />
    </div>

    <div v-if="isFetching" class="flex align-items-center gap-2 text-gray-500">
      <i class="pi pi-spin pi-spinner" />
      <span>Loading parameter specs...</span>
    </div>

    <div
      v-else-if="isError"
      class="flex align-items-center gap-2 p-3 surface-100 border-round border-1 border-red-500"
    >
      <i class="pi pi-exclamation-triangle text-red-600" />
      <span class="text-red-800">Unable to load parameter specs. Please try again.</span>
    </div>

    <div
      v-else-if="!specs?.length"
      class="flex align-items-center gap-2 p-3 surface-100 border-round border-1 border-200"
    >
      <i class="pi pi-info-circle text-gray-500" />
      <span>No parameter specs found.</span>
    </div>

    <div v-else class="overflow-auto">
      <table class="w-full text-sm specs-table">
        <thead>
          <tr class="text-left text-gray-500 border-bottom-1 border-200">
            <th class="p-2 font-medium">Name</th>
            <th class="p-2 font-medium">Type</th>
            <th class="p-2 font-medium">Description</th>
            <th class="p-2 font-medium">Updated</th>
            <th class="p-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="spec in sortedSpecs" :key="spec.id" class="border-bottom-1 border-100">
            <td class="p-2 font-semibold">{{ spec.name || spec.id }}</td>
            <td class="p-2">
              <PvTag :value="spec.type" severity="secondary" rounded />
            </td>
            <td class="p-2 text-gray-700">{{ spec.description || '—' }}</td>
            <td class="p-2 text-gray-500 white-space-nowrap">{{ formatTimestamp(spec.updatedAt) }}</td>
            <td class="p-2">
              <PvButton label="Edit" icon="pi pi-pencil" severity="secondary" text size="small" @click="openEdit(spec)" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <VariantParamSpecUpsertDialog v-model:visible="dialogVisible" :spec="editingSpec" />
  </div>
</template>

<script setup lang="ts">
import PvButton from 'primevue/button';
import PvTag from 'primevue/tag';
import { computed, ref } from 'vue';
import VariantParamSpecUpsertDialog from '@/components/tasks/VariantParamSpecUpsertDialog.vue';
import useVariantParamSpecsQuery from '@/composables/queries/useVariantParamSpecsQuery';
import type { SerializedVariantParamSpec } from '@/types/taskCatalog';

const { data: specs, isFetching, isError } = useVariantParamSpecsQuery();

const dialogVisible = ref(false);
const editingSpec = ref<SerializedVariantParamSpec | null>(null);

// TODO: This lists archived specs too; consider filtering/marking archived entries.
const sortedSpecs = computed(() => {
  if (!specs.value) return [];
  return [...specs.value].sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
});

function openCreate(): void {
  editingSpec.value = null;
  dialogVisible.value = true;
}

function openEdit(spec: SerializedVariantParamSpec): void {
  editingSpec.value = spec;
  dialogVisible.value = true;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '—';
  return date.toLocaleString();
}
</script>

<style scoped>
.specs-table {
  border-collapse: collapse;
  min-width: 40rem;
}
</style>
