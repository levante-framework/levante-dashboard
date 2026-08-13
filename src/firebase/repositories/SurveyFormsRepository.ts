import { Repository } from '@/firebase/Repository';

/**
 * A single field within an org-information form version.
 *
 * @TODO Replace with the shared zod contract once it is published.
 */
export interface InformationFormField {
  itemId: string;
  variableName: string;
  kind: 'text' | 'number' | 'single-select' | 'multi-select';
  required: boolean;
  questionText: string;
  sectionId?: string;
  options?: { value: string; label: string }[];
  displayLogic?: { field: string; includes: string };
  infoExample?: string;
  notes?: string;
}

/**
 * Title and description shown at the start of a section, identified by `sectionId`.
 */
export interface FormSectionInfo {
  sectionId: string;
  title?: string;
  description?: string;
}

/**
 * Definition of the registered survey returned by `loadFormDefinitions`.
 */
export interface LoadFormDefinitionsResult {
  formId: string;
  versionId: string;
  versionNumber: number;
  formDescription: string;
  generalPrompt?: string;
  sectionInfo?: FormSectionInfo[];
  fieldsDescription: Record<string, string>;
  fullFields: InformationFormField[];
}

class SurveyFormsRepository extends Repository {
  constructor() {
    super();
  }

  async loadFormDefinitions(orgType: 'site' | 'school', orgId = 'preview'): Promise<LoadFormDefinitionsResult> {
    return this.call<{ orgType: 'site' | 'school'; orgId: string }, LoadFormDefinitionsResult>('loadFormDefinitions', {
      orgType,
      orgId,
    });
  }

  async saveOrgInformation(params: {
    orgType: 'site' | 'school';
    orgId: string;
    formVersion: string;
    responses: Record<string, unknown>;
    status: 'draft' | 'submitted';
  }): Promise<{ path: string; status: 'draft' | 'submitted' }> {
    return this.call('saveOrgInformation', params);
  }
}

export const surveyFormsRepository = new SurveyFormsRepository();
