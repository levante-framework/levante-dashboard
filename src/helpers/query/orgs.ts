import { toValue, type Ref, ref } from 'vue';
import _intersection from 'lodash/intersection';
import _uniq from 'lodash/uniq';
import _flattenDeep from 'lodash/flattenDeep';
import _isEmpty from 'lodash/isEmpty';
import _without from 'lodash/without';
import _zip from 'lodash/zip';
import _mapValues from 'lodash/mapValues'; // Added for fetchTreeOrgs
import _groupBy from 'lodash/groupBy'; // Import _groupBy
// @ts-ignore - utils likely needs TS conversion
import {
  batchGetDocs, // Used in fetchTreeOrgs
  convertValues,
  fetchDocById,
  getAxiosInstance,
  mapFields,
  orderByDefault,
  getProjectId, // Used in fetchTreeOrgs
} from '@/helpers/query/utils';
// @ts-ignore - helpers/index likely needs TS conversion
import { pluralizeFirestoreCollection } from '@/helpers'; // Although not used here?
import { ORG_TYPES, SINGULAR_ORG_TYPES } from '@/constants/orgTypes';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';
import type { AxiosInstance } from 'axios';

// --- Reused Interfaces ---
// ... (Value types, OrderBy, FieldFilter, CompositeFilter, WhereFilter, Select, From, StructuredQuery, Aggregation, StructuredAggregationQuery, QueryRequestBody, BatchGetResponseItem, AggregationResult, FirestoreRunQueryDocument) ...
// Basic Firestore Value types
interface StringValue { stringValue: string; }
interface BooleanValue { booleanValue: boolean; }
interface IntegerValue { integerValue: string; }
interface DoubleValue { doubleValue: number; }
interface NullValue { nullValue: null; }
interface ArrayValue { arrayValue: { values?: Value[] }; }
type Value = StringValue | BooleanValue | IntegerValue | DoubleValue | NullValue | ArrayValue | { [key: string]: any };

// OrderBy clause structure
interface OrderBy {
    field: { fieldPath: string };
    direction: 'ASCENDING' | 'DESCENDING';
}
interface FieldFilter {
    field: { fieldPath: string };
    op: 'EQUAL' | 'IN' | 'ARRAY_CONTAINS' | string;
    value: Value;
}
interface CompositeFilter {
    op: 'AND' | 'OR';
    filters: (FieldFilter | WhereFilter)[];
}
interface WhereFilter {
    fieldFilter?: FieldFilter;
    compositeFilter?: CompositeFilter;
}
interface Select {
    fields: { fieldPath: string }[];
}
interface From {
    collectionId: string;
    allDescendants?: boolean;
}
interface StructuredQuery {
    select?: Select;
    from: From[];
    where?: WhereFilter;
    orderBy?: OrderBy[];
    limit?: number;
    offset?: number;
}
interface Aggregation {
    alias: string;
    count?: {};
}
interface StructuredAggregationQuery {
    structuredQuery: StructuredQuery;
    aggregations: Aggregation[];
}
interface QueryRequestBody {
    structuredQuery?: StructuredQuery;
    structuredAggregationQuery?: StructuredAggregationQuery;
}
interface BatchGetResponseItem {
    found?: {
        name: string;
        fields: Record<string, any>;
    };
    missing?: string;
    transaction?: string;
    readTime?: string;
}
interface AggregationResult {
    result?: {
        aggregateFields?: {
            [key: string]: Value;
        };
    };
    readTime?: string;
}
interface FirestoreRunQueryDocument {
    document?: {
        name: string;
        fields: Record<string, Value>;
        createTime: string;
        updateTime: string;
    };
    readTime?: string;
    parentDoc?: string;
    id?: string;
}
interface FetchSpec {
    collection: string;
    docId: string;
}

// --- Orgs Specific Interfaces ---

// Structure for admin orgs from user claims
export interface AdminOrgs {
    districts?: string[];
    schools?: string[];
    classes?: string[];
    groups?: string[];
    families?: string[];
}

