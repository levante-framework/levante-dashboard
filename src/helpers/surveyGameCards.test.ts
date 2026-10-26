import { describe, expect, it } from 'vitest';
import type { Game, SurveyResponseDoc } from '@/types/surveyGameCards';
import { expandGamesForDisplay, findSpecificSurveyResponse, getSpecificRelationId } from './surveyGameCards';

describe('findSpecificSurveyResponse', () => {
  const doc: SurveyResponseDoc = {
    specific: [
      { classId: 'class-a', isComplete: true },
      { childId: 42, isComplete: false },
      { classId: 'generic', isComplete: true },
    ],
  };

  it('matches a response by classId', () => {
    expect(findSpecificSurveyResponse(doc, 'class-a')).toEqual({ classId: 'class-a', isComplete: true });
  });

  it('matches a response by childId with string/number coercion', () => {
    expect(findSpecificSurveyResponse(doc, '42')).toEqual({ childId: 42, isComplete: false });
  });

  it('matches the generic classroom response', () => {
    expect(findSpecificSurveyResponse(doc, 'generic')).toEqual({ classId: 'generic', isComplete: true });
  });

  it('returns undefined for an unknown relation id', () => {
    expect(findSpecificSurveyResponse(doc, 'class-z')).toBeUndefined();
  });

  it('returns undefined when the relation id is undefined', () => {
    expect(findSpecificSurveyResponse(doc, undefined)).toBeUndefined();
  });

  it('returns undefined when there is no doc', () => {
    expect(findSpecificSurveyResponse(null, 'class-a')).toBeUndefined();
  });
});

describe('getSpecificRelationId', () => {
  it('prefers the live relationId over the stored relation data', () => {
    // Store is stale (cohort-only teacher's `generic` entry) while the teacher is now in a real class.
    const surveyStore = { specificSurveyRelationData: [{ id: 'generic' }] };

    expect(getSpecificRelationId(0, surveyStore, ['class-a'])).toBe('class-a');
  });

  it('falls back to the stored relation data id when no live id exists at the index', () => {
    const surveyStore = { specificSurveyRelationData: [{ id: 'class-a' }] };

    expect(getSpecificRelationId(0, surveyStore, [])).toBe('class-a');
  });

  it('returns undefined when neither source has an id', () => {
    const surveyStore = { specificSurveyRelationData: [] };

    expect(getSpecificRelationId(0, surveyStore, [])).toBeUndefined();
  });
});

describe('expandGamesForDisplay', () => {
  const surveyGame: Game = {
    taskId: 'teacher-survey',
    taskData: { name: 'Teacher Survey', description: 'desc' },
  };

  it('keys the specific card id off the live relationId, not stale relation data', () => {
    const relationData = [{ id: 'generic' }];
    const relationIds = ['class-a'];

    const result = expandGamesForDisplay([surveyGame], 'teacher', relationData, relationIds);

    expect(result.map((game) => game.gameCardId)).toEqual([
      'teacher-survey:general',
      'teacher-survey:specific:class-a',
    ]);
  });

  it('leaves non-survey games untouched', () => {
    const game: Game = { taskId: 'swr', taskData: { name: 'SWR', description: 'desc' } };

    const result = expandGamesForDisplay([game], 'teacher', [], []);

    expect(result).toEqual([{ ...game, gameCardId: 'swr' }]);
  });
});
