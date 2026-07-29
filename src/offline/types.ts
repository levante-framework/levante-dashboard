export interface OfflineTaskConfig {
  taskId: string;
  label?: string;
  variantParams?: Record<string, string>;
}

export interface OfflineSiteConfig {
  packId: string;
  language: string;
  assetBaseUrl: string;
  assignmentId?: string;
  tasks: OfflineTaskConfig[];
}

export interface OfflineRosterEntry {
  localUserId: string;
  displayName: string;
  roarUid?: string;
  assessmentPid?: string;
  birthMonth?: string;
  birthYear?: string;
  source: 'pack' | 'local';
}

export interface OfflineRosterFile {
  packId?: string;
  users: Array<Omit<OfflineRosterEntry, 'source'> & { source?: 'pack' | 'local' }>;
}