// Placeholder for Org data (refine based on actual fields for each org type)
export interface OrgData {
    id: string;
    name?: string;
    abbreviation?: string;
    address?: any; // Type address structure
    clever?: any; // Type clever structure
    classlink?: any; // Type classlink structure
    districtContact?: any; // Type contact structure
    mdrNumber?: string;
    ncesId?: string;
    tags?: string[];
    archived?: boolean;
    districtId?: string; // For schools/classes
    schoolId?: string; // For classes
    schools?: string[]; // For districts
    classes?: string[]; // For schools
    currentActivationCode?: string; // For schools
    [key: string]: any;
}

interface GetOrgsRequestParams {
    orgType: string; // Collection name (e.g., 'districts', 'schools')
    orgName?: string | null;
    parentDistrict?: string | null;
    parentSchool?: string | null;
    orderBy?: OrderBy[];
    aggregationQuery?: boolean;
    pageLimit?: number;
    page?: number;
    paginate?: boolean;
    select?: string[];
}

// Structure for assignedOrgs field in Administration documents
export interface AssignedOrgs {
    districts?: string[];
    schools?: string[];
    classes?: string[];
    groups?: string[];
    families?: string[];
}

// Structure for the result of fetchTreeOrgs
export interface OrgTree {
    districts: OrgData[];
    schools: OrgData[];
    classes: OrgData[];
    groups: OrgData[];
    families: OrgData[];
}

// --- Functions ---

export const getOrgsRequestBody = ({
  orgType,
  orgName,
  parentDistrict,
  parentSchool,
  orderBy,
  aggregationQuery = false,
  pageLimit,
  page,
  paginate = true,
  select = [
    'abbreviation',
    'address',
    'clever',
    'classlink',
    'districtContact',
    'id',
    'mdrNumber',
    'name',
    'ncesId',
    'tags',
  ],
}: GetOrgsRequestParams): QueryRequestBody => {
  const structuredQuery: StructuredQuery = {
      orderBy: orderBy ?? orderByDefault,
      from: [{ collectionId: orgType, allDescendants: false }],
      where: {
          compositeFilter: {
              op: 'AND',
              // Initialize with archived filter
              filters: [
                  {
                      fieldFilter: {
                          field: { fieldPath: 'archived' },
                          op: 'EQUAL',
                          value: { booleanValue: false },
                      },
                  },
              ],
          },
      },
  };

  const filters = structuredQuery.where!.compositeFilter!.filters;

  if (!aggregationQuery) {
    if (paginate && pageLimit !== undefined && page !== undefined) {
      structuredQuery.limit = pageLimit;
      structuredQuery.offset = page * pageLimit;
    }
    if (select && select.length > 0) {
        structuredQuery.select = {
            fields: select.map((field) => ({ fieldPath: field })),
        };
    }
  }

  // Add name/parent filters
  if (orgName && !parentDistrict && !parentSchool) {
    filters.push({
      fieldFilter: {
        field: { fieldPath: 'name' },
        op: 'EQUAL',
        value: { stringValue: orgName },
      },
    });
  } else if (orgType === FIRESTORE_COLLECTIONS.SCHOOLS && parentDistrict) {
    filters.push({
      fieldFilter: {
        field: { fieldPath: 'districtId' },
        op: 'EQUAL',
        value: { stringValue: parentDistrict },
      },
    });
    if (orgName) {
      filters.push({
        fieldFilter: {
          field: { fieldPath: 'name' },
          op: 'EQUAL',
          value: { stringValue: orgName },
        },
      });
    }
  } else if (orgType === FIRESTORE_COLLECTIONS.CLASSES && parentSchool) {
    filters.push({
      fieldFilter: {
        field: { fieldPath: 'schoolId' },
        op: 'EQUAL',
        value: { stringValue: parentSchool },
      },
    });
    if (orgName) {
      filters.push({
        fieldFilter: {
          field: { fieldPath: 'name' },
          op: 'EQUAL',
          value: { stringValue: orgName },
        },
      });
    }
  }

  if (aggregationQuery) {
    return {
      structuredAggregationQuery: {
        structuredQuery, // Use the constructed query
        aggregations: [{ alias: 'count', count: {} }],
      },
    };
  }

  return { structuredQuery };
};

