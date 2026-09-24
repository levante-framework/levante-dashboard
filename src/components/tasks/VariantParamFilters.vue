<template>
  <div class="flex flex-column gap-3 p-3 surface-50 border-1 border-200 border-round">
    <div class="flex flex-wrap align-items-center justify-content-between gap-2">
      <div class="flex flex-column gap-1">
        <div class="text-sm font-medium">Param filters</div>
        <p class="text-sm text-gray-500 m-0">
          Filter this task's variants by param values. AND binds tighter than OR, like
          <code>language=en AND corpus=alpha OR language=es</code>.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <PvButton label="Add condition" icon="pi pi-plus" size="small" severity="secondary" @click="addClause" />
        <PvButton
          label="Clear"
          icon="pi pi-times"
          size="small"
          severity="secondary"
          text
          :disabled="modelValue.length === 0"
          @click="clearClauses"
        />
      </div>
    </div>

    <div v-if="modelValue.length === 0" class="text-sm text-gray-500">No conditions. Showing all variants.</div>

    <div v-else class="flex flex-column gap-2">
      <div v-for="(clause, index) in modelValue" :key="clause.id" class="flex flex-wrap align-items-end gap-2">
        <div class="flex flex-column gap-1" style="min-width: 6.5rem">
          <label :for="`filter-join-${clause.id}`" class="text-sm text-gray-500 font-medium">
            {{ index === 0 ? 'Where' : 'Join' }}
          </label>
          <PvSelect
            v-if="index > 0"
            :id="`filter-join-${clause.id}`"
            :model-value="clause.join"
            :options="joinOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            @update:model-value="(join) => updateClause(index, { join })"
          />
          <span v-else class="text-sm text-gray-600 py-2">Where</span>
        </div>

        <div class="flex flex-column gap-1" style="min-width: 12rem">
          <label :for="`filter-key-${clause.id}`" class="text-sm text-gray-500 font-medium">Param</label>
          <PvSelect
            :id="`filter-key-${clause.id}`"
            :model-value="clause.key"
            :options="keyOptions"
            placeholder="Select param"
            filter
            show-clear
            class="w-full"
            @update:model-value="(key) => updateClause(index, { key, valueToken: null })"
          />
        </div>

        <div class="flex flex-column gap-1" style="min-width: 12rem">
          <label :for="`filter-value-${clause.id}`" class="text-sm text-gray-500 font-medium">Value</label>
          <PvSelect
            :id="`filter-value-${clause.id}`"
            :model-value="clause.valueToken"
            :options="valueOptionsFor(clause.key)"
            option-label="label"
            option-value="token"
            placeholder="Select value"
            filter
            show-clear
            :disabled="!clause.key"
            class="w-full"
            @update:model-value="(valueToken) => updateClause(index, { valueToken })"
          />
        </div>

        <PvButton
          icon="pi pi-trash"
          severity="secondary"
          text
          rounded
          aria-label="Remove condition"
          @click="removeClause(index)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import PvButton from 'primevue/button';
import PvSelect from 'primevue/select';
import { computed } from 'vue';
import {
  collectVariantParamOptions,
  createVariantParamFilterClause,
  type VariantParamFilterClause,
  type VariantParamFilterJoin,
} from '@/helpers/filterVariantsByParamQuery';
import type { SerializedTaskVariant } from '@/types/taskCatalog';

const props = defineProps<{
  variants: SerializedTaskVariant[];
  modelValue: VariantParamFilterClause[];
}>();

const emit = defineEmits<{
  'update:modelValue': [clauses: VariantParamFilterClause[]];
}>();

const joinOptions = [
  { label: 'AND', value: 'AND' satisfies VariantParamFilterJoin },
  { label: 'OR', value: 'OR' satisfies VariantParamFilterJoin },
];

const paramOptions = computed(() => collectVariantParamOptions(props.variants));
const keyOptions = computed(() => paramOptions.value.keys);

function valueOptionsFor(key: string | null) {
  if (!key) return [];
  return paramOptions.value.valuesByKey[key] ?? [];
}

function addClause(): void {
  emit('update:modelValue', [...props.modelValue, createVariantParamFilterClause()]);
}

function clearClauses(): void {
  emit('update:modelValue', []);
}

function removeClause(index: number): void {
  emit(
    'update:modelValue',
    props.modelValue.filter((_, clauseIndex) => clauseIndex !== index),
  );
}

function updateClause(index: number, patch: Partial<VariantParamFilterClause>): void {
  emit(
    'update:modelValue',
    props.modelValue.map((clause, clauseIndex) => (clauseIndex === index ? { ...clause, ...patch } : clause)),
  );
}
</script>
