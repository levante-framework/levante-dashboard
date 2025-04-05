import { toValue } from 'vue';
import axios, { AxiosInstance } from 'axios';
import Papa from 'papaparse';
import _get from 'lodash/get';
import _isEmpty from 'lodash/isEmpty';
import _fromPairs from 'lodash/fromPairs';
import _last from 'lodash/last';
import _mapValues from 'lodash/mapValues';
import _toPairs from 'lodash/toPairs';
import _union from 'lodash/union';
import _without from 'lodash/without';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/store/auth';
import { flattenObj } from '@/helpers';
import { FIRESTORE_DATABASES } from '@/constants/firebase';

interface FirestoreValue {
  nullValue?: null;
  booleanValue?: boolean;
  timestampValue?: string;
  stringValue?: string;
  bytesValue?: string;
  referenceValue?: string;
  geoPointValue?: { latitude: number; longitude: number };
  integerValue?: string;
  doubleValue?: string;
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: Record<string, FirestoreValue> };
}

interface Document {
  name?: string;
  fields?: Record<string, FirestoreValue>;
}

interface QueryResponse {
  document?: Document;
}

interface DocumentData {
  id: string;
  collection?: string;
  [key: string]: any;
}

interface DocumentRequest {
  collection: string;
  docId: string;
  select?: string[];
}

interface BatchGetResponse {
  found?: {
    name: string;
    fields: Record<string, FirestoreValue>;
  };
}

export const convertValues = (value: FirestoreValue): any => {
  const passThroughKeys = [
    'nullValue',
    'booleanValue',
    'timestampValue',
    'stringValue',
    'bytesValue',
    'referenceValue',
    'geoPointValue',
  ];
  const numberKeys = ['integerValue', 'doubleValue'];
  return _toPairs(value).map(([key, _value]) => {
    if (passThroughKeys.includes(key)) {
      return _value;
    } else if (numberKeys.includes(key)) {
      return Number(_value);
    } else if (key === 'arrayValue') {
      return (_value.values ?? []).map((itemValue: FirestoreValue) => convertValues(itemValue));
    } else if (key === 'mapValue') {
      return _fromPairs(_toPairs(_value.fields).map(([mapKey, mapValue]) => [mapKey, convertValues(mapValue as FirestoreValue)]));
    }
  })[0];
};

export const mapFields = (data: QueryResponse[], getParentDocId?: boolean): DocumentData[] => {
  const fields = _without(
    data.map((item) => {
      if (item.document?.fields) {
        const nameSplit = (item.document?.name ?? '').split('/');
        const result: Record<string, any> = {
          ...item.document?.fields,
          id: { stringValue: _last(nameSplit) },
        };
        if (getParentDocId) {
          result.parentDoc = { stringValue: nameSplit[nameSplit.length - 3] };
        }
        return result;
      }
      return undefined;
    }),
    undefined,
  );
  return fields.map((item) => _mapValues(item, (value) => convertValues(value))) as DocumentData[];
};

export const orderByDefault = [
  {
    field: { fieldPath: 'name' },
    direction: 'ASCENDING',
  },
];

export const getProjectId = (project = 'admin'): string | undefined => {
  const authStore = useAuthStore();
  const { roarfirekit } = storeToRefs(authStore);
  return roarfirekit.value.roarConfig?.[project]?.projectId;
};

export const getAxiosInstance = (db = FIRESTORE_DATABASES.ADMIN, unauthenticated = false): AxiosInstance => {
  const authStore = useAuthStore();
  const { roarfirekit } = storeToRefs(authStore);
  
  console.log('Getting axios instance for database:', db);
  console.log('Roarfirekit initialized:', roarfirekit.value?.initialized);
  console.log('Roarfirekit restConfig:', roarfirekit.value?.restConfig);
  
  const axiosOptions = _get(roarfirekit.value.restConfig, db) ?? {};
  
  if (unauthenticated) {
    delete axiosOptions.headers;
  }

  if (!axiosOptions.baseURL) {
    console.error('Base URL is not set for database:', db);
    throw new Error('Base URL is not set.');
  }

  return axios.create(axiosOptions);
};

