<template>
  <div v-if="isPreview">
    <SurveyComponent v-if="surveyPreviewModel" :model="surveyPreviewModel" class="survey-preview" style="height: auto;" />
  </div>

  <div v-else class="survey-manager" :style="{ height: `calc(100dvh - ${footerHeight}px)` }">
    <aside class="survey-manager__aside">
      <div class="aside__header">
        <img src="/LEVANTE/Levante_Logo.png" alt="Levante" class="logo" />
      </div>

      <div class="aside__actions">
        <div v-if="!isSuperAdmin" class="aside__action">
          <small class="label">Language</small>
          <LanguageSelector size="default" />
        </div>

        <div v-if="isSuperAdmin" class="aside__action">
          <small class="label">Bucket</small>
          <PvSelect
            v-model="selectedBucketId"
            class="w-full"
            empty-message="No available buckets"
            option-label="name"
            option-value="id"
            placeholder="Select Bucket"
            :highlight-on-select="true"
            :options="bucketOptions"
            @change="onChangeBucket"
          />
        </div>

        <div class="aside__action">
          <small class="label">Survey</small>
          <PvSelect
            v-model="surveyId"
            class="w-full"
            option-label="name"
            option-value="id"
            placeholder="Select Survey"
            show-clear
            :empty-message="selectedBucketId ? 'No available surveys' : 'Select a bucket to see surveys'"
            :highlight-on-select="true"
            :options="surveyOptions"
            @change="onChangeSurvey"
          />
        </div>

        <div v-if="surveyId" class="aside__action">
          <PvButton
            v-if="previewUrl"
            as="a"
            :href="previewUrl"
            target="_blank"
            class="w-full no-underline"
            @click="persistSurveyDraft"
          >
            <span class="flex justify-content-between align-items-center w-full">
              Full Preview <i class="pi pi-external-link"></i>
            </span>
          </PvButton>

          <PvButton severity="danger" variant="outlined" class="w-full mt-2" :disabled="!canUseSurveyActions" @click="downloadPDF">
            <span class="flex justify-content-between align-items-center gap-3 w-full">
              Download as PDF <i class="pi pi-download"></i>
            </span>
          </PvButton>
        </div>
      </div>

      <div v-if="isSuperAdmin" class="aside__footer">
        <router-link :to="{ name: 'Home' }">
          <PvButton class="w-full" severity="danger" variant="outlined">
            <i class="pi pi-arrow-left"></i>
            Return to Dashboard
          </PvButton>
        </router-link>
      </div>
    </aside>

    <main class="survey-manager__main">
      <SurveyCreatorComponent v-if="surveyCreator" :model="surveyCreator" />
    </main>
  </div>
</template>

