import { toValue } from "vue";
import axios from "axios";
import Papa from "papaparse";
import _get from "lodash/get";
import _isEmpty from "lodash/isEmpty";
import _fromPairs from "lodash/fromPairs";
import _last from "lodash/last";
import _mapValues from "lodash/mapValues";
import _toPairs from "lodash/toPairs";
import _union from "lodash/union";
import _without from "lodash/without";
import { storeToRefs } from "pinia";
import { useAuthStore } from "@/store/auth";
import { flattenObj } from "@/helpers";
import { FIRESTORE_DATABASES } from "@/constants/firebase";

export const convertValues = (value) => {
  const passThroughKeys = [
    "nullValue",
    "booleanValue",
    "timestampValue",
    "stringValue",
    "bytesValue",
    "referenceValue",
    "geoPointValue",
  ];
  const numberKeys = ["integerValue", "doubleValue"];
  return _toPairs(value).map(([key, _value]) => {
    if (passThroughKeys.includes(key)) {
      return _value;
    } else if (numberKeys.includes(key)) {
      return Number(_value);
    } else if (key === "arrayValue") {
      return (_value.values ?? []).map((itemValue) => convertValues(itemValue));
    } else if (key === "mapValue") {
      return _fromPairs(
        _toPairs(_value.fields).map(([mapKey, mapValue]) => [
          mapKey,
          convertValues(mapValue),
        ]),
      );
    }
  })[0];
};

