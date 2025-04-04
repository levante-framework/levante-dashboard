import { toValue } from 'vue';
import _intersection from 'lodash/intersection';
import _uniq from 'lodash/uniq';
import _flattenDeep from 'lodash/flattenDeep';
import _isEmpty from 'lodash/isEmpty';
import _without from 'lodash/without';
import _zip from 'lodash/zip';
import {
  batchGetDocs,
  convertValues,
  fetchDocById,
  getAxiosInstance,
  mapFields,
  orderByDefault,
} from '@/helpers/query/utils';
import { ORG_TYPES, SINGULAR_ORG_TYPES } from '@/constants/orgTypes';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

interface OrgsRequestBodyParams {
  orgType: string;
  orgName?: string;
  parentDistrict?: string;
  parentSchool?: string;
  orderBy?: any;
  aggregationQuery?: boolean;
  pageLimit?: number;
  page?: number;
  paginate?: boolean;
  select?: string[];
}

interface StructuredQuery {
  orderBy: any;
  limit?: number;
  offset?: number;
  select?: {
    fields: Array<{ fieldPath: string }>;
  };
  from: Array<{
    collectionId: string;
    allDescendants: boolean;
  }>;
  where: {
    compositeFilter: {
      op: string;
      filters: Array<{
        fieldFilter: {
          field: { fieldPath: string };
          op: string;
          value: { booleanValue?: boolean; stringValue?: string };
        };
      }>;
    };
  };
}

interface RequestBody {
  structuredQuery: StructuredQuery;
}

interface OrgData {
  id: string;
  name: string;
  abbreviation?: string;
  address?: string;
  clever?: boolean;
  classlink?: boolean;
  districtContact?: string;
  mdrNumber?: string;
  ncesId?: string;
  tags?: string[];
  currentActivationCode?: string;
  archived?: boolean;
  districtId?: string;
  schoolId?: string;
  schools?: string[];
  classes?: string[];
  [key: string]: any;
}

interface AdminOrgs {
  districts?: string[];
  schools?: string[];
  classes?: string[];
  groups?: string[];
  families?: string[];
}

interface SchoolDoc {
  districtId: string;
  [key: string]: any;
}

interface ClassDoc {
  districtId: string;
  schoolId: string;
  [key: string]: any;
}

interface DistrictDoc {
  schools: string[];
  [key: string]: any;
}

interface SchoolClassesDoc {
  classes: string[];
  [key: string]: any;
}

