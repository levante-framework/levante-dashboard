import { Repository } from '@/firebase/Repository';

/**
 * A single field within an org-information form version.
 * Mirrors `FullInformationFormField` in the firebase-functions firestore schema.
 *
 * @TODO Replace with the shared zod contract once it exists.
 */
export interface SurveyFormField {
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
export interface SurveyFormSection {
  sectionId: string;
  title?: string;
  description?: string;
}

/**
 * Definition of the registered survey returned by the build-survey callables.
 */
export interface SurveyFormDefinition {
  formId: string;
  versionId: string;
  versionNumber: number;
  formDescription: string;
  generalPrompt?: string;
  sectionInfo?: SurveyFormSection[];
  fieldsDescription: Record<string, string>;
  fullFields: SurveyFormField[];
}

class SurveyFormsRepository extends Repository {
  constructor() {
    super();
  }

  async buildSchoolSurvey(): Promise<SurveyFormDefinition> {
    return this.call<undefined, SurveyFormDefinition>('buildSchoolSurvey');
  }

  async buildSiteSurvey(): Promise<SurveyFormDefinition> {
    return this.call<undefined, SurveyFormDefinition>('buildSiteSurvey');
  }
}

export const surveyFormsRepository = new SurveyFormsRepository();
