import _capitalize from 'lodash/capitalize';
import { convertValues, getAxiosInstance } from './utils';

// Define and export the interface matching the actual data structure
export interface LegalDocument {
  type: string;
  fileName: any; // Use specific type if known (e.g., string)
  gitHubOrg: any; // Use specific type if known
  gitHubRepository: any; // Use specific type if known
  currentCommit: any; // Use specific type if known
  lastUpdated: string;
  params: Record<string, any>;
  // Add id, content, version IF they are actually present in the data
  // id?: string; 
  // content?: string;
  // version?: string;
}

interface FirestoreDocument {
  name: string;
  createTime: string;
  fields: {
    fileName: { stringValue: string };
    gitHubOrg: { stringValue: string };
    gitHubRepository: { stringValue: string };
    currentCommit: { stringValue: string };
    params: { stringValue: string };
  };
}

interface LegalResponse {
  documents: FirestoreDocument[];
}

/**
 * Fetches legal documents.
 *
 * @returns {Promise<LegalDocument[]>} A promise that resolves to an array of legal document objects.
 */
export const fetchLegalDocs = async (): Promise<LegalDocument[]> => {
  const axiosInstance = getAxiosInstance('admin');
  const { data } = await axiosInstance.get<LegalResponse>('/legal');
  
  return data.documents.map((doc) => {
    const type = _capitalize(doc.name.split('/').pop() || '');
    const lastUpdated = new Date(doc.createTime);
    return {
      type,
      fileName: convertValues(doc.fields.fileName),
      gitHubOrg: convertValues(doc.fields.gitHubOrg),
      gitHubRepository: convertValues(doc.fields.gitHubRepository),
      currentCommit: convertValues(doc.fields.currentCommit),
      lastUpdated: lastUpdated.toLocaleString(),
      params: convertValues(doc.fields.params),
    };
  });
}; 