import axios from 'axios';
import _merge from 'lodash/merge';
import { BufferLoader, AudioContext } from '@/helpers/audio';
import { LEVANTE_SURVEY_RESPONSES_KEY } from '@/constants/bucket';
const context = new AudioContext();

// Create a Web Worker for audio processing
const audioWorker = new Worker(new URL('./audioWorker.js', import.meta.url));

export const fetchAudioLinks = async (surveyType) => {
    const response = await axios.get('https://storage.googleapis.com/storage/v1/b/road-dashboard/o/');
    const files = response.data || { items: [] };
    const audioLinkMap = {};
    
    // Use Promise.all for parallel processing
    const audioFiles = files.items.filter(item => 
      item.contentType === 'audio/mpeg' && item.name.startsWith(surveyType)
    );

    // Process files in parallel
    await Promise.all(audioFiles.map(async (item) => {
      const splitParts = item.name.split('/');
      const fileLocale = splitParts[1];
      const fileName = splitParts.at(-1).split('.')[0];
      
      if (!audioLinkMap[fileLocale]) {
        audioLinkMap[fileLocale] = {};
      }
      audioLinkMap[fileLocale][fileName] = `https://storage.googleapis.com/road-dashboard/${item.name}`;
    }));

    return audioLinkMap;
};
  
  
export function getParsedLocale(locale) {
    return (locale || '').split('-')?.[0] || 'en';
  }
  
  function finishedLoading({ bufferList, parsedLocale, setSurveyAudioLoading, setSurveyAudioPlayerBuffers }) {
    setSurveyAudioPlayerBuffers(parsedLocale, bufferList);
    setSurveyAudioLoading(false);
  }
  
  // Progressive audio loading
  export const fetchBuffer = ({ parsedLocale, setSurveyAudioLoading, audioLinks, surveyAudioBuffers, setSurveyAudioPlayerBuffers }) => {
    if (surveyAudioBuffers[parsedLocale]) {
      return;
    }

    setSurveyAudioLoading(true);
    
    // Create a queue for progressive loading
    const audioQueue = Object.entries(audioLinks[parsedLocale]);
    const processedBuffers = {};
    let processedCount = 0;

    const processNextAudio = async () => {
      if (audioQueue.length === 0) {
        finishedLoading({ 
          bufferList: processedBuffers, 
          parsedLocale, 
          setSurveyAudioLoading, 
          setSurveyAudioPlayerBuffers 
        });
        return;
      }

      const [fileName, url] = audioQueue.shift();
      
      try {
        // Fetch audio data
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        
        // Process audio in Web Worker
        audioWorker.postMessage({ arrayBuffer }, [arrayBuffer]);
        
        audioWorker.onmessage = (e) => {
          processedBuffers[fileName] = e.data;
          processedCount++;
          
          // Update progress and continue with next audio
          if (processedCount % 5 === 0) { // Update every 5 files
            setSurveyAudioPlayerBuffers(parsedLocale, processedBuffers);
          }
          
          processNextAudio();
        };
      } catch (error) {
        console.error(`Error processing audio ${fileName}:`, error);
        processNextAudio();
      }
    };

    processNextAudio();
  };
  
  
  export const showAndPlaceAudioButton = ({ playAudioButton, el }) => {
    if (playAudioButton) {
      playAudioButton.classList.add('play-button-visible');
      playAudioButton.style.display = 'flex';
      el.appendChild(playAudioButton);
    }
  };

  // Cache for survey data
  const surveyDataCache = new Map();

  export function restoreSurveyData({ surveyInstance, uid, selectedAdmin, surveyResponsesData, surveyStore }) {
    // Try to get data from cache first
    const cacheKey = `${uid}-${selectedAdmin}`;
    if (surveyDataCache.has(cacheKey)) {
      const cachedData = surveyDataCache.get(cacheKey);
      surveyInstance.data = cachedData.responses;
      surveyInstance.currentPageNo = cachedData.pageNo;
      return { isRestored: true, pageNo: cachedData.pageNo };
    }

    // Try to get data from localStorage
    const prevData = window.localStorage.getItem(`${LEVANTE_SURVEY_RESPONSES_KEY}-${uid}`);
    if (prevData) {
      const parsedData = JSON.parse(prevData);
      surveyInstance.data = parsedData.responses;
      surveyInstance.currentPageNo = parsedData.pageNo;
      // Cache the data
      surveyDataCache.set(cacheKey, parsedData);
      return { isRestored: true, pageNo: parsedData.pageNo };
    } else if (surveyResponsesData) {
      // If not in localStorage, try to find data from the server
      const surveyResponse = surveyResponsesData.find((doc) => doc?.administrationId === selectedAdmin);
      if (surveyResponse) {
        const responseData = !surveyStore.isGeneralSurveyComplete
          ? surveyResponse.general
          : surveyResponse.specific[surveyStore.specificSurveyRelationIndex];

        surveyInstance.data = responseData.responses;
        surveyInstance.currentPageNo = responseData.pageNo;
        
        // Cache the data
        surveyDataCache.set(cacheKey, responseData);
        return { isRestored: true, pageNo: responseData.pageNo };
      }
    }

    return { isRestored: false, pageNo: 0 };
  }
  
  // Batch save operations
  const saveQueue = new Map();
  let saveTimeout = null;

  const processSaveQueue = async () => {
    const batchPromises = [];
    
    for (const [key, data] of saveQueue.entries()) {
      const { surveyData, administrationId, roarfirekit } = data;
      
      try {
        const promise = roarfirekit.saveSurveyResponses({
          surveyData,
          administrationId: administrationId ?? null,
        });
        batchPromises.push(promise);
      } catch (error) {
        console.error(`Error saving survey data for ${key}:`, error);
      }
    }
    
    // Clear the queue
    saveQueue.clear();
    
    // Wait for all saves to complete
    await Promise.all(batchPromises);
  };

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
    const cacheKey = `${uid}-${selectedAdmin}`;
    
    // Get or create survey data
    let surveyData = surveyDataCache.get(cacheKey) || {
      pageNo: currentPageNo,
      isGeneral: true,
      isComplete: false,
      specificId: 0,
      responses: {},
      userType: userType,
    };

    // Update the data
    surveyData.pageNo = currentPageNo;
    if (!surveyStore.isGeneralSurveyComplete) {
      surveyData.responses[questionName] = responseValue;
    } else {
      const specificIndex = surveyStore.specificSurveyRelationIndex;
      surveyData.specificId = specificIds[specificIndex];
      surveyData.responses[questionName] = responseValue;
      surveyData.isComplete = false;
      surveyData.isGeneral = false;
    }

    // Update cache
    surveyDataCache.set(cacheKey, surveyData);
    
    // Update localStorage
    window.localStorage.setItem(`${LEVANTE_SURVEY_RESPONSES_KEY}-${uid}`, JSON.stringify(surveyData));

    // Add to save queue
    saveQueue.set(cacheKey, {
      surveyData,
      administrationId: selectedAdmin,
      roarfirekit
    });

    // Clear existing timeout if any
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    // Set new timeout for batch save
    saveTimeout = setTimeout(processSaveQueue, 1000);
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

    // Merge responses
    const responsesWithAllQuestions = _merge(unansweredQuestions, sender.data);

    // Structure the data
    const structuredResponses = {
      pageNo: 0,
      isGeneral: true,
      isComplete: true,
      specificId: 0,
      responses: responsesWithAllQuestions,
      userType: userType,
    };

    // Update specificId if it's a specific survey
    if (surveyStore.isGeneralSurveyComplete) {
      structuredResponses.isGeneral = false;
      const specificIndex = surveyStore.specificSurveyRelationIndex;
      structuredResponses.specificId = specificIds[specificIndex];
    }

    // Clear any pending saves
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      saveTimeout = null;
    }

    // Process any remaining saves in the queue
    await processSaveQueue();

    // turn on loading state
    surveyStore.setIsSavingSurveyResponses(true);

    try {
      await roarfirekit.saveSurveyResponses({
        surveyData: structuredResponses,
        administrationId: selectedAdmin ?? null,
      });

      // Clear localStorage and cache
      window.localStorage.removeItem(`${LEVANTE_SURVEY_RESPONSES_KEY}-${uid}`);
      surveyDataCache.delete(`${uid}-${selectedAdmin}`);

      // Update survey store
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

      // Invalidate queries
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
