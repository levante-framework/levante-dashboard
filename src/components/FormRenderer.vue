<template>
  <form class="survey-form" @submit.prevent="onSubmit">
    <section v-if="isComplete" class="survey-form__complete">
      <h2 class="survey-form__complete-title">Submitted</h2>
      <p class="survey-form__complete-text">Your responses have been saved.</p>
      <PvButton type="button" label="Close" class="survey-form__complete-close" @click="emit('close')" />
    </section>

    <section v-else-if="isIntroPage" class="survey-form__section">
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
            @click="openExample($event, field)"
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

        <!-- number: InputText + digit filter (InputNumber breaks CJK IME) -->
        <PvInputText
          v-else-if="field.kind === 'number'"
          :id="field.itemId"
          :model-value="formatNumberField(field.variableName)"
          class="w-full"
          :invalid="Boolean(fieldErrors[field.itemId])"
          inputmode="numeric"
          @update:model-value="(value) => onNumberInput(field.itemId, field.variableName, value)"
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

    <PvPopover ref="examplePopover" append-to="body">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="survey-form__example-panel" v-html="exampleHtml"></div>
    </PvPopover>

    <footer v-if="pageCount && !isComplete" class="survey-form__footer">
      <div class="survey-form__nav" :class="{ 'survey-form__nav--intro': isIntroPage }">
        <span v-if="!isIntroPage" class="survey-form__step">{{ stepLabel }}</span>
        <div class="survey-form__nav-buttons">
          <PvButton
            v-if="!isIntroPage"
            type="button"
            label="Save"
            icon="pi pi-save"
            severity="secondary"
            outlined
            :loading="isSaving"
            :disabled="isSaving"
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
            :loading="isSaving"
            :disabled="isSaving"
            @click="goNext"
          />
          <PvButton v-else type="submit" label="Submit" :loading="isSaving" :disabled="isSaving" />
        </div>
      </div>
    </footer>
  </form>
</template>

<script setup lang="ts">
import DOMPurify from 'dompurify';
import PvButton from 'primevue/button';
import PvInputText from 'primevue/inputtext';
import PvMultiSelect from 'primevue/multiselect';
import PvPopover from 'primevue/popover';
import PvSelect from 'primevue/select';
import PvTextarea from 'primevue/textarea';
import { computed, nextTick, reactive, ref, watch } from 'vue';
import type { SurveyFormField, SurveyFormSection } from '@/firebase/repositories/SurveyFormsRepository';

interface RenderedSection {
  id: string;
  title?: string;
  description?: string;
  fields: SurveyFormField[];
}

const DEFAULT_SECTION_ID = '__default';

const MESSAGES = {
  required: 'This field is required',
  numbersOnly: 'Numbers only',
} as const;

const props = defineProps<{
  fields: SurveyFormField[];
  generalPrompt?: string;
  sectionInfo?: SurveyFormSection[];
  isSaving?: boolean;
  isComplete?: boolean;
}>();

// `sectionInfo` arrives as an ordered array; index it by id for quick lookup.
const sectionInfoById = computed(
  () => new Map((props.sectionInfo ?? []).map((section) => [section.sectionId, section])),
);

