import type { CreateOrgType } from '@levante-framework/levante-zod';
import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { ORG_MUTATION_KEY, SITE_OVERVIEW_QUERY_KEY } from '@/constants/queryKeys';
import { groupsRepository } from '@/firebase/repositories/GroupsRepository';
import { logger } from '@/logger';

const useUpsertOrgMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, CreateOrgType>({
    mutationKey: [ORG_MUTATION_KEY],
    mutationFn: async (data: CreateOrgType): Promise<void> => {
      await groupsRepository.upsertOrg(data);
    },
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: [SITE_OVERVIEW_QUERY_KEY, data.siteId] });
    },
    onError: (err, newOrgData) => {
      logger.error(new Error('Failed to upsert org', { cause: err }), {
        tags: { function: 'useUpsertOrgMutation' },
        siteId: newOrgData.siteId,
        type: newOrgData.type,
      });
    },
  });
};

export default useUpsertOrgMutation;
