<template>
  <div class="flex align-items-center justify-content-between gap-2 mb-1">
    <label for="userTypes" class="w-1">
      <em>userTypes</em>
    </label>
    <PvInputText placeholder="array" class="w-2 text-center" disabled />
    <PvMultiSelect
      input-id="userTypes"
      :model-value="modelValue"
      :options="userTypeOptions"
      placeholder="Select user types"
      display="chip"
      class="flex-grow-1"
      @update:model-value="onUpdate"
    />
  </div>
</template>

<script setup>
import PvInputText from 'primevue/inputtext';
import PvMultiSelect from 'primevue/multiselect';
import { TASK_USER_TYPES } from '@/types/taskField';
import { normalizeUserTypes } from '@/helpers/taskFields';

defineProps({
  modelValue: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['update:modelValue']);

const userTypeOptions = [...TASK_USER_TYPES];

function onUpdate(values) {
  emit('update:modelValue', normalizeUserTypes(values));
}
</script>
