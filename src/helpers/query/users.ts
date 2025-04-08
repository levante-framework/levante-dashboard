import { toValue } from 'vue';
import { convertValues, getAxiosInstance, mapFields } from './utils';

interface UserRequestBodyParams {
  userIds?: string[];
  orgType?: string;
  orgId?: string;
  aggregationQuery?: boolean;
  pageLimit?: number;
  page?: number;
  paginate?: boolean;
  select?: string[];
  orderBy?: string;
  restrictToActiveUsers?: boolean;
}

interface User {
  username?: string;
  name?: string;
  studentData?: any;
  userType?: string;
  archived?: boolean;
}

interface StructuredQuery {
  orderBy?: any;
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
      filters: Array<any>;
    };
  };
}

interface RequestBody {
  structuredQuery?: StructuredQuery;
  structuredAggregationQuery?: {
    structuredQuery: StructuredQuery;
    aggregations: Array<{
      alias: string;
      count: Record<string, never>;
    }>;
  };
}

/**
 * Constructs the request body for fetching users.
 */
export const getUsersRequestBody = ({
  userIds = [],
  orgType,
  orgId,
  aggregationQuery,
  pageLimit,
  page,
  paginate = true,
  select = ['name'],
  orderBy,
  restrictToActiveUsers = false,
}: UserRequestBodyParams): RequestBody => {
  const requestBody: RequestBody = {
    structuredQuery: {
      from: [
        {
          collectionId: 'users',
          allDescendants: false,
        },
      ],
      where: {
        compositeFilter: {
          op: 'AND',
          filters: [],
        },
      },
    },
  };

  if (orderBy) {
    requestBody.structuredQuery!.orderBy = orderBy;
  }

  if (!aggregationQuery) {
    if (paginate) {
      requestBody.structuredQuery!.limit = pageLimit;
      requestBody.structuredQuery!.offset = page! * pageLimit!;
    }

    requestBody.structuredQuery!.select = {
      fields: select.map((field) => ({ fieldPath: field })),
    };
  }

  if (restrictToActiveUsers) {
    requestBody.structuredQuery!.where.compositeFilter.filters.push({
      fieldFilter: {
        field: { fieldPath: 'archived' },
        op: 'EQUAL',
        value: { booleanValue: false },
      },
    });
  }

  if (userIds.length > 0) {
    requestBody.structuredQuery!.where.compositeFilter.filters.push({
      fieldFilter: {
        field: { fieldPath: 'id' },
        op: 'IN',
        value: {
          arrayValue: {
            values: userIds.map((userId) => ({ stringValue: userId })),
          },
        },
      },
    });
  } else if (orgType && orgId) {
    requestBody.structuredQuery!.where.compositeFilter.filters.push({
      fieldFilter: {
        field: { fieldPath: `${orgType}.current` },
        op: 'ARRAY_CONTAINS',
        value: { stringValue: orgId },
      },
    });
  } else {
    throw new Error('Must provide either userIds or orgType and orgId');
  }

  if (aggregationQuery) {
    return {
      structuredAggregationQuery: {
        structuredQuery: requestBody.structuredQuery!,
        aggregations: [
          {
            alias: 'count',
            count: {},
          },
        ],
      },
    };
  }

  return requestBody;
};

/**
 * Fetches a page of users based on the provided organization type and ID.
 */
export const fetchUsersByOrg = async (
  orgType: string,
  orgId: string,
  pageLimit: number,
  page: number,
  orderBy: string,
  restrictToActiveUsers = false
): Promise<User[]> => {
  const axiosInstance = await getAxiosInstance();
  const requestBody = getUsersRequestBody({
    orgType: toValue(orgType),
    orgId: toValue(orgId),
    aggregationQuery: false,
    pageLimit: toValue(pageLimit),
    page: toValue(page),
    paginate: true,
    select: ['username', 'name', 'studentData', 'userType', 'archived'],
    orderBy: toValue(orderBy),
    restrictToActiveUsers,
  });

  console.log(`Fetching users page ${toValue(page)} for ${toValue(orgType)} ${toValue(orgId)}`);
  const { data } = await axiosInstance.post(':runQuery', requestBody);
  return mapFields(data) as User[];
};

/**
 * Counts the number of users based on the provided organization type and ID.
 */
export const countUsersByOrg = async (
  orgType: string,
  orgId: string,
  orderBy: string,
  restrictToActiveUsers = false
): Promise<number> => {
  const axiosInstance = await getAxiosInstance();
  const requestBody = getUsersRequestBody({
    orgType: toValue(orgType),
    orgId: toValue(orgId),
    aggregationQuery: true,
    paginate: false,
    orderBy: toValue(orderBy),
    restrictToActiveUsers,
  });

  const { data } = await axiosInstance.post(':runAggregationQuery', requestBody);
  return Number(convertValues(data[0].result?.aggregateFields?.count));
}; 