export const orgCounter = async (
    activeOrgType: Ref<string>,
    selectedDistrict: Ref<string | null>,
    selectedSchool: Ref<string | null>,
    orderBy: Ref<OrderBy[] | undefined>,
    isSuperAdmin: Ref<boolean>,
    adminOrgs: Ref<AdminOrgs | undefined> // Use AdminOrgs interface
): Promise<number> => {

  const currentOrgType = toValue(activeOrgType);
  const currentAdminOrgs = toValue(adminOrgs);

  if (toValue(isSuperAdmin)) {
    // Super Admin: Use aggregation query
    const axiosInstance = getAxiosInstance();
    const requestBody = getOrgsRequestBody({
      orgType: currentOrgType,
      parentDistrict: toValue(selectedDistrict),
      parentSchool: toValue(selectedSchool),
      aggregationQuery: true,
      orderBy: toValue(orderBy),
      paginate: false,
      select: ['name', 'id'], // Select needed for aggregation?
    });
    console.log(`Fetching count for ${currentOrgType}`);
    const { data } = await axiosInstance.post<AggregationResult[]>(':runAggregationQuery', requestBody);
    const countValue = data[0]?.result?.aggregateFields?.count;
    let count = 0;
    if (countValue && typeof countValue === 'object' && 'integerValue' in countValue && typeof countValue.integerValue === 'string') {
        const numericCount = Number(countValue.integerValue);
        count = isNaN(numericCount) ? 0 : numericCount;
    } else if (countValue) {
        console.warn(`Unexpected structure for ${currentOrgType} count aggregation:`, countValue);
        const numericCount = Number(countValue);
        count = isNaN(numericCount) ? 0 : numericCount;
    }
    return count;

  } else {
    // Regular Admin: Logic based on adminOrgs
    console.log('Org Counter, not super admin');
    if (!currentAdminOrgs || _isEmpty(currentAdminOrgs)) {
        return 0; // No orgs assigned
    }

    const { districts = [], schools = [], classes = [] } = currentAdminOrgs;

    if (['groups', 'families'].includes(currentOrgType)) {
        // Direct count for groups/families
        return currentAdminOrgs[currentOrgType as keyof AdminOrgs]?.length ?? 0;
    }

    if (currentOrgType === FIRESTORE_COLLECTIONS.DISTRICTS) {
        // Count unique district IDs from direct assignment + derived from schools/classes
        const schoolPromises = schools.map(schoolId =>
            fetchDocById(FIRESTORE_COLLECTIONS.SCHOOLS, schoolId, ['districtId']) as Promise<{ districtId?: string }>
        );
        const classPromises = classes.map(classId =>
            fetchDocById(FIRESTORE_COLLECTIONS.CLASSES, classId, ['districtId']) as Promise<{ districtId?: string }>
        );

        const schoolResults = await Promise.all(schoolPromises);
        const classResults = await Promise.all(classPromises);

        const derivedDistrictIds = [
            ...schoolResults.map(s => s?.districtId),
            ...classResults.map(c => c?.districtId),
        ];

        const allDistrictIds = [...districts, ...derivedDistrictIds];
        // Filter out undefined/null/empty strings before counting unique
        return _uniq(_without(allDistrictIds, undefined, null, '')).length;

    } else if (currentOrgType === FIRESTORE_COLLECTIONS.SCHOOLS) {
        const currentDistrictId = toValue(selectedDistrict);
        if (!currentDistrictId) return 0; // Cannot count schools without selected district

        // Fetch the schools array from the selected district document
        const districtData = await fetchDocById(FIRESTORE_COLLECTIONS.DISTRICTS, currentDistrictId, ['schools']) as { schools?: string[] };
        const districtSchools = districtData?.schools ?? [];

        if (districts.includes(currentDistrictId)) {
            // Admin has access to the whole district, count all its schools
            return districtSchools.length;
        } else if (schools.length > 0) {
            // Admin has specific school access, count intersection within the selected district
            return _intersection(districtSchools, schools).length;
        } else if (classes.length > 0) {
            // Admin has class access, derive school IDs from classes and count intersection
            const classPromises = classes.map(classId =>
                fetchDocById(FIRESTORE_COLLECTIONS.CLASSES, classId, ['schoolId']) as Promise<{ schoolId?: string }>
            );
            const classResults = await Promise.all(classPromises);
             // Filter out undefined/null/empty strings before counting unique
            const derivedSchoolIds = _uniq(_without(classResults.map(c => c?.schoolId), undefined, null, '')) as string[];
            return _intersection(districtSchools, derivedSchoolIds).length;
        }
        return 0;

    } else if (currentOrgType === FIRESTORE_COLLECTIONS.CLASSES) {
        const currentSchoolId = toValue(selectedSchool);
        if (!currentSchoolId) return 0; // Cannot count classes without selected school

        // Fetch the classes array from the selected school document
        const schoolData = await fetchDocById(FIRESTORE_COLLECTIONS.SCHOOLS, currentSchoolId, ['classes']) as { classes?: string[] };
        const schoolClasses = schoolData?.classes ?? [];

        // Check if admin has access via parent district or direct school access
        const parentDistrictId = (await fetchDocById(FIRESTORE_COLLECTIONS.SCHOOLS, currentSchoolId, ['districtId']) as { districtId?: string })?.districtId;
        if ((parentDistrictId && districts.includes(parentDistrictId)) || schools.includes(currentSchoolId)) {
            // Admin has access via district or school, count all classes in the school
            return schoolClasses.length;
        }
        // Admin has specific class access, count intersection
        return _intersection(schoolClasses, classes).length;
    }

    return 0; // Should not be reached for valid org types
  }
};

