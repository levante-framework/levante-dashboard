import { computed, toValue, type MaybeRef, type Ref, type ComputedRef } from 'vue';
import { useQuery, type UseQueryReturnType, type UseQueryOptions } from '@tanstack/vue-query';
import _isEmpty from 'lodash/isEmpty';
import { computeQueryOverrides, type Condition } from '@/helpers/computeQueryOverrides.ts';
import { administrationPageFetcher } from '@/helpers/query/administrations';
import useUserClaimsQuery from '@/composables/queries/useUserClaimsQuery';
import useUserType from '@/composables/useUserType';
import { ADMINISTRATIONS_LIST_QUERY_KEY } from '@/constants/queryKeys';
import { type UserClaimsData } from '@/composables/queries/useUserClaimsQuery'; // Import shared type

// Define expected data structure for an administration
interface AdministrationData {
  id: string;
  name?: string;
  // Add other fields from administration documents
  [key: string]: any; // Or be more specific
}

// Base query options type from TanStack
type BaseQueryOptions = UseQueryOptions<AdministrationData[], Error, AdministrationData[], ReadonlyArray<unknown>>;

// Define specific options, inheriting from BaseQueryOptions but omitting queryKey and queryFn
type AdministrationsListQueryOptions = Omit<BaseQueryOptions, 'queryKey' | 'queryFn'>;

/**
 * Administrations list query.
 *
 * @param {MaybeRef<string>} orderBy – A Vue ref containing the field to order the query by.
 * @param {MaybeRef<boolean>} [testAdministrationsOnly=false] – A Vue ref containing whether to fetch only test data.
 * @param {AdministrationsListQueryOptions | undefined} queryOptions – Optional TanStack query options.
 * @returns {UseQueryReturnType<AdministrationData[], Error>} The TanStack query result.
 */
const useAdministrationsListQuery = (
  orderBy: MaybeRef<string>,
  testAdministrationsOnly: MaybeRef<boolean> = false,
  queryOptions: AdministrationsListQueryOptions = {},
): UseQueryReturnType<AdministrationData[], Error> => {
  // Fetch the user claims.
  const { data: userClaims } = useUserClaimsQuery({
    // Access enabled from the passed options - should now exist on the type
    enabled: queryOptions.enabled ?? true,
  });

  // Get admin status and administation orgs.
  // Cast userClaims for useUserType if needed, or ensure useUserType handles potentially undefined data
  const { isSuperAdmin } = useUserType(userClaims as Ref<UserClaimsData | null>); // Added cast for clarity
  const exhaustiveAdministrationOrgs: ComputedRef<Record<string, any> | undefined> = computed(
    () => (userClaims.value as UserClaimsData | null)?.claims?.adminOrgs, // Added cast for clarity
  );

  // Ensure all necessary data is loaded before enabling the query.
  const claimsLoaded = computed(() => !_isEmpty((userClaims.value as UserClaimsData | null)?.claims));
  const queryConditions: Condition[] = [() => claimsLoaded.value]; // Pass function returning boolean
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  // Build query key, based on whether or not we only fetch test administrations.
  const queryKey = computed(() =>
    toValue(testAdministrationsOnly)
      ? [ADMINISTRATIONS_LIST_QUERY_KEY, 'test-data', orderBy] as const // Use const assertion
      : [ADMINISTRATIONS_LIST_QUERY_KEY, orderBy] as const, // Use const assertion
  );

  // Simplify TQueryKey generic to ReadonlyArray<unknown>
  return useQuery<AdministrationData[], Error, AdministrationData[], ReadonlyArray<unknown>>({
    queryKey: queryKey, // Pass the computed queryKey ref
    queryFn: async (): Promise<AdministrationData[]> => {
      // Ensure administrationPageFetcher returns Promise<AdministrationData[]> or cast
      const result = await administrationPageFetcher(
        isSuperAdmin.value, // Pass unwrapped boolean
        exhaustiveAdministrationOrgs.value, // Pass unwrapped value
        toValue(testAdministrationsOnly), // Pass unwrapped boolean
        toValue(orderBy), // Pass unwrapped string
      );
      return result as AdministrationData[]; // Cast if necessary
    },
    enabled: isQueryEnabled, // Use the computed enabled state
    ...options,
  });
};

export default useAdministrationsListQuery;