export const mapFields = (data, getParentDocId) => {
  const fields = _without(
    data.map((item) => {
      if (item.document?.fields) {
        const nameSplit = (item.document?.name ?? "").split("/");
        const result = {
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
  return fields.map((item) =>
    _mapValues(item, (value) => convertValues(value)),
  );
};

export const orderByDefault = [
  {
    field: { fieldPath: "name" },
    direction: "ASCENDING",
  },
];

export const getProjectId = (project = "admin") => {
  const authStore = useAuthStore();
  const { roarfirekit } = storeToRefs(authStore);
  return roarfirekit.value.roarConfig?.[project]?.projectId;
};

export const getAxiosInstance = (
  db = FIRESTORE_DATABASES.ADMIN,
  unauthenticated = false,
) => {
  const authStore = useAuthStore();
  const { roarfirekit } = storeToRefs(authStore);
  
  console.log('getAxiosInstance: Called with db:', db, 'unauthenticated:', unauthenticated);
  console.log('getAxiosInstance: Firekit state:', {
    hasFirekit: !!roarfirekit.value,
    initialized: roarfirekit.value?.initialized,
    hasProject: !!roarfirekit.value?.project,
    hasAuth: !!roarfirekit.value?.project?.auth,
    hasIdToken: !!roarfirekit.value?.idToken
  });
  
  // Get the restConfig - simplified approach
  let axiosOptions = {};
  
  if (roarfirekit.value && roarfirekit.value.initialized) {
    try {
      // Access restConfig getter directly
      const restConfig = roarfirekit.value.restConfig;
      console.log('getAxiosInstance: RestConfig:', restConfig);
      
      if (restConfig) {
        // Try to get the config for the specified database
        axiosOptions = restConfig[db] || restConfig.admin || restConfig.app || {};
        console.log('getAxiosInstance: Found axiosOptions from restConfig:', axiosOptions);
      } else {
        console.log('getAxiosInstance: No restConfig found, constructing manually...');
        // Fallback: construct the config manually
        const projectId = roarfirekit.value?.roarConfig?.merged?.projectId;
        const useEmulators = roarfirekit.value?.roarConfig?.merged?.useEmulators;
        const emulatorPorts = roarfirekit.value?.roarConfig?.merged?.emulatorPorts;
        const idToken = roarfirekit.value?.idToken;
        
        console.log('getAxiosInstance: Manual config values:', {
          projectId,
          useEmulators,
          emulatorPorts,
          hasIdToken: !!idToken
        });
        
        if (projectId) {
          let baseURL;
          if (useEmulators && emulatorPorts?.db) {
            const host = roarfirekit.value?.roarConfig?.merged?.emulatorHost || 'localhost';
            const port = emulatorPorts.db;
            baseURL = `http://${host}:${port}/v1/projects/${projectId}/databases/(default)/documents`;
            console.log('getAxiosInstance: Using emulator baseURL:', baseURL);
          } else {
            baseURL = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
            console.log('getAxiosInstance: Using production baseURL:', baseURL);
          }
          
          const headers = {};
          if (idToken) {
            headers.Authorization = `Bearer ${idToken}`;
          }
          
          axiosOptions = { headers, baseURL };
          console.log('getAxiosInstance: Manually constructed axiosOptions:', axiosOptions);
        } else {
          console.warn('getAxiosInstance: No projectId found');
        }
      }
    } catch (error) {
      console.error('getAxiosInstance: Error accessing restConfig:', error);
    }
  } else {
    console.warn('getAxiosInstance: Firekit not available or not initialized');
  }

  if (unauthenticated) {
    delete axiosOptions.headers;
    console.log('getAxiosInstance: Removed headers for unauthenticated request');
  }

  // Throw error when the Axios baseUrl is not set.
  // This is a temporary solution to ensure the Axios base URL is set before making requests. This is a workaround that
  // is required because the initialization logic seems to contain a race condition that causes TanStack to make
  // requests before the base URL is set. Throwing an error ensures that TanStack identifies the request as invalid and
  // retries it after the base URL is set.
  // @TODO: Remove once initialization logic issue is identified and fixed.
  if (!axiosOptions.baseURL) {
    console.error('getAxiosInstance: Base URL is not set!', {
      db,
      axiosOptions,
      firekitState: {
        hasFirekit: !!roarfirekit.value,
        initialized: roarfirekit.value?.initialized,
        hasProject: !!roarfirekit.value?.project,
        hasAuth: !!roarfirekit.value?.project?.auth,
      }
    });
    throw new Error("Base URL is not set.");
  }

  console.log('getAxiosInstance: Returning axios instance with baseURL:', axiosOptions.baseURL);
  return axios.create(axiosOptions);
};

export const exportCsv = (data, filename) => {
  const csvData = data.map(flattenObj);
  const csvColumns = _union(...csvData.map(Object.keys));
  const csv = Papa.unparse(csvData, {
    columns: csvColumns,
  });

  const blob = new Blob([csv]);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob, { type: "text/plain" });
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

/**
 * Fetch a document by its ID
 *
 * @param {String} collection - The Firestore collection name.
 * @param {String} docId - The ID of the document to fetch.
 * @param {Array<String>} [select] - Optional array of fields to select from the document.
 * @param {String} [db=FIRESTORE_DATABASES.ADMIN] - The Firestore database to query.
 * @param {Boolean} [unauthenticated=false] - Whether to use an unauthenticated request.
 * @returns {Promise<Object>} The document data or an error message.
 */
export const fetchDocById = async (
  collection,
  docId,
  select,
  db = FIRESTORE_DATABASES.ADMIN,
  unauthenticated = false,
) => {
  const collectionValue = toValue(collection);
  const docIdValue = toValue(docId);

  if (!toValue(collectionValue) || !toValue(docId)) {
    console.warn(
      `fetchDocById: Collection or docId not provided. Called with collection "${collectionValue}" and docId "${docIdValue}"`,
    );
    return {};
  }

  const docPath = `/${collectionValue}/${docIdValue}`;
  const axiosInstance = getAxiosInstance(db, unauthenticated);
  const queryParams = (select ?? []).map((field) => `mask.fieldPaths=${field}`);
  const queryString = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";

  const { data } = await axiosInstance.get(docPath + queryString);

  return {
    id: docIdValue,
    collectionValue,
    ..._mapValues(data.fields, (value) => convertValues(value)),
  };
};

/**
 * Fetch documents by ID
 *
 * Helper to query documents of a given collection by their IDs using the Firestore REST API.
 *
 * @param {String} collection - The collection to query.
 * @param {Array<String>} docIds - The array of document IDs to query.
 * @param {Array<String>} select - The optional array of fields to select from the document.
 * @param {String} db - The Firestore database to query. Defaults to the roar-admin database.
 * @returns {Promise<Array<Object>>} The array of document data.
 */
export const fetchDocumentsById = async (
  collection,
  docIds,
  select = [],
  db = FIRESTORE_DATABASES.ADMIN,
) => {
  const axiosInstance = getAxiosInstance(db);
  const baseURL = axiosInstance.defaults.baseURL.split("googleapis.com/v1/")[1];
  const documents = toValue(docIds).map(
    (docId) => `${baseURL}/${collection}/${docId}`,
  );

  const requestBody = {
    documents,
  };

  if (select?.length > 0) {
    requestBody.mask = { fieldPaths: select };
  }

  try {
    const response = await axiosInstance.post(":batchGet", requestBody);

    return response.data
      .filter(({ found }) => found)
      .map(({ found }) => {
        // Deconstruct the document path as Firebase conveniently doesn't return basic information like the record ID as
        // part of the documentation data. Whilst this is a bit hacky, it works.
        const pathParts = found.name.split("/");
        const documentId = pathParts.pop();
        const collectionName = pathParts.pop();
        return {
          id: documentId,
          collection: collectionName,
          ..._mapValues(found.fields, (value) => convertValues(value)),
        };
      });
  } catch (error) {
    console.error("fetchDocumentsById: Error fetching documents by ID:", error);
    return [];
  }
};

// @TODO: Depreceate fetchDocsById and use fetchDocumentsById instead once the last queries are updated as well. This
// existing method fetches documents by emitting a single GET request per document, which is inefficient. The new
// fetchDocumentsById method fetches documents by emitting a single POST request with all document paths.
export const fetchDocsById = async (
  documents,
  db = FIRESTORE_DATABASES.ADMIN,
) => {
  if (_isEmpty(documents)) {
    console.warn("FetchDocsById: No documents provided!");
    return [];
  }
  const axiosInstance = getAxiosInstance(db);
  const promises = [];

  for (const { collection, docId, select } of documents) {
    const docPath = `/${collection}/${docId}`;
    const queryParams = (select ?? []).map(
      (field) => `mask.fieldPaths=${field}`,
    );
    const queryString =
      queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
    promises.push(
      axiosInstance.get(docPath + queryString).then(({ data }) => {
        return {
          id: docId,
          collection,
          ..._mapValues(data.fields, (value) => convertValues(value)),
        };
      }),
    );
  }
  return Promise.all(promises);
};

export const batchGetDocs = async (
  docPaths,
  select = [],
  db = FIRESTORE_DATABASES.ADMIN,
) => {
  if (_isEmpty(docPaths)) {
    return [];
  }

  const axiosInstance = getAxiosInstance(db);
  const baseURL = axiosInstance.defaults.baseURL.split("googleapis.com/v1/")[1];
  const documents = docPaths.map((docPath) => `${baseURL}/${docPath}`);
  const batchDocs = await axiosInstance
    .post(":batchGet", {
      documents,
      ...(select.length > 0 && {
        mask: { fieldPaths: select },
      }),
    })
    .then(({ data }) => {
      return _without(
        data.map(({ found }) => {
          if (found) {
            const nameSplit = found.name.split("/");
            return {
              name: found.name,
              data: {
                id: nameSplit.pop(),
                collection: nameSplit.pop(),
                ..._mapValues(found.fields, (value) => convertValues(value)),
              },
            };
          }
          return undefined;
        }),
        undefined,
      );
    });

  return docPaths
    .map((docPath) => batchDocs.find((doc) => doc.name.includes(docPath)))
    .map((doc) => doc?.data);
};

export const matchMode2Op = {
  equals: "EQUAL",
  notEquals: "NOT_EQUAL",
};

export const fetchSubcollection = async (
  collectionPath,
  subcollectionName,
  select = [],
  db = FIRESTORE_DATABASES.ADMIN,
) => {
  const axiosInstance = getAxiosInstance(db);
  // Construct the path to the subcollection
  const subcollectionPath = `/${collectionPath}/${subcollectionName}`;
  const queryParams = select
    .map((field) => `mask.fieldPaths=${field}`)
    .join("&");
  const queryString = queryParams ? `?${queryParams}` : "";

  try {
    const response = await axiosInstance.get(subcollectionPath + queryString);

    // Check if the API returns an array of document data in the subcollection
    const documents = response.data.documents ?? [];

    // Map and return the documents with the required format
    return documents.map((doc) => ({
      id: doc.name.split("/").pop(), // Extract document ID from the document name/path
      ..._mapValues(doc.fields, (value) => convertValues(value)),
    }));
  } catch (error) {
    console.error("Failed to fetch subcollection: ", error);
    return {
      error:
        error.response?.status === 404
          ? "Subcollection not found"
          : error.message,
    };
  }
};