export const fetchOrgByName = async (
    orgType: string,
    orgName: string,
    selectedDistrict: Ref<string | null>,
    selectedSchool: Ref<string | null>
): Promise<OrgData[]> => {
  const axiosInstance = getAxiosInstance();
  const requestBody = getOrgsRequestBody({
    orgType: orgType,
    parentDistrict: orgType === FIRESTORE_COLLECTIONS.SCHOOLS ? toValue(selectedDistrict) : null,
    parentSchool: orgType === FIRESTORE_COLLECTIONS.CLASSES ? toValue(selectedSchool) : null,
    aggregationQuery: false,
    orgName,
    paginate: false,
    select: ['id', 'abbreviation'], // Select specific fields
  });

  const { data } = await axiosInstance.post<FirestoreRunQueryDocument[]>(':runQuery', requestBody);
  return mapFields(data as any) as OrgData[]; // Cast needed for mapFields
};

/**
 * Fetches organizations (schools or classes) based on user permissions and selected parent.
 * Used primarily for populating dropdowns.
 */
export const orgFetcher = async (
  orgType: string, // e.g., FIRESTORE_COLLECTIONS.SCHOOLS
  selectedParentId: string | null, // District ID for schools, School ID for classes
  isSuperAdmin: boolean,
  adminOrgs: AdminOrgs | undefined,
  select: string[] = ['name', 'id', 'tags', 'currentActivationCode'] // Default select fields
): Promise<OrgData[]> => {

    if (!selectedParentId) return []; // Need parent to fetch children

    const parentCollection = orgType === FIRESTORE_COLLECTIONS.SCHOOLS
        ? FIRESTORE_COLLECTIONS.DISTRICTS
        : FIRESTORE_COLLECTIONS.SCHOOLS;
    const childField = orgType === FIRESTORE_COLLECTIONS.SCHOOLS ? 'schools' : 'classes';

    try {
        const parentDoc = await fetchDocById(parentCollection, selectedParentId, [childField]) as { [key: string]: string[] | undefined };
        const allChildIds = parentDoc?.[childField] ?? [];

        if (allChildIds.length === 0) return [];

        let accessibleChildIds: string[];

        if (isSuperAdmin) {
            accessibleChildIds = allChildIds;
        } else {
            if (!adminOrgs) return []; // No access
            const { districts = [], schools = [], classes = [] } = adminOrgs;
            const parentIsAdminDistrict = orgType === FIRESTORE_COLLECTIONS.SCHOOLS && districts.includes(selectedParentId); // Check orgType
            const parentIsAdminSchool = orgType === FIRESTORE_COLLECTIONS.CLASSES && schools.includes(selectedParentId); // Check orgType

            if (parentIsAdminDistrict || parentIsAdminSchool) {
                // If admin has access to the parent, they have access to all children
                accessibleChildIds = allChildIds;
            } else {
                // Otherwise, find intersection with specifically assigned children
                const specificChildAccess = orgType === FIRESTORE_COLLECTIONS.SCHOOLS ? schools : classes;
                accessibleChildIds = _intersection(allChildIds, specificChildAccess);
            }
        }

        if (accessibleChildIds.length === 0) return [];

        // Construct full document paths for batchGetDocs
        // Assuming getProjectId() and db identifier (e.g., '(default)') are available or implicitly handled by batchGetDocs path construction
        // We need the full path relative to the DB root: `collectionId/docId`
        const docPaths = accessibleChildIds.map(id => `${orgType}/${id}`);
        
        // Remove the @ts-ignore - batchGetDocs expects string[] (full paths relative to db root)
        const childDocs = await batchGetDocs(docPaths, select) as OrgData[];
        // Filter out undefined results from batchGetDocs (missing docs)
        const validChildDocs = childDocs.filter(doc => doc !== undefined);

        return validChildDocs.sort((a, b) => a.name?.localeCompare(b.name ?? '') ?? 0);

    } catch (error) {
        console.error(`Error fetching orgs of type ${orgType} for parent ${selectedParentId}:`, error);
        return [];
    }
};

