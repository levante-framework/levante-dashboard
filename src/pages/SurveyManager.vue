<template>
  <div v-if="isPreview" class="">
    <SurveyComponent v-if="surveyPreviewModel" :model="surveyPreviewModel" />
  </div>

  <div v-else class="survey-manager">
    <aside class="survey-manager__aside">
      <div class="aside__header">
        <img src="/LEVANTE/Levante_Logo.png" alt="Levante" class="logo" />
      </div>

      <div class="aside__actions">
        <div v-if="!isUserSuperAdmin()" class="aside__action">
          <small class="label">Language</small>
          <LanguageSelector size="default" />
        </div>

        <div v-if="isUserSuperAdmin()" class="aside__action">
          <small class="label">Bucket</small>
          <PvSelect
            v-model="selectedBucket"
            class="w-full"
            empty-message="No available buckets"
            option-label="name"
            option-value="url"
            placeholder="Select Bucket"
            :highlight-on-select="true"
            :options="bucketOptions"
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
            :empty-message="selectedBucket ? 'No available surveys' : 'Select a bucket to see surveys'"
            :highlight-on-select="true"
            :options="surveyOptions"
            @change="onChangeSurvey"
          />
        </div>

        <div v-if="surveyId" class="aside__action">
          <a :href="`/survey-manager/preview/${surveyId}/${language}`" target="_blank">
            <PvButton class="w-full">
              <span class="flex justify-content-between align-items-center w-full">
                Full Preview <i class="pi pi-external-link"></i>
              </span>
            </PvButton>
          </a>

          <PvButton variant="outlined" class="w-full mt-2" @click="downloadPDF">
            <span class="flex justify-content-between align-items-center gap-3 w-full">
              Download as PDF <i class="pi pi-download"></i>
            </span>
          </PvButton>
        </div>
      </div>

      <div v-if="isUserSuperAdmin()" class="aside__footer">
        <router-link :to="{ name: 'Home' }">
          <PvButton class="w-full mt-2" variant="outlined">
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
import LanguageSelector from '@/components/LanguageSelector.vue';
import { useSurveyListQuery } from '@/composables/queries/useSurveyListQuery';
import { useSurveyQuery } from '@/composables/queries/useSurveyQuery';
import { getParsedLocale, getPlainSurveyData } from '@/helpers/survey';
import { useAuthStore } from '@/store/auth';
import PvButton from 'primevue/button';
import PvSelect from 'primevue/select';
import { Model } from 'survey-core';
import 'survey-core/survey-core.css';
import { type ICreatorOptions, SurveyCreatorModel } from 'survey-creator-core';
import 'survey-creator-core/survey-creator-core.css';
import { SC2020 } from 'survey-creator-core/themes';
import { SurveyCreatorComponent } from 'survey-creator-vue';
import { SurveyPDF } from 'survey-pdf';
import { SurveyComponent } from 'survey-vue3-ui';
import { computed, markRaw, ref, watch, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

const BUCKETS = [
  { name: 'Development', url: 'https://storage.googleapis.com/levante-assets-dev/surveys' },
  { name: 'Draft', url: 'https://storage.googleapis.com/levante-assets-draft/surveys' },
];

const { locale } = useI18n();
const authStore = useAuthStore();
const { isUserSuperAdmin } = authStore;
const route = useRoute();
const router = useRouter();

const bucketOptions = ref(BUCKETS);
const bucketUrl = computed(
  () => selectedBucket.value || BUCKETS.find((bucket) => bucket.name.toLowerCase() === 'development')?.url,
);
const isPreview = computed(() => surveyPreview.value.toLowerCase() === 'preview');
const language = computed(() => surveyLanguage.value || locale.value);
const selectedBucket = ref<string | undefined>(undefined);
const surveyId = ref(route.params.surveyId as string);
const surveyLanguage = ref(route.params.surveyLanguage as string);
const surveyOptions = computed(() => surveyListData.value ?? []);
const surveyPreview = ref(route.params.surveyPreview as string);

const { data: surveyListData } = useSurveyListQuery(selectedBucket);
const { data: surveyData } = useSurveyQuery(bucketUrl, surveyId);

const surveyCreatorTheme = {
  ...SC2020,
  cssVariables: {
    ...SC2020.cssVariables,
    '--sjs-corner-radius': '8px',
    '--sjs-primary-backcolor-dark': '#a22d10',
    '--sjs-primary-backcolor-light': 'rgba(220, 38, 38, 0.1)',
    '--sjs-primary-backcolor': '#da3d16',
    '--sjs-primary-background-500': '#da3d16',
    '--sjs-secondary-background-500': '#a22d10',
  },
};

const surveyCreatorOptions: ICreatorOptions = {
  autoSaveEnabled: true,
  // collapseOnDrag: true,
  showCreatorThemeSettings: isUserSuperAdmin(),
  showDesignerTab: isUserSuperAdmin(),
  showJSONEditorTab: isUserSuperAdmin(),
  showLogicTab: isUserSuperAdmin(),
};

const surveyCreator = new SurveyCreatorModel(surveyCreatorOptions);
surveyCreator.applyCreatorTheme(surveyCreatorTheme);
surveyCreator.saveSurveyFunc = (saveNo: number, callback: Function) => {
  // window.localStorage.setItem('survey-json', surveyCreator.text);
  // callback(saveNo, true);
};

const surveyPreviewModel = computed(() => {
  const raw = surveyData.value;
  if (!raw) return null;
  const plain = getPlainSurveyData(raw);
  plain.locale = getParsedLocale(language.value);
  return markRaw(new Model(plain));
});

const downloadPDF = async () => {
  const plain = getPlainSurveyData(surveyData.value);
  const locale = getParsedLocale(language.value);
  plain.locale = locale;
  const fileName = `${surveyId.value}_${locale.toLowerCase()}`;
  const surveyPDF = new SurveyPDF(plain, {});
  surveyPDF.data = surveyPreviewModel.value;
  surveyPDF.save(fileName).catch((error) => {
    console.error('Failed to download as PDF', error);
  });
};

const onChangeSurvey = ({ value }: { value: string }) => {
  surveyId.value = value;
};

watch(
  [surveyData, locale],
  ([newSurveyData]) => {
    const plain = getPlainSurveyData(newSurveyData);
    if (plain) plain.locale = getParsedLocale(language.value);
    surveyCreator.JSON = plain;
  },
  { immediate: true },
);

watchEffect(() => {
  // Survey id is required to preview it
  if (surveyPreview.value && !surveyId.value) {
    router.push({ name: 'Survey_Manager' });
  }

  // Set development bucket as the default for non-superadmin users
  if (!isUserSuperAdmin()) {
    selectedBucket.value = BUCKETS.find((bucket) => bucket.name.toLowerCase() === 'development')?.url;
  }
});
</script>

<style lang="scss">
.survey-manager {
  display: flex;
  width: 100%;
  height: 100dvh;
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
