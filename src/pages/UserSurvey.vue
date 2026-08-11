<script setup>
import { storeToRefs } from 'pinia';
import LevanteSpinner from '@/components/LevanteSpinner.vue';
import { useAuthStore } from '@/store/auth';
import { useSurveyStore } from '@/store/survey';
import 'survey-core/survey-core.css';
import { SurveyComponent } from 'survey-vue3-ui';
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const authStore = useAuthStore();
const { userData } = storeToRefs(authStore);
const surveyStore = useSurveyStore();
const {
  isGeneralSurveyComplete,
  isSavingSurveyResponses,
  isSurveyCompleted,
  specificSurveyRelationData,
  specificSurveyRelationIndex,
  survey,
} = storeToRefs(surveyStore);

const birthMonth = computed(() => {
  return specificSurveyRelationData.value[specificSurveyRelationIndex.value]?.birthMonth ?? '--';
});

const birthYear = computed(() => {
  return specificSurveyRelationData.value[specificSurveyRelationIndex.value]?.birthYear ?? '--';
});

const name = computed(() => {
  return specificSurveyRelationData.value[specificSurveyRelationIndex.value]?.name ?? '--';
});

onMounted(() => {
  if (!survey.value) {
    router.push({ name: 'Home' });
  }
});
</script>

<template>
  <div v-if="survey && !isSavingSurveyResponses">
    <h1
      v-if="userData.userType !== 'student' && isGeneralSurveyComplete && !isSurveyCompleted"
      class="text-2xl font-bold text-black text-center"
    >
      {{
        userData.userType === 'parent'
          ? `${$t('userSurvey.specificRelationDescriptionChildA')} ${
              birthMonth
            } ${$t('userSurvey.specificRelationDescriptionChildB')} ${
              birthYear
            }`
          : `${$t('userSurvey.specificRelationDescriptionClass')} ${
              name
            }`
      }}
    </h1>

    <SurveyComponent :model="survey" />
  </div>

  <LevanteSpinner
    v-if="!survey || isSavingSurveyResponses"
    fullscreen
  />
</template>