/**
 * Fetches a paginated list of organizations based on user permissions.
 */
export const orgPageFetcher = async (
  activeOrgType: Ref<string>,
  selectedDistrict: Ref<string | null>,
  selectedSchool: Ref<string | null>,
  orderBy: Ref<OrderBy[] | undefined>,
  pageLimit: Ref<number>,
  page: Ref<number>,
  isSuperAdmin: Ref<boolean>,
  adminOrgs: Ref<AdminOrgs | undefined>
): Promise<OrgData[]> => {

    const currentOrgType = toValue(activeOrgType);
    const currentAdminOrgs = toValue(adminOrgs);

    if (toValue(isSuperAdmin)) {
        // Super Admin: Direct query
        const axiosInstance = getAxiosInstance();
        const requestBody = getOrgsRequestBody({
            orgType: currentOrgType,
            parentDistrict: toValue(selectedDistrict),
            parentSchool: toValue(selectedSchool),
            orderBy: toValue(orderBy),
            aggregationQuery: false,
            pageLimit: toValue(pageLimit),
            page: toValue(page),
            paginate: true,
            select: undefined, // Use default select from getOrgsRequestBody
        });
        console.log(`Fetching page ${toValue(page)} for ${currentOrgType}`);
        const { data } = await axiosInstance.post<FirestoreRunQueryDocument[]>(':runQuery', requestBody);
        return mapFields(data as any) as OrgData[];
    } else {
        // Regular Admin: Fetch IDs based on permissions, then batch get
        console.log(`Org Page Fetcher (${currentOrgType}), not super admin`);
        if (!currentAdminOrgs) return [];

        let accessibleIds: string[] = [];
        const { districts = [], schools = [], classes = [], groups = [], families = [] } = currentAdminOrgs;

        if (currentOrgType === FIRESTORE_COLLECTIONS.DISTRICTS) {
            const schoolPromises = schools.map(schoolId => fetchDocById(FIRESTORE_COLLECTIONS.SCHOOLS, schoolId, ['districtId']) as Promise<{ districtId?: string }>);
            const classPromises = classes.map(classId => fetchDocById(FIRESTORE_COLLECTIONS.CLASSES, classId, ['districtId']) as Promise<{ districtId?: string }>);
            const schoolResults = await Promise.all(schoolPromises);
            const classResults = await Promise.all(classPromises);
            const derivedDistrictIds = [...schoolResults.map(s => s?.districtId), ...classResults.map(c => c?.districtId)];
            accessibleIds = _uniq(_without([...districts, ...derivedDistrictIds], undefined, null, '')) as string[];
        } else if (currentOrgType === FIRESTORE_COLLECTIONS.SCHOOLS) {
            const currentDistrictId = toValue(selectedDistrict);
            if (!currentDistrictId) return [];
            const districtData = await fetchDocById(FIRESTORE_COLLECTIONS.DISTRICTS, currentDistrictId, ['schools']) as { schools?: string[] };
            const districtSchools = districtData?.schools ?? [];
            if (districts.includes(currentDistrictId)) {
                accessibleIds = districtSchools;
            } else {
                const classPromises = classes.map(classId => fetchDocById(FIRESTORE_COLLECTIONS.CLASSES, classId, ['schoolId']) as Promise<{ schoolId?: string }>);
                const classResults = await Promise.all(classPromises);
                const derivedSchoolIds = _uniq(_without(classResults.map(c => c?.schoolId), undefined, null, '')) as string[];
                accessibleIds = _intersection(districtSchools, [...schools, ...derivedSchoolIds]);
            }
        } else if (currentOrgType === FIRESTORE_COLLECTIONS.CLASSES) {
            const currentSchoolId = toValue(selectedSchool);
            if (!currentSchoolId) return [];
            const schoolData = await fetchDocById(FIRESTORE_COLLECTIONS.SCHOOLS, currentSchoolId, ['classes']) as { classes?: string[] };
            const schoolClasses = schoolData?.classes ?? [];
            const parentDistrictId = (await fetchDocById(FIRESTORE_COLLECTIONS.SCHOOLS, currentSchoolId, ['districtId']) as { districtId?: string })?.districtId;
            if ((parentDistrictId && districts.includes(parentDistrictId)) || schools.includes(currentSchoolId)) {
                accessibleIds = schoolClasses;
            } else {
                accessibleIds = _intersection(schoolClasses, classes);
            }
        } else if (currentOrgType === ORG_TYPES.GROUPS) { // Check specifically for GROUPS
             accessibleIds = groups; // Directly use the groups array
        } else if (currentOrgType === ORG_TYPES.FAMILIES) { // Check specifically for FAMILIES
             accessibleIds = families; // Directly use the families array
        }

        if (accessibleIds.length === 0) return [];

        console.warn(`Non-super-admin orgPageFetcher for ${currentOrgType} currently fetches all accessible orgs, ignoring pagination and sorting.`);

        const fetchSpecs: FetchSpec[] = accessibleIds.map(id => ({ collection: currentOrgType, docId: id }));
        // Construct correct paths for batchGetDocs
        const docPaths = fetchSpecs.map(spec => `${spec.collection}/${spec.docId}`);

        // Remove @ts-ignore and pass correct path strings
        const orgDocsResults = await batchGetDocs(docPaths) as (OrgData | undefined)[];

        // Filter out undefined results
        const orgDocs = orgDocsResults.filter(doc => doc !== undefined) as OrgData[];

        // TODO: Implement actual pagination and sorting for non-super-admin if needed
        return orgDocs.sort((a, b) => a.name?.localeCompare(b.name ?? '') ?? 0);
    }
};

