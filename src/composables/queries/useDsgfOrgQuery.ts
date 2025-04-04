import { toValue, Ref } from 'vue';
import { useQuery, UseQueryOptions } from '@tanstack/vue-query';
import { DSGF_ORGS_QUERY_KEY } from '@/constants/queryKeys';
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
import { fetchTreeOrgs } from '@/helpers/query/orgs';

interface Organization {
  id: string;
  name: string;
  type: string;
  [key: string]: any;
}

interface AssignedOrgs {
  districts?: string[];
  schools?: string[];
  groups?: string[];
  families?: string[];
  [key: string]: any;
}

type QueryOptions = {
  enabled?: boolean;
  [key: string]: any;
} & Partial<UseQueryOptions<Organization[], Error>>;

/**
 * District School Groups Families (DSGF) Orgs query.
 *
 * @TODO: Decouple the assignedOrgs from the query parameter, ideally letting this query request that data
 * independently. This would allow the query to be more flexible and reusable, but currently not a hard requirement.
 *
 * @param {Ref<string> | string} administrationId – The ID of the administration to fetch DSGF orgs for.
 * @param {AssignedOrgs} assignedOrgs – The orgs assigned to the current administration.
 * @param {QueryOptions|undefined} queryOptions – Optional TanStack query options.
 * @returns The TanStack query result.
 */
const useDsgfOrgQuery = (
  administrationId: Ref<string> | string,
  assignedOrgs: AssignedOrgs,
  queryOptions: QueryOptions | undefined = undefined
) => {
  // Ensure all necessary data is available before enabling the query.
  const conditions = [() => !!toValue(administrationId)];
  const { isQueryEnabled, options } = computeQueryOverrides(conditions, queryOptions);

  return useQuery<Organization[], Error>({
    queryKey: [DSGF_ORGS_QUERY_KEY, toValue(administrationId)],
    queryFn: async () => {
      const orgs = await fetchTreeOrgs(toValue(administrationId), assignedOrgs);
      return orgs as Organization[];
    },
    enabled: isQueryEnabled,
    ...options,
  });
};

export default useDsgfOrgQuery; 