<template>
  <PvDialog
    :draggable="false"
    :visible="visible"
    modal
    style="width: 100%; max-width: 42rem"
    @update:visible="onVisibleChange"
  >
    <template #header>
      <div class="flex flex-column gap-1">
        <h2 class="m-0 font-bold">{{ isFork ? 'Create variant from latest' : 'Create variant' }}</h2>
        <p class="m-0 text-gray-500 text-sm">
          Params are immutable after create. Saving always creates a new variant; older ones stay in the timeline.
        </p>
      </div>
    </template>

    <form class="flex flex-column gap-4 mt-2" @submit.prevent="handleSubmit">
      <div class="flex flex-column gap-1">
        <label for="variant-display-name" class="text-sm font-medium text-gray-600"
          >Display name <span class="text-red-500">*</span></label
        >
        <PvInputText id="variant-display-name" v-model="form.displayName" class="w-full" autocomplete="off" />
      </div>

      <div class="flex flex-column gap-1">
        <label for="variant-name" class="text-sm font-medium text-gray-600"
          >Internal name <span class="text-red-500">*</span></label
        >
        <PvInputText id="variant-name" v-model="form.name" class="w-full" autocomplete="off" />
      </div>

      <div class="flex align-items-center gap-2">
        <PvCheckbox v-model="form.registered" input-id="variant-registered" :binary="true" />
        <label for="variant-registered" class="text-sm">Registered</label>
      </div>

      <div class="flex flex-column gap-2">
        <div class="flex flex-wrap align-items-center justify-content-between gap-2">
          <div class="text-sm font-medium text-gray-600">Parameters</div>
          <PvButton
            type="button"
            label="Add param"
            icon="pi pi-plus"
            size="small"
            severity="secondary"
            text
            :disabled="!availableSpecOptions.length"
            @click="addParamRow"
          />
        </div>

        <p v-if="!paramSpecs?.length" class="m-0 text-sm text-gray-500">
          No param specs available. Create specs first so params can be validated.
        </p>

        <div v-for="(row, index) in form.rows" :key="row.uid" class="flex flex-wrap gap-2 align-items-end">
          <div class="flex flex-column gap-1 flex-grow-1" style="min-width: 10rem">
            <label class="text-xs text-gray-500">Key</label>
            <PvSelect
              v-model="row.key"
              :options="specOptionsForRow(row.key)"
              option-label="label"
              option-value="value"
              placeholder="Select param"
              class="w-full"
              filter
              @change="onRowKeyChange(row)"
            />
          </div>
          <div class="flex flex-column gap-1 flex-grow-1" style="min-width: 8rem">
            <label class="text-xs text-gray-500">Value ({{ rowType(row) }})</label>
            <PvSelect
              v-if="rowType(row) === 'boolean'"
              v-model="row.value"
              :options="booleanOptions"
              option-label="label"
              option-value="value"
              class="w-full"
            />
            <PvInputNumber
              v-else-if="rowType(row) === 'number'"
              v-model="row.numberValue"
              class="w-full"
              :use-grouping="false"
            />
            <PvInputText v-else v-model="row.stringValue" class="w-full" />
          </div>
          <PvButton
            type="button"
            icon="pi pi-trash"
            severity="danger"
            text
            rounded
            aria-label="Remove param"
            @click="removeParamRow(index)"
          />
        </div>
      </div>

      <small v-if="errorMessage" class="p-error">{{ errorMessage }}</small>

      <div class="flex justify-content-end gap-2 mt-2">
        <PvButton type="button" label="Cancel" severity="secondary" text :disabled="isPending" @click="close" />
        <PvButton type="submit" label="Create variant" :loading="isPending" />
      </div>
    </form>
  </PvDialog>
</template>

<script setup lang="ts">
import PvButton from 'primevue/button';
import PvCheckbox from 'primevue/checkbox';
import PvDialog from 'primevue/dialog';
import PvInputNumber from 'primevue/inputnumber';
import PvInputText from 'primevue/inputtext';
import PvSelect from 'primevue/select';
import { useToast } from 'primevue/usetoast';
import { computed, reactive, ref, watch } from 'vue';
import useCreateTaskVariantMutation from '@/composables/mutations/useCreateTaskVariantMutation';
import useVariantParamSpecsQuery from '@/composables/queries/useVariantParamSpecsQuery';
import { getCallableErrorMessage } from '@/helpers/taskCatalog';
import type { SerializedTaskVariant, VariantParamValue } from '@/types/taskCatalog';

interface ParamRow {
  uid: string;
  key: string | null;
  value: boolean | null;
  numberValue: number | null;
  stringValue: string;
  sourceType: 'boolean' | 'number' | 'string' | null;
}

interface Props {
  visible: boolean;
  taskId: string;
  sourceVariant?: SerializedTaskVariant | null;
}

const props = withDefaults(defineProps<Props>(), {
  sourceVariant: null,
});

