<template>
  <div class="survey-preview">
    <header class="survey-preview__header">
      <h1>Org Information Survey Preview</h1>
      <PvSelectButton
        v-model="formType"
        :allow-empty="false"
        option-label="label"
        option-value="value"
        :options="formTypeOptions"
      />
    </header>

    <PvMessage v-if="isError" severity="error" :closable="false">
      {{ (error as Error)?.message ?? 'Failed to load survey definition.' }}
    </PvMessage>

    <div v-else-if="isLoading" class="survey-preview__loading">
      <PvProgressSpinner />
      <span>Loading survey definition…</span>
    </div>

    <div v-else-if="data" class="survey-preview__body">
      <p class="survey-preview__description">{{ data.formDescription }}</p>
      <small class="survey-preview__meta">
        {{ data.formId }} · version {{ data.versionNumber }} ({{ data.versionId }}) ·
        {{ data.fullFields.length }} fields
      </small>

      <SurveyFormRenderer :fields="data.fullFields" @submit="onSubmit" />

      <section v-if="submittedValues" class="survey-preview__output">
        <h2>Submitted values (mock)</h2>
        <pre>{{ submittedValuesJson }}</pre>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import PvMessage from 'primevue/message';
import PvProgressSpinner from 'primevue/progressspinner';
import PvSelectButton from 'primevue/selectbutton';
import SurveyFormRenderer from '@/components/SurveyFormRenderer.vue';
import {
  useSurveyFormDefinitionQuery,
  type SurveyFormType,
} from '@/composables/queries/useSurveyFormDefinitionQuery';

const route = useRoute();

const formTypeOptions = [
  { label: 'School', value: 'school' as const },
  { label: 'Site', value: 'site' as const },
];

const initialType = (route.params.formType as SurveyFormType) === 'site' ? 'site' : 'school';
const formType = ref<SurveyFormType>(initialType);

const { data, isLoading, isError, error } = useSurveyFormDefinitionQuery(formType);

const submittedValues = ref<Record<string, unknown> | null>(null);
const submittedValuesJson = computed(() => JSON.stringify(submittedValues.value, null, 2));

function onSubmit(values: Record<string, unknown>) {
  submittedValues.value = values;
}
</script>

<style scoped>
.survey-preview {
  max-width: 760px;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.survey-preview__header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.survey-preview__loading {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.survey-preview__description {
  font-size: 1.05rem;
}

.survey-preview__meta {
  color: var(--text-color-secondary, #6b7280);
}

.survey-preview__output {
  margin-top: 2rem;
  border-top: 1px solid var(--surface-border, #e5e7eb);
  padding-top: 1rem;
}

.survey-preview__output pre {
  background: var(--surface-100, #f3f4f6);
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
}
</style>
