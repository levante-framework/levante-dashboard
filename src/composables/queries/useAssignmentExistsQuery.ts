import { USE_ASSIGNMENT_EXISTS_QUERY_KEY } from '@/constants/queryKeys';
import { normalizeToLowercase } from '@/helpers';
import { fetchAssignmentsByNameAndDistricts } from '@/helpers/query/assignments';
import { useAuthStore } from '@/store/auth';
import { useQuery } from '@tanstack/vue-query';
import { storeToRefs } from 'pinia';
import { Ref } from 'vue';

export default function useAssignmentExistsQuery(name: Ref<string>, districts: Ref<any[]>, adminId: string | null) {
  const authStore = useAuthStore();
  const { currentSite } = storeToRefs(authStore);

  return useQuery({
    enabled: false,
    queryKey: [USE_ASSIGNMENT_EXISTS_QUERY_KEY, name.value, districts.value],
    queryFn: async () => {
      const normalizedName = normalizeToLowercase(name.value);

      const districtIds = districts.value?.map((district) => district?.id);

      if (!districtIds.includes(currentSite.value)) {
        districtIds.push(currentSite.value);
      }

      if (!normalizedName || districtIds.length <= 0) return false;

      const assignments = await fetchAssignmentsByNameAndDistricts(name.value, normalizedName, districtIds, adminId);

      return Array.isArray(assignments) ? assignments?.length > 0 : false;
    },
  });
}
