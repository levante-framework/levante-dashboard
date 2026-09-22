export const GENERIC_TEACHER_CLASSROOM_ID = "generic";

export function getTeacherClassroomSurveyIds(user: {
  classes?: { current?: string[] };
  groups?: { current?: string[] };
}): string[] {
  const classIds = user.classes?.current ?? [];

  if (classIds.length > 0) return classIds;

  if ((user.groups?.current ?? []).length > 0)
    return [GENERIC_TEACHER_CLASSROOM_ID];

  return [];
}
