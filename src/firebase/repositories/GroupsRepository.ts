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

  async getSchoolsBySiteId(siteIdRef: Ref<string | null>): Promise<Array<unknown>> {
    if (!siteIdRef.value?.length || siteIdRef.value === 'any') return [];

    try {
      const assignmentsRef = collection(FirebaseService.db, FIRESTORE_COLLECTIONS.SCHOOLS);
      const assignmentsQuery = query(assignmentsRef, where('siteId', '==', siteIdRef.value));
      const snapshot = await getDocs(assignmentsQuery);
      const docs = snapshot.docs.map((doc) => doc.data());
      return docs;
    } catch (error) {
      console.error('getSchoolsBySiteId: Error fetching schools from Firestore:', error);
      logger.error(error, { context: { function: 'getSchoolsBySiteId' } });
      throw error;
    }
  }

  async getClassesBySiteId(siteIdRef: Ref<string | null>): Promise<Array<unknown>> {
    if (!siteIdRef.value?.length || siteIdRef.value === 'any') return [];

    try {
      const assignmentsRef = collection(FirebaseService.db, FIRESTORE_COLLECTIONS.CLASSES);
      const assignmentsQuery = query(assignmentsRef, where('siteId', '==', siteIdRef.value));
      const snapshot = await getDocs(assignmentsQuery);
      const docs = snapshot.docs.map((doc) => doc.data());
      return docs;
    } catch (error) {
      console.error('getClassesBySiteId: Error fetching classes from Firestore:', error);
      logger.error(error, { context: { function: 'getClassesBySiteId' } });
      throw error;
    }
  }

  async getCohortsBySiteId(siteIdRef: Ref<string | null>): Promise<Array<unknown>> {
    if (!siteIdRef.value?.length || siteIdRef.value === 'any') return [];

    try {
      const assignmentsRef = collection(FirebaseService.db, FIRESTORE_COLLECTIONS.GROUPS);
      const assignmentsQuery = query(assignmentsRef, where('siteId', '==', siteIdRef.value));
      const snapshot = await getDocs(assignmentsQuery);
      const docs = snapshot.docs.map((doc) => doc.data());
      return docs;
    } catch (error) {
      console.error('getCohortsBySiteId: Error fetching cohorts from Firestore:', error);
      logger.error(error, { context: { function: 'getCohortsBySiteId' } });
      throw error;
    }
  }
}

export const groupsRepository = new GroupsRepository();
