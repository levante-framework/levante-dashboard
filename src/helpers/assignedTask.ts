interface AssignedAssessment {
  taskId?: string;
}

interface AssignmentWithAssessments {
  assessments?: AssignedAssessment[];
}

export function assignmentIncludesTask(
  assignment: AssignmentWithAssessments | null | undefined,
  taskId: string,
): boolean {
  if (!taskId) return false;
  return (assignment?.assessments ?? []).some((assessment) => assessment?.taskId === taskId);
}

export function isUnassignedTaskError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('code' in error)) return false;
  const code = String((error as { code: unknown }).code).replace(/^functions\//, '');
  return code === 'not-found';
}
