import { useQuery } from '@tanstack/vue-query';
import axios from 'axios';
import { computed, MaybeRefOrGetter, toValue } from 'vue';

interface GcsObject {
  name: string;
}

interface GcsListResponse {
  items?: Array<GcsObject>;
  nextPageToken?: string;
}

export interface SurveyListItem {
  id: string;
  name: string;
  url: string;
}

const fetchSurveyList = async (bucketUrl?: string): Promise<Array<SurveyListItem> | null> => {
  if (!bucketUrl) return null;

  const url = new URL(bucketUrl);
  const [, bucketName, ...prefixParts] = url.pathname.split('/');
  const prefix = prefixParts.filter(Boolean).join('/');
  const normalizedPrefix = prefix ? `${prefix}/` : '';
  const listApiUrl = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o`;
  const { data } = await axios.get<GcsListResponse>(listApiUrl, {
    params: {
      prefix: normalizedPrefix,
      delimiter: '/',
    },
  });

  return (data.items ?? [])
    .filter(({ name }) => name.endsWith('.json'))
    .map(({ name }) => {
      const fileName = name.replace(normalizedPrefix, '').replace(/\.json$/, '');

      return {
        id: fileName,
        name: fileName,
        url: `https://storage.googleapis.com/${bucketName}/${name}`,
      };
    });
};

export const useSurveyListQuery = (bucketUrl?: MaybeRefOrGetter<string | undefined>) => {
  return useQuery({
    queryKey: computed(() => ['survey-list', toValue(bucketUrl)]),
    queryFn: () => fetchSurveyList(toValue(bucketUrl)),
    enabled: computed(() => !!toValue(bucketUrl)),
  });
};
