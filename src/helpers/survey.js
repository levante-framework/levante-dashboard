import axios from 'axios';
import _merge from 'lodash/merge';
import { BufferLoader, AudioContext } from '@/helpers/audio';
import { LEVANTE_SURVEY_RESPONSES_KEY } from '@/constants/bucket';
const context = new AudioContext();


export const fetchAudioLinks = async (surveyType) => {
    const response = await axios.get('https://storage.googleapis.com/storage/v1/b/road-dashboard/o/');
    const files = response.data || { items: [] };
    const audioLinkMap = {};
    files.items.forEach((item) => {
      if (item.contentType === 'audio/mpeg' && item.name.startsWith(surveyType)) {
        const splitParts = item.name.split('/');
        const fileLocale = splitParts[1];
        const fileName = splitParts.at(-1).split('.')[0];
        if (!audioLinkMap[fileLocale]) {
          audioLinkMap[fileLocale] = {};
        }
        audioLinkMap[fileLocale][fileName] = `https://storage.googleapis.com/road-dashboard/${item.name}`;
      }
    });
    return audioLinkMap;
  };
  
  
export function getParsedLocale(locale) {
    return (locale || '').split('-')?.[0] || 'en';
  }
  
  function finishedLoading({ bufferList, parsedLocale, setSurveyAudioLoading, setSurveyAudioPlayerBuffers }) {
    setSurveyAudioPlayerBuffers(parsedLocale, bufferList);
    setSurveyAudioLoading(false);
  }
  
  // Function to fetch buffer or return from the cache
  export const fetchBuffer = ({ parsedLocale, setSurveyAudioLoading, audioLinks, surveyAudioBuffers, setSurveyAudioPlayerBuffers }) => {
    // buffer already exists for the given local
    if (surveyAudioBuffers[parsedLocale]) {
      return;
    }
    setSurveyAudioLoading(true);
    const bufferLoader = new BufferLoader(context, audioLinks[parsedLocale], (bufferList) =>
      finishedLoading({ bufferList, parsedLocale, setSurveyAudioLoading, setSurveyAudioPlayerBuffers }),
    );
  
    bufferLoader.load();
  };
  
  
  export const showAndPlaceAudioButton = ({ playAudioButton, el }) => {
    if (playAudioButton) {
      playAudioButton.classList.add('play-button-visible');
      playAudioButton.style.display = 'flex';
      el.appendChild(playAudioButton);
    }
  };

  export function restoreSurveyData({ surveyInstance, uid, selectedAdmin, surveyResponsesData, surveyStore }) {
    // Try to get data from localStorage first
    const prevData = window.localStorage.getItem(`${LEVANTE_SURVEY_RESPONSES_KEY}-${uid}`);
    
    if (prevData) {
      const parsedData = JSON.parse(prevData);
      const currentPageNo = surveyInstance.currentPageNo;
      
      // Check if we're in general or specific survey
      if (!surveyStore.isGeneralSurveyComplete) {
        // For general survey, flatten the responses by page number
        const responses = {};
        
        if (parsedData.responses && parsedData.responses.general) {
          // Loop through each page and aggregate all responses
          Object.keys(parsedData.responses.general).forEach(pageNo => {
            Object.assign(responses, parsedData.responses.general[pageNo]);
          });
        }
        
        surveyInstance.data = responses;
      } else {
        // For specific survey
        const responses = {};
        const specificIndex = surveyStore.specificSurveyRelationIndex;
        const specificId = surveyStore.specificSurveyRelationData[specificIndex];
        
        if (parsedData.responses && 
            parsedData.responses.specific && 
            parsedData.responses.specific[specificId]) {
          // Loop through each page and aggregate all responses
          Object.keys(parsedData.responses.specific[specificId]).forEach(pageNo => {
            Object.assign(responses, parsedData.responses.specific[specificId][pageNo]);
          });
        }
        
        surveyInstance.data = responses;
        surveyInstance.currentPageNo = prevData.currentPageNo;
      }
      
      return { isRestored: true, pageNo: currentPageNo };
    } else if (surveyResponsesData) {
      // If not in localStorage, try to find data from the server
      const surveyResponse = surveyResponsesData.find((doc) => doc?.administrationId === selectedAdmin);
      if (surveyResponse) {
        if (!surveyStore.isGeneralSurveyComplete) {
          surveyInstance.data = surveyResponse.general.responses;
        } else {
          const specificIndex = surveyStore.specificSurveyRelationIndex;
          surveyInstance.data = surveyResponse.specific[specificIndex].responses;
        }

        surveyInstance.currentPageNo = surveyResponse.pageNo;
        return { isRestored: true, pageNo: surveyResponse.pageNo };
      }
    }

    // If there's no data in localStorage and no data from the server, 
    // the survey has never been started, so we continue with an empty survey
    return { isRestored: false, pageNo: 0 };
  }
  
  export function saveSurveyData({ 
    survey, 
    roarfirekit, 
    uid, 
    selectedAdmin, 
    questionName, 
    responseValue, 
    specificIds,
    userType,
    surveyStore
  }) {  
    const currentPageNo = survey.currentPageNo;

    if (window.localStorage.getItem(`${LEVANTE_SURVEY_RESPONSES_KEY}-${uid}`)) {
      const prevData = JSON.parse(window.localStorage.getItem(`${LEVANTE_SURVEY_RESPONSES_KEY}-${uid}`));

      // Update the page number at the top level
      prevData.pageNo = currentPageNo;
      prevData.responses[questionName] = responseValue;

      window.localStorage.setItem(`${LEVANTE_SURVEY_RESPONSES_KEY}-${uid}`, JSON.stringify(prevData));

      try {
        roarfirekit.saveSurveyResponses({
          surveyData: prevData,
          administrationId: selectedAdmin ?? null,
        });
      } catch (error) {
        console.error('Error saving survey responses: ', error);
      }
    } else {
      // Initialize the structure if it doesn't exist
      const newData = {
        pageNo: currentPageNo,
        isGeneral: true,
        isComplete: false,
        specificId: 0,
        responses: {},
        userType: userType,
      };


      console.log('selectedAdmin: ', selectedAdmin);


      if (!surveyStore.isGeneralSurveyComplete) {
        newData.responses[questionName] = responseValue;
      } else {
        const specificIndex = surveyStore.specificSurveyRelationIndex;
        console.log('specificIndex in saveSurveyData: ', specificIndex);
        newData.specificId = specificIds[specificIndex];
        newData.responses[questionName] = responseValue;
        newData.isComplete = false;
        newData.isGeneral = false;
      }

      console.log('newData after adding responses: ', newData);

        window.localStorage.setItem(`${LEVANTE_SURVEY_RESPONSES_KEY}-${uid}`, JSON.stringify(newData));

      try {
        roarfirekit.saveSurveyResponses({
          surveyData: newData,
          administrationId: selectedAdmin ?? null,
      });
      } catch (error) {
        console.error('Error saving survey responses: ', error);
      }
    }
  }
  
  export async function saveFinalSurveyData({ 
    sender, 
    roarfirekit, 
    uid, 
    surveyStore, 
    selectedAdmin,
    router,
    toast, 
    queryClient, 
    specificIds, 
    userType,
    gameStore 
  }) {
    const allQuestions = sender.getAllQuestions();
    const unansweredQuestions = {};

    allQuestions.forEach((question) => (unansweredQuestions[question.name] = null));

    // NOTE: Values from the second object overwrite values from the first
    const responsesWithAllQuestions = _merge(unansweredQuestions, sender.data);
    const currentPageNo = sender.currentPageNo;
    const isGeneralSurvey = !surveyStore.isGeneralSurveyComplete;
    
    // Get existing responses from localStorage or initialize
    const prevData = localStorage.getItem(`${LEVANTE_SURVEY_RESPONSES_KEY}-${uid}`);
    let responsesData = prevData ? JSON.parse(prevData) : { responses: { general: {}, specific: {} } };
    
    if (!responsesData.responses) {
      responsesData.responses = { general: {}, specific: {} };
    }

    responsesData.isGeneral = surveyStore.isGeneralSurveyComplete;
    responsesData.specificId = surveyStore.specificSurveyRelationData[surveyStore.specificSurveyRelationIndex];
    
    // Update the data structure based on general or specific survey
    if (isGeneralSurvey) {
      // For general survey, update the last page
      if (!responsesData.responses.general[currentPageNo]) {
        responsesData.responses.general[currentPageNo] = {};
      }
      
      // Merge all questions with responses
      Object.assign(responsesData.responses.general[currentPageNo], responsesWithAllQuestions);
    } else {
      // For specific survey
      const specificIndex = surveyStore.specificSurveyRelationIndex;
      const specificId = specificIds[specificIndex];
      
      if (!responsesData.responses.specific[specificId]) {
        responsesData.responses.specific[specificId] = {};
      }
      
      if (!responsesData.responses.specific[specificId][currentPageNo]) {
        responsesData.responses.specific[specificId][currentPageNo] = {};
      }
      
      // Merge all questions with responses
      Object.assign(responsesData.responses.specific[specificId][currentPageNo], responsesWithAllQuestions);
    }
    
    // Add metadata
    responsesData.userType = userType;
    responsesData.isComplete = true;
    responsesData.pageNo = currentPageNo;

    // turn on loading state
    surveyStore.setIsSavingSurveyResponses(true);

    // call cloud function to save the survey results
    try {
      await roarfirekit.saveSurveyResponses({
        surveyData: responsesData,
        administrationId: selectedAdmin ?? null,
      });

      // Clear localStorage after successful submission
      window.localStorage.removeItem(`${LEVANTE_SURVEY_RESPONSES_KEY}-${uid}`);

      // update survey store to let survey tabs know
      if (userType === 'student') {
        surveyStore.setIsGeneralSurveyComplete(true);
      } else {
        if (!surveyStore.isGeneralSurveyComplete) {
          surveyStore.setIsGeneralSurveyComplete(true);
        } else if (surveyStore.specificSurveyRelationIndex === surveyStore.specificSurveyRelationData.length - 1) {
          surveyStore.setIsSpecificSurveyComplete(true);
        }
      }

      surveyStore.setSpecificSurveyRelationIndex(surveyStore.specificSurveyRelationIndex + 1);

      queryClient.invalidateQueries({ queryKey: ['surveyResponses', uid] });

      gameStore.requireHomeRefresh();
      router.push({ name: 'Home' });
    } catch (error) {
      surveyStore.setIsSavingSurveyResponses(false);
      console.error(error);
      toast.add({
        severity: 'error',
        summary: 'Error saving survey responses: ' + error.message,
        life: 3000,
      });
    }
  }
