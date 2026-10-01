<template>
  <div class="survey-preview">
    <header v-if="!isComplete" class="survey-preview__header">
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

    <LevanteSpinner v-else-if="isLoading" fullscreen />

    <div v-else-if="data" class="survey-preview__body">
      <FormRenderer
        :fields="data.fullFields"
        :general-prompt="data.generalPrompt"
        :section-info="data.sectionInfo"
        :is-saving="isSaving"
        :is-complete="isComplete"
        :initial-responses="initialResponses"
        :save-draft="onSave"
        @submit="onSubmit"
        @close="onClose"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import PvMessage from 'primevue/message';
import { useToast } from 'primevue/usetoast';
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import FormRenderer from '@/components/FormRenderer.vue';
import LevanteSpinner from '@/components/LevanteSpinner.vue';
import { type SurveyFormType, useSurveyFormDefinitionQuery } from '@/composables/queries/useSurveyFormDefinitionQuery';
import { SURVEY_FORM_DEFINITION_QUERY_KEY } from '@/constants/queryKeys';
import { surveyFormsRepository } from '@/firebase/repositories/SurveyFormsRepository';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const queryClient = useQueryClient();

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

const savedResponse = computed(() => {
  return data.value?.savedResponses[0] as
    | { responses?: Record<string, unknown>; status?: 'draft' | 'complete' }
    | undefined;
});

const initialResponses = computed(() => savedResponse.value?.responses);

const versionTooltip = computed(() => {
  if (!data.value) return '';
  const { formId, versionNumber, versionId, fullFields } = data.value;
  return `${formId} · version ${versionNumber} (${versionId}) · ${fullFields.length} fields`;
});

const isSaving = ref(false);
const isComplete = ref(false);
const persistedStatus = ref<'draft' | 'complete'>();

async function persist(
  responses: Record<string, unknown>,
  status: 'draft' | 'complete',
  options?: { silent?: boolean },
): Promise<boolean> {
  if (!data.value) return false;
  isSaving.value = true;
  try {
    await surveyFormsRepository.saveOrgInformation({
      orgType: formType.value,
      orgId: orgId.value,
      formVersion: data.value.versionId,
      responses,
      status,
    });
    persistedStatus.value = status;
    await queryClient.invalidateQueries({
      queryKey: [SURVEY_FORM_DEFINITION_QUERY_KEY, formType.value, orgId.value],
    });
    if (options?.silent) return true;
    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: 'Responses saved.',
      life: 3000,
    });
    return true;
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Save failed',
      detail: err instanceof Error ? err.message : 'Failed to save responses.',
      life: 5000,
    });
    return false;
  } finally {
    isSaving.value = false;
  }
}

function onSave(values: Record<string, unknown>, options?: { silent?: boolean }) {
  const status =
    persistedStatus.value === 'complete' || savedResponse.value?.status === 'complete' ? 'complete' : 'draft';
  return persist(values, status, options);
}

async function onSubmit(values: Record<string, unknown>) {
  isComplete.value = await persist(values, 'complete', { silent: true });
}

function onClose() {
  void router.push({ name: 'Home' });
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
