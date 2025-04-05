import { computed, toValue, Ref, ComputedRef } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import _isEmpty from 'lodash/isEmpty';
import { administrationPageFetcher } from '@/helpers/query/administrations';
import useUserClaimsQuery from '@/composables/queries/useUserClaimsQuery';
import useUserType from '@/composables/useUserType.js';
import { ADMINISTRATIONS_LIST_QUERY_KEY, USER_CLAIMS_QUERY_KEY } from '@/constants/queryKeys';

interface Administration {
  [key: string]: any;
}

interface QueryOptions {
  enabled?: boolean;
  [key: string]: any;
}

// Define an interface for the return type of useUserType
interface UserTypeInfo {
  userType: ComputedRef<string | undefined>;
  isAdmin: ComputedRef<boolean>;
  isParticipant: ComputedRef<boolean>;
  isSuperAdmin: ComputedRef<boolean>;
}

/**
 * Administrations list query.
 *
 * @param {Ref<string>} orderBy – A Vue ref containing the field to order the query by.
 * @param {Ref<boolean>} [testAdministrationsOnly=false] – A Vue ref containing whether to fetch only test data.
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useAdministrationsListQuery = (
  orderBy: Ref<string>,
  testAdministrationsOnly: Ref<boolean> | boolean = false,
  queryOptions: QueryOptions | undefined = undefined
) => {
  console.log('useAdministrationsListQuery running...', { orderBy: toValue(orderBy), testAdministrationsOnly: toValue(testAdministrationsOnly), queryOptions });

  // Fetch the user claims - ensure it reacts to queryOptions.enabled
  const { data: userClaims } = useUserClaimsQuery({
    queryKey: [USER_CLAIMS_QUERY_KEY],
    enabled: computed(() => toValue(queryOptions?.enabled ?? true)), // Pass enabled as a computed ref
  });
  console.log('useAdministrationsListQuery - User Claims Data:', userClaims.value);

  // Cast the result to the defined interface
  const userTypeInfo = useUserType(userClaims) as UserTypeInfo;
  const isSuperAdmin = userTypeInfo.isSuperAdmin;
  const exhaustiveAdministrationOrgs = computed(() => userClaims.value?.claims?.adminOrgs);

  // Ensure all necessary data is loaded before enabling the query.
  const claimsLoaded = computed(() => {
    const loaded = !_isEmpty(userClaims?.value?.claims);
    console.log('useAdministrationsListQuery - claimsLoaded computed:', loaded, 'Based on:', userClaims?.value?.claims);
    return loaded;
  });

  // Directly compute the final enabled state
  const finalEnabled = computed(() => {
    const passedEnabled = toValue(queryOptions?.enabled ?? true);
    const isEnabled = passedEnabled && claimsLoaded.value;
    console.log(`useAdministrationsListQuery - finalEnabled computed: ${isEnabled} (passedEnabled: ${passedEnabled}, claimsLoaded: ${claimsLoaded.value})`);
    return isEnabled;
  });

  // Build query key, based on whether or not we only fetch test administrations.
  const queryKey = computed(() =>
    toValue(testAdministrationsOnly)
      ? [ADMINISTRATIONS_LIST_QUERY_KEY, 'test-data', orderBy]
      : [ADMINISTRATIONS_LIST_QUERY_KEY, orderBy],
  );

  return useQuery({
    queryKey,
    queryFn: () => {
      console.log('useAdministrationsListQuery - Query Function (queryFn) IS RUNNING!');
      return administrationPageFetcher(
        isSuperAdmin,
        exhaustiveAdministrationOrgs,
        toValue(testAdministrationsOnly),
        orderBy
      );
    },
    // Use the directly computed reactive ref for enabled state
    enabled: finalEnabled,
    // Pass other options, ensuring enabled isn't duplicated if computeQueryOverrides was modifying them
    ...(queryOptions ?? {}),
  });
};

export default useAdministrationsListQuery; 