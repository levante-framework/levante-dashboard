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
        :is-saving="isSaving"
        @save="onSave"
        @submit="onSubmit"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import PvMessage from 'primevue/message';
import PvProgressSpinner from 'primevue/progressspinner';
import { useToast } from 'primevue/usetoast';
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import FormRenderer from '@/components/FormRenderer.vue';
import { type SurveyFormType, useSurveyFormDefinitionQuery } from '@/composables/queries/useSurveyFormDefinitionQuery';
import { surveyFormsRepository } from '@/firebase/repositories/SurveyFormsRepository';

const route = useRoute();
const toast = useToast();

const formType = computed<SurveyFormType>(() =>
  (route.params.formType as SurveyFormType) === 'site' ? 'site' : 'school',
);

const orgId = computed(() => {
  const value = route.query.orgId;
  return typeof value === 'string' && value.trim() ? value.trim() : 'preview';
});

const title = computed(() =>
  formType.value === 'site' ? 'Additional Site Information' : 'Additional School Information',
);

const { data, isLoading, isError, error } = useSurveyFormDefinitionQuery(formType, orgId);

const versionTooltip = computed(() => {
  if (!data.value) return '';
  const { formId, versionNumber, versionId, fullFields } = data.value;
  return `${formId} · version ${versionNumber} (${versionId}) · ${fullFields.length} fields`;
});

const isSaving = ref(false);

async function persist(
  responses: Record<string, unknown>,
  status: 'draft' | 'submitted',
  options?: { silent?: boolean },
) {
  if (!data.value) return;
  isSaving.value = true;
  try {
    await surveyFormsRepository.saveOrgInformation({
      orgType: formType.value,
      orgId: orgId.value,
      formVersion: data.value.versionId,
      responses,
      status,
    });
    if (options?.silent) return;
    toast.add({
      severity: 'success',
      summary: status === 'submitted' ? 'Submitted' : 'Saved',
      detail: status === 'submitted' ? 'Form submitted.' : 'Responses saved.',
      life: 3000,
    });
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Save failed',
      detail: err instanceof Error ? err.message : 'Failed to save responses.',
      life: 5000,
    });
  } finally {
    isSaving.value = false;
  }
}

function onSave(values: Record<string, unknown>, options?: { silent?: boolean }) {
  void persist(values, 'draft', options);
}

async function onSubmit(values: Record<string, unknown>) {
  await persist(values, 'submitted');
}
</script>

<style scoped>
.survey-preview {
  max-width: 720px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem 5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.survey-preview__header {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-bottom: 0;
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
  margin: 0;
  font-size: 1.625rem;
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.25;
  color: var(--text-color, #111827);
}

.survey-preview__version-info {
  color: var(--text-color-secondary, #9ca3af);
  cursor: help;
  font-size: 0.85rem;
}
</style>
