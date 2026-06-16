<template>
  <form class="survey-form" @submit.prevent="onSubmit">
    <div v-for="field in visibleFields" :key="field.itemId" class="survey-form__field">
      <label :for="field.itemId" class="survey-form__label">
        {{ field.questionText }}
        <span v-if="field.required" class="required-asterisk">*</span>
      </label>

      <small v-if="field.infoExample" class="survey-form__hint">{{ field.infoExample }}</small>

      <!-- text -->
      <PvTextarea
        v-if="field.kind === 'text'"
        :id="field.itemId"
        v-model="(model[field.variableName] as string)"
        auto-resize
        class="w-full"
        rows="2"
      />

      <!-- number -->
      <PvInputNumber
        v-else-if="field.kind === 'number'"
        :id="field.itemId"
        v-model="(model[field.variableName] as number)"
        class="w-full"
      />

      <!-- single-select -->
      <PvSelect
        v-else-if="field.kind === 'single-select'"
        :id="field.itemId"
        v-model="(model[field.variableName] as string)"
        class="w-full"
        option-label="label"
        option-value="value"
        placeholder="Select an option"
        show-clear
        :options="field.options ?? []"
      />

      <!-- multi-select -->
      <PvMultiSelect
        v-else-if="field.kind === 'multi-select'"
        :id="field.itemId"
        v-model="(model[field.variableName] as string[])"
        class="w-full"
        display="chip"
        option-label="label"
        option-value="value"
        placeholder="Select all that apply"
        :options="field.options ?? []"
      />

      <small v-if="field.notes" class="survey-form__notes">{{ field.notes }}</small>
    </div>

    <div class="survey-form__actions">
      <PvButton label="Submit (mock)" type="submit" />
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import PvButton from 'primevue/button';
import PvInputNumber from 'primevue/inputnumber';
import PvMultiSelect from 'primevue/multiselect';
import PvSelect from 'primevue/select';
import PvTextarea from 'primevue/textarea';
import type { SurveyFormField } from '@/firebase/repositories/SurveyFormsRepository';

const props = defineProps<{
  fields: SurveyFormField[];
}>();

const emit = defineEmits<{
  submit: [values: Record<string, unknown>];
}>();

// One reactive value per field, keyed by variableName.
const model = reactive<Record<string, unknown>>({});

watch(
  () => props.fields,
  (fields) => {
    for (const field of fields) {
      if (!(field.variableName in model)) {
        model[field.variableName] = field.kind === 'multi-select' ? [] : null;
      }
    }
  },
  { immediate: true },
);

/**
 * Hides a field until its `displayLogic` condition is met (e.g. only show the
 * "Other" text box when the controlling select includes "other").
 */
const visibleFields = computed(() => {
  return props.fields.filter((field) => {
    if (!field.displayLogic) return true;
    const controlling = model[field.displayLogic.field];
    if (Array.isArray(controlling)) {
      return controlling.includes(field.displayLogic.includes);
    }
    return controlling === field.displayLogic.includes;
  });
});

function onSubmit() {
  emit('submit', { ...model });
}
</script>

<style scoped>
.survey-form {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.survey-form__field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.survey-form__label {
  font-weight: 600;
  white-space: pre-line;
}

.survey-form__hint {
  color: var(--text-color-secondary, #6b7280);
  white-space: pre-line;
}

.survey-form__notes {
  color: var(--text-color-secondary, #9ca3af);
  font-style: italic;
}

.required-asterisk {
  color: var(--red-500, #ef4444);
  margin-left: 0.15rem;
}

.survey-form__actions {
  display: flex;
  justify-content: flex-end;
}
</style>
