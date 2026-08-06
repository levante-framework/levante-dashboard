<template>
  <form class="survey-form" @submit.prevent="onSubmit">
    <section v-if="isIntroPage" class="survey-form__section">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <p v-if="generalPrompt" class="survey-form__general-prompt" v-html="renderHtml(generalPrompt)"></p>
    </section>

    <section v-else-if="currentSection" class="survey-form__section">
      <header
        v-if="currentSection.title || currentSection.description"
        class="survey-form__section-header"
      >
        <!-- eslint-disable-next-line vue/no-v-html -->
        <h2 v-if="currentSection.title" class="survey-form__section-title" v-html="renderHtml(currentSection.title)"></h2>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <p
          v-if="currentSection.description"
          class="survey-form__section-description"
          v-html="renderHtml(currentSection.description)"
        ></p>
      </header>

      <div
        v-for="field in currentSection.fields"
        :key="field.itemId"
        class="survey-form__field"
        :class="{
          'survey-form__field--conditional': field.displayLogic,
          'survey-form__field--invalid': Boolean(fieldErrors[field.itemId]),
        }"
      >
        <label :for="field.itemId" class="survey-form__label">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span class="survey-form__question-text" v-html="renderHtml(field.questionText)"></span>
          <span v-if="field.required" class="required-asterisk">*</span>
          <button
            v-if="field.infoExample"
            type="button"
            class="survey-form__example-trigger"
            :aria-label="`Show an example for: ${toPlainText(field.questionText)}`"
            @click="openExample(field)"
          >
            ?
          </button>
        </label>

        <!-- text -->
        <PvTextarea
          v-if="field.kind === 'text'"
          :id="field.itemId"
          v-model="(model[field.variableName] as string)"
          class="w-full survey-form__textarea"
          :class="{ 'p-invalid': fieldErrors[field.itemId] }"
          rows="3"
          @update:model-value="clearFieldError(field.itemId)"
        />

        <!-- number: text input with digit filter (InputNumber breaks CJK IME) -->
        <input
          v-else-if="field.kind === 'number'"
          :id="field.itemId"
          class="p-inputtext p-component w-full"
          :class="{ 'p-invalid': fieldErrors[field.itemId] }"
          inputmode="numeric"
          :value="formatNumberField(field.variableName)"
          @input="onNumberInput(field.itemId, field.variableName, $event)"
          @blur="onNumberBlur(field.itemId)"
        />

        <!-- single-select -->
        <PvSelect
          v-else-if="field.kind === 'single-select'"
          :id="field.itemId"
          v-model="(model[field.variableName] as string)"
          class="w-full"
          :invalid="Boolean(fieldErrors[field.itemId])"
          option-label="label"
          option-value="value"
          placeholder="Select an option"
          show-clear
          :options="field.options ?? []"
          @update:model-value="clearFieldError(field.itemId)"
        />

        <!-- multi-select -->
        <PvMultiSelect
          v-else-if="field.kind === 'multi-select'"
          :id="field.itemId"
          v-model="(model[field.variableName] as string[])"
          class="w-full"
          :invalid="Boolean(fieldErrors[field.itemId])"
          display="chip"
          option-label="label"
          option-value="value"
          placeholder="Select all that apply"
          :show-toggle-all="false"
          :options="field.options ?? []"
          @update:model-value="clearFieldError(field.itemId)"
        />

        <small v-if="fieldErrors[field.itemId]" class="survey-form__field-error">
          {{ fieldErrors[field.itemId] }}
        </small>
      </div>
    </section>

    <PvDialog
      v-model:visible="exampleDialog.visible"
      modal
      dismissable-mask
      :style="{ width: '32rem', maxWidth: '90vw' }"
    >
      <template #header>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <span class="survey-form__example-header" v-html="renderHtml(exampleDialog.questionText)"></span>
      </template>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <p class="survey-form__example-text" v-html="renderHtml(exampleDialog.text)"></p>
    </PvDialog>

    <footer v-if="pageCount" class="survey-form__footer">
      <PvProgressBar :value="progressValue" :show-value="false" class="survey-form__progress" />
      <div class="survey-form__nav">
        <span class="survey-form__step">{{ stepLabel }}</span>
        <div class="survey-form__nav-buttons">
          <PvButton
            v-if="!isIntroPage"
            type="button"
            label="Save"
            icon="pi pi-save"
            severity="secondary"
            outlined
            @click="onSave"
          />
          <PvButton
            v-if="!isFirstPage"
            type="button"
            label="Back"
            severity="secondary"
            outlined
            @click="goBack"
          />
          <PvButton
            v-if="!isLastPage"
            type="button"
            :label="isIntroPage ? 'Get started' : 'Next'"
            @click="goNext"
          />
          <PvButton v-else type="submit" label="Submit (mock)" />
        </div>
      </div>
    </footer>
  </form>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import DOMPurify from 'dompurify';
