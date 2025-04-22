import _capitalize from 'lodash/capitalize';
// @ts-ignore - utils.ts likely needs conversion itself
import { convertValues, getAxiosInstance } from './utils';

// Define the structure of the fields within a document
interface LegalDocFields {
    fileName?: any; // Replace 'any' with specific types if known
    gitHubOrg?: any;
    gitHubRepository?: any;
    currentCommit?: any;
    params?: any;
}

// Define the structure of a raw document from the API response
interface RawLegalDoc {
    name: string;
    createTime: string; // ISO date string
    fields: LegalDocFields;
}

// Define the structure of the processed legal document
interface LegalDoc {
    type: string;
    fileName: any; // Type based on convertValues return type
    gitHubOrg: any; // Type based on convertValues return type
    gitHubRepository: any; // Type based on convertValues return type
    currentCommit: any; // Type based on convertValues return type
    lastUpdated: string;
    params: any; // Type based on convertValues return type
}

// Define the structure of the API response
interface LegalApiResponse {
    documents: RawLegalDoc[];
}

/**
 * Fetches legal documents.
 *
 * @returns {Promise<LegalDoc[]>} A promise that resolves to an array of legal document objects.
 */
export const fetchLegalDocs = async (): Promise<LegalDoc[]> => {
  // Assuming getAxiosInstance returns an AxiosInstance
  const axiosInstance = getAxiosInstance('admin');
  // Use async/await and specify the expected response data structure
  const { data } = await axiosInstance.get<LegalApiResponse>('/legal');

  const docs = data.documents.map((doc: RawLegalDoc): LegalDoc => {
    const type = _capitalize(doc.name.split('/').pop() || ''); // Handle potential undefined from pop
    const lastUpdated = new Date(doc.createTime);
    return {
      type: type,
      fileName: convertValues(doc.fields.fileName),
      gitHubOrg: convertValues(doc.fields.gitHubOrg),
      gitHubRepository: convertValues(doc.fields.gitHubRepository),
      currentCommit: convertValues(doc.fields.currentCommit),
      lastUpdated: lastUpdated.toLocaleString(),
      params: convertValues(doc.fields.params),
    };
  });
  return docs;
}; 