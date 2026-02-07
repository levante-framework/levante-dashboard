import _capitalize from 'lodash/capitalize';
import { convertValues, getAxiosInstance } from './utils';
import { USE_BACKEND_MIGRATED_QUERIES } from '@/constants/featureFlags';
import { useAuthStore } from '@/store/auth';
import { storeToRefs } from 'pinia';

/**
 * Fetches legal documents.
 *
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of legal document objects.
 */
export const fetchLegalDocs = () => {
  if (USE_BACKEND_MIGRATED_QUERIES) {
    const authStore = useAuthStore();
    const { roarfirekit } = storeToRefs(authStore);
    return roarfirekit.value.getLegalDocs();
  }

  const axiosInstance = getAxiosInstance('admin');
  return axiosInstance.get('/legal').then(({ data }) => {
    const docs = data.documents.map((doc) => {
      const type = _capitalize(doc.name.split('/').pop());
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
  });
};
