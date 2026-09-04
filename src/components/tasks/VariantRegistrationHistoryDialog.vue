<template>
  <PvDialog
    :draggable="false"
    :visible="visible"
    modal
    style="width: 100%; max-width: 36rem"
    @update:visible="onVisibleChange"
  >
    <template #header>
      <div class="flex flex-column gap-1">
        <h2 class="m-0 font-bold">Registration history</h2>
        <p class="m-0 text-gray-500 text-sm">
          Registered / deregistered revisions for variant
          <code>{{ variantId }}</code>
        </p>
      </div>
    </template>

    <div class="flex flex-column gap-3 mt-2">
      <div v-if="isFetching" class="flex align-items-center gap-2 text-gray-500">
        <i class="pi pi-spin pi-spinner" />
        <span>Loading revisions...</span>
      </div>

      <div
        v-else-if="isError"
        class="flex align-items-center gap-2 p-3 surface-100 border-round border-1 border-red-500"
      >
        <i class="pi pi-exclamation-triangle text-red-600" />
        <span class="text-red-800">Unable to load registration history.</span>
      </div>

      <div
        v-else-if="!revisions?.length"
        class="flex align-items-center gap-2 p-3 surface-100 border-round border-1 border-200"
      >
        <i class="pi pi-info-circle text-gray-500" />
        <span>No revisions found for this variant.</span>
      </div>

      <ol v-else class="list-none m-0 p-0 flex flex-column gap-3">
        <li
          v-for="revision in revisions"
          :key="revision.id"
          class="surface-50 border-1 border-200 border-round p-3 flex flex-column gap-2"
        >
          <div class="flex flex-wrap align-items-center justify-content-between gap-2">
            <PvTag
              rounded
              :severity="revision.registered ? 'success' : 'secondary'"
              :value="revision.registered ? 'Registered' : 'Unregistered'"
            />
            <span class="text-sm text-gray-500">{{ formatTimestamp(revision.updatedAt) }}</span>
          </div>
          <div class="text-sm text-gray-600">
            Updated by: {{ revision.updatedBy || '—' }}
          </div>
          <div class="text-xs text-gray-400">Revision ID: {{ revision.id }}</div>
        </li>
      </ol>
    </div>

    <template #footer>
      <PvButton label="Close" severity="secondary" text @click="close" />
    </template>
  </PvDialog>
</template>

<script setup lang="ts">
import PvButton from 'primevue/button';
import PvDialog from 'primevue/dialog';
import PvTag from 'primevue/tag';
import { computed } from 'vue';
import useTaskVariantRevisionsQuery from '@/composables/queries/useTaskVariantRevisionsQuery';

interface Props {
  visible: boolean;
  variantId?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  variantId: null,
});

const emit = defineEmits<{
  'update:visible': [value: boolean];
}>();

const {
  data: revisions,
  isFetching,
  isError,
} = useTaskVariantRevisionsQuery({
  variantId: computed(() => props.variantId || undefined),
  enabled: computed(() => props.visible && Boolean(props.variantId)),
});

function onVisibleChange(value: boolean): void {
  emit('update:visible', value);
}

function close(): void {
  emit('update:visible', false);
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '—';
  return date.toLocaleString();
}
</script>
