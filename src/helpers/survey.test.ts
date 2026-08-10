import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSpecificRelationIndexForEmptySpecificResume, saveFinalSurveyData } from './survey';

vi.mock('@/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

function createSurveyStore(overrides: Record<string, unknown> = {}) {
  return {
    isGeneralSurveyComplete: false,
    isSpecificSurveyComplete: false,
    specificSurveyRelationIndex: 0,
    specificSurveyRelationData: [{ birthMonth: 'March' }, { birthMonth: 'June' }],
    setIsSavingSurveyResponses: vi.fn(),
    setIsGeneralSurveyComplete: vi.fn(function (this: any, value: boolean) {
      this.isGeneralSurveyComplete = value;
    }),
    setIsSpecificSurveyComplete: vi.fn(function (this: any, value: boolean) {
      this.isSpecificSurveyComplete = value;
    }),
    setSpecificSurveyRelationIndex: vi.fn(function (this: any, value: number) {
      this.specificSurveyRelationIndex = value;
    }),
    ...overrides,
  };
}

function createSaveArgs(surveyStore: ReturnType<typeof createSurveyStore>, overrides: Record<string, unknown> = {}) {
  return {
    sender: {
      getAllQuestions: () => [],
    },
    roarfirekit: {
      saveSurveyResponses: vi.fn().mockResolvedValue(undefined),
    },
    uid: 'user-1',
    surveyStore,
    selectedAdmin: 'admin-1',
    router: {
      push: vi.fn(),
    },
    toast: {
      add: vi.fn(),
    },
    queryClient: {
      invalidateQueries: vi.fn(),
    },
    specificIds: ['child-1', 'child-2'],
    userType: 'parent',
    assignmentsStore: {
      setHomeRefresh: vi.fn(),
    },
    ...overrides,
  } as any;
}

describe('saveFinalSurveyData relation index', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('keeps index at 0 after saving the general survey', async () => {
    const surveyStore = createSurveyStore({
      isGeneralSurveyComplete: false,
      specificSurveyRelationIndex: 0,
    });
    const args = createSaveArgs(surveyStore);

    await saveFinalSurveyData(args);

    expect(surveyStore.setIsGeneralSurveyComplete).toHaveBeenCalledWith(true);
    expect(surveyStore.setSpecificSurveyRelationIndex).not.toHaveBeenCalled();
    expect(surveyStore.specificSurveyRelationIndex).toBe(0);
    expect(surveyStore.setIsSpecificSurveyComplete).not.toHaveBeenCalled();
  });

  it('regression: one-child caregiver stays on child 0 after general (old bug bumped past end)', async () => {
    // Old behavior always did index += 1 after general save. With one child that left
    // index at 1 → relationData[1] undefined (DASHBOARD-PC crash) and skipped the child survey.
    const surveyStore = createSurveyStore({
      isGeneralSurveyComplete: false,
      specificSurveyRelationIndex: 0,
      specificSurveyRelationData: [{ birthMonth: 'March', birthYear: '2018' }],
    });
    const args = createSaveArgs(surveyStore, {
      specificIds: ['only-child'],
    });

    await saveFinalSurveyData(args);

    expect(surveyStore.specificSurveyRelationIndex).toBe(0);
    expect(surveyStore.setSpecificSurveyRelationIndex).not.toHaveBeenCalled();
    expect(args.specificIds[surveyStore.specificSurveyRelationIndex]).toBe('only-child');
    expect(surveyStore.specificSurveyRelationData[surveyStore.specificSurveyRelationIndex]).toEqual({
      birthMonth: 'March',
      birthYear: '2018',
    });
  });

  it('advances index after saving a non-final specific survey', async () => {
    const surveyStore = createSurveyStore({
      isGeneralSurveyComplete: true,
      specificSurveyRelationIndex: 0,
    });
    const args = createSaveArgs(surveyStore);

    await saveFinalSurveyData(args);

    expect(surveyStore.setSpecificSurveyRelationIndex).toHaveBeenCalledWith(1);
    expect(surveyStore.specificSurveyRelationIndex).toBe(1);
    expect(surveyStore.setIsSpecificSurveyComplete).not.toHaveBeenCalled();
  });

  it('does not advance past the last child after saving the final specific survey', async () => {
    const surveyStore = createSurveyStore({
      isGeneralSurveyComplete: true,
      specificSurveyRelationIndex: 1,
    });
    const args = createSaveArgs(surveyStore);

    await saveFinalSurveyData(args);

    expect(surveyStore.setIsSpecificSurveyComplete).toHaveBeenCalledWith(true);
    expect(surveyStore.setSpecificSurveyRelationIndex).not.toHaveBeenCalled();
    expect(surveyStore.specificSurveyRelationIndex).toBe(1);
  });
});

describe('getSpecificRelationIndexForEmptySpecificResume (Home guard)', () => {
  it('resets to 0 when general is complete and there are no specific responses yet', () => {
    // Same-session recovery: Pinia may still hold a bumped index after general save.
    expect(getSpecificRelationIndexForEmptySpecificResume(true, 0)).toBe(0);
  });

  it('does not override resume when specific responses already exist', () => {
    expect(getSpecificRelationIndexForEmptySpecificResume(true, 1)).toBeNull();
    expect(getSpecificRelationIndexForEmptySpecificResume(true, 2)).toBeNull();
  });

  it('does not force an index when general is still incomplete', () => {
    expect(getSpecificRelationIndexForEmptySpecificResume(false, 0)).toBeNull();
  });
});