import PvButton from 'primevue/button';
import PvDialog from 'primevue/dialog';
import PvMultiSelect from 'primevue/multiselect';
import PvProgressBar from 'primevue/progressbar';
import PvSelect from 'primevue/select';
import PvTextarea from 'primevue/textarea';
import type {
  SurveyFormField,
  SurveyFormSection,
} from '@/firebase/repositories/SurveyFormsRepository';

interface RenderedSection {
  id: string;
  title?: string;
  description?: string;
  fields: SurveyFormField[];
}

const DEFAULT_SECTION_ID = '__default';

const props = defineProps<{
  fields: SurveyFormField[];
  generalPrompt?: string;
  sectionInfo?: SurveyFormSection[];
}>();

// `sectionInfo` arrives as an ordered array; index it by id for quick lookup.
const sectionInfoById = computed(
  () => new Map((props.sectionInfo ?? []).map((section) => [section.sectionId, section])),
);

const emit = defineEmits<{
  submit: [values: Record<string, unknown>];
  save: [values: Record<string, unknown>];
}>();

// Form definition text (questions, descriptions, examples) can deliberately
// contain HTML markup, so render it via sanitized v-html.
function renderHtml(value?: string): string {
  return DOMPurify.sanitize(value ?? '');
}

// Plain-text variant for attributes that cannot render HTML (e.g. aria-label).
function toPlainText(value?: string): string {
  return (value ?? '').replace(/<[^>]*>/g, '');
}

const exampleDialog = reactive<{ visible: boolean; questionText: string; text: string }>({
  visible: false,
  questionText: '',
  text: '',
});

function openExample(field: SurveyFormField) {
  exampleDialog.questionText = field.questionText;
  exampleDialog.text = field.infoExample ?? '';
  exampleDialog.visible = true;
}

function formatNumberField(variableName: string): string {
  const value = model[variableName];
  if (value == null) return '';
  return String(value);
}

function onNumberInput(itemId: string, variableName: string, event: Event) {
  const target = event.target as HTMLInputElement;
  const raw = target.value;
  const hasInvalidChars = /\D/.test(raw);
  const digits = raw.replace(/\D/g, '');
  // Write back to the DOM so rejected IME/letter keystrokes don't stick when
  // the model value is unchanged (e.g. null → null).
  target.value = digits;
  model[variableName] = digits === '' ? null : Number(digits);

  if (hasInvalidChars) {
    fieldErrors[itemId] = 'Numbers only';
    return;
  }
  clearFieldError(itemId);
}

function onNumberBlur(itemId: string) {
  if (fieldErrors[itemId] === 'Numbers only') clearFieldError(itemId);
}

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

// When a conditional field is hidden again (e.g. the controlling answer no longer
// includes "other"), drop any value it had collected so it isn't submitted.
watch(visibleFields, (visible) => {
  const visibleVars = new Set(visible.map((field) => field.variableName));
  for (const field of props.fields) {
    if (!field.displayLogic || visibleVars.has(field.variableName)) continue;
    const emptyValue = field.kind === 'multi-select' ? [] : null;
    const current = model[field.variableName];
    const isEmpty = Array.isArray(current) ? current.length === 0 : current === null;
    if (!isEmpty) model[field.variableName] = emptyValue;
  }
});

/**
 * Groups visible fields into ordered sections (by first appearance), attaching
 * each section's title/description from `sectionInfo`.
 */
const sections = computed<RenderedSection[]>(() => {
  const byId = new Map<string, RenderedSection>();
  const order: string[] = [];
  for (const field of visibleFields.value) {
    const id = field.sectionId ?? DEFAULT_SECTION_ID;
    if (!byId.has(id)) {
      const info = sectionInfoById.value.get(id);
      byId.set(id, { id, title: info?.title, description: info?.description, fields: [] });
      order.push(id);
    }
    byId.get(id)!.fields.push(field);
  }
  return order.map((id) => byId.get(id)!);
});

// An optional intro page (the general prompt) precedes the section pages.
const hasIntroPage = computed(() => Boolean(props.generalPrompt));
const pageCount = computed(() => sections.value.length + (hasIntroPage.value ? 1 : 0));

const currentPageIndex = ref(0);

watch(
  pageCount,
  (count) => {
    if (currentPageIndex.value > count - 1) {
      currentPageIndex.value = Math.max(0, count - 1);
    }
  },
);

const isIntroPage = computed(() => hasIntroPage.value && currentPageIndex.value === 0);

