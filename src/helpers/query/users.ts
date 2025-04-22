import { toValue, type Ref, ref } from 'vue';
// @ts-ignore - utils likely needs TS conversion
import { convertValues, getAxiosInstance, mapFields } from './utils';
import type { AxiosInstance } from 'axios';

// --- Interfaces & Types ---

// Basic Firestore Value types
interface StringValue { stringValue: string; }
interface BooleanValue { booleanValue: boolean; }
interface IntegerValue { integerValue: string; } // Firestore returns numbers as strings in some contexts
interface DoubleValue { doubleValue: number; }
interface NullValue { nullValue: null; }
interface ArrayValue { arrayValue: { values?: Value[] }; }

// Union type for possible Firestore field values
type Value = StringValue | BooleanValue | IntegerValue | DoubleValue | NullValue | ArrayValue | { [key: string]: any }; // Add other types as needed (mapValue, etc.)

// OrderBy clause structure
interface OrderBy {
    field: { fieldPath: string };
    direction: 'ASCENDING' | 'DESCENDING';
}

// FieldFilter structure
interface FieldFilter {
    field: { fieldPath: string };
    op: 'EQUAL' | 'IN' | 'ARRAY_CONTAINS' | 'LESS_THAN' | 'GREATER_THAN' | string; // Add other operators
    value: Value;
}

// CompositeFilter structure
interface CompositeFilter {
    op: 'AND' | 'OR';
    filters: (FieldFilter | WhereFilter)[]; // Can contain nested filters
}

// Where clause structure (can be FieldFilter or CompositeFilter)
interface WhereFilter {
    fieldFilter?: FieldFilter;
    compositeFilter?: CompositeFilter;
    // Add unaryFilter if needed
}

// Select clause structure
interface Select {
    fields: { fieldPath: string }[];
}

// From clause structure
interface From {
    collectionId: string;
    allDescendants?: boolean;
}

// Basic StructuredQuery structure
interface StructuredQuery {
    select?: Select;
    from: From[];
    where?: WhereFilter;
    orderBy?: OrderBy[];
    limit?: number;
    offset?: number;
}

// Aggregation structure
interface Aggregation {
    alias: string;
    count?: {}; // Or other aggregation types
}

// Structured Aggregation Query structure
interface StructuredAggregationQuery {
    structuredQuery: StructuredQuery;
    aggregations: Aggregation[];
}

// Request body for runQuery or runAggregationQuery
interface QueryRequestBody {
    structuredQuery?: StructuredQuery;
    structuredAggregationQuery?: StructuredAggregationQuery;
    // Add transaction, newTransaction, readTime options if needed
}

// Parameters for getUsersRequestBody function
interface GetUsersRequestBodyParams {
    userIds?: string[];
    orgType?: string | null; // Allow null
    orgId?: string | null; // Allow null
    aggregationQuery?: boolean;
    pageLimit?: number;
    page?: number;
    paginate?: boolean;
    select?: string[];
    orderBy?: OrderBy[]; // Expecting array of OrderBy
    restrictToActiveUsers?: boolean;
}

// Structure for the result of runAggregationQuery
interface AggregationResult {
    result?: {
        aggregateFields?: {
            [key: string]: Value; // e.g., count: { integerValue: '123' }
        };
    };
    readTime?: string;
}

// Expected structure for mapped user data (refine based on actual mapFields output)
interface UserData {
    id: string;
    // Add other fields returned by mapFields (username, name, studentData, userType, archived)
    [key: string]: any;
}

// --- Functions ---

/**
 * Constructs the request body for fetching users.
 *
 * @param params - The parameters for constructing the request body.
 * @returns The constructed Firestore query request body.
 * @throws {Error} If neither userIds nor orgType and orgId are provided.
 */