export const getOrgsRequestBody = ({
  orgType,
  orgName,
  parentDistrict,
  parentSchool,
  orderBy,
  aggregationQuery,
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
}: OrgsRequestBodyParams): RequestBody => {
  const requestBody: RequestBody = {
    structuredQuery: {
      orderBy: orderBy ?? orderByDefault,
      from: [
        {
          collectionId: orgType,
          allDescendants: false,
        },
      ],
      where: {
        compositeFilter: {
          op: 'AND',
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
    },
  };

  if (!aggregationQuery) {
    if (paginate && pageLimit !== undefined && page !== undefined) {
      requestBody.structuredQuery.limit = pageLimit;
      requestBody.structuredQuery.offset = page * pageLimit;
    }

    requestBody.structuredQuery.select = {
      fields: select.map((field) => ({ fieldPath: field })),
    };
  }

  if (orgName && !(parentDistrict || parentSchool)) {
    requestBody.structuredQuery.where.compositeFilter.filters.push({
      fieldFilter: {
        field: { fieldPath: 'name' },
        op: 'EQUAL',
        value: { stringValue: orgName },
      },
    });
  } else if (orgType === 'schools' && parentDistrict) {
    if (orgName) {
      requestBody.structuredQuery.where.compositeFilter.filters.push(
        {
          fieldFilter: {
            field: { fieldPath: 'name' },
            op: 'EQUAL',
            value: { stringValue: orgName },
          },
        },
        {
          fieldFilter: {
            field: { fieldPath: 'districtId' },
            op: 'EQUAL',
            value: { stringValue: parentDistrict },
          },
        },
      );
    } else {
      requestBody.structuredQuery.where.compositeFilter.filters.push({
        fieldFilter: {
          field: { fieldPath: 'districtId' },
          op: 'EQUAL',
          value: { stringValue: parentDistrict },
        },
      });
    }
  } else if (orgType === 'classes' && parentSchool) {
    if (orgName) {
      requestBody.structuredQuery.where.compositeFilter.filters.push(
        {
          fieldFilter: {
            field: { fieldPath: 'name' },
            op: 'EQUAL',
            value: { stringValue: orgName },
          },
        },
        {
          fieldFilter: {
            field: { fieldPath: 'schoolId' },
            op: 'EQUAL',
            value: { stringValue: parentSchool },
          },
        },
      );
    } else {
      requestBody.structuredQuery.where.compositeFilter.filters.push({
        fieldFilter: {
          field: { fieldPath: 'schoolId' },
          op: 'EQUAL',
          value: { stringValue: parentSchool },
        },
      });
    }
  }

  if (aggregationQuery) {
    return {
      structuredAggregationQuery: {
        ...requestBody,
        aggregations: [
          {
            alias: 'count',
            count: {},
          },
        ],
      },
    } as any;
  }

  return requestBody;
};

export const orgCounter = async (
  activeOrgType: { value: string },
  selectedDistrict: { value: string },
  selectedSchool: { value: string },
  orderBy: { value: any },
  isSuperAdmin: { value: boolean },
  adminOrgs: { value: AdminOrgs }
): Promise<number> => {
  if (isSuperAdmin.value) {
    const axiosInstance = getAxiosInstance('admin');
    const requestBody = getOrgsRequestBody({
      orgType: activeOrgType.value,
      parentDistrict: selectedDistrict.value,
      parentSchool: selectedSchool.value,
      aggregationQuery: true,
      orderBy: orderBy.value,
      paginate: false,
      select: ['name', 'id'],
    });
    console.log(`Fetching count for ${activeOrgType.value}`);
    const { data } = await axiosInstance.post(':runAggregationQuery', requestBody);
    return Number(convertValues(data[0].result?.aggregateFields?.count));
  } else {
    console.log('Org Counter, not super admin');
    if (['groups', 'families'].includes(activeOrgType.value)) {
      const orgType = activeOrgType.value as keyof AdminOrgs;
      return adminOrgs.value[orgType]?.length ?? 0;
    }

    const { districts: districtIds = [], schools: schoolIds = [], classes: classIds = [] } = adminOrgs.value;

    if (activeOrgType.value === 'districts') {
      const schoolPromises = schoolIds.map((schoolId) => {
        return fetchDocById('schools', schoolId, ['districtId']) as Promise<SchoolDoc>;
      });

      const classPromises = classIds.map((classId) => {
        return fetchDocById('classes', classId, ['districtId']) as Promise<ClassDoc>;
      });

      const schools = await Promise.all(schoolPromises);
      const classes = await Promise.all(classPromises);

      districtIds.push(...schools.map(({ districtId }) => districtId));
      districtIds.push(...classes.map(({ districtId }) => districtId));
      return _uniq(districtIds).length;
    } else if (activeOrgType.value === 'schools') {
      const { schools } = await fetchDocById('districts', selectedDistrict.value, ['schools']) as DistrictDoc;
      if (districtIds.includes(selectedDistrict.value)) {
        return schools?.length ?? 0;
      } else if (schoolIds.length > 0) {
        return _intersection(schools ?? [], schoolIds).length ?? 0;
      } else if (classIds.length > 0) {
        const classPromises = classIds.map((classId) => {
          return fetchDocById('classes', classId, ['schoolId']) as Promise<ClassDoc>;
        });

        const classes = await Promise.all(classPromises);
        return _intersection(
          schools,
          classes.map(({ schoolId }) => schoolId),
        ).length;
      }

      return 0;
    } else if (activeOrgType.value === 'classes') {
      if (selectedSchool.value) {
        const school = await fetchDocById('schools', selectedSchool.value, ['classes']) as SchoolClassesDoc;
        console.log('in orgs counter', districtIds);
        if (districtIds.includes(selectedDistrict.value) || schoolIds.includes(selectedSchool.value)) {
          return school.classes?.length ?? 0;
        }
        return _intersection(school.classes ?? [], classIds).length;
      }
      return 0;
    }
    return 0;
  }
};

export const fetchOrgByName = async (
  orgType: string,
  orgName: string,
  selectedDistrict: { value: string },
  selectedSchool: { value: string }
): Promise<OrgData[]> => {
  const axiosInstance = getAxiosInstance('admin');
  const requestBody = getOrgsRequestBody({
    orgType,
    parentDistrict: orgType === 'schools' ? selectedDistrict.value : undefined,
    parentSchool: orgType === 'classes' ? selectedSchool.value : undefined,
    aggregationQuery: false,
    orgName,
    paginate: false,
    select: ['id', 'abbreviation'],
  });

  const { data } = await axiosInstance.post(':runQuery', requestBody);
  return mapFields(data) as OrgData[];
};

export const fetchTreeOrgs = async (
  administrationId: string,
  assignedOrgs: AdminOrgs
): Promise<Record<string, OrgData[]>> => {
  const { districts = [], schools = [], classes = [], groups = [], families = [] } = assignedOrgs;

  const [districtDocs, schoolDocs, classDocs, groupDocs, familyDocs] = await Promise.all([
    batchGetDocs(districts.map(id => `districts/${id}`)),
    batchGetDocs(schools.map(id => `schools/${id}`)),
    batchGetDocs(classes.map(id => `classes/${id}`)),
    batchGetDocs(groups.map(id => `groups/${id}`)),
    batchGetDocs(families.map(id => `families/${id}`)),
  ]);

  return {
    districts: districtDocs as OrgData[],
    schools: schoolDocs as OrgData[],
    classes: classDocs as OrgData[],
    groups: groupDocs as OrgData[],
    families: familyDocs as OrgData[],
  };
};

export const orgFetcher = async (
  collection: string,
  parentId: string | undefined,
  isSuperAdmin: boolean,
  administrationOrgs: { value: AdminOrgs }
): Promise<OrgData[]> => {
  if (isSuperAdmin) {
    const axiosInstance = getAxiosInstance('admin');
    const requestBody = getOrgsRequestBody({
      orgType: collection,
      parentDistrict: collection === 'schools' ? parentId : undefined,
      parentSchool: collection === 'classes' ? parentId : undefined,
      aggregationQuery: false,
      paginate: false,
    });

    const { data } = await axiosInstance.post(':runQuery', requestBody);
    return mapFields(data) as OrgData[];
  }

  const orgType = collection as keyof AdminOrgs;
  const orgIds = administrationOrgs.value[orgType] ?? [];
  
  if (_isEmpty(orgIds)) {
    return [];
  }

  return batchGetDocs(orgIds.map(id => `${collection}/${id}`)) as Promise<OrgData[]>;
};

export const orgFetchAll = async (
  orgType: { value: string },
  selectedDistrict: { value: string | undefined },
  selectedSchool: { value: string | undefined },
  orderBy: { value: any },
  isSuperAdmin: boolean,
  adminOrgs: { value: AdminOrgs },
  select: string[] = ['id', 'name']
): Promise<OrgData[]> => {
  if (isSuperAdmin) {
    const axiosInstance = getAxiosInstance('admin');
    const requestBody = getOrgsRequestBody({
      orgType: orgType.value,
      parentDistrict: orgType.value === 'schools' ? selectedDistrict.value : undefined,
      parentSchool: orgType.value === 'classes' ? selectedSchool.value : undefined,
      orderBy: orderBy.value,
      aggregationQuery: false,
      paginate: false,
      select,
    });

    const { data } = await axiosInstance.post(':runQuery', requestBody);
    return mapFields(data) as OrgData[];
  }

  const orgTypeKey = orgType.value as keyof AdminOrgs;
  const orgIds = adminOrgs.value[orgTypeKey] ?? [];
  
  if (_isEmpty(orgIds)) {
    return [];
  }

  return batchGetDocs(orgIds.map(id => `${orgType.value}/${id}`), select) as Promise<OrgData[]>;
};

export const orgPageFetcher = async (
  orgType: { value: string },
  selectedDistrict: { value: string | undefined },
  selectedSchool: { value: string | undefined },
  orderBy: { value: any },
  pageLimit: { value: number },
  page: { value: number },
  isSuperAdmin: boolean,
  adminOrgs: { value: AdminOrgs }
): Promise<OrgData[]> => {
  if (isSuperAdmin) {
    const axiosInstance = getAxiosInstance('admin');
    const requestBody = getOrgsRequestBody({
      orgType: orgType.value,
      parentDistrict: orgType.value === 'schools' ? selectedDistrict.value : undefined,
      parentSchool: orgType.value === 'classes' ? selectedSchool.value : undefined,
      orderBy: orderBy.value,
      pageLimit: pageLimit.value,
      page: page.value,
      aggregationQuery: false,
      paginate: true,
    });

    const { data } = await axiosInstance.post(':runQuery', requestBody);
    return mapFields(data) as OrgData[];
  }

  const orgTypeKey = orgType.value as keyof AdminOrgs;
  const orgIds = adminOrgs.value[orgTypeKey] ?? [];
  
  if (_isEmpty(orgIds)) {
    return [];
  }

  // For non-super admins, we need to handle pagination manually
  const start = page.value * pageLimit.value;
  const end = start + pageLimit.value;
  const paginatedIds = orgIds.slice(start, end);

  return batchGetDocs(paginatedIds.map(id => `${orgType.value}/${id}`)) as Promise<OrgData[]>;
}; 