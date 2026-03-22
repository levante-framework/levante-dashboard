import { Repository } from '@/firebase/Repository';

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

export interface CreateAdministratorPayload {
  email: string;
  name: CreateUpdateSuperAdminNamePayload;
  roles: CreateUpdateSuperAdminRolePayload[];
  isTestData?: boolean;
}

export interface UpdateAdministratorPayload extends CreateAdministratorPayload {
  adminUid: string;
}

class ManageAdministratorsRepository extends Repository {
  constructor() {
    super();
  }

  async createUpdateSuperAdmin(payload: CreateUpdateSuperAdminPayload): Promise<unknown> {
    return this.call<CreateUpdateSuperAdminPayload, unknown>('createUpdateSuperAdmin', payload);
  }

  async createAdministrator(payload: CreateAdministratorPayload): Promise<unknown> {
    return this.call<CreateAdministratorPayload, unknown>('createAdministrator', payload);
  }

  async updateAdministrator(payload: UpdateAdministratorPayload): Promise<unknown> {
    return this.call<UpdateAdministratorPayload, unknown>('updateAdministrator', payload);
  }
}

export const manageAdministratorsRepository = new ManageAdministratorsRepository();
