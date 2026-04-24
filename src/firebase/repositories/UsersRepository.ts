import { Repository } from '@/firebase/Repository';
import { FirebaseService } from '@/firebase/Service';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';
import { ROLES } from '@/constants/roles';
import {
  collection,
  getDocs,
  query,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { logger } from '@/logger';

export interface CreateUpdateSuperAdminNamePayload {
  first: string;
  middle?: string;
  last: string;
}

export interface CreateUpdateSuperAdminRolePayload {
  role: string;
  siteId: string;
  siteName: string;
}

export interface CreateUpdateSuperAdminPayload {
  email: string;
  name: CreateUpdateSuperAdminNamePayload;
  roles: CreateUpdateSuperAdminRolePayload[];
  adminUid?: string;
  isTestData?: boolean;
}

export interface CreateUpdateAdministratorPayload {
  email: string;
  name: CreateUpdateSuperAdminNamePayload;
  roles: CreateUpdateSuperAdminRolePayload[];
  adminUid?: string;
  isTestData?: boolean;
}

const CREATE_USERS_CALLABLE_TIMEOUT_MS = 540_000;
const CREATE_USERS_EXPORT_POLL_INTERVAL_MS = 2_500;
const CREATE_USERS_EXPORT_MAX_POLL_MS = 1_200_000;

export interface InputUserOrgIds {
  districts: string[];
  schools: string[];
  classes: string[];
  groups: string[];
  families: string[];
}

export interface InputUser {
  userType: string;
  childId?: string;
  parentId?: string;
  teacherId?: string;
  month: string;
  year: string;
  orgIds: InputUserOrgIds;
  isTestData: boolean;
}

export interface CreateUsersWithEmailExportRequestData {
  jobId?: string;
  users?: InputUser[];
  siteId?: string;
  sendCredentialsEmail?: boolean;
}

export interface ReturnUserData {
  uid: string;
  email: string;
  password: string;
  username?: string;
}

export type CreateUsersCallableResult = {
  status: 'success';
  message: string;
  data: ReturnUserData[];
};

export type CreateUsersWithEmailExportPollResponse =
  | { status: 'pending'; jobId: string }
  | CreateUsersCallableResult
  | { status: 'failed'; jobId: string; message: string }
  | { status: 'rolled_back'; jobId: string; message: string };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const ADMIN_ROLES = new Set<string>([
  ROLES.SUPER_ADMIN,
  ROLES.SITE_ADMIN,
  ROLES.ADMIN,
  ROLES.RESEARCH_ASSISTANT,
]);

function roleEntryHasAdminRole(entry: unknown): boolean {
  if (!entry || typeof entry !== 'object' || !('role' in entry)) {
    return false;
  }
  const role = (entry as { role?: string }).role;
  return typeof role === 'string' && ADMIN_ROLES.has(role);
}

function documentHasAnyAdminRole(data: DocumentData): boolean {
  const roles = data.roles;
  if (!Array.isArray(roles)) {
    return false;
  }
  return roles.some(roleEntryHasAdminRole);
}

function documentHasSuperAdminRole(data: DocumentData): boolean {
  const roles = data.roles;
  if (!Array.isArray(roles)) {
    return false;
  }
  return roles.some((r) => r && typeof r === 'object' && (r as { role?: string }).role === ROLES.SUPER_ADMIN);
}

function serializeUserSnapshot(doc: QueryDocumentSnapshot<DocumentData>): DocumentData & { id: string } {
  const data = doc.data();
  const out: DocumentData & { id: string } = { id: doc.id, ...data };
  const createdAt = data.createdAt;
  if (createdAt instanceof Timestamp) {
    out.createdAt = createdAt.toDate().toISOString();
  }
  return out;
}

class UsersRepository extends Repository {
  constructor() {
    super();
  }

  async fetchAdminUsers(options: { superAdminsOnly?: boolean } = {}): Promise<(DocumentData & { id: string })[]> {
    const { superAdminsOnly = false } = options;

    try {
      const usersRef = collection(FirebaseService.db, FIRESTORE_COLLECTIONS.USERS);
      const usersQuery = query(usersRef, where('roles', '!=', null));
      const snapshot = await getDocs(usersQuery);

      let users = snapshot.docs.map(serializeUserSnapshot).filter(documentHasAnyAdminRole);

      if (superAdminsOnly) {
        users = users.filter((u) => documentHasSuperAdminRole(u));
      }

      return users;
    } catch (error) {
      console.error('fetchAdminUsers: Error fetching admin users from Firestore:', error);
      logger.error(error, { context: { function: 'fetchAdminUsers', superAdminsOnly } });
      throw error;
    }
  }

  async createUpdateSuperAdmin(payload: CreateUpdateSuperAdminPayload): Promise<unknown> {
    return this.call<CreateUpdateSuperAdminPayload, unknown>('createUpdateSuperAdmin', payload);
  }

  async createUpdateAdministrator(payload: CreateUpdateAdministratorPayload): Promise<unknown> {
    if (payload.adminUid) {
      return this.call<CreateUpdateAdministratorPayload, unknown>('updateAdministrator', payload);
    }
    return this.call<CreateUpdateAdministratorPayload, unknown>('createAdministrator', payload);
  }

  async createUsersWithEmailExport(
    payload: CreateUsersWithEmailExportRequestData,
  ): Promise<CreateUsersCallableResult> {
    let response = await this.callWithTimeout<
      CreateUsersWithEmailExportRequestData,
      CreateUsersWithEmailExportPollResponse
    >('createUsersWithEmailExport', payload, CREATE_USERS_CALLABLE_TIMEOUT_MS);

    const deadline = Date.now() + CREATE_USERS_EXPORT_MAX_POLL_MS;

    for (;;) {
      if (response.status === 'success') {
        return response;
      }
      if (response.status === 'failed' || response.status === 'rolled_back') {
        throw new Error(response.message || `User creation ${response.status}`);
      }
      if (response.status !== 'pending') {
        throw new Error('Unexpected response from createUsersWithEmailExport');
      }
      if (Date.now() > deadline) {
        throw new Error(
          'User creation timed out while waiting for the server. Try again with a smaller batch or contact support.',
        );
      }
      await sleep(CREATE_USERS_EXPORT_POLL_INTERVAL_MS);
      response = await this.callWithTimeout<
        CreateUsersWithEmailExportRequestData,
        CreateUsersWithEmailExportPollResponse
      >(
        'createUsersWithEmailExport',
        { jobId: response.jobId },
        CREATE_USERS_CALLABLE_TIMEOUT_MS,
      );
    }
  }
}

export const usersRepository = new UsersRepository();