/**
 * Fetches ALL organizations for a given context (potentially large).
 */
export const orgFetchAll = async (
  activeOrgType: Ref<string>,
  selectedDistrict: Ref<string | null>,
  selectedSchool: Ref<string | null>,
  orderBy: Ref<OrderBy[] | undefined>,
  isSuperAdmin: Ref<boolean>,
  adminOrgs: Ref<AdminOrgs | undefined>,
  select: Ref<string[] | undefined> = ref(undefined)
): Promise<OrgData[]> => {
    console.warn(`orgFetchAll for ${toValue(activeOrgType)} fetches all documents and may be slow or hit limits.`);

    const currentOrgType = toValue(activeOrgType);
    const currentAdminOrgs = toValue(adminOrgs);
    const selectFields = toValue(select);

    if (toValue(isSuperAdmin)) {
        const allOrgs: OrgData[] = [];
        const pageSize = 200; // Internal page size
        let currentPage = 0;
        let hasMore = true;
        const axiosInstance = getAxiosInstance();

        while (hasMore) {
            const requestBody = getOrgsRequestBody({
                orgType: currentOrgType,
                parentDistrict: toValue(selectedDistrict),
                parentSchool: toValue(selectedSchool),
                orderBy: toValue(orderBy),
                aggregationQuery: false,
                pageLimit: pageSize,
                page: currentPage,
                paginate: true,
                select: selectFields, // Pass provided select fields
            });
            try {
                const { data } = await axiosInstance.post<FirestoreRunQueryDocument[]>(':runQuery', requestBody);
                const pageOrgs = mapFields(data as any) as OrgData[];
                if (pageOrgs.length > 0) {
                    allOrgs.push(...pageOrgs);
                }
                if (pageOrgs.length < pageSize) {
                    hasMore = false;
                } else {
                    currentPage++;
                }
            } catch (error) {
                console.error(`Error fetching page ${currentPage} for ${currentOrgType}:`, error);
                hasMore = false; // Stop fetching on error
            }
        }
        return allOrgs;
    } else {
        // Regular Admin: Fetch all accessible IDs and batch get
        if (!currentAdminOrgs) return [];

        let accessibleIds: string[] = [];
        const { districts = [], schools = [], classes = [], groups = [], families = [] } = currentAdminOrgs;

        if (currentOrgType === FIRESTORE_COLLECTIONS.DISTRICTS) {
            const schoolPromises = schools.map(schoolId => fetchDocById(FIRESTORE_COLLECTIONS.SCHOOLS, schoolId, ['districtId']) as Promise<{ districtId?: string }>);
            const classPromises = classes.map(classId => fetchDocById(FIRESTORE_COLLECTIONS.CLASSES, classId, ['districtId']) as Promise<{ districtId?: string }>);
            const schoolResults = await Promise.all(schoolPromises);
            const classResults = await Promise.all(classPromises);
            const derivedDistrictIds = [...schoolResults.map(s => s?.districtId), ...classResults.map(c => c?.districtId)];
            accessibleIds = _uniq(_without([...districts, ...derivedDistrictIds], undefined, null, '')) as string[];
        } else if (currentOrgType === FIRESTORE_COLLECTIONS.SCHOOLS) {
            const currentDistrictId = toValue(selectedDistrict);
            if (!currentDistrictId) return [];
            const districtData = await fetchDocById(FIRESTORE_COLLECTIONS.DISTRICTS, currentDistrictId, ['schools']) as { schools?: string[] };
            const districtSchools = districtData?.schools ?? [];
            if (districts.includes(currentDistrictId)) {
                accessibleIds = districtSchools;
            } else {
                const classPromises = classes.map(classId => fetchDocById(FIRESTORE_COLLECTIONS.CLASSES, classId, ['schoolId']) as Promise<{ schoolId?: string }>);
                const classResults = await Promise.all(classPromises);
                const derivedSchoolIds = _uniq(_without(classResults.map(c => c?.schoolId), undefined, null, '')) as string[];
                accessibleIds = _intersection(districtSchools, [...schools, ...derivedSchoolIds]);
            }
        } else if (currentOrgType === FIRESTORE_COLLECTIONS.CLASSES) {
            const currentSchoolId = toValue(selectedSchool);
            if (!currentSchoolId) return [];
            const schoolData = await fetchDocById(FIRESTORE_COLLECTIONS.SCHOOLS, currentSchoolId, ['classes']) as { classes?: string[] };
            const schoolClasses = schoolData?.classes ?? [];
            const parentDistrictId = (await fetchDocById(FIRESTORE_COLLECTIONS.SCHOOLS, currentSchoolId, ['districtId']) as { districtId?: string })?.districtId;
            if ((parentDistrictId && districts.includes(parentDistrictId)) || schools.includes(currentSchoolId)) {
                accessibleIds = schoolClasses;
            } else {
                accessibleIds = _intersection(schoolClasses, classes);
            }
        } else if (currentOrgType === ORG_TYPES.GROUPS) { // Check specifically for GROUPS
             accessibleIds = groups;
        } else if (currentOrgType === ORG_TYPES.FAMILIES) { // Check specifically for FAMILIES
             accessibleIds = families;
        }

        if (accessibleIds.length === 0) return [];

        // Prepare the full document paths for batchGetDocs
        const docPaths = accessibleIds.map(id => `${currentOrgType}/${id}`);

        // Call batchGetDocs with correct parameters: (docPaths, select)
        // The db parameter defaults to FIRESTORE_DATABASES.ADMIN
        const orgDocsResults = await batchGetDocs(docPaths, selectFields) as (OrgData | undefined)[];

        // Filter out undefined results (documents not found or inaccessible)
        const orgDocs = orgDocsResults.filter(doc => doc !== undefined) as OrgData[];

        return orgDocs.sort((a, b) => a.name?.localeCompare(b.name ?? '') ?? 0);
    }
};

