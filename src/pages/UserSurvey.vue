<script setup>
import { storeToRefs } from 'pinia';
import LevanteSpinner from '@/components/LevanteSpinner.vue';
import { useSurveyStore } from '@/store/survey';
import 'survey-core/survey-core.css';
import { SurveyComponent } from 'survey-vue3-ui';
import { inject, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const surveyStore = useSurveyStore();
const { isSavingSurveyResponses, survey } = storeToRefs(surveyStore);

const navbarHeight = inject('navbarHeight', ref(0));
const footerHeight = inject('footerHeight', ref(0));

onMounted(() => {
  if (!survey.value) {
    router.push({ name: 'Home' });
  }
});
</script>

<template>
  <div v-if="survey && !isSavingSurveyResponses" class="survey-wrapper" :style="{
    height: `calc(100dvh - ${navbarHeight}px - ${footerHeight}px - 7px)`
  }">
    <SurveyComponent :model="survey" class="survey" />
  </div>

  <LevanteSpinner
    v-if="!survey || isSavingSurveyResponses"
    fullscreen
  />
</template>

<style lang="scss">
.survey {
  .sd-container-modern__title {
    padding: 1rem 2.5rem;
    border-bottom: 1px solid var(--surface-d);
    box-shadow: none;
    position: sticky;
    top: 0;
    z-index: 100;

    .sd-header__text {
      .sd-title {
        font-size: 20px;
        line-height: 1;
      }
    }
  }
}
</style>
