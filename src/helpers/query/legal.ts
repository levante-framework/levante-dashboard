import _capitalize from 'lodash/capitalize';
import { convertValues, getAxiosInstance } from './utils';

interface LegalDocument {
  type: string;
  fileName: string;
  gitHubOrg: string;
  gitHubRepository: string;
  currentCommit: string;
  lastUpdated: string;
  params: Record<string, any>;
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