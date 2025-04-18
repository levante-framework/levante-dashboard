import { computed, toValue } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import type { UseQueryReturnType, QueryKey, QueryOptions } from '@tanstack/vue-query';
import _isEmpty from 'lodash/isEmpty';
// @ts-ignore - JS Helper
import { orgFetcher } from '@/helpers/query/orgs';
// @ts-ignore - JS Helper
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
// @ts-ignore - JS Composable
import useUserType from '@/composables/useUserType';
// @ts-ignore - JS Composable
import useUserClaimsQuery from '@/composables/queries/useUserClaimsQuery';
import { DISTRICT_SCHOOLS_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

// --- Interfaces & Types ---

// Basic structure for user claims (reuse or adapt from previous)
interface UserClaimsData {
    claims?: {
        minimalAdminOrgs?: Record<string, any>; // Adjust type if org structure is known
        // Add other claim properties
    };
}

// Structure returned by useUserType (reuse or adapt)
interface UserTypeResult {
    isSuperAdmin: boolean;
}

// Basic structure for a school list item, based on 'select' fields
interface SchoolListItem {
    id: string;
    name?: string;
    tags?: any[]; // Type more specifically if possible
    currentActivationCode?: string;
    lowGrade?: string | number; // Or specific grade type
    [key: string]: any;
}

/**
 * District Schools query.
 *
 * Query designed to fetch the schools of a given district.
 *
 * @param districtId – A Vue ref containing the ID of the district to fetch schools for.
 * @param queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useDistrictSchoolsQuery = (
    districtId: Ref<string | null | undefined>, // Allow null/undefined
    queryOptions: any = undefined // Use any due to helper complexity
): UseQueryReturnType<SchoolListItem[], Error> => {

  const initialEnabled = queryOptions?.enabled ?? true;

  // @ts-ignore - JS Composable
  const { data: userClaims } = useUserClaimsQuery({
    enabled: initialEnabled,
  }) as { data: Ref<UserClaimsData | undefined> };

  // @ts-ignore - JS Composable
  const { isSuperAdmin } = useUserType(userClaims) as UserTypeResult;
  
  const administrationOrgs: ComputedRef<Record<string, any> | undefined> = computed(() => 
      userClaims.value?.claims?.minimalAdminOrgs
  );

  const claimsLoaded = computed<boolean>(() => !_isEmpty(userClaims?.value?.claims));
  // Condition includes checking if districtId has a value
  const queryConditions = [() => !!toValue(districtId), () => claimsLoaded.value];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions ?? {});

  // Fields to select for the query.
  const select: string[] = ['name', 'id', 'tags', 'currentActivationCode', 'lowGrade'];

  // Compute query key dynamically
  const queryKey: ComputedRef<QueryKey> = computed(() => [
      DISTRICT_SCHOOLS_QUERY_KEY, 
      toValue(districtId) // Use the unwrapped value in the key
  ]);

  return useQuery<SchoolListItem[], Error>({
    // Use computed queryKey ref
    queryKey,
    // Assuming orgFetcher returns Promise<SchoolListItem[]>
    queryFn: (): Promise<SchoolListItem[]> => 
        orgFetcher(
            FIRESTORE_COLLECTIONS.SCHOOLS, 
            toValue(districtId), // Pass unwrapped ID
            isSuperAdmin, 
            administrationOrgs, // Pass computed ref
            select
        ),
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useDistrictSchoolsQuery; 