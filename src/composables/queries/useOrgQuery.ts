import { computed, type MaybeRef, type Ref, toValue, ref } from 'vue';
import { type UseQueryOptions, type UseQueryReturnType } from '@tanstack/vue-query';

// Import the specific query composables
import useDistrictsQuery from '@/composables/queries/useDistrictsQuery';
import useSchoolsQuery from '@/composables/queries/useSchoolsQuery';
import useClassesQuery from '@/composables/queries/useClassesQuery';
import useGroupsQuery from '@/composables/queries/useGroupsQuery';
import useFamiliesQuery from '@/composables/queries/useFamiliesQuery';

// Import types used by the queries (assuming OrgData for Districts, Schools, Groups)
import type { OrgData } from '@/helpers/query/orgs';
import type { Class } from './useClassesQuery'; // Assuming Class is exported from useClassesQuery
import type { Family } from './useFamiliesQuery'; // Assuming Family is exported from useFamiliesQuery

// Use FIRESTORE_COLLECTIONS values directly
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';
type OrgTypeKey = typeof FIRESTORE_COLLECTIONS[keyof Pick<
    typeof FIRESTORE_COLLECTIONS, 
    'DISTRICTS' | 'SCHOOLS' | 'CLASSES' | 'GROUPS' | 'FAMILIES'
>];

// Define a union type for the possible return values
type OrgQueryResult = 
  | UseQueryReturnType<OrgData[], Error>   // Districts, Schools, Groups
  | UseQueryReturnType<Class[], Error>    // Classes
  | UseQueryReturnType<Family[], Error>;  // Families

// Define a union type for the possible query options
// Use broad types to allow passing options down, casting to any might be needed
type OrgQueryOptions = 
  | UseQueryOptions<OrgData[], Error> 
  | UseQueryOptions<Class[], Error> 
  | UseQueryOptions<Family[], Error>;

/**
 * Org Query
 *
 * Dynamic query composable for fetching org data based on org type.
 *
 * @param {MaybeRef<OrgTypeKey>} orgType – The org type (e.g., 'DISTRICTS', 'SCHOOLS').
 * @param {MaybeRef<string[] | undefined>} orgIds – The array of org IDs to fetch.
 * @param {OrgQueryOptions} [queryOptions] – Optional TanStack query options (passed to underlying query).
 * @returns {OrgQueryResult} The TanStack query result from the corresponding org query.
 */
function useOrgQuery(
  orgType: MaybeRef<OrgTypeKey>,
  orgIds: MaybeRef<string[] | undefined>,
  queryOptions?: OrgQueryOptions
): OrgQueryResult {

  const currentOrgType = computed(() => toValue(orgType));
  // Create a ref from the MaybeRef orgIds, defaulting to empty array
  const orgIdsRef: Ref<string[]> = computed(() => toValue(orgIds) ?? []);

  // We compute which query to run, but the query execution itself is reactive via useQuery
  const orgQuery = computed((): OrgQueryResult => {
    const optionsWithDefault = {
        enabled: true, 
        ...(queryOptions as any),
    };

    // Pass the Ref<string[]> directly
    switch (currentOrgType.value) {
      case FIRESTORE_COLLECTIONS.DISTRICTS: // Use actual values
        return useDistrictsQuery(orgIdsRef, optionsWithDefault as UseQueryOptions<OrgData[], Error>);
      case FIRESTORE_COLLECTIONS.SCHOOLS:
        return useSchoolsQuery(orgIdsRef, optionsWithDefault as UseQueryOptions<OrgData[], Error>);
      case FIRESTORE_COLLECTIONS.CLASSES:
        return useClassesQuery(orgIdsRef, optionsWithDefault as UseQueryOptions<Class[], Error>);
      case FIRESTORE_COLLECTIONS.GROUPS:
        return useGroupsQuery(orgIdsRef, optionsWithDefault as UseQueryOptions<OrgData[], Error>);
      case FIRESTORE_COLLECTIONS.FAMILIES:
        return useFamiliesQuery(orgIdsRef, optionsWithDefault as any); // Keep as any for now
      default:
        // Revert to simple throw
        console.error(`Unsupported org type in useOrgQuery: ${currentOrgType.value}`);
        throw new Error(`Unsupported org type: ${currentOrgType.value}`);
    }
  });

  // Return the computed query result object
  return orgQuery.value;
}

export default useOrgQuery; 