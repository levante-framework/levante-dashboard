<script setup>
import 'survey-core/survey-core.css';
// import '@/styles/survey-levante.css';
import { Model } from 'survey-core';
import { SurveyComponent } from 'survey-vue3-ui';
import { onMounted, nextTick } from 'vue';
// import { levanteLikeTheme } from '@/helpers/surveyTheme';

const surveyJson = {
  showQuestionNumbers: 'off',
  showCompletedPage: false,
  completedHtml: '',
  completeText: 'Sign in',
  pages: [
    {
      name: 'signin',
      elements: [
        { type: 'text', inputType: 'email', name: 'email', title: 'Email', isRequired: true, placeholder: 'name@company.com' },
        { type: 'text', inputType: 'password', name: 'password', title: 'Password', isRequired: true, placeholder: '••••••••' }
      ]
    }
  ]
};

const survey = new Model(surveyJson);
// survey.applyTheme(levanteLikeTheme);
survey.locale = 'en';

onMounted(async () => {
  console.log('[SurveyPreview] model created, pages:', survey.pages?.length);
  await nextTick();
  const root = document.querySelector('.sd-root, .sd-root-modern');
  console.log('[SurveyPreview] survey root exists?', !!root, root);
  if (root) {
    // @ts-ignore
    console.log('[SurveyPreview] innerHTML length:', root.innerHTML?.length);
    // @ts-ignore
    const body = root.querySelector('.sd-body');
    console.log('[SurveyPreview] .sd-body exists?', !!body, body);
  }
});
</script>

<template>
  <div class="p-4 min-h-screen">
    <div style="position:fixed;top:64px;left:16px;z-index:99999;background:#ef4444;color:#fff;padding:6px 10px;border-radius:6px;">
      DEBUG: Preview route mounted
    </div>
    <div class="text-center mb-4">
      <h1 class="text-2xl font-bold">Survey Preview</h1>
      <p class="text-gray-600">Quick visual check of SurveyJS with the Levante theme.</p>
    </div>
    <div id="debug-marker" class="mb-2 inline-block rounded bg-yellow-100 text-yellow-900 px-2 py-1">
      Debug marker — page content is rendering
    </div>
    <div class="border p-4 bg-white">
      <SurveyComponent v-if="survey" :model="survey" />
    </div>
  </div>
</template>
