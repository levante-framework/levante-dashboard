<script setup>
import 'survey-core/defaultV2.min.css';
import { SurveyComponent } from 'survey-vue3-ui';
import { useAuthStore } from '@/store/auth';
import AppSpinner from '@/components/AppSpinner.vue';
import { useSurveyStore } from '@/store/survey';
import { useI18n } from 'vue-i18n';
import { AudioContext } from '@/helpers/audio';
import { getParsedLocale } from '@/helpers/survey';
import { onBeforeRouteLeave, ref, computed } from 'vue-router';
import { isLevante } from '@/helpers';
import PvButton from 'primevue/button';

const authStore = useAuthStore();
const surveyStore = useSurveyStore();
const { locale } = useI18n();
const context = new AudioContext();

// Virtual scrolling state
const currentPageIndex = ref(0);
const visiblePages = computed(() => {
  if (!surveyStore.survey?.pages) return [];
  const start = Math.max(0, currentPageIndex.value - 1);
  const end = Math.min(surveyStore.survey.pages.length, currentPageIndex.value + 2);
  return surveyStore.survey.pages.slice(start, end);
});

const currentPageKey = computed(() => `page-${currentPageIndex.value}`);

const getSpecificRelationDescription = computed(() => {
  if (!surveyStore.specificSurveyRelationData[surveyStore.specificSurveyRelationIndex]) return '';
  
  if (authStore.userData.userType === 'parent') {
    const child = surveyStore.specificSurveyRelationData[surveyStore.specificSurveyRelationIndex];
    return `${$t('userSurvey.specificRelationDescriptionChildA')} ${child.birthMonth} ${$t('userSurvey.specificRelationDescriptionChildB')} ${child.birthYear}`;
  } else {
    const classData = surveyStore.specificSurveyRelationData[surveyStore.specificSurveyRelationIndex];
    return `${$t('userSurvey.specificRelationDescriptionClass')} ${classData.name}`;
  }
});

// Handle page changes for virtual scrolling
const handlePageChange = (pageIndex) => {
  currentPageIndex.value = pageIndex;
};

onBeforeRouteLeave((to, from) => {
  if (isLevante && surveyStore.currentSurveyAudioSource) {
    surveyStore.currentSurveyAudioSource.stop();
  }
});

async function playAudio(name) {
  const currentLocale = getParsedLocale(locale.value);
  if (surveyStore.currentSurveyAudioSource) {
    await surveyStore.currentSurveyAudioSource.stop();
  }
  
  try {
    const source = context.createBufferSource();
    surveyStore.currentSurveyAudioSource = source;
    source.buffer = surveyStore.surveyAudioPlayerBuffers[currentLocale][name];
    source.connect(context.destination);
    source.start(0);
  } catch (error) {
    console.error('Error playing audio:', error);
  }
}

console.log('specificSurveyRelationData', surveyStore.specificSurveyRelationData)
console.log('specificSurveyRelationIndex', surveyStore.specificSurveyRelationIndex)
console.log('specific relation:', surveyStore.specificSurveyRelationData[surveyStore.specificSurveyRelationIndex])

</script>

<template>
  <div v-if="surveyStore.survey && !surveyStore.isSavingSurveyResponses && (!surveyStore.surveyAudioLoading || authStore.userData.userType === 'student')">
    <h1 v-if="authStore.userData.userType !== 'student' && surveyStore.isGeneralSurveyComplete" class="text-2xl font-bold text-black text-center">
      {{ getSpecificRelationDescription }}
    </h1>
    
    <div class="survey-container">
      <SurveyComponent 
        :model="surveyStore.survey" 
        :key="currentPageKey"
        @page-change="handlePageChange"
      />

      <div v-if="authStore.userData.userType === 'student'" class="audio-buttons-container">
        <template v-for="page in visiblePages" :key="page.name">
          <template v-for="item in page.elements[0].elements || page.elements" :key="item.name">
            <PvButton
              :id="'audio-button-' + item.name"
              icon="pi pi-volume-up text-white"
              class="audio-button"
              style="display: none"
              @click="playAudio(item.name)"
            />
          </template>
        </template>
      </div>
    </div>
  </div>

  <AppSpinner v-if="!surveyStore.survey || surveyStore.isSavingSurveyResponses || (surveyStore.surveyAudioLoading && authStore.userData.userType !== 'student')" />
</template>

<style>
.survey-container {
  position: relative;
  min-height: 400px;
}

.audio-buttons-container {
  position: relative;
  pointer-events: none;
}

.audio-button {
  position: absolute;
  right: 0;
  left: 500px;
  width: 40px;
  height: 40px;
  background-color: var(--primary-color);
  border: none;
  border-radius: 25%;
  pointer-events: auto;
}

.audio-button:hover {
  background-color: var(--primary-color-hover);
}
</style>
