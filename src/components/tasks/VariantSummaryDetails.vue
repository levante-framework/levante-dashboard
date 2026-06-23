<template>
  <div class="flex flex-column gap-3">
    <div class="flex flex-wrap align-items-start justify-content-between gap-2">
      <div class="flex flex-column gap-1">
        <div v-if="showTask" class="text-sm text-gray-500">
          <span class="font-medium text-gray-700">{{ variant.taskName || variant.taskId }}</span>
          <span> ({{ variant.taskId }})</span>
        </div>
        <div class="font-semibold text-lg">{{ variant.name || variant.id }}</div>
        <div class="text-sm text-gray-500">Variant ID: {{ variant.id }}</div>
      </div>
      <PvTag
        rounded
        :severity="variant.registered === false ? 'secondary' : 'success'"
        :value="variant.registered === false ? 'Unregistered' : 'Registered'"
      />
    </div>

    <div class="grid">
      <div class="col-12 md:col-6">
        <div class="text-sm text-gray-500 mb-1">Last updated</div>
        <div>{{ formatLastUpdated(variant.lastUpdated) }}</div>
      </div>
      <div class="col-12 md:col-6">
        <div class="text-sm text-gray-500 mb-1">Schema version</div>
        <div>{{ variant.schemaVersion ?? '—' }}</div>
      </div>
    </div>

    <div class="flex flex-column gap-1">
      <div class="text-sm text-gray-500 font-medium">Parameters</div>
      <pre class="m-0 p-3 surface-100 border-round border-1 border-200 text-sm overflow-auto white-space-pre-wrap">{{
        formattedParams
      }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import PvTag from 'primevue/tag';
import type { VariantSummary } from '@/types/task';

interface Props {
  variant: VariantSummary;
  showTask?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showTask: false,
});

function formatLastUpdated(value: unknown): string {
  if (value == null) return '—';
  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toLocaleString();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
  }
  return String(value);
}

const formattedParams = computed(() => {
  const params = props.variant.params;
  if (!params || Object.keys(params).length === 0) return '—';
  return JSON.stringify(params, null, 2);
});
</script>
