import { ASSIGNMENT_STATUSES } from '@/constants';
import { AdministrationType } from '@levante-framework/levante-zod';
import { convertToDate } from '.';

export const isCurrent = (assignment: AdministrationType) => {
  const now = new Date();
  const opened = convertToDate(assignment.dateOpened);
  const closed = convertToDate(assignment.dateClosed);
  return opened <= now && closed >= now;
};

export const isPast = (assignment: AdministrationType) => {
  const now = new Date();
  return convertToDate(assignment.dateClosed) < now;
};

export const isUpcoming = (assignment: AdministrationType) => {
  const now = new Date();
  return convertToDate(assignment.dateOpened) > now;
};

export const getAssignmentStatus = (assignment: AdministrationType) => {
  if (isPast(assignment) || assignment?.completed) return ASSIGNMENT_STATUSES.PAST;
  else if (isUpcoming(assignment)) return ASSIGNMENT_STATUSES.UPCOMING;
  else return ASSIGNMENT_STATUSES.CURRENT;
};

export const sortAssignmentsByDateOpened = (assignments: AdministrationType[]) => {
  if (assignments.length <= 0) return [];

  return [...assignments].sort((a, b) => {
    const aTime = new Date(a.dateOpened).getTime() || 0;
    const bTime = new Date(b.dateOpened).getTime() || 0;
    return aTime - bTime;
  });
};
