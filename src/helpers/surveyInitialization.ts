import {
  getParsedLocale,
  restoreSurveyData,
  saveFinalSurveyData,
  saveSurveyData,
  type RoarfirekitType,
  type LocalStorageSurveyData,
} from '@/helpers/survey';
import { LEVANTE_SURVEY_RESPONSES_KEY } from '@/constants/bucket';
import type { SurveyModel, PageModel, Question, CompleteEvent } from 'survey-core';
import type { Router } from 'vue-router';
import type { ToastServiceMethods } from 'primevue/toastservice';
import type { QueryClient } from '@tanstack/vue-query';
import type { useAssignmentsStore } from '@/store/assignments';

interface UserData {
  id: string;
  selectedAdminId: string | null;
  surveyResponsesData: any;
  childIds?: (string | number)[];
  classes?: { current: (string | number)[] };
  isGeneralSurveyComplete: boolean;
  specificSurveyRelationIndex: number;
}

interface SurveyStore {
  setAllSurveyPages: (pages: PageModel[]) => void;
  setAllSpecificPages: (pages: PageModel[]) => void;
  setNumberOfSurveyPages: (general: number, specific: number) => void;
  isGeneralSurveyComplete: boolean;
  specificSurveyRelationIndex: number;
}

interface SurveyData {
  pages: PageModel[];
}

/** Restore persisted/server data, SurveyJS locale, and page metadata. */
interface BootstrapSurveyInstanceParams {
  surveyInstance: SurveyModel;
  userType: string;
  specificSurveyData?: SurveyData;
  userData: UserData;
  surveyStore: SurveyStore;
  generalSurveyData: SurveyData;
  /** Dashboard i18n locale → SurveyJS locale via `getParsedLocale`. */
  locale: string | undefined | null;
}

interface SetupSurveyEventHandlersParams {
  surveyInstance: SurveyModel;
  userType: string;
  roarfirekit: RoarfirekitType;
  uid: string;
  selectedAdminId: string | null;
  surveyStore: SurveyStore;
  router: Router;
  toast: ToastServiceMethods;
  queryClient: QueryClient;
  userData: UserData;
  assignmentsStore: typeof useAssignmentsStore;
}

export function bootstrapSurveyInstance({
  surveyInstance,
  userType,
  specificSurveyData,
  userData,
  surveyStore,
  generalSurveyData,
  locale,
}: BootstrapSurveyInstanceParams): void {
  surveyInstance.locale = getParsedLocale(locale);

  restoreSurveyData({
    surveyInstance,
    uid: userData.id,
    selectedAdmin: userData.selectedAdminId,
    surveyResponsesData: userData.surveyResponsesData,
    surveyStore: surveyStore as any,
  });

  const allGeneralPages = generalSurveyData.pages;
  const allSpecificPages = specificSurveyData?.pages || [];
  surveyStore.setAllSurveyPages(allGeneralPages);
  surveyStore.setAllSpecificPages(allSpecificPages);

  const numGeneralPages = allGeneralPages.length;
  const numSpecificPages = allSpecificPages.length;
  surveyStore.setNumberOfSurveyPages(numGeneralPages, numSpecificPages);
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
  assignmentsStore,
}: SetupSurveyEventHandlersParams): void {
  let specificIds: (string | number)[] = [];
  if (userType === 'parent') {
    specificIds = userData.childIds || [];
  } else if (userType === 'teacher') {
    specificIds = userData.classes?.current || [];
  }

  surveyInstance.onValueChanged.add((sender: SurveyModel, options: { name: string; question: Question; value: any }) =>
    saveSurveyData({
      survey: sender,
      uid,
      questionName: options.name,
      responseValue: options.value,
      userType,
      surveyStore: surveyStore as any,
      specificIds: specificIds,
    }),
  );

  surveyInstance.onCurrentPageChanged.add(
    (
      sender: SurveyModel,
      options: {
        oldCurrentPage: PageModel | null;
        newCurrentPage: PageModel;
        isNextPage: boolean;
        isPrevPage: boolean;
      },
    ) => {
      const previousPage = options.oldCurrentPage;

      if (previousPage) {
        const previousPageQuestions = previousPage.questions as Question[];
        const prevDataStr = window.localStorage.getItem(`${LEVANTE_SURVEY_RESPONSES_KEY}-${uid}`);

        if (prevDataStr) {
          const parsedData: LocalStorageSurveyData = JSON.parse(prevDataStr);
          const previousPageResponses: Record<string, { responseValue: string; responseTime: string }> = {
            ...parsedData.responses,
          };

          previousPageQuestions.forEach((question) => {
            if (parsedData.responses[question.name] !== undefined) {
              previousPageResponses[question.name] = parsedData.responses[question.name];
            }
          });

          const dataToSave = {
            responses: previousPageResponses,
            pageNo: previousPage.visibleIndex,
            isComplete: false,
            isGeneral: !surveyStore.isGeneralSurveyComplete,
            specificId: surveyStore.isGeneralSurveyComplete ? specificIds[surveyStore.specificSurveyRelationIndex] : 0,
            userType: userType,
          };

          try {
            roarfirekit.saveSurveyResponses({
              surveyData: dataToSave,
              administrationId: selectedAdminId,
            });
          } catch (error: unknown) {
            console.error(
              'Error saving previous page responses: ',
              error instanceof Error ? error.message : String(error),
            );
          }
        }
      }
    },
  );

  surveyInstance.onComplete.add((sender: SurveyModel, options: CompleteEvent) =>
    saveFinalSurveyData({
      sender,
      roarfirekit,
      uid,
      surveyStore: surveyStore as any,
      router,
      toast,
      queryClient,
      specificIds: specificIds,
      selectedAdmin: selectedAdminId,
      userType,
      assignmentsStore: assignmentsStore as any,
    }),
  );
}
