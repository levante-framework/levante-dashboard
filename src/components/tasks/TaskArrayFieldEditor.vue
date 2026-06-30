<template>
  <div class="flex flex-column gap-2 flex-grow-1">
    <div class="flex flex-wrap align-items-center gap-2">
      <PvDropdown
        :model-value="itemType"
        :options="itemTypeOptions"
        placeholder="Item type"
        class="w-8rem"
        @update:model-value="onItemTypeChange"
      />
      <PvButton type="button" label="Add item" icon="pi pi-plus" text @click="addItem" />
    </div>
    <div v-if="!items.length" class="text-sm text-gray-500">No items yet.</div>
    <div v-for="(item, index) in items" :key="index" class="flex align-items-center gap-2">
      <PvInputText
        v-if="itemType === 'string'"
        :model-value="String(item)"
        placeholder="Value"
        class="flex-grow-1"
        @update:model-value="(v) => updateItem(index, v)"
      />
      <PvInputNumber
        v-else-if="itemType === 'number'"
        :model-value="Number(item)"
        class="flex-grow-1"
        @update:model-value="(v) => updateItem(index, v ?? 0)"
      />
      <PvDropdown
        v-else-if="itemType === 'boolean'"
        :model-value="Boolean(item)"
        :options="booleanOptions"
        option-label="label"
        option-value="value"
        class="flex-grow-1"
        @update:model-value="(v) => updateItem(index, v)"
      />
      <PvButton type="button" icon="pi pi-trash" text @click="removeItem(index)" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import PvButton from 'primevue/button';
import PvDropdown from 'primevue/dropdown';
import PvInputNumber from 'primevue/inputnumber';
import PvInputText from 'primevue/inputtext';
import { TASK_ARRAY_ITEM_TYPES } from '@/types/taskField';

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [],
  },
  itemType: {
    type: String,
    default: 'string',
  },
});

const emit = defineEmits(['update:modelValue', 'update:itemType']);

const itemTypeOptions = [...TASK_ARRAY_ITEM_TYPES];

const booleanOptions = [
  { label: 'true', value: true },
  { label: 'false', value: false },
];

const items = computed(() => (Array.isArray(props.modelValue) ? props.modelValue : []));

function defaultItemValue(type) {
  if (type === 'number') return 0;
  if (type === 'boolean') return false;
  return '';
}

function onItemTypeChange(nextType) {
  emit('update:itemType', nextType);
  emit(
    'update:modelValue',
    items.value.map(() => defaultItemValue(nextType)),
  );
}

function addItem() {
  emit('update:modelValue', [...items.value, defaultItemValue(props.itemType)]);
}

function removeItem(index) {
  emit(
    'update:modelValue',
    items.value.filter((_, i) => i !== index),
  );
}

function updateItem(index, value) {
  const next = [...items.value];
  next[index] = value;
  emit('update:modelValue', next);
}
</script>
