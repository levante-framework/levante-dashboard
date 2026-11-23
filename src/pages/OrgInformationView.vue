<template>
  <div class="org-information-view">
    <div class="org-information-view__notice-wrap" :style="{ top: `${navbarHeight}px` }">
      <div class="org-information-view__notice">
        <i class="pi pi-question-circle org-information-view__notice-icon" aria-hidden="true" />
        <p class="org-information-view__notice-text">Something doesn't look right?</p>
        <PvButton
          label="Open a Ticket"
          severity="secondary"
          variant="outlined"
          size="small"
          @click="openTicket"
        />
      </div>
    </div>

    <PvMessage v-if="isSiteForm && !isSiteSelected" severity="info" :closable="false">Select a site</PvMessage>

    <PvMessage v-else-if="isError && !data" severity="error" :closable="false">
      {{ (error as Error)?.message ?? 'Failed to load survey definition.' }}
    </PvMessage>

    <LevanteSpinner v-else-if="isLoading" fullscreen />

    <div v-else-if="data" class="org-information-view__body">
      <h1 class="org-information-view__title">{{ title }}</h1>
      <div v-for="row in rows" :key="row.itemId" class="org-information-view__field">
        <!-- questionText may include block HTML, so this cannot be a <p>. -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="org-information-view__question" v-html="row.questionHtml"></div>
        <p class="org-information-view__answer">{{ row.answer }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DOMPurify from 'dompurify';
import { storeToRefs } from 'pinia';
import PvButton from 'primevue/button';
import PvMessage from 'primevue/message';
import { computed, inject, ref } from 'vue';
import { useRoute } from 'vue-router';
import LevanteSpinner from '@/components/LevanteSpinner.vue';
import { type SurveyFormType, useSurveyFormDefinitionQuery } from '@/composables/queries/useSurveyFormDefinitionQuery';
import type { InformationFormField } from '@/firebase/repositories/SurveyFormsRepository';
import { languageSelectionOptions } from '@/helpers/languageSelectionOptions';
import { useAuthStore } from '@/store/auth';

const FRESHDESK_TICKET_URL = 'https://levante-support.freshdesk.com/support/tickets/new';

const route = useRoute();
const authStore = useAuthStore();
const { currentSite, currentSiteName } = storeToRefs(authStore);
const navbarHeight = inject('navbarHeight', ref(0));

const formType = computed<SurveyFormType>(() =>
  (route.params.formType as SurveyFormType) === 'site' ? 'site' : 'school',
);

const isSiteForm = computed(() => formType.value === 'site');
const isSiteSelected = computed(() => !!currentSite.value && currentSite.value !== 'any');
const canLoad = computed(() => !isSiteForm.value || isSiteSelected.value);

const orgId = computed(() => {
  if (isSiteForm.value) return isSiteSelected.value ? (currentSite.value as string) : '';

  const value = route.query.orgId;
  return typeof value === 'string' && value.trim() ? value.trim() : 'preview';
});

const title = computed(() => {
  if (!isSiteForm.value) return 'Additional School Information';
  if (!isSiteSelected.value) return 'Site Information';
  return `Site Information: ${currentSiteName.value ?? ''}`;
});

const { data, isLoading, isError, error } = useSurveyFormDefinitionQuery(formType, orgId, canLoad);

const savedResponses = computed(() => data.value?.savedResponses?.[0]?.responses);

const rows = computed(() =>
  (data.value?.fullFields ?? [])
    .filter((field) => isFieldVisible(field, savedResponses.value))
    .map((field) => ({
      itemId: field.itemId,
      questionHtml: DOMPurify.sanitize(field.questionText ?? ''),
      answer: answerText(field, savedResponses.value),
    })),
);

function isFieldVisible(field: InformationFormField, responses: Record<string, unknown> | undefined): boolean {
  if (!field.displayLogic) return true;
  const controlling = responses?.[field.displayLogic.field];
  if (Array.isArray(controlling)) return controlling.includes(field.displayLogic.includes);
  return controlling === field.displayLogic.includes;
}

function optionLabel(field: InformationFormField, value: unknown): string {
  return field.options?.find((option) => option.value === value)?.label ?? '';
}

function languageAnswer(value: unknown): string {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return '';
  const record = value as { codes?: unknown; otherDescription?: unknown };
  const labels = (Array.isArray(record.codes) ? record.codes : [])
    .map((code) => languageSelectionOptions.find((option) => option.value === code)?.label)
    .filter((label): label is string => Boolean(label));
  const other = typeof record.otherDescription === 'string' ? record.otherDescription.trim() : '';
  if (other) labels.push(other);
  return labels.join(', ');
}

function answerText(field: InformationFormField, responses: Record<string, unknown> | undefined): string {
  const value = responses?.[field.variableName];
  if (field.kind === 'single-select') {
    if (value == null || value === '') return '';
    return optionLabel(field, value);
  }
  if (field.kind === 'multi-select') {
    if (!Array.isArray(value)) return '';
    return value
      .map((entry) => optionLabel(field, entry))
      .filter(Boolean)
      .join(', ');
  }
  if (field.kind === 'language-selection') return languageAnswer(value);
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value.trim() === '' ? '' : value;
  return '';
}

function openTicket() {
  window.open(FRESHDESK_TICKET_URL, '_blank');
}
</script>

<style scoped>
.org-information-view {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 1.5rem 5rem;
}

.org-information-view__notice-wrap {
  position: sticky;
  z-index: 10;
  margin: 0 -1.5rem;
  padding: 0.5rem 1.5rem 0.75rem;
  background: var(--surface-a, #ffffff);
}

.org-information-view__notice {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--gray-100);
  border-radius: 12px;
  color: var(--gray-500);
}

.org-information-view__notice-icon {
  flex-shrink: 0;
  font-size: 1.25rem;
}

.org-information-view__notice-text {
  flex: 1;
  margin: 0;
}

@media (max-width: 768px) {
  .org-information-view__notice {
    flex-direction: column;
    align-items: flex-start;
  }
}

.org-information-view__title {
  margin: 1.5rem 0 0;
  font-size: 1.625rem;
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.25;
}

.org-information-view__field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 1rem 0;
  border-bottom: 1px solid var(--surface-d, #e5e7eb);
}

.org-information-view__question {
  margin: 0;
  font-weight: 600;
}

.org-information-view__question :deep(p) {
  margin: 0;
}

.org-information-view__answer {
  margin: 0;
  white-space: pre-wrap;
}
</style>
