<template>
  <div class="flex flex-column gap-4 p-4">
    <div class="flex flex-column gap-1">
      <h2 class="text-xl font-bold m-0">Variants</h2>
      <p class="text-md text-gray-500 m-0">
        Timeline of variants for a task, ordered by createdAt. Editing params creates a new variant; register status can
        be flipped on any existing variant.
      </p>
    </div>

    <div class="flex flex-wrap align-items-end gap-3">
      <div class="flex flex-column gap-1" style="min-width: 16rem">
        <label for="task-filter" class="text-sm text-gray-500 font-medium">Task</label>
        <PvSelect
          id="task-filter"
          v-model="selectedTaskId"
          :options="taskOptions"
          option-label="label"
          option-value="value"
          placeholder="Select a task"
          filter
          show-clear
          class="w-full"
          :loading="isTasksFetching"
        />
      </div>
      <span v-if="selectedTaskId && variants?.length" class="text-sm text-gray-500">
        {{ variants.length }} variant{{ variants.length === 1 ? '' : 's' }}
      </span>
      <PvButton
        v-if="selectedTaskId"
        label="New variant"
        icon="pi pi-plus"
        :disabled="isFetching"
        @click="openCreate()"
      />
    </div>

    <div v-if="!selectedTaskId" class="flex align-items-center gap-2 p-3 surface-100 border-round border-1 border-200">
      <i class="pi pi-info-circle text-gray-500" />
      <span>Select a task to view its variant timeline.</span>
    </div>

    <div v-else-if="isFetching" class="flex align-items-center gap-2 text-gray-500">
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
      v-else-if="!variants?.length"
      class="flex align-items-center gap-2 p-3 surface-100 border-round border-1 border-200"
    >
      <i class="pi pi-info-circle text-gray-500" />
      <span>No variants found for this task.</span>
    </div>

    <ol v-else class="timeline list-none m-0 p-0 flex flex-column gap-0">
      <li v-for="(entry, index) in timelineEntries" :key="entry.variant.id" class="timeline-item">
        <div class="timeline-rail" aria-hidden="true">
          <span class="timeline-dot" :class="{ 'timeline-dot-latest': entry.isLatest }" />
          <span v-if="index < timelineEntries.length - 1" class="timeline-line" />
        </div>

        <div class="flex flex-column gap-3 flex-grow-1 pb-5">
          <article class="surface-50 border-1 border-200 border-round p-4 flex flex-column gap-3">
            <div class="flex flex-wrap align-items-start justify-content-between gap-2">
              <div class="flex flex-column gap-1">
                <div class="flex flex-wrap align-items-center gap-2">
                  <div class="font-semibold text-lg">
                    {{ entry.variant.displayName || entry.variant.name || entry.variant.id }}
                  </div>
                  <PvTag v-if="entry.isLatest" value="Latest" severity="info" rounded />
                </div>
                <div class="text-sm text-gray-500">
                  Variant ID: {{ entry.variant.id }}
                  <span v-if="entry.variant.name"> · Internal: {{ entry.variant.name }}</span>
                </div>
              </div>
              <div class="flex flex-wrap align-items-center gap-3">
                <div class="flex align-items-center gap-2">
                  <PvToggleSwitch
                    :model-value="entry.variant.registered"
                    :disabled="updatingVariantId === entry.variant.id"
                    @update:model-value="(value) => toggleRegistered(entry.variant, value)"
                  />
                  <span class="text-sm">{{ entry.variant.registered ? 'Registered' : 'Unregistered' }}</span>
                </div>
                <PvButton
                  v-if="entry.isLatest"
                  label="Edit params"
                  icon="pi pi-pencil"
                  size="small"
                  severity="secondary"
                  text
                  @click="openCreate(entry.variant)"
                />
                <PvButton
                  label="Reg. history"
                  icon="pi pi-history"
                  size="small"
                  severity="secondary"
                  text
                  @click="openHistory(entry.variant)"
                />
              </div>
            </div>

            <div class="flex flex-wrap gap-4 text-sm text-gray-500">
              <span>Created: {{ formatTimestamp(entry.variant.createdAt) }}</span>
              <span v-if="entry.variant.createdBy">Created by: {{ entry.variant.createdBy }}</span>
              <span>Updated: {{ formatTimestamp(entry.variant.updatedAt) }}</span>
              <span v-if="entry.variant.updatedBy">Updated by: {{ entry.variant.updatedBy }}</span>
            </div>

            <div class="flex flex-column gap-1">
              <div class="text-sm text-gray-500 font-medium">Parameters</div>
              <pre
                class="m-0 p-3 surface-0 border-round border-1 border-200 text-sm overflow-auto white-space-pre-wrap"
                >{{ formatParams(entry.variant.params) }}</pre
              >
            </div>
          </article>

          <div
            v-if="entry.diff && hasVariantParamDiff(entry.diff)"
            class="diff-card surface-0 border-1 border-200 border-round p-3"
          >
            <div class="text-sm font-medium text-gray-600 mb-2">Changes from previous variant</div>
            <div class="flex flex-column gap-2 text-sm">
              <div v-for="(value, key) in entry.diff.added" :key="`added-${key}`" class="diff-row diff-added">
                <span class="diff-label">+ {{ key }}</span>
                <code>{{ formatParamValue(value) }}</code>
              </div>
              <div v-for="(change, key) in entry.diff.changed" :key="`changed-${key}`" class="diff-row diff-changed">
                <span class="diff-label">~ {{ key }}</span>
                <code>{{ formatParamValue(change.from) }} → {{ formatParamValue(change.to) }}</code>
              </div>
              <div v-for="(value, key) in entry.diff.removed" :key="`removed-${key}`" class="diff-row diff-removed">
                <span class="diff-label">− {{ key }}</span>
                <code>{{ formatParamValue(value) }}</code>
              </div>
            </div>
          </div>
        </div>
      </li>
    </ol>

    <VariantCreateDialog
      v-if="selectedTaskId"
      v-model:visible="createDialogVisible"
      :task-id="selectedTaskId"
      :source-variant="createSourceVariant"
    />
    <VariantRegistrationHistoryDialog
      v-model:visible="historyDialogVisible"
      :variant-id="historyVariantId"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import PvButton from 'primevue/button';