const currentSectionIndex = computed(() =>
  hasIntroPage.value ? currentPageIndex.value - 1 : currentPageIndex.value,
);

const currentSection = computed<RenderedSection | undefined>(() =>
  isIntroPage.value ? undefined : sections.value[currentSectionIndex.value],
);

const isFirstPage = computed(() => currentPageIndex.value === 0);
const isLastPage = computed(() => currentPageIndex.value >= pageCount.value - 1);

// Progress reflects only the section pages; the intro page is informational.
const progressValue = computed(() => {
  if (isIntroPage.value || !sections.value.length) return 0;
  return Math.round(((currentSectionIndex.value + 1) / sections.value.length) * 100);
});

const stepLabel = computed(() => {
  if (isIntroPage.value) return 'Introduction';
  return `Section ${currentSectionIndex.value + 1} of ${sections.value.length}`;
});

const REQUIRED_MESSAGE = 'This field is required';
const fieldErrors = reactive<Record<string, string>>({});

function isEmptyValue(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function clearFieldError(itemId: string) {
  delete fieldErrors[itemId];
}

function clearAllFieldErrors() {
  for (const itemId of Object.keys(fieldErrors)) {
    delete fieldErrors[itemId];
  }
}

/** Validates required fields on the current section page. Intro page always passes. */
function validateCurrentSection(): boolean {
  clearAllFieldErrors();
  if (isIntroPage.value || !currentSection.value) return true;

  let isValid = true;
  for (const field of currentSection.value.fields) {
    if (!field.required) continue;
    if (!isEmptyValue(model[field.variableName])) continue;
    fieldErrors[field.itemId] = REQUIRED_MESSAGE;
    isValid = false;
  }
  return isValid;
}

function goNext() {
  if (!validateCurrentSection()) return;
  if (!isLastPage.value) currentPageIndex.value += 1;
}

function goBack() {
  clearAllFieldErrors();
  if (!isFirstPage.value) currentPageIndex.value -= 1;
}

function onSubmit() {
  if (!validateCurrentSection()) return;
  emit('submit', { ...model });
}

// Placeholder save action; wiring (persisting a partial response) comes later.
function onSave() {
  emit('save', { ...model });
}
</script>

<style scoped>
.survey-form {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  padding-bottom: 1rem;
}

.survey-form__general-prompt {
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.5;
}

.survey-form__section {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.survey-form__section-header {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.survey-form__section-title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
}

.survey-form__section-description {
  margin: 0;
  color: var(--text-color-secondary, #6b7280);
  white-space: pre-line;
  line-height: 1.5;
}

.survey-form__field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.survey-form__field--conditional {
  margin-left: 1.5rem;
  padding-left: 1rem;
  border-left: 2px solid var(--surface-border, #e5e7eb);
}

.survey-form__field-error {
  color: var(--red-500, #ef4444);
  font-size: 0.85rem;
}

.survey-form__label {
  font-weight: 600;
  white-space: pre-line;
}

.survey-form__question-text {
  white-space: pre-line;
}

/* Rendered HTML inside form text should not carry heading/paragraph margins. */
.survey-form__question-text :deep(p),
.survey-form__section-description :deep(p),
.survey-form__general-prompt :deep(p),
.survey-form__example-text :deep(p) {
  margin: 0 0 0.5rem;
}

.survey-form__textarea {
  resize: vertical;
  min-height: 4.5rem;
}

.survey-form__example-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.15rem;
  height: 1.15rem;
  margin-left: 0.3rem;
  padding: 0;
  border: none;
  border-radius: 9999px;
  background: var(--red-500, #ef4444);
  color: #ffffff;
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0;
  vertical-align: middle;
  cursor: pointer;
  -webkit-font-smoothing: antialiased;
  text-shadow: 0 0 0.4px #ffffff;
}

.survey-form__example-trigger:hover,
.survey-form__example-trigger:focus-visible {
  background: var(--red-600, #dc2626);
  outline: none;
}

.survey-form__example-text {
  margin: 0;
  white-space: pre-line;
  line-height: 1.5;
}

.required-asterisk {
  color: var(--red-500, #ef4444);
  margin-left: 0.15rem;
}

.survey-form__footer {
  position: sticky;
  bottom: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
  padding: 1rem 0;
  background: var(--surface-0, #ffffff);
  border-top: 1px solid var(--surface-border, #e5e7eb);
}

.survey-form__progress {
  height: 0.5rem;
}

.survey-form__nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.survey-form__step {
  color: var(--text-color-secondary, #6b7280);
  font-size: 0.9rem;
}

.survey-form__nav-buttons {
  display: flex;
  gap: 0.5rem;
}
</style>
