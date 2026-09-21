import type {
  LoadFormDefinitionsParams,
  LoadFormDefinitionsResult,
  SaveOrgInformationParams,
  SaveOrgInformationResult,
} from '@levante-framework/levante-zod';
import { Repository } from '@/firebase/Repository';

export type {
  FormSectionInfo,
  InformationFormField,
  LoadFormDefinitionsResult,
} from '@levante-framework/levante-zod';

class SurveyFormsRepository extends Repository {
  constructor() {
    super();
  }

  async loadFormDefinitions(orgType: 'site' | 'school', orgId = 'preview'): Promise<LoadFormDefinitionsResult> {
    return this.call<LoadFormDefinitionsParams, LoadFormDefinitionsResult>('loadFormDefinitions', {
      orgType,
      orgId,
    });
  }

  async saveOrgInformation(params: SaveOrgInformationParams): Promise<SaveOrgInformationResult> {
    return this.call('saveOrgInformation', params);
  }
}

export const surveyFormsRepository = new SurveyFormsRepository();