const emit = defineEmits<{
  submit: [values: Record<string, unknown>];
  save: [values: Record<string, unknown>, options?: { silent?: boolean }];
  close: [];
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

/** Display-only: turn example lists into paragraphs without changing seed HTML. */
function formatExampleHtml(value?: string): string {
  const sanitized = DOMPurify.sanitize(value ?? '');
  const doc = new DOMParser().parseFromString(`<div>${sanitized}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return sanitized;

  root.querySelectorAll('ul, ol').forEach((list) => {
    const fragment = doc.createDocumentFragment();
    list.querySelectorAll(':scope > li').forEach((item) => {
      const paragraph = doc.createElement('p');
      paragraph.innerHTML = item.innerHTML;
      fragment.appendChild(paragraph);
    });
    list.replaceWith(fragment);
  });

  return DOMPurify.sanitize(root.innerHTML);
}

const examplePopover = ref<InstanceType<typeof PvPopover> | null>(null);
const exampleHtml = ref('');

function openExample(event: Event, field: SurveyFormField) {
  exampleHtml.value = formatExampleHtml(field.infoExample);
  examplePopover.value?.toggle(event);
}

function formatNumberField(variableName: string): string {
  if (variableName in numberDrafts) return numberDrafts[variableName] ?? '';
  const value = model[variableName];
  if (value == null) return '';
  return String(value);
}

const numberDrafts = reactive<Record<string, string>>({});

async function onNumberInput(itemId: string, variableName: string, raw: string | undefined) {
  const value = raw ?? '';
  const hasInvalidChars = /\D/.test(value);
  const digits = value.replace(/\D/g, '');
  model[variableName] = digits === '' ? null : Number(digits);

  if (hasInvalidChars) {
    fieldErrors[itemId] = MESSAGES.numbersOnly;
    // Force the controlled input to drop rejected characters even when the
    // underlying model value is unchanged (e.g. null → null).
    numberDrafts[variableName] = `${digits}\u200b`;
    await nextTick();
    numberDrafts[variableName] = digits;
    return;
  }

  clearFieldError(itemId);
  numberDrafts[variableName] = digits;
}

function onNumberBlur(itemId: string) {
  if (fieldErrors[itemId] === MESSAGES.numbersOnly) clearFieldError(itemId);
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

watch(pageCount, (count) => {
  if (currentPageIndex.value > count - 1) {
    currentPageIndex.value = Math.max(0, count - 1);
  }
});

const isIntroPage = computed(() => hasIntroPage.value && currentPageIndex.value === 0);

const currentSectionIndex = computed(() => (hasIntroPage.value ? currentPageIndex.value - 1 : currentPageIndex.value));

const currentSection = computed<RenderedSection | undefined>(() =>
  isIntroPage.value ? undefined : sections.value[currentSectionIndex.value],
);

const isFirstPage = computed(() => currentPageIndex.value === 0);
const isLastPage = computed(() => currentPageIndex.value >= pageCount.value - 1);

const stepLabel = computed(() => {
  if (isIntroPage.value || !sections.value.length) return '';
  return `Section ${currentSectionIndex.value + 1} of ${sections.value.length}`;
});

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
    fieldErrors[field.itemId] = MESSAGES.required;
    isValid = false;
  }
  return isValid;
}

function collectValues(fields: SurveyFormField[]): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    const value = model[field.variableName];
    if (isEmptyValue(value)) continue;
    values[field.variableName] = value;
  }
  return values;
}

function currentPageValues(): Record<string, unknown> {
  return collectValues(currentSection.value?.fields ?? []);
}

function goNext() {
  if (!validateCurrentSection()) return;
  if (!isIntroPage.value) emit('save', currentPageValues(), { silent: true });
  if (!isLastPage.value) currentPageIndex.value += 1;
}

function onSave() {
  if (!validateCurrentSection()) return;
  emit('save', currentPageValues());
}

function goBack() {
  clearAllFieldErrors();
  if (!isFirstPage.value) currentPageIndex.value -= 1;
}

function onSubmit() {
  if (!validateCurrentSection()) return;
  emit('submit', collectValues(visibleFields.value));
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
  max-width: 42rem;
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--text-color, #1f2937);
}

.survey-form__section {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.survey-form__section-header {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.85rem;
}

.survey-form__section-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  letter-spacing: -0.015em;
  line-height: 1.35;
  color: var(--text-color, #111827);
}

.survey-form__section-description {
  margin: 0;
  max-width: 40rem;
  font-size: 0.95rem;
  font-weight: 400;
  color: var(--text-color-secondary, #4b5563);
  white-space: pre-line;
  line-height: 1.6;
}

.survey-form__complete {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 18rem;
  text-align: center;
}

.survey-form__complete-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  letter-spacing: -0.015em;
  line-height: 1.35;
  color: var(--text-color, #111827);
}

.survey-form__complete-text {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--text-color-secondary, #4b5563);
}

.survey-form__complete-close {
  margin-top: 0.75rem;
}

.survey-form__field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.survey-form__field + .survey-form__field {
  margin-top: 1.5rem;
}

.survey-form__field--conditional {
  margin-left: 1.25rem;
  padding-left: 0.9rem;
  border-left: 2px solid var(--surface-border, #e5e7eb);
}

.survey-form__field-error {
  color: var(--red-500, #ef4444);
  font-size: 0.8rem;
}

.survey-form__label {
  font-size: 0.95rem;
  font-weight: 500;
  line-height: 1.45;
  color: var(--text-color, #1f2937);
  white-space: pre-line;
}

.survey-form__question-text {
  white-space: pre-line;
}

/* Rendered HTML inside form text should not carry heading/paragraph margins. */
.survey-form__question-text :deep(p),
.survey-form__section-description :deep(p),
.survey-form__general-prompt :deep(p) {
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
  width: 0.95rem;
  height: 0.95rem;
  margin-left: 0.25rem;
  padding: 0;
  border: none;
  border-radius: 9999px;
  background: var(--red-500, #ef4444);
  color: #ffffff;
  font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
  font-size: 0.65rem;
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

.survey-form__example-panel {
  max-width: 22rem;
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.55;
  color: var(--text-color, #1f2937);
}

.survey-form__example-panel :deep(p) {
  margin: 0 0 0.65rem;
  line-height: 1.55;
}

.survey-form__example-panel :deep(p:last-child) {
  margin-bottom: 0;
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
  gap: 0.65rem;
  margin-top: 1rem;
  padding: 0.5rem 0 0.25rem;
  background: color-mix(in srgb, var(--surface-0, #ffffff) 92%, transparent);
  backdrop-filter: blur(6px);
}

.survey-form__nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.survey-form__nav--intro {
  justify-content: flex-end;
}

.survey-form__step {
  color: var(--text-color-secondary, #6b7280);
  font-size: 0.85rem;
  font-weight: 500;
}

.survey-form__nav-buttons {
  display: flex;
  gap: 0.5rem;
}
</style>
