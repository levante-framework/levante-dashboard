import { 
  getParsedLocale, 
  fetchBuffer, 
  showAndPlaceAudioButton, 
  restoreSurveyData, 
  saveFinalSurveyData,
  saveSurveyData,
} from '@/helpers/survey';

// Debounce function for performance
const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

export async function initializeSurvey({
  surveyInstance,
  userType,
  specificSurveyData,
  userData,
  surveyStore,
  locale,
  audioLinkMap,
  generalSurveyData,
}) {
  // Restore survey data with error handling
  try {
    const { isRestored, pageNo } = await restoreSurveyData({
      surveyInstance,
      uid: userData.id,
      selectedAdmin: userData.selectedAdminId,
      surveyResponsesData: userData.surveyResponsesData,
      surveyStore,
    });

    // Store pages progressively
    const allGeneralPages = generalSurveyData.pages;
    const allSpecificPages = specificSurveyData?.pages || [];
    
    // Use requestAnimationFrame for smooth UI updates
    requestAnimationFrame(() => {
      surveyStore.setAllSurveyPages(allGeneralPages);
      surveyStore.setAllSpecificPages(allSpecificPages);
    });

    const numGeneralPages = allGeneralPages.length;
    const numSpecificPages = allSpecificPages.length;
    
    // Batch state updates
    surveyStore.setNumberOfSurveyPages(numGeneralPages, numSpecificPages);

    // Setup audio only for students and only if needed
    if (userType === 'student' && !surveyStore.surveyAudioPlayerBuffers[getParsedLocale(locale)]) {
      await setupStudentAudio(surveyInstance, locale, audioLinkMap, surveyStore);
    }
  } catch (error) {
    console.error('Error initializing survey:', error);
    // Handle error appropriately
  }
}

export async function setupStudentAudio(surveyInstance, locale, audioLinkMap, surveyStore) {
  const parsedLocale = getParsedLocale(locale);
  
  // Start audio loading in the background
  fetchBuffer({ 
    parsedLocale, 
    setSurveyAudioLoading: surveyStore.setSurveyAudioLoading, 
    audioLinks: audioLinkMap, 
    surveyAudioBuffers: surveyStore.surveyAudioPlayerBuffers, 
    setSurveyAudioPlayerBuffers: surveyStore.setSurveyAudioPlayerBuffers 
  });

  // Debounce the audio button setup to prevent excessive DOM updates
  const debouncedSetupAudioButtons = debounce((htmlElement) => {
    const questionElements = htmlElement.querySelectorAll('div[id^=sq_]');
    if (surveyStore.currentSurveyAudioSource) {
      surveyStore.currentSurveyAudioSource.stop();
    }
    
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    questionElements.forEach((el) => {
      const playAudioButton = document.getElementById('audio-button-' + el.dataset.name);
      if (playAudioButton) {
        fragment.appendChild(playAudioButton);
      }
    });
    
    // Batch DOM updates
    requestAnimationFrame(() => {
      questionElements.forEach((el) => {
        const playAudioButton = document.getElementById('audio-button-' + el.dataset.name);
        showAndPlaceAudioButton({playAudioButton, el});
      });
    });
  }, 100);

  surveyInstance.onAfterRenderPage.add((__, { htmlElement }) => {
    debouncedSetupAudioButtons(htmlElement);
  });
}

export function setupSurveyEventHandlers({
  surveyInstance,
  userType,
  roarfirekit,
  uid,
  selectedAdminId,
  surveyStore,
  router,
  toast,
  queryClient,
  userData,
  gameStore,
}) {
  let specificIds = [];
  if (userType === 'parent') {
    specificIds = userData.childIds;
  } else if (userType === 'teacher') {
    specificIds = userData.classes.current;
  }

  // Debounce save operations
  const debouncedSave = debounce((sender, options) => {
    saveSurveyData({ 
      survey: sender, 
      roarfirekit, 
      uid, 
      selectedAdmin: selectedAdminId, 
      questionName: options.name, 
      responseValue: options.value,
      userType,
      numGeneralPages: surveyStore.numGeneralPages,
      numSpecificPages: surveyStore.numSpecificPages,
      surveyStore,
      specificIds: specificIds,
      saveSurveyResponses: roarfirekit.saveSurveyResponses
    });
  }, 1000);

  surveyInstance.onValueChanged.add((sender, options) => debouncedSave(sender, options));

  surveyInstance.onComplete.add((sender) => 
    saveFinalSurveyData({ 
      sender, 
      roarfirekit, 
      uid, 
      surveyStore, 
      router, 
      toast, 
      queryClient,
      specificIds: specificIds,
      selectedAdmin: selectedAdminId,
      userType,
      gameStore,
    })
  );
}