export const getUsersRequestBody = ({
  userIds = [],
  orgType,
  orgId,
  aggregationQuery = false,
  pageLimit,
  page,
  paginate = true,
  select = ['name'],
  orderBy,
  restrictToActiveUsers = false,
}: GetUsersRequestBodyParams): QueryRequestBody => {

  // Base structure
  const structuredQuery: StructuredQuery = {
      from: [{ collectionId: 'users', allDescendants: false }],
      where: {
          compositeFilter: {
              op: 'AND',
              filters: [],
          },
      },
  };

  if (orderBy) {
    structuredQuery.orderBy = orderBy;
  }

  if (!aggregationQuery) {
    if (paginate && pageLimit !== undefined && page !== undefined) {
      structuredQuery.limit = pageLimit;
      structuredQuery.offset = page * pageLimit;
    }

    if (select.length > 0) {
        structuredQuery.select = {
            fields: select.map((field) => ({ fieldPath: field })),
        };
    }
  }

  // Ensure filters array exists before pushing
  const filters = structuredQuery.where!.compositeFilter!.filters;

  if (restrictToActiveUsers) {
    filters.push({
      fieldFilter: {
        field: { fieldPath: 'archived' },
        op: 'EQUAL',
        value: { booleanValue: false },
      },
    });
  }

  if (userIds.length > 0) {
    filters.push({
      fieldFilter: {
        field: { fieldPath: '__name__' }, // Filter by document ID using __name__
        op: 'IN',
        // Construct the fully qualified document path
        value: {
          arrayValue: {
            values: userIds.map((userId) => ({ stringValue: userId })),
          },
        },
      },
    });
  } else if (orgType && orgId) {
    filters.push({
      fieldFilter: {
        // Path depends on how orgs are stored (e.g., 'orgs.schools', 'schools.current')
        // Adjust fieldPath based on the actual data structure
        field: { fieldPath: `${orgType}.current` },
        op: 'ARRAY_CONTAINS',
        value: { stringValue: orgId },
      },
    });
  } else {
      // Replicating original logic: Throw if no specific user/org filter is applied
      // for non-aggregation queries.
      if (userIds.length === 0 && (!orgType || !orgId) && !aggregationQuery && filters.length === 0) {
          throw new Error('Must provide either userIds or orgType and orgId for non-aggregation queries unless other filters are present.');
      }
  }

  if (aggregationQuery) {
    return {
      structuredAggregationQuery: {
        structuredQuery, // Reuse the base query structure
        aggregations: [
          {
            alias: 'count',
            count: {},
          },
        ],
      },
    };
  }

  return { structuredQuery };
};

/**
 * Fetches a page of users based on the provided organization type and ID.
 *
 * @returns A promise resolving to the fetched and mapped user data.
 */
export const fetchUsersByOrg = async (
    orgType: Ref<string | null>,
    orgId: Ref<string | null>,
    pageLimit: Ref<number>,
    page: Ref<number>,
    orderBy: Ref<OrderBy[] | undefined>,
    restrictToActiveUsers: Ref<boolean> = ref(false) // Use imported ref
): Promise<UserData[]> => { // Assuming mapFields returns UserData[]
  const axiosInstance = getAxiosInstance(); // Assume returns AxiosInstance
  const requestBody = getUsersRequestBody({
    orgType: toValue(orgType),
    orgId: toValue(orgId),
    aggregationQuery: false,
    pageLimit: toValue(pageLimit),
    page: toValue(page),
    paginate: true,
    select: ['username', 'name', 'studentData', 'userType', 'archived'], // Fields to select
    orderBy: toValue(orderBy),
    restrictToActiveUsers: toValue(restrictToActiveUsers),
  });

  console.log(`Fetching users page ${toValue(page)} for ${toValue(orgType)} ${toValue(orgId)}`);
  // Assuming axiosInstance.post returns { data: any }
  const { data } = await axiosInstance.post(':runQuery', requestBody);
  // Assuming mapFields converts the raw Firestore response to UserData[]
  return mapFields(data) as UserData[];
};

/**
 * Counts the number of users based on the provided organization type and ID.
 *
 * @returns A promise resolving to the count of users.
 */
export const countUsersByOrg = async (
    orgType: Ref<string | null>,
    orgId: Ref<string | null>,
    orderBy: Ref<OrderBy[] | undefined>,
    restrictToActiveUsers: Ref<boolean> = ref(false) // Use imported ref
): Promise<number> => {
  const axiosInstance = getAxiosInstance(); // Assume returns AxiosInstance
  const requestBody = getUsersRequestBody({
    orgType: toValue(orgType),
    orgId: toValue(orgId),
    aggregationQuery: true,
    paginate: false, // Aggregation doesn't need pagination params in structuredQuery
    orderBy: toValue(orderBy), // OrderBy might affect aggregation in some cases
    restrictToActiveUsers: toValue(restrictToActiveUsers),
  });

  // Specify expected response structure for aggregation query
  const { data } = await axiosInstance.post<AggregationResult[]>(':runAggregationQuery', requestBody);

  // Extract count, check if it's the expected structure { integerValue: string }
  const countValue = data[0]?.result?.aggregateFields?.count;
  let count = 0;
  // Check if countValue exists and has the integerValue property before converting
  if (countValue && typeof countValue === 'object' && 'integerValue' in countValue && typeof countValue.integerValue === 'string') {
      // Directly use the value since we confirmed it's a string integer
      const numericCount = Number(countValue.integerValue);
      count = isNaN(numericCount) ? 0 : numericCount;
  } else if (countValue) {
      // Handle cases where countValue might exist but not be integerValue
      console.warn("Unexpected structure for aggregation count:", countValue);
      // Attempt direct Number conversion as a fallback, bypassing convertValues
      const numericCount = Number(countValue);
      count = isNaN(numericCount) ? 0 : numericCount;
  }

  return count;
}; 