export const exportCsv = (data: Record<string, any>[], filename: string): void => {
  const csvData = data.map(flattenObj);
  const csvColumns = _union(...csvData.map(Object.keys));
  const csv = Papa.parse(JSON.stringify(csvData), {
    header: true,
  });

  const blob = new Blob([JSON.stringify(csv.data)], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

export const fetchDocById = async (
  collection: string,
  docId: string,
  select?: string[],
  db = FIRESTORE_DATABASES.ADMIN,
  unauthenticated = false,
): Promise<DocumentData> => {
  const collectionValue = toValue(collection);
  const docIdValue = toValue(docId);

  if (!toValue(collectionValue) || !toValue(docId)) {
    console.warn(
      `fetchDocById: Collection or docId not provided. Called with collection "${collectionValue}" and docId "${docIdValue}"`,
    );
    return {} as DocumentData;
  }

  const docPath = `/${collectionValue}/${docIdValue}`;
  const axiosInstance = getAxiosInstance(db, unauthenticated);
  const queryParams = (select ?? []).map((field) => `mask.fieldPaths=${field}`);
  const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

  const { data } = await axiosInstance.get(docPath + queryString);

  return {
    id: docIdValue,
    collectionValue,
    ..._mapValues(data.fields, (value) => convertValues(value)),
  } as DocumentData;
};

export const fetchDocumentsById = async (
  collection: string,
  docIds: string[],
  select: string[] = [],
  db = FIRESTORE_DATABASES.ADMIN,
): Promise<DocumentData[]> => {
  const axiosInstance = getAxiosInstance(db);
  const baseURL = axiosInstance.defaults.baseURL?.split('googleapis.com/v1/')[1] ?? '';
  const documents = toValue(docIds).map((docId) => `${baseURL}/${collection}/${docId}`);

  const requestBody: {
    documents: string[];
    mask?: { fieldPaths: string[] };
  } = {
    documents,
  };

  if (select?.length > 0) {
    requestBody.mask = { fieldPaths: select };
  }

  const response = await axiosInstance.post<BatchGetResponse[]>(':batchGet', requestBody);

  return response.data
    .filter(({ found }) => found)
    .map(({ found }) => {
      if (!found) return null;
      const pathParts = found.name.split('/');
      const documentId = pathParts.pop();
      const collectionName = pathParts.pop();
      return {
        id: documentId,
        collection: collectionName,
        ..._mapValues(found.fields, (value) => convertValues(value)),
      } as DocumentData;
    })
    .filter((doc): doc is DocumentData => doc !== null);
};

export const fetchDocsById = async (
  documents: DocumentRequest[],
  db = FIRESTORE_DATABASES.ADMIN,
): Promise<DocumentData[]> => {
  if (_isEmpty(documents)) {
    console.warn('FetchDocsById: No documents provided!');
    return [];
  }
  const axiosInstance = getAxiosInstance(db);
  const promises = [];

  for (const { collection, docId, select } of documents) {
    const docPath = `/${collection}/${docId}`;
    const queryParams = (select ?? []).map((field) => `mask.fieldPaths=${field}`);
    const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
    promises.push(
      axiosInstance.get(docPath + queryString).then(({ data }) => {
        return {
          id: docId,
          collection,
          ..._mapValues(data.fields, (value) => convertValues(value)),
        } as DocumentData;
      }),
    );
  }
  return Promise.all(promises);
};

export const batchGetDocs = async (
  docPaths: string[],
  select: string[] = [],
  db = FIRESTORE_DATABASES.ADMIN,
): Promise<DocumentData[]> => {
  if (_isEmpty(docPaths)) {
    return [];
  }

  const axiosInstance = getAxiosInstance(db);
  const baseURL = axiosInstance.defaults.baseURL?.split('googleapis.com/v1/')[1] ?? '';
  const documents = docPaths.map((docPath) => `${baseURL}/${docPath}`);
  const batchDocs = await axiosInstance
    .post<BatchGetResponse[]>(':batchGet', {
      documents,
      ...(select.length > 0 && {
        mask: { fieldPaths: select },
      }),
    })
    .then(({ data }) => {
      return data
        .map(({ found }) => {
          if (found) {
            const pathParts = found.name.split('/');
            const documentId = pathParts.pop();
            const collectionName = pathParts.pop();
            return {
              id: documentId,
              collection: collectionName,
              ..._mapValues(found.fields, (value) => convertValues(value)),
            } as DocumentData;
          }
          return null;
        })
        .filter((doc): doc is DocumentData => doc !== null);
    });

  return batchDocs;
};

export const fetchSubcollection = async (
  collectionPath: string,
  subcollectionName: string,
  select: string[] = [],
  db = FIRESTORE_DATABASES.ADMIN,
): Promise<DocumentData[]> => {
  const axiosInstance = getAxiosInstance(db);
  const requestBody = {
    structuredQuery: {
      from: [
        {
          collectionId: subcollectionName,
          allDescendants: false,
        },
      ],
    },
  };

  if (select.length > 0) {
    requestBody.structuredQuery.select = {
      fields: select.map((field) => ({ fieldPath: field })),
    };
  }

  const { data } = await axiosInstance.post(`${collectionPath}:runQuery`, requestBody);
  return mapFields(data);
}; 