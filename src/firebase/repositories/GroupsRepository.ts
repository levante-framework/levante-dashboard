import type { GetSyncStatusParams, GetSyncStatusResult } from '@levante-framework/levante-zod';
import { Repository } from '@/firebase/Repository';

interface GroupsParams {
  id?: string;
  type: 'districts' | 'schools' | 'classes' | 'groups';
  [key: string]: unknown;
}

class GroupsRepository extends Repository {
  async upsertOrg(params?: GroupsParams): Promise<void> {
    await this.call<GroupsParams>('upsertOrg', params);
  }

  async getSyncStatus(params: GetSyncStatusParams): Promise<GetSyncStatusResult> {
    return this.call<GetSyncStatusParams, GetSyncStatusResult>('getSyncStatus', params);
  }
}

export const groupsRepository = new GroupsRepository();
