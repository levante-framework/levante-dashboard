<template>
  <LevanteSpinner v-if="isSurveyLoading" fullscreen />

  <PvMessage v-else-if="isSurveyError" icon="pi pi-times-circle" severity="error" class="m-5">
    {{ surveyError?.message }}
  </PvMessage>

  <div v-else :class="isLive ? 'preview preview--live' : 'preview'">
    <aside v-if="!isLive" class="preview-aside">
      <div class="preview-aside-header">
        <img src="/LEVANTE/Levante_Logo.png" alt="Levante" class="logo" />
      </div>

      <div class="preview-aside-main">
        <div class="preview-aside-option">
          <small class="label">Language</small>
          <LanguageSelector />
        </div>

        <div class="preview-aside-option">
          <small class="label">Survey</small>
          <PvSelect
            v-model="routeSurveyId"
            class="w-full"
            option-label="name"
            option-value="id"
            placeholder="Select Survey"
            size="small"
            :highlight-on-select="true"
            :options="surveyOptions"
            @change="onChangeSurvey"
          />
        </div>

        <div class="preview-aside-option">
          <small class="label">Actions</small>
          <a :href="`/survey/preview/${routeSurveyId}/live/${locale}`" target="_blank">
            <PvButton class="w-full" :disabled="!routeSurveyId">
              <span class="flex justify-content-between align-items-center w-full">
                Live Preview <i class="pi pi-external-link"></i>
              </span>
            </PvButton>
          </a>

          <PvButton
            variant="outlined"
            class="w-full mt-2"
            :disabled="!routeSurveyId || isDownloading"
            @click="downloadPDF"
          >
            <span v-if="!isDownloading" class="flex justify-content-between align-items-center gap-3 w-full">
              Download as PDF <i class="pi pi-download"></i>
            </span>
          </PvButton>
        </div>
      </div>
    </aside>

    <main v-if="routeSurveyId" class="preview-main">
      <header v-if="!isLive" class="preview-main-header">
        <small class="label">Selected survey</small>
        <h4 class="m-0 font-semibold text-color">{{ selectedSurveyName }}</h4>
      </header>

      <SurveyComponent v-if="surveyModel" :model="surveyModel" />
    </main>

    <main v-else class="preview-main-empty">
      <div class="empty-message-wrapper">
        <i class="pi pi-exclamation-circle"></i>
        <p class="m-0">Please select a survey to preview it</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import LanguageSelector from '@/components/LanguageSelector.vue';
import LevanteSpinner from '@/components/LevanteSpinner.vue';
import { SurveyOption, SURVEYS, useSurveyQuery } from '@/composables/queries/useSurveyQuery';
import { getParsedLocale } from '@/helpers/survey';
import PvButton from 'primevue/button';
import PvMessage from 'primevue/message';
import PvSelect from 'primevue/select';
import { Model } from 'survey-core';
import 'survey-core/survey-core.css';
import 'survey-core/survey.i18n';
import { SurveyPDF } from 'survey-pdf';
import { SurveyComponent } from 'survey-vue3-ui';
import { computed, markRaw, ref, toRaw, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

const { locale } = useI18n();
const route = useRoute();
const router = useRouter();

const isLive = ref(false);
const isDownloading = ref(false);
const routeSurveyId = ref(route.params.id as string);
const routeLocale = ref(route.params.locale as string);

const selectedSurveyName = computed(
  () =>
    SURVEYS.find((survey: SurveyOption) => survey.id.toLowerCase() === (route.params.id as string).toLowerCase())
      ?.name || '',
);

const surveyOptions = computed(() => SURVEYS);

const surveyModel = computed(() => {
  const surveyDataRaw = surveyData.value;
  if (!surveyDataRaw) return null;
  const plain = getPlainSurveyData(surveyDataRaw);
  plain.locale = getParsedLocale(routeLocale.value || locale.value);
  return markRaw(new Model(plain));
});

const {
  data: surveyData,
  error: surveyError,
  isError: isSurveyError,
  isLoading: isSurveyLoading,
} = useSurveyQuery(routeSurveyId.value);

const downloadPDF = async () => {
  isDownloading.value = true;
  const plain = getPlainSurveyData(surveyData.value);
  plain.locale = getParsedLocale(routeLocale.value || locale.value);
  const fileName = `${getFullDate()}_${routeSurveyId.value}`;
  const surveyPDF = new SurveyPDF(plain, {});
  surveyPDF.data = surveyModel.value;
  surveyPDF
    .save(fileName)
    .catch((error) => {
      console.error('Failed to download as PDF', error);
    })
    .finally(() => {
      isDownloading.value = false;
    });
};

const getFullDate = () => {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear();
  return `${year}${month}${day}`;
};

const getPlainSurveyData = (raw: unknown) => {
  return typeof structuredClone === 'function' ? structuredClone(toRaw(raw)) : JSON.parse(JSON.stringify(toRaw(raw)));
};

const onChangeSurvey = ({ value }: { value: string }) => {
  router.push(`/survey/preview/${value}`);
};

watchEffect(() => {
  if (route.params?.live?.toString()?.toLowerCase() === 'live') {
    isLive.value = true;
  } else {
    router.push(`/survey/preview/${routeSurveyId.value}`);
  }
});
</script>

<style lang="scss">
.preview {
  display: flex;
  align-items: flex-start;
  width: 100%;
  height: auto;
  min-height: 100dvh;
  margin: 0;
  padding: 6px 0 0 320px;
  background-color: #f3f3f3;

  &::before {
    content: '';
    display: block;
    width: 100%;
    height: auto;
    margin: 0;
    border-top: 6px solid var(--primary-color);
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1000;
  }

  &.preview--live {
    padding: 0;
  }
}

.preview-aside {
  display: block;
  width: 100%;
  max-width: 320px;
  height: calc(100% - 6px);
  margin: 0;
  padding: 0 0 1.5rem;
  background-color: white;
  border-right: 2px solid #f3f3f3;
  position: fixed;
  top: 6px;
  left: 0;
  z-index: 100;
  overflow-y: auto;
}

.preview-aside-header {
  display: block;
  width: 100%;
  height: auto;
  margin: 0;
  padding: 1.5rem 1.5rem 0;
}

.preview-aside-main {
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

.logo {
  display: block;
  width: 100%;
  max-width: 175px;
  height: auto;
  margin: 0;
}

.preview-main {
  display: block;
  width: 100%;
  height: auto;
}

.preview-main-header {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0;
  width: 100%;
  height: auto;
  margin: 0;
  padding: 1.5rem 2.5rem;
  background-color: white;
  position: sticky;
  top: 6px;
  z-index: 10;
  box-shadow: 0 2px 4px rgba(black, 0.1);
}

.preview-main-empty {
  display: flex;
  width: 100%;
  height: auto;
  min-height: calc(100dvh - 6px);
}

.empty-message-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 1rem;
  margin: auto;
  padding: 0.75rem 1rem;
  background-color: rgba(var(--bright-yellow-rgb), 0.1);
  border-radius: 0.75rem;
  font-weight: 600;
  color: var(--bright-yellow);

  .pi {
    margin: auto;
    font-size: 1.5rem;
    color: var(--bright-yellow);
  }
}
</style>
