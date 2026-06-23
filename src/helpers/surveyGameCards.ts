import { LEVANTE_SURVEY_RESPONSES_KEY } from '@/constants/bucket';
import type { DisplayGame, Game, SurveyPartMeta, SurveyResponseDoc, SurveyStoreSlice } from '@/types/surveyGameCards';

export type {
  DisplayGame,
  Game,
  GameTaskData,
  SurveyPartMeta,
  SurveyResponseDoc,
  SurveyStoreSlice,
} from '@/types/surveyGameCards';

export function isAdultMultipartSurveyTask(taskId: string, userType: string): boolean {
  const normalizedTaskId = taskId.toLowerCase();
  return (
    (normalizedTaskId === 'caregiver-survey' || normalizedTaskId === 'teacher-survey') &&
    (userType === 'parent' || userType === 'teacher')
  );
}

export function expandGamesForDisplay(
  games: Game[],
  userType: string,
  relationData: Array<Record<string, unknown>>,
  relationIds: (string | number)[],
): DisplayGame[] {
  return games.flatMap((game) => {
    if (!isAdultMultipartSurveyTask(game.taskId, userType)) {
      return [{ ...game, gameCardId: game.taskId }];
    }

    const parts: DisplayGame[] = [
      {
        ...game,
        gameCardId: `${game.taskId}:general`,
        surveyPart: { type: 'general', index: 0 },
      },
    ];

    const specificCount = Math.max(relationData.length, relationIds.length);

    for (let index = 0; index < specificCount; index++) {
      const specificId = relationData[index]?.id ?? relationIds[index] ?? index;
      parts.push({
        ...game,
        gameCardId: `${game.taskId}:specific:${specificId}`,
        surveyPart: { type: 'specific', index },
      });
    }

    return parts;
  });
}

function progressFromPageNo(pageNo: number, totalPages: number): number {
  if (!totalPages) return 0;
  return Math.min(99, Math.round((pageNo / totalPages) * 100));
}

function getStoredSurveyProgress(
  userId: string,
  specificId: string | number,
  surveyStore: SurveyStoreSlice,
  options: { isGeneral: boolean },
): number | null {
  const localStorageData = JSON.parse(window.localStorage.getItem(`${LEVANTE_SURVEY_RESPONSES_KEY}-${userId}`) || '{}');

  if (!localStorageData || String(localStorageData.specificId) !== String(specificId)) return null;
  if (Boolean(localStorageData.isGeneral) !== options.isGeneral) return null;
  if (localStorageData.isComplete) return 100;

  const totalPages = options.isGeneral ? surveyStore.numGeneralPages : surveyStore.numSpecificPages;
  return progressFromPageNo(localStorageData.pageNo || 0, totalPages);
}

export function getSurveyPartProgress(
  part: SurveyPartMeta,
  userId: string,
  surveyStore: SurveyStoreSlice,
  surveyResponseDoc: SurveyResponseDoc | null,
  relationIds: (string | number)[],
): number {
  if (part.type === 'general') {
    if (surveyStore.isGeneralSurveyComplete || surveyResponseDoc?.general?.isComplete) return 100;

    const localProgress = getStoredSurveyProgress(userId, 0, surveyStore, { isGeneral: true });
    if (localProgress !== null) return localProgress;

    if (!surveyStore.survey || !surveyStore.numGeneralPages) return 0;

    return progressFromPageNo(surveyStore.survey.currentPageNo || 0, surveyStore.numGeneralPages);
  }

  const specificResponse = surveyResponseDoc?.specific?.[part.index];
  if (specificResponse?.isComplete) return 100;

  const specificId =
    surveyStore.specificSurveyRelationData[part.index]?.id ?? relationIds[part.index] ?? part.index;
  const localProgress = getStoredSurveyProgress(userId, specificId, surveyStore, { isGeneral: false });
  if (localProgress !== null) return localProgress;

  return 0;
}

export function isSurveyPartComplete(
  part: SurveyPartMeta,
  surveyStore: SurveyStoreSlice,
  surveyResponseDoc: SurveyResponseDoc | null,
): boolean {
  if (part.type === 'general') {
    return Boolean(surveyStore.isGeneralSurveyComplete || surveyResponseDoc?.general?.isComplete);
  }

  return Boolean(surveyResponseDoc?.specific?.[part.index]?.isComplete);
}

export function isSurveyPartLocked(
  part: SurveyPartMeta,
  surveyStore: SurveyStoreSlice,
  surveyResponseDoc: SurveyResponseDoc | null,
): boolean {
  if (part.type === 'general') return false;

  if (!isSurveyPartComplete({ type: 'general', index: 0 }, surveyStore, surveyResponseDoc)) return true;

  if (part.index === 0) return false;

  return !isSurveyPartComplete({ type: 'specific', index: part.index - 1 }, surveyStore, surveyResponseDoc);
}

export function isAdultSurveyAssignmentComplete(
  surveyStore: SurveyStoreSlice,
  surveyResponseDoc: SurveyResponseDoc | null,
): boolean {
  if (!isSurveyPartComplete({ type: 'general', index: 0 }, surveyStore, surveyResponseDoc)) return false;

  if (surveyStore.specificSurveyRelationData.length === 0) {
    return surveyStore.isSpecificSurveyComplete;
  }

  return surveyStore.specificSurveyRelationData.every((_relation, index) =>
    isSurveyPartComplete({ type: 'specific', index }, surveyStore, surveyResponseDoc),
  );
}
