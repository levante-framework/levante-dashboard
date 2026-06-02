import { Repository } from '@/firebase/Repository';

interface GroupsParams {
  id?: string;
  type: 'districts' | 'schools' | 'classes' | 'groups';
  [key: string]: unknown;
}

class GroupsRepository extends Repository {
  constructor() {
    super();
  }

  async upsertOrg(params?: GroupsParams): Promise<void> {
    await this.call<GroupsParams>('upsertOrg', params);
  }
}

export const groupsRepository = new GroupsRepository();
