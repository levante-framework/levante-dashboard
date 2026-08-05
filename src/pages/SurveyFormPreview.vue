<template>
  <div class="survey-preview">
    <header class="survey-preview__header">
      <h1 class="survey-preview__title">
        {{ title }}
        <i
          v-if="data"
          v-tooltip.top="versionTooltip"
          class="pi pi-info-circle survey-preview__version-info"
          tabindex="0"
          role="button"
          aria-label="Survey version information"
        />
      </h1>
    </header>

    <PvMessage v-if="isError" severity="error" :closable="false">
      {{ (error as Error)?.message ?? 'Failed to load survey definition.' }}
    </PvMessage>

    <div v-else-if="isLoading" class="survey-preview__loading">
      <PvProgressSpinner />
      <span>Loading survey definition…</span>
    </div>

    <div v-else-if="data" class="survey-preview__body">
      <FormRenderer
        :fields="data.fullFields"
        :general-prompt="data.generalPrompt"
        :section-info="data.sectionInfo"
        @submit="onSubmit"
      />

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
import FormRenderer from '@/components/FormRenderer.vue';
import {
  useSurveyFormDefinitionQuery,
  type SurveyFormType,
} from '@/composables/queries/useSurveyFormDefinitionQuery';

const route = useRoute();

const formType = computed<SurveyFormType>(() =>
  (route.params.formType as SurveyFormType) === 'site' ? 'site' : 'school',
);

const title = computed(() =>
  formType.value === 'site' ? 'Additional Site Information' : 'Additional School Information',
);

const { data, isLoading, isError, error } = useSurveyFormDefinitionQuery(formType);

const versionTooltip = computed(() => {
  if (!data.value) return '';
  const { formId, versionNumber, versionId, fullFields } = data.value;
  return `${formId} · version ${versionNumber} (${versionId}) · ${fullFields.length} fields`;
});

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

.survey-preview__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.survey-preview__version-info {
  color: var(--text-color-secondary, #6b7280);
  cursor: help;
  font-size: 1rem;
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