/**
 * Fetches all organizations assigned to a specific administration.
 */
export const fetchTreeOrgs = async (
    administrationId: string,
    assignedOrgs: AssignedOrgs
): Promise<OrgTree> => {
    const result: OrgTree = {
        districts: [],
        schools: [],
        classes: [],
        groups: [],
        families: [],
    };

    if (!assignedOrgs || _isEmpty(assignedOrgs)) {
        return result;
    }

    const orgTypes = Object.keys(assignedOrgs) as Array<keyof AssignedOrgs>;
    const allFetchSpecs: FetchSpec[] = [];

    for (const orgType of orgTypes) {
        const ids = assignedOrgs[orgType];
        if (ids && ids.length > 0) {
            const collectionName = FIRESTORE_COLLECTIONS[orgType.toUpperCase() as keyof typeof FIRESTORE_COLLECTIONS];
            if (collectionName) {
                ids.forEach(id => allFetchSpecs.push({ collection: collectionName, docId: id }));
            } else {
                console.warn(`Unknown collection name for orgType: ${orgType}`);
            }
        }
    }

    if (allFetchSpecs.length === 0) {
        return result;
    }

    try {
        // Construct full relative paths for batchGetDocs
        const docPaths = allFetchSpecs.map(spec => `${spec.collection}/${spec.docId}`);

        // @ts-ignore - batchGetDocs likely expects FetchSpec[], but utils.ts might be untyped
        // Removed @ts-ignore as we now pass the correct type (string[])
        const allOrgDocsResults = await batchGetDocs(docPaths) as (OrgData | undefined)[];

        // Filter out any undefined results (documents that were not found)
        const allOrgDocs = allOrgDocsResults.filter(doc => doc !== undefined) as OrgData[];

        const projectId = getProjectId();
        const basePath = `projects/${projectId}/databases/(default)/documents/`;

        // Type doc parameter as OrgData | any to handle potential extra properties like __name__
        const groupedDocs = _groupBy(allOrgDocs, (doc: OrgData | any) => {
            // Attempt to extract collection name from document path stored in __name__ or name
            // This relies on batchGetDocs preserving or adding this path info.
            // Make this safer: check if doc exists and path is a string.
            // Use the 'collection' property added by batchGetDocs
            if (doc && typeof doc.collection === 'string') {
                return doc.collection;
            }
            console.warn("Could not determine collection from doc object:", doc);
            return 'unknown';
        });

        // Populate the result object
        for (const orgType of orgTypes) {
            const collectionName = FIRESTORE_COLLECTIONS[orgType.toUpperCase() as keyof typeof FIRESTORE_COLLECTIONS];
            if (collectionName && groupedDocs[collectionName]) {
                 // Ensure we are assigning an array, even if only one doc was fetched
                 result[orgType] = Array.isArray(groupedDocs[collectionName]) 
                                    ? groupedDocs[collectionName] 
                                    : [groupedDocs[collectionName]];
            }
        }

    } catch (error) {
        console.error(`Error fetching tree orgs for administration ${administrationId}:`, error);
    }

    return result;
}; 