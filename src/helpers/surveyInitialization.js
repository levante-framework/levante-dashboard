import { 
  getParsedLocale, 
  fetchBuffer, 
  showAndPlaceAudioButton, 
  restoreSurveyData, 
  saveFinalSurveyData,
} from '@/helpers/survey';
import { LEVANTE_SURVEY_RESPONSES_KEY } from '@/constants/bucket';

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
  restoreSurveyData({
    surveyInstance,
    uid: userData.id,
    selectedAdmin: userData.selectedAdminId,
    surveyResponsesData: userData.surveyResponsesData,
    surveyStore,
  });

  // Store all pages from the survey JSON
  const allGeneralPages = generalSurveyData.pages;
  const allSpecificPages = specificSurveyData?.pages || [];
  surveyStore.setAllSurveyPages(allGeneralPages);
  surveyStore.setAllSpecificPages(allSpecificPages);

  const numGeneralPages = allGeneralPages.length;
  const numSpecificPages = allSpecificPages.length;
  surveyStore.setNumberOfSurveyPages(numGeneralPages, numSpecificPages);


  if (userType === 'student') {
    await setupStudentAudio(surveyInstance, locale, audioLinkMap, surveyStore);
  }

  surveyStore.setNumberOfSurveyPages(numGeneralPages, numSpecificPages);
}


export async function setupStudentAudio(surveyInstance, locale, audioLinkMap, surveyStore) {
  const parsedLocale = getParsedLocale(locale);
  await fetchBuffer({ 
    parsedLocale, 
    setSurveyAudioLoading: surveyStore.setSurveyAudioLoading, 
    audioLinks: audioLinkMap, 
    surveyAudioBuffers: surveyStore.surveyAudioPlayerBuffers, 
    setSurveyAudioPlayerBuffers: surveyStore.setSurveyAudioPlayerBuffers 
  });

  surveyInstance.onAfterRenderPage.add((__, { htmlElement }) => {
    const questionElements = htmlElement.querySelectorAll('div[id^=sq_]');
    if (surveyStore.currentSurveyAudioSource) {
      surveyStore.currentSurveyAudioSource.stop();
    }
    questionElements.forEach((el) => {
      const playAudioButton = document.getElementById('audio-button-' + el.dataset.name);
      showAndPlaceAudioButton({playAudioButton, el});
    });
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

  
  surveyInstance.onValueChanged.add((sender, options) => {
    const currentPageNo = sender.currentPageNo;
    console.log('currentPageNo: ', currentPageNo);
    const questionName = options.name;
    const responseValue = options.value;
    const isGeneralSurvey = !surveyStore.isGeneralSurveyComplete;
    
    // Initialize or get existing data from localStorage
    let responsesData = JSON.parse(localStorage.getItem(`${LEVANTE_SURVEY_RESPONSES_KEY}-${uid}`) || "{}");
    
    if (!responsesData?.responses) {
      console.log('initializing responsesData');
      responsesData.responses = { general: {}, specific: {}, currentPageNo: currentPageNo };
    }
    
    // Save data based on whether it's a general or specific survey
    if (isGeneralSurvey) {
      // For general survey
      if (!responsesData.responses.general[currentPageNo]) {
        responsesData.responses.general[currentPageNo] = {};
      }
      responsesData.responses.general[currentPageNo][questionName] = responseValue;
    } else {
      // For specific survey, add an additional level based on userType
      if (!responsesData.responses.specific) {
        responsesData.responses.specific = {};
      }
      
      const specificIndex = surveyStore.specificSurveyRelationIndex;
      const specificId = specificIds[specificIndex];
      
      // Create the specific id key if it doesn't exist
      if (!responsesData.responses.specific[specificId]) {
        responsesData.responses.specific[specificId] = {};
      }
      
      // Create the page number key if it doesn't exist
      if (!responsesData.responses.specific[specificId][currentPageNo]) {
        responsesData.responses.specific[specificId][currentPageNo] = {};
      }
      
      // Save the response
      responsesData.responses.specific[specificId][currentPageNo][questionName] = responseValue;
    }
    
    // Save to localStorage
    localStorage.setItem(`${LEVANTE_SURVEY_RESPONSES_KEY}-${uid}`, JSON.stringify(responsesData));
  });

  surveyInstance.onCurrentPageChanged.add((sender) => {  
    const currentPageNo = sender.currentPageNo;
    const previousPageNo = currentPageNo > 0 ? currentPageNo - 1 : 0;
    
    // Update the current page index in the store
    surveyStore.setCurrentPageIndex(currentPageNo);

    const localStorageData   = JSON.parse(localStorage.getItem(`${LEVANTE_SURVEY_RESPONSES_KEY}-${uid}`))
    const isGeneralSurvey = !surveyStore.isGeneralSurveyComplete;
    const prevPageData = isGeneralSurvey ? localStorageData.responses.general[previousPageNo] :
     localStorageData.responses.specific[specificIds[surveyStore.specificSurveyRelationIndex]][previousPageNo];
    
    console.log('prevPageData: ', prevPageData);
    
    if (prevPageData.length > 0) {            
      // Create a structured data object similar for the backend
      const structuredResponses = {
        pageNo: previousPageNo,
        isGeneral: !surveyStore.isGeneralSurveyComplete,
        isComplete: false,
        responses: prevPageData,
        userType: userType,
      };
      
      // Set specificId if it's a specific survey
      if (surveyStore.isGeneralSurveyComplete) {
        const specificIndex = surveyStore.specificSurveyRelationIndex;
        structuredResponses.specificId = specificIds[specificIndex];
      }
      
      // Save to the database
      try {
        roarfirekit.saveSurveyResponses({
          surveyData: structuredResponses,
          administrationId: selectedAdminId ?? null,
        });
      } catch (error) {
        console.error('Error saving survey responses on page change: ', error);
      }
      
    }
  });

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
