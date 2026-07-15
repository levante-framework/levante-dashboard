<script setup>
import 'survey-core/survey-core.css';
import { SurveyComponent } from 'survey-vue3-ui';
import { useAuthStore } from '@/store/auth';
import { useSurveyStore } from '@/store/survey';
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import LevanteSpinner from '@/components/LevanteSpinner.vue';

const authStore = useAuthStore();
const router = useRouter();
const surveyStore = useSurveyStore();

onMounted(() => {
  if (!surveyStore.survey) {
    router.push({ name: 'Home' });
  }
});
</script>

<template>
  <div v-if="surveyStore.survey && !surveyStore.isSavingSurveyResponses">
    <h1
      v-if="authStore.userData.userType !== 'student' && surveyStore.isGeneralSurveyComplete"
      class="text-2xl font-bold text-black text-center"
    >
      {{
        authStore.userData.userType === 'parent'
          ? `${$t('userSurvey.specificRelationDescriptionChildA')} ${
              surveyStore.specificSurveyRelationData[surveyStore.specificSurveyRelationIndex].birthMonth
            } ${$t('userSurvey.specificRelationDescriptionChildB')} ${
              surveyStore.specificSurveyRelationData[surveyStore.specificSurveyRelationIndex].birthYear
            }`
          : `${$t('userSurvey.specificRelationDescriptionClass')} ${
              surveyStore.specificSurveyRelationData[surveyStore.specificSurveyRelationIndex].name
            }`
      }}
    </h1>

    <SurveyComponent :model="surveyStore.survey" />
  </div>

  <LevanteSpinner
    v-if="!surveyStore.survey || surveyStore.isSavingSurveyResponses"
    fullscreen
  />
</template>
