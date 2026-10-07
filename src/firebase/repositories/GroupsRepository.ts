import type {
  GetSiteOverviewParams,
  GetSiteOverviewResult,
  GetSyncStatusParams,
  GetSyncStatusResult,
} from '@levante-framework/levante-zod';
import { Repository } from '@/firebase/Repository';

interface GroupsParams {
  id?: string;
  type: 'districts' | 'schools' | 'classes' | 'groups';
  [key: string]: unknown;
}

class GroupsRepository extends Repository {
  async getSiteOverview(params: GetSiteOverviewParams): Promise<GetSiteOverviewResult> {
    return this.call<GetSiteOverviewParams, GetSiteOverviewResult>('getSiteOverview', params);
  }

  async getSyncStatus(params: GetSyncStatusParams): Promise<GetSyncStatusResult> {
    return this.call<GetSyncStatusParams, GetSyncStatusResult>('getSyncStatus', params);
  }

  async upsertOrg(params?: GroupsParams): Promise<void> {
    await this.call<GroupsParams>('upsertOrg', params);
  }
}

export const groupsRepository = new GroupsRepository();
