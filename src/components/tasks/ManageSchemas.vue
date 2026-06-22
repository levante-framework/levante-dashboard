<template>
  <PvToast />
  <div class="flex flex-column gap-4 p-4">
    <h2 class="text-xl font-bold">Task schemas</h2>
    <p class="text-md text-gray-500">
      Define parameter definitions (key and type) per task. Variants use these schemas; create a schema before adding
      variants for a task.
    </p>

    <section class="flex flex-column gap-2">
      <label for="schema-task-select">
        <small class="text-gray-400 font-bold">Select task</small>
      </label>
      <PvDropdown
        id="schema-task-select"
        v-model="selectedTaskId"
        :options="formattedTasks"
        option-label="name"
        option-value="id"
        placeholder="Select task"
        :loading="isFetchingTasks"
        class="w-full max-w-md"
        @change="onTaskChange"
      />
    </section>

    <template v-if="selectedTaskId">
      <div v-if="!schemaForTask && !isSchemaLoading" class="flex align-items-center gap-2 p-3 surface-100 border-round">
        <i class="pi pi-exclamation-triangle text-orange-500" />
        <span>No schema for this task. Create one below so variants can use it.</span>
      </div>
      <div
        v-else-if="schemaForTask"
        class="flex align-items-center gap-2 p-3 surface-100 border-round mb-2"
      >
        <i class="pi pi-check-circle text-green-600" />
        <span>Schema version <strong>{{ schemaForTask.version }}</strong></span>
      </div>

      <section class="card p-4 flex flex-column gap-3">
        <h3 class="text-lg font-semibold m-0">
          {{ schemaForTask ? 'Update schema' : 'Create schema' }}
        </h3>
        <p class="text-sm text-gray-500 m-0">
          Add parameter definitions: key, type, description, and whether the parameter is required.
        </p>

        <div class="flex flex-column gap-3">
          <div
            v-for="(entry, index) in paramEntries"
            :key="index"
            class="surface-50 border-1 border-200 border-round p-3 flex flex-column gap-3"
          >
            <div class="flex align-items-center gap-2 flex-wrap">
              <PvInputText
                v-model="entry.key"
                placeholder="Param key"
                class="flex-1 min-w-10rem"
              />
              <PvDropdown
                v-model="entry.type"
                :options="paramTypes"
                option-label="label"
                option-value="value"
                placeholder="Type"
                class="w-8rem"
              />
              <div class="flex align-items-center gap-1">
                <PvCheckbox
                  v-model="entry.required"
                  :input-id="`param-required-${index}`"
                  :binary="true"
                />
                <label :for="`param-required-${index}`" class="text-sm whitespace-nowrap">Required</label>
              </div>
              <PvButton
                icon="pi pi-trash"
                severity="secondary"
                text
                rounded
                :disabled="paramEntries.length === 1"
                @click="removeParam(index)"
              />
            </div>
            <div class="flex flex-column gap-1">
              <label :for="`param-description-${index}`" class="text-sm text-gray-500 font-medium">
                Description
              </label>
              <PvTextarea
                :id="`param-description-${index}`"
                v-model="entry.description"
                placeholder="Describe what this parameter controls for researchers and admins"
                rows="2"
                auto-resize
                class="w-full"
              />
            </div>
          </div>
          <PvButton
            label="Add parameter"
            icon="pi pi-plus"
            severity="secondary"
            text
            @click="addParam"
          />
        </div>

        <div class="flex gap-2">
          <PvButton
            label="Save schema"
            icon="pi pi-save"
            :loading="isUpserting"
            :disabled="paramEntries.length === 0 || !paramEntries.every((e) => e.key.trim())"
            @click="saveSchema"
          />
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useToast } from 'primevue/usetoast';
import PvButton from 'primevue/button';
import PvCheckbox from 'primevue/checkbox';
import PvDropdown from 'primevue/dropdown';
import PvInputText from 'primevue/inputtext';
import PvTextarea from 'primevue/textarea';
import PvToast from 'primevue/toast';
import { useAuthStore } from '@/store/auth';
import useTasksQuery from '@/composables/queries/useTasksQuery';
import useTaskSchemasQuery from '@/composables/queries/useTaskSchemasQuery';
import useUpsertTaskSchemaMutation from '@/composables/mutations/useUpsertTaskSchemaMutation';
import { formatTasksForDropdown } from '@/helpers/taskFields';
import type { ParamDefinitionType, ParamDefinitions, TaskSchemaResultItem } from '@/types/taskSchema';

const toast = useToast();
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

const { isFetching: isFetchingTasks, data: tasks } = useTasksQuery(true, undefined, { enabled: initialized });
const selectedTaskId = ref<string | null>(null);
const {
  schema: schemaForTask,
  isFetching: isSchemaLoading,
} = useTaskSchemasQuery(selectedTaskId, {
  enabled: computed(() => initialized.value && !!selectedTaskId.value),
});
const { mutateAsync: upsertSchema, isPending: isUpserting } = useUpsertTaskSchemaMutation();

interface ParamEntry {
  key: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  description: string;
}

const paramEntries = ref<ParamEntry[]>([{ key: '', type: 'string', required: false, description: '' }]);

const paramTypes = [
  { label: 'String', value: 'string' },
  { label: 'Number', value: 'number' },
  { label: 'Boolean', value: 'boolean' },
];

const formattedTasks = computed(() => {
  if (!tasks.value) return [];
  return formatTasksForDropdown(tasks.value);
});

function buildParamDefinitions(): Record<string, ParamDefinitionType> {
  const defs: Record<string, ParamDefinitionType> = {};
  paramEntries.value.forEach((e) => {
    const k = e.key?.trim();
    if (k) defs[k] = { type: e.type, required: e.required, description: e.description.trim() };
  });
  return defs;
}

function loadSchemaIntoForm(schema: TaskSchemaResultItem | { paramDefinitions: ParamDefinitions } | undefined) {
  const entries: ParamEntry[] = schema
    ? Object.entries(schema.paramDefinitions).map(([key, def]) => ({
        key,
        type: def.type,
        required: def.required ?? false,
        description: def.description ?? '',
      }))
    : [{ key: '', type: 'string', required: false, description: '' }];
  paramEntries.value = entries.length ? entries : [{ key: '', type: 'string', required: false, description: '' }];
}

const onTaskChange = () => {
  loadSchemaIntoForm(schemaForTask.value ?? undefined);
};

watch(schemaForTask, (s) => {
  if (selectedTaskId.value) loadSchemaIntoForm(s ?? undefined);
}, { immediate: true });

const addParam = () => {
  paramEntries.value = [...paramEntries.value, { key: '', type: 'string', required: false, description: '' }];
};

const removeParam = (index: number) => {
  paramEntries.value = paramEntries.value.filter((_, i) => i !== index);
  if (paramEntries.value.length === 0) {
    paramEntries.value = [{ key: '', type: 'string', required: false, description: '' }];
  }
};

const saveSchema = async () => {
  const taskId = selectedTaskId.value;
  if (!taskId) return;
  const paramDefinitions = buildParamDefinitions();
  if (Object.keys(paramDefinitions).length === 0) {
    toast.add({ severity: 'warn', summary: 'Validation', detail: 'Add at least one parameter.', life: 3000 });
    return;
  }
  try {
    await upsertSchema({ taskId, paramDefinitions });
    toast.add({ severity: 'success', summary: 'Saved', detail: 'Schema saved successfully.', life: 3000 });
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save schema.', life: 3000 });
    console.error(e);
  }
};
</script>
