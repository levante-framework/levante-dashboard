import { defineStore } from 'pinia';
import { ref, markRaw } from 'vue';

export const useSurveyStore = defineStore('surveyStore', () => {
  // State
  const requireRefresh = ref(false);
  const survey = ref(null); // This will hold the markRaw survey
  const numGeneralPages = ref(0);
  const numSpecificPages = ref(0);
  const isSavingSurveyResponses = ref(false);
  const allSurveyPages = ref([]);
  const allSpecificPages = ref([]);
  const currentPageIndex = ref(0);
  const specificSurveyRelationData = ref([]);
  const specificSurveyRelationIndex = ref(0);
  const isGeneralSurveyComplete = ref(false);
  const isSpecificSurveyComplete = ref(false);
  const isSurveyCompleted = ref(false);

  // Actions
  function setSurveyCompleted() {
    isSurveyCompleted.value = true;
  }

  function setSurvey(surveyInstance) {
    // Mark the survey instance as raw to prevent deep reactivity
    survey.value = markRaw(surveyInstance);
  }

  function setNumberOfSurveyPages(numGeneral, numSpecific) {
    numGeneralPages.value = numGeneral;
    numSpecificPages.value = numSpecific;
  }

  function setIsSavingSurveyResponses(isSaving) {
    isSavingSurveyResponses.value = isSaving;
  }

  function setAllSurveyPages(pages) {
    allSurveyPages.value = pages;
  }

  function setAllSpecificPages(pages) {
    allSpecificPages.value = pages;
  }

  function setCurrentPageIndex(index) {
    currentPageIndex.value = index;
  }

  function setSpecificSurveyRelationData(data) {
    specificSurveyRelationData.value = data;
  }

  function setSpecificSurveyRelationIndex(index) {
    specificSurveyRelationIndex.value = index;
  }

  function setIsGeneralSurveyComplete(isComplete) {
    isGeneralSurveyComplete.value = isComplete;
  }

  function setIsSpecificSurveyComplete(isComplete) {
    isSpecificSurveyComplete.value = isComplete;
  }

  function reset() {
    requireRefresh.value = false;
    survey.value = null;
    numGeneralPages.value = 0;
    numSpecificPages.value = 0;
    isSavingSurveyResponses.value = false;
    allSurveyPages.value = [];
    allSpecificPages.value = [];
    currentPageIndex.value = 0;
    specificSurveyRelationData.value = [];
    specificSurveyRelationIndex.value = 0;
    isGeneralSurveyComplete.value = false;
    isSpecificSurveyComplete.value = false;
    isSurveyCompleted.value = false;
  }

  return {
    // State
    requireRefresh,
    survey,
    numGeneralPages,
    numSpecificPages,
    isSavingSurveyResponses,
    allSurveyPages,
    allSpecificPages,
    currentPageIndex,
    specificSurveyRelationData,
    specificSurveyRelationIndex,
    isGeneralSurveyComplete,
    isSpecificSurveyComplete,
    isSurveyCompleted,

    // Actions
    setSurveyCompleted,
    setSurvey,
    setNumberOfSurveyPages,
    setIsSavingSurveyResponses,
    setAllSurveyPages,
    setAllSpecificPages,
    setCurrentPageIndex,
    setSpecificSurveyRelationData,
    setSpecificSurveyRelationIndex,
    setIsGeneralSurveyComplete,
    setIsSpecificSurveyComplete,
    reset,
  };
});
