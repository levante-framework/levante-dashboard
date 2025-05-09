import { useQuery } from '@tanstack/vue-query';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/store/auth';
import { computeQueryOverrides } from '@/helpers/computeQueryOverrides';
import { fetchDocById } from '@/helpers/query/utils';
import { USER_CLAIMS_QUERY_KEY } from '@/constants/queryKeys';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';
import { isDevMode, isTestUser, getMockUserClaims } from '@/helpers/mockDataProvider';

/**
 * Safe user claims query that handles emulator mode
 * @returns {object} The user's claims from Firestore or a mock object in emulator mode
 */
export default function useUserClaimsQuery() {
  const authStore = useAuthStore();
  const { uid } = storeToRefs(authStore);

  return useQuery({
    queryKey: ['userClaims', uid],
    queryFn: async ({ queryKey }) => {
      const [_, userId] = queryKey;
      
      // If we're in development mode and using the test user, return mock data
      if (isDevMode() && isTestUser(userId)) {
        console.log('Using mock claims for emulator test user from mockDataProvider');
        return getMockUserClaims();
      }
      
      // If there's no userId, return null
      if (!userId) {
        return null;
      }
      
      try {
        // Try to fetch the document from Firestore (or emulator in dev mode)
        console.log('Fetching user claims from Firestore:', userId);
        const result = await fetchDocById('userClaims', userId);
        console.log('User claims result:', result);
        return result;
      } catch (error) {
        console.error('Error in useUserClaimsQuery:', error);
        
        // If in dev mode and this is the test user, return mock data as fallback
        if (isDevMode() && isTestUser(userId)) {
          console.log('Error fetching user claims, returning mock data for test user');
          return getMockUserClaims();
        }
        
        throw error;
      }
    },
    enabled: !!uid.value, // Only run the query if uid exists
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}
