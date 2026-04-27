<template>
  <PvDataTable
    v-if="rows.length"
    :value="rows"
    show-gridlines
    :row-hover="true"
    :resizable-columns="true"
    paginator
    :always-show-paginator="false"
    :rows="10"
    class="datatable mb-3"
  >
    <PvColumn
      v-for="(key, i) of keys"
      :key="key"
      :field="key"
      :header-style="{ textAlign: 'left' }"
      :body-style="{ textAlign: 'left' }"
    >
      <template #header>
        <b>{{ headers?.[i] ?? key }}</b>
      </template>
      <template #body="{ data }">
        <span>{{ formatCell(data[key]) }}</span>
      </template>
    </PvColumn>
  </PvDataTable>
</template>

<script setup lang="ts">
import PvColumn from 'primevue/column';
import PvDataTable from 'primevue/datatable';

defineProps<{
  headers?: string[];
  keys: string[];
  rows: Record<string, unknown>[];
}>();

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) {
    return value.length > 5 ? 'Many rows affected, download Error CSV for details' : value.join(', ');
  }
  return String(value);
}
</script>

<style lang="scss" scoped>
.datatable {
  border: 1px solid var(--surface-d);
  border-radius: 5px;
  margin: 1rem 0 0;
}
</style>
