export type OrgCollectionKey = 'districts' | 'schools' | 'classes' | 'groups';

export type AssignmentRollupStatus = 'notStarted' | 'started' | 'completed' | 'notAssigned';

export interface TaskProgressBreakdown {
  taskId: string;
  variantId: string;
  variantName: string;
  counts: {
    notStarted: number;
    started: number;
    completed: number;
  };
  userIds: {
    notStarted: string[];
    started: string[];
    completed: string[];
  };
}

export interface TaskProgressSummaryRow {
  taskId: string;
  variantId: string;
  variantName: string;
  notStarted: number;
  started: number;
  completed: number;
}

export interface UserAdministrationProgressRow {
  userId: string;
  email: string | null;
  userType: string;
  role: string | null;
  status: AssignmentRollupStatus;
  startedAt: string | null;
  completedAt: string | null;
}

export interface GetAdministrationOrgProgressResult {
  administrationId: string;
  orgId: string;
  orgType: OrgCollectionKey;
  taskProgress: TaskProgressBreakdown[];
  taskSummary: TaskProgressSummaryRow[];
  users: UserAdministrationProgressRow[];
}

export interface GetAdministrationOrgProgressPayload {
  administrationId: string;
  orgId: string;
  orgType: OrgCollectionKey;
}

export interface GetAdministrationOrgProgressApiResponse {
  status: 'ok';
  data: GetAdministrationOrgProgressResult;
}