const emit = defineEmits<{
  'update:visible': [value: boolean];
}>();

const toast = useToast();
const { mutateAsync, isPending } = useCreateTaskVariantMutation();
const { data: paramSpecs } = useVariantParamSpecsQuery({ enabled: computed(() => props.visible) });
const errorMessage = ref('');

const booleanOptions = [
  { label: 'true', value: true },
  { label: 'false', value: false },
];

const form = reactive({
  displayName: '',
  name: '',
  registered: true,
  rows: [] as ParamRow[],
});

const isFork = computed(() => Boolean(props.sourceVariant));

const availableSpecOptions = computed(() => {
  if (!paramSpecs.value) return [];
  return [...paramSpecs.value]
    .filter((spec) => !spec.archived)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((spec) => ({
      label: `${spec.name} (${spec.type})`,
      value: spec.name,
      type: spec.type,
    }));
});

function nextUid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyRow(): ParamRow {
  return { uid: nextUid(), key: null, value: null, numberValue: null, stringValue: '', sourceType: null };
}

function rowType(row: ParamRow): 'boolean' | 'number' | 'string' | 'unknown' {
  const specType = row.key ? availableSpecOptions.value.find((option) => option.value === row.key)?.type : undefined;
  return specType ?? row.sourceType ?? 'string';
}

function specOptionsForRow(currentKey: string | null) {
  const used = new Set(form.rows.map((row) => row.key).filter(Boolean));
  return availableSpecOptions.value.filter((option) => option.value === currentKey || !used.has(option.value));
}

function onRowKeyChange(row: ParamRow): void {
  row.sourceType = null;
  const type = rowType(row);
  row.value = type === 'boolean' ? false : null;
  row.numberValue = type === 'number' ? 0 : null;
  row.stringValue = '';
}

function addParamRow(): void {
  if (!availableSpecOptions.value.length) return;
  form.rows.push(emptyRow());
}

function removeParamRow(index: number): void {
  form.rows.splice(index, 1);
}

function buildParamsFromSource(source: SerializedTaskVariant | null | undefined): ParamRow[] {
  if (!source?.params) return [];
  return Object.entries(source.params).map(([key, value]) => {
    const row = emptyRow();
    row.key = key;
    if (typeof value === 'boolean') {
      row.value = value;
      row.sourceType = 'boolean';
    } else if (typeof value === 'number') {
      row.numberValue = value;
      row.sourceType = 'number';
    } else {
      row.stringValue = String(value);
      row.sourceType = 'string';
    }
    return row;
  });
}

watch(
  () => [props.visible, props.sourceVariant, props.taskId] as const,
  ([visible, source]) => {
    if (!visible) return;
    errorMessage.value = '';
    form.displayName = source?.displayName ?? source?.name ?? '';
    form.name = source?.name ?? '';
    form.registered = source?.registered ?? true;
    form.rows = buildParamsFromSource(source);
  },
  { immediate: true },
);

function onVisibleChange(value: boolean): void {
  emit('update:visible', value);
}

function close(): void {
  emit('update:visible', false);
}

function collectParams(): Record<string, VariantParamValue> | null {
  const params: Record<string, VariantParamValue> = {};

  for (const row of form.rows) {
    if (!row.key) {
      errorMessage.value = 'Each param row needs a key.';
      return null;
    }
    const type = rowType(row);
    if (type === 'boolean') {
      if (row.value === null) {
        errorMessage.value = `Choose a boolean value for ${row.key}.`;
        return null;
      }
      params[row.key] = row.value;
      continue;
    }
    if (type === 'number') {
      if (row.numberValue === null || Number.isNaN(row.numberValue)) {
        errorMessage.value = `Enter a number for ${row.key}.`;
        return null;
      }
      params[row.key] = row.numberValue;
      continue;
    }
    if (!row.stringValue.trim()) {
      errorMessage.value = `Enter a value for ${row.key}.`;
      return null;
    }
    params[row.key] = row.stringValue;
  }

  return params;
}

async function handleSubmit(): Promise<void> {
  errorMessage.value = '';
  const displayName = form.displayName.trim();
  const name = form.name.trim();
  if (!displayName) {
    errorMessage.value = 'Display name is required.';
    return;
  }
  if (!name) {
    errorMessage.value = 'Internal name is required.';
    return;
  }
  if (!props.taskId) {
    errorMessage.value = 'Select a task first.';
    return;
  }

  const params = collectParams();
  if (!params) return;

  try {
    const result = await mutateAsync({
      taskId: props.taskId,
      name,
      displayName,
      params,
      registered: form.registered,
    });
    toast.add({
      severity: 'success',
      summary: 'Variant created',
      detail: result.variant.id,
      life: 3000,
    });
    close();
  } catch (error) {
    errorMessage.value = getCallableErrorMessage(error, 'Unable to create variant.');
  }
}
</script>
