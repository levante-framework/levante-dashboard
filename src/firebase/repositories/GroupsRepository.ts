import { Repository } from '@/firebase/Repository';

interface GroupsParams {
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
