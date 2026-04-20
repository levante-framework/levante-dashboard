import { ORG_MUTATION_KEY } from '@/constants/queryKeys';
import { groupsRepository } from '@/firebase/repositories/GroupsRepository';
import { CreateOrgType } from '@levante-framework/levante-zod';
import { useMutation } from '@tanstack/vue-query';

const useUpsertOrgMutation = () => {
  return useMutation<void, Error, CreateOrgType>({
    mutationKey: [ORG_MUTATION_KEY],
    mutationFn: async (data: CreateOrgType): Promise<void> => {
      await groupsRepository.upsertOrg(data);
    },
    onError: (err, newOrgData) => {
      console.error('Error upserting org:', err, newOrgData);
    },
  });
};

export default useUpsertOrgMutation;
