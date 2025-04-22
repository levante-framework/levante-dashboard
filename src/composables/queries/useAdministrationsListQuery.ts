import { computed, toValue, ref } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import type { UseQueryReturnType, QueryKey, QueryOptions } from '@tanstack/vue-query';
import _isEmpty from 'lodash/isEmpty';
// @ts-ignore - computeQueryOverrides might be JS or have complex types
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
// @ts-ignore - Still JS helper
import { administrationPageFetcher } from '@/helpers/query/administrations'; 
// @ts-ignore - Still JS
import useUserClaimsQuery from '@/composables/queries/useUserClaimsQuery'; 
// @ts-ignore - Still JS
import useUserType from '@/composables/useUserType'; 
import { ADMINISTRATIONS_LIST_QUERY_KEY } from '@/constants/queryKeys';

// --- Interfaces & Types ---

// Basic structure for user claims, refine based on actual data
interface UserClaimsData {
    claims?: {
        adminOrgs?: Record<string, any>; // Adjust type if org structure is known
        // Add other claim properties
    };
    // Add other top-level claim properties
}

// Structure returned by useUserType (adjust if different)
interface UserTypeResult {
    isSuperAdmin: boolean;
    // Add other user type properties if any
}

// Basic structure for an administration list item, refine based on actual data
interface AdministrationListItem {
    id: string;
    name?: string;
    // Add other relevant fields returned by administrationPageFetcher
    [key: string]: any;
}

// Remove BaseQueryOptions, use full QueryOptions directly
type AdministrationListQueryOptions = QueryOptions<AdministrationListItem[], Error>;

/**
 * Administrations list query.
 *
 * @param orderBy – A Vue ref containing the field to order the query by.
 * @param testAdministrationsOnly – A Vue ref containing whether to fetch only test data.
 * @param queryOptions – Optional TanStack query options (typed as any due to helper complexity).
 * @returns The TanStack query result.
 */
const useAdministrationsListQuery = (
  orderBy: Ref<string | undefined>,
  testAdministrationsOnly: Ref<boolean> = ref(false),
  queryOptions?: any // Use any for queryOptions due to helper type complexity
): UseQueryReturnType<AdministrationListItem[], Error> => {
  
  const initialEnabled = queryOptions?.enabled ?? true;

  // @ts-ignore - useUserClaimsQuery is JS, assert return type
  const { data: userClaims } = useUserClaimsQuery({
    enabled: initialEnabled, // Use checked enabled status
  }) as { data: Ref<UserClaimsData | undefined> };

  // @ts-ignore - useUserType is JS, assert return type
  const { isSuperAdmin } = useUserType(userClaims) as UserTypeResult;
  
  // Type the computed property for admin orgs
  const exhaustiveAdministrationOrgs: ComputedRef<Record<string, any> | undefined> = computed(() => 
      userClaims.value?.claims?.adminOrgs
  );

  // Ensure all necessary data is loaded before enabling the query.
  const claimsLoaded = computed<boolean>(() => !_isEmpty(userClaims?.value?.claims));
  const queryConditions = [() => claimsLoaded.value];
  // Pass queryOptions (as any) directly to the helper
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions ?? {});

  // Build query key, based on whether or not we only fetch test administrations.
  const queryKey: ComputedRef<QueryKey> = computed(() =>
    toValue(testAdministrationsOnly)
      ? [ADMINISTRATIONS_LIST_QUERY_KEY, 'test-data', toValue(orderBy)] // Use toValue for orderBy
      : [ADMINISTRATIONS_LIST_QUERY_KEY, toValue(orderBy)], // Use toValue for orderBy
  );

  return useQuery<AdministrationListItem[], Error>({
    queryKey,
    // Assuming administrationPageFetcher returns Promise<AdministrationListItem[]>
    queryFn: (): Promise<AdministrationListItem[]> =>
      administrationPageFetcher(
          isSuperAdmin,
          exhaustiveAdministrationOrgs, // Pass computed ref directly
          testAdministrationsOnly,    // Pass computed ref directly
          orderBy                    // Pass computed ref directly
      ),
    enabled: isQueryEnabled,
    ...options, 
  });
};

export default useAdministrationsListQuery; 