import { computed, type MaybeRef, unref, type Ref, type ComputedRef } from 'vue';
import { useQuery, type UseQueryReturnType, type UseQueryOptions } from '@tanstack/vue-query';
import _isEmpty from 'lodash/isEmpty';
import { computeQueryOverrides, type Condition } from '@/helpers/computeQueryOverrides.ts';
import { orgFetcher } from '@/helpers/query/orgs';
import useUserType from '@/composables/useUserType';
import useUserClaimsQuery, { type UserClaimsData } from '@/composables/queries/useUserClaimsQuery.ts';
import { SCHOOL_CLASSES_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';

// Placeholder type for class data within a school context
interface SchoolClassData {
  id: string;
  name?: string;
  // Add other expected class properties
  [key: string]: any;
}

// Use a simpler options type, explicitly omitting enabled
type SchoolClassesQueryOptions = Omit<
  UseQueryOptions<SchoolClassData[], Error, SchoolClassData[], ReadonlyArray<unknown>>,
  'queryKey' | 'queryFn' | 'enabled'
>;

/**
 * School Classes query.
 *
 * Query designed to fetch the classes of a given school.
 *
 * @param {MaybeRef<string | undefined>} schoolId – A Vue ref containing the ID of the school to fetch classes for.
 * @param {MaybeRef<boolean | undefined>} enabled - Explicit enabled state.
 * @param {SchoolClassesQueryOptions | undefined} queryOptions – Optional TanStack query options (excluding enabled).
 * @returns {UseQueryReturnType<SchoolClassData[], Error>} The TanStack query result.
 */
const useSchoolClassesQuery = (
  schoolId: MaybeRef<string | undefined>,
  enabled: MaybeRef<boolean | undefined> = true,
  queryOptions: SchoolClassesQueryOptions = {},
): UseQueryReturnType<SchoolClassData[], Error> => {
  // Fetch the user claims.
  const { data: userClaims } = useUserClaimsQuery({
    enabled: enabled ?? true,
  });

  // Get admin status and administation orgs.
  const { isSuperAdmin } = useUserType(userClaims as Ref<UserClaimsData | null>);
  const administrationOrgs: ComputedRef<Record<string, string[]> | undefined> = computed(
    () => (userClaims.value as UserClaimsData | null)?.claims?.minimalAdminOrgs,
  );

  // Ensure all necessary data is loaded before enabling the query.
  const claimsLoaded = computed(() => !_isEmpty(userClaims.value?.claims));
  const queryConditions: Condition[] = [() => !!unref(schoolId), () => claimsLoaded.value, () => unref(enabled) ?? true];
  const { isQueryEnabled, options } = computeQueryOverrides(queryConditions, queryOptions);

  return useQuery<SchoolClassData[], Error, SchoolClassData[], ReadonlyArray<unknown>>({
    queryKey: [SCHOOL_CLASSES_QUERY_KEY, schoolId],
    queryFn: async (): Promise<SchoolClassData[]> => {
      const currentSchoolId = unref(schoolId);
      if (!currentSchoolId) {
        return Promise.resolve([]);
      }
      const result = await orgFetcher(
        FIRESTORE_COLLECTIONS.CLASSES,
        currentSchoolId,
        isSuperAdmin.value,
        administrationOrgs.value,
        undefined
      );
      return result as SchoolClassData[];
    },
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useSchoolClassesQuery;
