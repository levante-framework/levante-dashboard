import { describe, expect, it } from 'vitest';
import { GENERIC_TEACHER_CLASSROOM_ID, getTeacherClassroomSurveyIds } from './teacherSurveyRelations';

describe('getTeacherClassroomSurveyIds', () => {
  it('returns the linked class ids when the teacher has classes', () => {
    const user = { classes: { current: ['class-a', 'class-b'] }, groups: { current: ['group-1'] } };

    expect(getTeacherClassroomSurveyIds(user)).toEqual(['class-a', 'class-b']);
  });

  it('returns a single generic id when the teacher only belongs to a group', () => {
    const user = { classes: { current: [] }, groups: { current: ['group-1'] } };

    expect(getTeacherClassroomSurveyIds(user)).toEqual([GENERIC_TEACHER_CLASSROOM_ID]);
  });

  it('treats missing class/group fields as empty', () => {
    expect(getTeacherClassroomSurveyIds({})).toEqual([]);
  });

  it('returns no ids when the teacher has neither classes nor groups', () => {
    const user = { classes: { current: [] }, groups: { current: [] } };

    expect(getTeacherClassroomSurveyIds(user)).toEqual([]);
  });
});
