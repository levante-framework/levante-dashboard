export interface SurveyPartMeta {
  type: 'general' | 'specific';
  index: number;
}

export interface GameTaskData {
  name: string;
  description: string;
  image?: string;
  variantURL?: string;
  taskURL?: string;
}

export interface Game {
  taskId: string;
  completedOn?: string | Date;
  taskData: GameTaskData;
}

export interface DisplayGame extends Game {
  gameCardId: string;
  surveyPart?: SurveyPartMeta;
}

export interface SpecificSurveyResponse {
  classId?: string;
  childId?: string | number;
  isComplete?: boolean;
  responses?: Record<string, unknown>;
}

export interface SurveyResponseDoc {
  administrationId?: string;
  general?: { isComplete?: boolean; responses?: Record<string, unknown> };
  specific?: SpecificSurveyResponse[];
  pageNo?: number;
}

export interface SurveyStoreSlice {
  isGeneralSurveyComplete: boolean;
  isSpecificSurveyComplete: boolean;
  numGeneralPages: number;
  numSpecificPages: number;
  specificSurveyRelationData: Array<Record<string, unknown>>;
  survey: { currentPageNo?: number } | null;
}
