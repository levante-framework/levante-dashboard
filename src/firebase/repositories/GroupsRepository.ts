import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';
import { Repository } from '@/firebase/Repository';
import { logger } from '@/logger';
import { collection, getDocs, query, where } from '@firebase/firestore';
import { Ref } from 'vue';
import { FirebaseService } from '../Service';

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