import PvSelect from 'primevue/select';
import PvTag from 'primevue/tag';
import PvToggleSwitch from 'primevue/toggleswitch';
import { useToast } from 'primevue/usetoast';
import VariantCreateDialog from '@/components/tasks/VariantCreateDialog.vue';
import VariantRegistrationHistoryDialog from '@/components/tasks/VariantRegistrationHistoryDialog.vue';
import useUpdateTaskVariantMutation from '@/composables/mutations/useUpdateTaskVariantMutation';
import useTaskVariantsCatalogQuery from '@/composables/queries/useTaskVariantsCatalogQuery';
import useTasksCatalogQuery from '@/composables/queries/useTasksCatalogQuery';
import { diffVariantParams, hasVariantParamDiff } from '@/helpers/diffVariantParams';
import { getCallableErrorMessage } from '@/helpers/taskCatalog';
import type { SerializedTaskVariant, VariantParamDiff, VariantParamValue } from '@/types/taskCatalog';

const toast = useToast();
const selectedTaskId = ref<string | undefined>(undefined);
const createDialogVisible = ref(false);
const createSourceVariant = ref<SerializedTaskVariant | null>(null);
const historyDialogVisible = ref(false);
const historyVariantId = ref<string | null>(null);
const updatingVariantId = ref<string | null>(null);

const { data: tasks, isFetching: isTasksFetching } = useTasksCatalogQuery();
const {
  data: variants,
  isFetching,
  isError,
} = useTaskVariantsCatalogQuery({
  taskId: selectedTaskId,
  enabled: computed(() => Boolean(selectedTaskId.value)),
});
const { mutateAsync: updateVariant } = useUpdateTaskVariantMutation();

const taskOptions = computed(() => {
  if (!tasks.value) return [];
  return [...tasks.value]
    .sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id))
    .map((task) => ({
      label: `${task.name || task.id} (${task.id})`,
      value: task.id,
    }));
});

interface TimelineEntry {
  variant: SerializedTaskVariant;
  diff: VariantParamDiff | null;
  isLatest: boolean;
}

const timelineEntries = computed((): TimelineEntry[] => {
  // variants arrive newest-first; diffs compare each to the chronologically older neighbor.
  const list = variants.value ?? [];
  return list.map((variant, index) => {
    const isLatest = index === 0;
    const older = list[index + 1];
    if (!older) {
      return { variant, diff: null, isLatest };
    }
    return {
      variant,
      diff: diffVariantParams(older.params, variant.params),
      isLatest,
    };
  });
});

function openCreate(source: SerializedTaskVariant | null = null): void {
  createSourceVariant.value = source;
  createDialogVisible.value = true;
}

function openHistory(variant: SerializedTaskVariant): void {
  historyVariantId.value = variant.id;
  historyDialogVisible.value = true;
}

async function toggleRegistered(variant: SerializedTaskVariant, registered: boolean): Promise<void> {
  if (registered === variant.registered) return;
  updatingVariantId.value = variant.id;
  try {
    await updateVariant({
      id: variant.id,
      archived: variant.archived === true,
      registered,
    });
    toast.add({
      severity: 'success',
      summary: registered ? 'Variant registered' : 'Variant deregistered',
      detail: variant.id,
      life: 2500,
    });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Update failed',
      detail: getCallableErrorMessage(error, 'Unable to update registration.'),
      life: 4000,
    });
  } finally {
    updatingVariantId.value = null;
  }
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '—';
  return date.toLocaleString();
}

function formatParamValue(value: VariantParamValue): string {
  return JSON.stringify(value);
}

function formatParams(params: Record<string, VariantParamValue>): string {
  try {
    return JSON.stringify(params ?? {}, null, 2);
  } catch {
    return String(params);
  }
}
</script>

<style scoped>
.timeline-item {
  display: grid;
  grid-template-columns: 1.25rem 1fr;
  column-gap: 1rem;
}

.timeline-rail {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.timeline-dot {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 9999px;
  background: #64748b;
  margin-top: 1.25rem;
  flex-shrink: 0;
}

.timeline-dot-latest {
  background: #2563eb;
}

.timeline-line {
  width: 2px;
  flex-grow: 1;
  background: #cbd5e1;
  margin-top: 0.25rem;
  min-height: 1rem;
}

.diff-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  align-items: baseline;
}

.diff-label {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 600;
  min-width: 8rem;
}

.diff-added {
  color: #166534;
}

.diff-changed {
  color: #92400e;
}

.diff-removed {
  color: #991b1b;
}
</style>
