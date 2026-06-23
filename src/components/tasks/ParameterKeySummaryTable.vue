<template>
  <PvDataTable :value="rows" striped-rows show-gridlines class="text-sm">
    <PvColumn field="paramKey" header="Parameter key" sortable />
    <PvColumn field="taskNames" header="Task names" sortable />
    <PvColumn field="taskIds" header="Task IDs" sortable />
    <PvColumn field="variantNames" header="Variant names" sortable />
    <PvColumn field="variantIds" header="Variant IDs" sortable />
    <PvColumn field="schemaVersions" header="Schema versions" sortable />
    <PvColumn field="registeredStatuses" header="Registered" sortable />
    <PvColumn field="variantCount" header="Variants" sortable />
  </PvDataTable>
</template>

<script setup lang="ts">
import PvColumn from 'primevue/column';
import PvDataTable from 'primevue/datatable';
import type { AggregatedParamKey } from '@/helpers/parameterSummary';

interface Props {
  rows: AggregatedParamKey[];
}

defineProps<Props>();
</script>
