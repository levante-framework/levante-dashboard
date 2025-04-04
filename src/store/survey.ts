import { defineStore } from 'pinia';
import { parse, stringify } from 'zipson';

interface SurveyState {
  requireRefresh: boolean;
  survey: any | null;
  numGeneralPages: number;
  numSpecificPages: number;
  currentSurveyAudioSource: string | null;
  isSavingSurveyResponses: boolean;
  surveyAudioPlayerBuffers: Record<string, any>;
  surveyAudioLoading: boolean;
  allSurveyPages: any[];
  allSpecificPages: any[];
  currentPageIndex: number;
  specificSurveyRelationData: any[];
  specificSurveyRelationIndex: number;
  isGeneralSurveyComplete: boolean;
  isSpecificSurveyComplete: boolean;
  isSurveyCompleted: boolean;
  audioLinkMap: Record<string, any>;
}

export const useSurveyStore = () => {
  return defineStore({
    id: 'surveyStore',
    state: (): SurveyState => {
      return {
        requireRefresh: false,
        survey: null,
        numGeneralPages: 0,
        numSpecificPages: 0,
        currentSurveyAudioSource: null,
        isSavingSurveyResponses: false,
        surveyAudioPlayerBuffers: {},
        surveyAudioLoading: false,
        allSurveyPages: [],
        allSpecificPages: [],
        currentPageIndex: 0,
        specificSurveyRelationData: [],
        specificSurveyRelationIndex: 0,
        isGeneralSurveyComplete: false,
        isSpecificSurveyComplete: false,
        isSurveyCompleted: false,
        audioLinkMap: {},
      };
    },
    actions: {
      requireHomeRefresh(): void {
        this.requireRefresh = true;
      },
      setSurveyCompleted(): void {
        this.isSurveyCompleted = true;
      },
      setSurvey(survey: any): void {
        this.survey = survey;
      },
      setNumberOfSurveyPages(numGeneralPages: number, numSpecificPages: number): void {
        this.numGeneralPages = numGeneralPages;
        this.numSpecificPages = numSpecificPages;
      },
      setCurrentSurveyAudioSource(audioSource: string | null): void {
        this.currentSurveyAudioSource = audioSource;
      },
      setIsSavingSurveyResponses(isSaving: boolean): void {
        this.isSavingSurveyResponses = isSaving;
      },
      setSurveyAudioPlayerBuffers(parsedLocale: string, bufferList: any): void {
        this.surveyAudioPlayerBuffers[parsedLocale] = bufferList;
      },
      setSurveyAudioLoading(loading: boolean): void {
        this.surveyAudioLoading = loading;
      },
      setAllSurveyPages(pages: any[]): void {
        this.allSurveyPages = pages;
      },
      setAllSpecificPages(pages: any[]): void {
        this.allSpecificPages = pages;
      },
      setCurrentPageIndex(index: number): void {
        this.currentPageIndex = index;
      },
      setSpecificSurveyRelationData(data: any[]): void {
        this.specificSurveyRelationData = data;
      },
      setSpecificSurveyRelationIndex(index: number): void {
        this.specificSurveyRelationIndex = index;
      },
      setIsGeneralSurveyComplete(isComplete: boolean): void {
        this.isGeneralSurveyComplete = isComplete;
      },
      setIsSpecificSurveyComplete(isComplete: boolean): void {
        this.isSpecificSurveyComplete = isComplete;
      },
      setAudioLinkMap(map: Record<string, any>): void {
        this.audioLinkMap = map;
      },
    },
    persist: {
      storage: sessionStorage,
      debug: false,
      serializer: {
        deserialize: parse,
        serialize: stringify,
      },
    },
  })();
}; 