<script setup lang="ts">
import PvButton from 'primevue/button';
import PvSelect from 'primevue/select';
import { Model } from 'survey-core';
import LanguageSelector from '@/components/LanguageSelector.vue';
import { useSurveyListQuery } from '@/composables/queries/useSurveyListQuery';
import { useSurveyQuery } from '@/composables/queries/useSurveyQuery';
import {
  getParsedLocale,
  getPlainSurveyData,
  setupSurveyMarkdownConverter,
  getSurveyDataWithDefaults,
  getSurveyTheme,
} from '@/helpers/survey';
import { logger } from '@/logger';
import { useAuthStore } from '@/store/auth';
import 'survey-core/survey-core.css';
import { type ICreatorOptions, SurveyCreatorModel } from 'survey-creator-core';
import 'survey-creator-core/survey-creator-core.css';
import { SurveyCreatorComponent } from 'survey-creator-vue';
import { SurveyPDF } from 'survey-pdf';
import { SurveyComponent } from 'survey-vue3-ui';
import { computed, inject, markRaw, nextTick, Ref, ref, watch, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

const BUCKETS = [
  { id: 'levante-assets-dev', name: 'Development' },
  { id: 'levante-assets-draft', name: 'Draft' },
];
const DEFAULT_BUCKET_ID = BUCKETS.find((bucket) => bucket.name.toLowerCase() === 'development')?.id ?? '';
const STORAGE_KEYS = {
  BUCKET_ID: 'levanteBucketId',
  SURVEY_ID: 'levanteSurveyId',
  SURVEY: 'levanteSurvey',
};

const { locale } = useI18n();
const authStore = useAuthStore();
const { isUserSuperAdmin } = authStore;
const route = useRoute();
const router = useRouter();

const footerHeight = inject<Ref<number>>('footerHeight', ref(0));

const getRouteValue = (value: unknown): string => {
  if (Array.isArray(value)) return value[0] ?? '';
  return typeof value === 'string' ? value : '';
};

const setSurveyBaseline = (): void => {
  surveyBaseline.value = surveyCreator.text;
};

const hasUnsavedSurveyChanges = (): boolean => {
  return Boolean(previousSurveyId.value && surveyCreator.text !== surveyBaseline.value);
};

const confirmDiscardChanges = (): boolean => {
  if (!hasUnsavedSurveyChanges()) return true;
  return window.confirm('Discard unsaved survey changes?');
};

const clearStoredSurveyDraft = (): void => {
  window.localStorage.removeItem(STORAGE_KEYS.SURVEY);
};

const bucketOptions = ref(BUCKETS);
const isSuperAdmin = computed(() => isUserSuperAdmin());
const routeBucketId = computed(() => getRouteValue(route.query.bucketId));
const routeSurveyId = computed(() => getRouteValue(route.params.surveyId));
const routeSurveyLanguage = computed(() => getRouteValue(route.params.surveyLanguage));
const routeSurveyPreview = computed(() => getRouteValue(route.params.surveyPreview));
const selectedBucketId = ref<string>(
  routeBucketId.value || window.localStorage.getItem(STORAGE_KEYS.BUCKET_ID) || DEFAULT_BUCKET_ID,
);
const surveyId = ref<string | null>(routeSurveyId.value || window.localStorage.getItem(STORAGE_KEYS.SURVEY_ID));
const previousBucketId = ref(selectedBucketId.value);
const previousSurveyId = ref<string | null>(surveyId.value);
const surveyBaseline = ref('');
const surveyLanguage = ref<string>(routeSurveyLanguage.value);
const bucketId = computed(() => selectedBucketId.value || DEFAULT_BUCKET_ID);
const isPreview = computed(() => routeSurveyPreview.value.toLowerCase() === 'preview');
const language = computed(() => surveyLanguage.value || locale.value);
const surveyQueryId = computed(() => surveyId.value ?? undefined);

const { data: surveyListData } = useSurveyListQuery(selectedBucketId);
const { data: surveyData, isFetching: isSurveyFetching } = useSurveyQuery(bucketId, surveyQueryId);

const surveyDataWithDefaults = ref<Record<string, any> | null>(null);

watch([surveyId, surveyData], ([newSurveyId, newSurveyData]) => {
  if (!newSurveyId || !newSurveyData) return;
  surveyDataWithDefaults.value = getSurveyDataWithDefaults(newSurveyId, newSurveyData);
});

const surveyOptions = computed(() => surveyListData.value ?? []);
const canUseSurveyActions = computed(() => Boolean(surveyId.value && surveyData.value));
const previewUrl = computed(() => {
  if (!surveyId.value) return '';

  return router.resolve({
    name: 'SurveyManager',
    params: {
      surveyPreview: 'preview',
      surveyId: surveyId.value,
      surveyLanguage: language.value,
    },
    query: { bucketId: bucketId.value },
  }).href;
});

const surveyCreatorOptions: ICreatorOptions = {
  autoSaveEnabled: isSuperAdmin.value,
  collapseOnDrag: true,
  showCreatorThemeSettings: isSuperAdmin.value,
  showDesignerTab: isSuperAdmin.value,
  showJSONEditorTab: isSuperAdmin.value,
  showLogicTab: isSuperAdmin.value,
};

const surveyCreator = new SurveyCreatorModel(surveyCreatorOptions);
surveyCreator.applyCreatorTheme(getSurveyTheme());
surveyCreator.onSurveyInstanceCreated.add((_sender, options) => {
  setupSurveyMarkdownConverter(options.survey);
});

const persistSurveyDraft = (): void => {
  window.localStorage.setItem(STORAGE_KEYS.BUCKET_ID, selectedBucketId.value);
  if (surveyId.value) window.localStorage.setItem(STORAGE_KEYS.SURVEY_ID, surveyId.value);
  window.localStorage.setItem(STORAGE_KEYS.SURVEY, surveyCreator.text);
};

surveyCreator.saveSurveyFunc = (saveNo: number, callback: (saveNo: number, isSuccess: boolean) => void) => {
  persistSurveyDraft();
  callback(saveNo, true);
};

// The creator model is not reactive, so its content is mirrored into a ref for the preview to track.
const surveyContent = ref('');

const syncSurveyContent = (): void => {
  surveyContent.value = surveyCreator.text;
};

surveyCreator.onModified.add(syncSurveyContent);

const surveyPreviewModel = computed(() => {
  if (!surveyContent.value) return null;

  const plain = JSON.parse(surveyContent.value);
  plain.locale = getParsedLocale(language.value);
  const model = new Model(plain);
  setupSurveyMarkdownConverter(model);
  model.applyTheme(getSurveyTheme());
  return markRaw(model);
});

const downloadPDF = async () => {
  if (!surveyId.value) return;

  const plain = getPlainSurveyData(surveyCreator.JSON);
  const locale = getParsedLocale(language.value);
  plain.locale = locale;
  const fileName = `${surveyId.value}_${locale.toLowerCase()}`;
  const surveyPDF = new SurveyPDF(plain, {});

  try {
    await surveyPDF.save(fileName);
  } catch (error) {
    logger.capture('Failed to download as PDF', { error });
  }
};

const onChangeBucket = async ({ value }: { value: string }) => {
  const nextBucketId = value || DEFAULT_BUCKET_ID;
  if (nextBucketId === previousBucketId.value) return;

  if (!confirmDiscardChanges()) {
    await nextTick();
    selectedBucketId.value = previousBucketId.value;
    return;
  }

  clearStoredSurveyDraft();
  selectedBucketId.value = nextBucketId;
  previousBucketId.value = nextBucketId;
  surveyId.value = null;
  previousSurveyId.value = null;
  surveyCreator.JSON = {};
  setSurveyBaseline();
  window.localStorage.setItem(STORAGE_KEYS.BUCKET_ID, nextBucketId);
  window.localStorage.removeItem(STORAGE_KEYS.SURVEY_ID);
};

const onChangeSurvey = async ({ value }: { value: string | null }) => {
  if (value === previousSurveyId.value) return;

  if (!confirmDiscardChanges()) {
    await nextTick();
    surveyId.value = previousSurveyId.value;
    return;
  }

  clearStoredSurveyDraft();
  surveyId.value = value;
  previousSurveyId.value = value;
  surveyCreator.JSON = {};
  setSurveyBaseline();
  if (value) window.localStorage.setItem(STORAGE_KEYS.SURVEY_ID, value);
  else window.localStorage.removeItem(STORAGE_KEYS.SURVEY_ID);
};

watch(
  [locale, bucketId, surveyDataWithDefaults, surveyId, isSurveyFetching],
  ([, newBucketId, newSurveyDataWithDefaults, newSurveyId, newIsSurveyFetching]) => {
    if (!newSurveyId) {
      surveyCreator.JSON = {};
      surveyContent.value = '';
      return;
    }

    if (newIsSurveyFetching) return;
    if (!newSurveyDataWithDefaults) return;

    newSurveyDataWithDefaults.locale = getParsedLocale(language.value);
    surveyCreator.JSON = newSurveyDataWithDefaults;
    setSurveyBaseline();

    // If the selected survey has been modified, use the local stored content
    const storedSurvey = window.localStorage.getItem(STORAGE_KEYS.SURVEY);
    if (
      storedSurvey &&
      window.localStorage.getItem(STORAGE_KEYS.BUCKET_ID) === newBucketId &&
      window.localStorage.getItem(STORAGE_KEYS.SURVEY_ID) === newSurveyId
    ) {
      surveyCreator.text = storedSurvey;
    }

    syncSurveyContent();
  },
  { immediate: true },
);

watch(routeBucketId, (newBucketId) => {
  if (!newBucketId) return;
  selectedBucketId.value = newBucketId;
  previousBucketId.value = newBucketId;
});

watch(routeSurveyId, (newSurveyId) => {
  if (!newSurveyId) return;
  surveyId.value = newSurveyId;
  previousSurveyId.value = newSurveyId;
});

watch(routeSurveyLanguage, (newSurveyLanguage) => {
  surveyLanguage.value = newSurveyLanguage;
});

watchEffect(() => {
  if (!selectedBucketId.value) selectedBucketId.value = DEFAULT_BUCKET_ID;
  if (isPreview.value && !surveyId.value) router.push({ name: 'SurveyManager' });
});
</script>

<style lang="scss">
.survey-manager,
.survey-preview {
  .svc-creator__content-wrapper {
    background-color: white;
  }

  .sd-container-modern__title {
    border-bottom: 1px solid var(--surface-d);
    box-shadow: none;
  }

  .sd-title {
    font-size: 1.5rem;
    color: var(--text-primary);
  }

  .sd-logo {
    .sd-logo__image {
      margin: 0;
    }
  }
}

.survey-preview {
  .sd-container-modern__title {
    border-top: 6px solid var(--primary-color);
  }
}

.survey-manager {
  display: flex;
  width: 100%;
  height: auto;
  border-top: 6px solid var(--primary-color);
}
.survey-manager__aside {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 320px;
  height: 100%;
  background-color: white;
  border-right: 1px solid #f3f3f3;
}
.aside__header {
  display: block;
  width: 100%;
  height: auto;
  margin: 0;
  padding: 1.5rem 1.5rem 0;
}
.logo {
  display: block;
  width: 100%;
  max-width: 175px;
  height: auto;
  margin: 0;
}
.aside__actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  height: auto;
  margin: 0;
  padding: 1.5rem 1.5rem 0;
}
.label {
  display: block;
  margin: 0 0 4px;
  font-weight: 700;
  font-size: 12px;
  color: var(--text-color-secondary);
  text-transform: uppercase;
}
.aside__footer {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  height: auto;
  margin: auto 0 0;
  padding: 1.5rem;
}
.survey-manager__main {
  display: block;
  flex: 1;
  height: 100%;
  background-color: #f3f3f3;
}
</style>
