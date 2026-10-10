import { beforeEach, describe, expect, it, vi } from 'vitest';
import { enqueueSurveySave, saveFinalSurveyData } from './survey';

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

describe('enqueueSurveySave', () => {
  it('retries a save while it is still the latest', async () => {
    vi.useFakeTimers();
    const operation = vi.fn().mockRejectedValueOnce({ code: 'functions/internal' }).mockResolvedValueOnce(undefined);
    const pending = enqueueSurveySave(operation);
    await vi.advanceTimersByTimeAsync(1000);
    await expect(pending).resolves.toBe('saved');
    expect(operation).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('does not retry a save after a newer one is queued', async () => {
    let rejectPage: (error: unknown) => void = () => undefined;
    const pageAttempt = new Promise((_, reject) => {
      rejectPage = reject;
    });
    const pageSave = vi.fn(() => pageAttempt);
    const pageQueued = enqueueSurveySave(pageSave);
    await vi.waitFor(() => expect(pageSave).toHaveBeenCalledTimes(1));

    const finalSave = vi.fn().mockResolvedValue(undefined);
    const finalQueued = enqueueSurveySave(finalSave);
    rejectPage({ code: 'functions/internal' });

    await expect(pageQueued).resolves.toBe('superseded');
    await expect(finalQueued).resolves.toBe('saved');
    expect(pageSave).toHaveBeenCalledTimes(1);
    expect(finalSave).toHaveBeenCalledTimes(1);
  });

  it('finishes an in-flight save before the newer save writes', async () => {
    const order: string[] = [];
    let resolvePage: () => void = () => undefined;
    const pageAttempt = new Promise<void>((resolve) => {
      resolvePage = resolve;
    });
    const pageQueued = enqueueSurveySave(async () => {
      order.push('page-start');
      await pageAttempt;
      order.push('page-done');
    });
    await vi.waitFor(() => expect(order).toEqual(['page-start']));
    const finalQueued = enqueueSurveySave(async () => {
      order.push('final');
    });
    resolvePage();
    await pageQueued;
    await finalQueued;
    expect(order).toEqual(['page-start', 'page-done', 'final']);
  });
});
