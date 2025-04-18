import { computed, toValue } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import type { UseQueryReturnType, QueryKey, QueryOptions } from '@tanstack/vue-query';
import _isEmpty from 'lodash/isEmpty';
// @ts-ignore - JS Helper
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
// @ts-ignore - JS Helper
import { orgFetcher } from '@/helpers/query/orgs';
// @ts-ignore - JS Composable
import useUserType from '@/composables/useUserType';
// @ts-ignore - JS Composable
import useUserClaimsQuery from '@/composables/queries/useUserClaimsQuery';
import { SCHOOL_CLASSES_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

// --- Interfaces & Types ---

// Reuse or adapt from previous queries
interface UserClaimsData {
    claims?: {
        minimalAdminOrgs?: Record<string, any>;
    };
}

interface UserTypeResult {
    isSuperAdmin: boolean;
}

// Basic structure for a class list item
interface ClassListItem {
    id: string;
    name?: string;
    // Add other relevant class fields returned by orgFetcher
    [key: string]: any;
}

/**
 * School Classes query.
 *
 * Query designed to fetch the classes of a given school.
 *
 * @param schoolId – A Vue ref containing the ID of the school to fetch classes for.
 * @param queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useSchoolClassesQuery = (
    schoolId: Ref<string | null | undefined>, // Allow null/undefined
    queryOptions: any = undefined // Use any due to helper complexity
): UseQueryReturnType<ClassListItem[], Error> => {

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
  // Condition includes checking if schoolId has a value
  const queryConditions = [() => !!toValue(schoolId), () => claimsLoaded.value];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions ?? {});

  // Compute query key dynamically
  const queryKey: ComputedRef<QueryKey> = computed(() => [
      SCHOOL_CLASSES_QUERY_KEY, 
      toValue(schoolId) // Use the unwrapped value in the key
  ]);

  return useQuery<ClassListItem[], Error>({
    queryKey,
    // Assuming orgFetcher returns Promise<ClassListItem[]>
    queryFn: (): Promise<ClassListItem[]> => 
        orgFetcher(
            FIRESTORE_COLLECTIONS.CLASSES, 
            toValue(schoolId), // Pass unwrapped ID
            isSuperAdmin, 
            administrationOrgs // Pass computed ref
            // No select fields specified in original JS, pass undefined or omit
        ),
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useSchoolClassesQuery; 