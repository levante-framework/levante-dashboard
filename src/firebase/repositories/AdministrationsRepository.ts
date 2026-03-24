import { Repository } from '@/firebase/Repository';

interface GetAdministrationsParams {
  idsOnly: boolean;
  testData: boolean;
}

// Replace the following interface with zod schema
interface Administration {
  id: string;
}

interface GetAdministrationsResponse {
  data: Administration[];
}

class AdministrationsRepository extends Repository {
  constructor() {
    super();
  }

  async getAdministrations(params?: GetAdministrationsParams): Promise<Administration[]> {
    const response = await this.call<GetAdministrationsParams, GetAdministrationsResponse>(
      'getAdministrations',
      params,
    );

    return response.data;
  }
}

export const administrationsRepository = new AdministrationsRepository();
