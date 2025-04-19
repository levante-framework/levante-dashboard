import { ref, nextTick, type Ref } from 'vue';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTestingPinia, type TestingPinia } from '@pinia/testing';
import {
  QueryClient,
  VueQueryPlugin,
  useQuery,
  type UseQueryOptions,
} from '@tanstack/vue-query';
import { nanoid } from 'nanoid';
import { withSetup } from '@/test-support/withSetup';
import { useAuthStore } from '@/store/auth';
import { fetchSubcollection } from '@/helpers/query/utils';
import useSurveyResponsesQuery from './useSurveyResponsesQuery';

// --- Mocks ---
const mockFetchSubcollection = vi.fn().mockResolvedValue([]);
const mockUseQuery = vi.fn();

vi.mock('@/helpers/query/utils', () => ({
  fetchSubcollection: mockFetchSubcollection,
}));

// Simplified vue-query mock
vi.mock('@tanstack/vue-query', async (importOriginal) => {
  mockUseQuery.mockImplementation(() => ({ 
    data: ref(null), isLoading: ref(false), isError: ref(false), error: ref(null) 
  })); 
  return {
    useQuery: mockUseQuery,
    QueryClient: (await importOriginal<typeof import('@tanstack/vue-query')>()).QueryClient,
    VueQueryPlugin: (await importOriginal<typeof import('@tanstack/vue-query')>()).VueQueryPlugin,
  };
});

// --- Types ---
interface SurveyResponse {
  id: string;
}

// --- Tests ---
describe('useSurveyResponsesQuery', () => {
  let piniaInstance: TestingPinia;
  let queryClient: QueryClient;

  beforeEach(() => {
    piniaInstance = createTestingPinia({ 
        createSpy: vi.fn, 
        initialState: { auth: { roarUid: null } } // Default state
    });
    queryClient = new QueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('should call query with auth user ID when available', () => {
    const mockUserId = nanoid();
    piniaInstance.state.value.auth = { roarUid: mockUserId }; // Set user ID in mock store

    // Call composable with no arguments
    withSetup(() => useSurveyResponsesQuery(), {
        plugins: [[VueQueryPlugin, { queryClient }]] // Pass VueQuery plugin
        // Pinia is available via createTestingPinia
    });

    // Check useQuery call
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['survey-responses', mockUserId], // Use auth user ID in key
        enabled: expect.objectContaining({ value: true }),
      })
    );
    // Check fetchSubcollection call (assuming queryFn calls it)
    // const queryArgs = mockUseQuery.mock.calls[0][0];
    // queryArgs.queryFn(); // Might need to call queryFn depending on mock
    // expect(mockFetchSubcollection).toHaveBeenCalledWith(`users/${mockUserId}`, 'surveyResponses');
  });

  it('should allow the query to be disabled via the passed query options', () => {
    const mockUserId = nanoid();
    piniaInstance.state.value.auth = { roarUid: mockUserId };
    // Define full options object
    const queryOptions: UseQueryOptions<SurveyResponse[], Error> = { 
      queryKey: ['survey-responses', mockUserId], // Key should match internal logic
      enabled: false 
    }; 

    // Pass ONLY options object, cast to any
    withSetup(() => useSurveyResponsesQuery(queryOptions as any), {
        plugins: [[VueQueryPlugin, { queryClient }]]
    });

    // Check useQuery call
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['survey-responses', mockUserId],
        enabled: expect.objectContaining({ value: false }),
      })
    );
  });

  it('should only fetch data if the roarUid is available', async () => {
    piniaInstance.state.value.auth = { roarUid: null }; // Start with null ID
    const mockUserId = nanoid();
    // Define full options object (attempting to enable)
    const queryOptions: UseQueryOptions<SurveyResponse[], Error> = { 
        queryKey: ['survey-responses', null], // Initial key based on null ID
        enabled: true 
    };

    withSetup(() => useSurveyResponsesQuery(queryOptions as any), {
        plugins: [[VueQueryPlugin, { queryClient }]]
    });

    // Initial check (should be disabled)
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['survey-responses', null],
        enabled: expect.objectContaining({ value: false }),
      })
    );

    // Update store state
    piniaInstance.state.value.auth.roarUid = mockUserId;
    await nextTick();
    // Assume reactivity updates query (might need rerender/invalidation in real test)
    // Check mockUseQuery call args again for updated queryKey and enabled state
  });

  it('should not let queryOptions override the internally computed value (missing roarUid)', async () => {
      piniaInstance.state.value.auth = { roarUid: null };
      const queryOptions: UseQueryOptions<SurveyResponse[], Error> = {
          queryKey: ['survey-responses', null],
          enabled: true,
      };

      withSetup(() => useSurveyResponsesQuery(queryOptions as any), {
          plugins: [[VueQueryPlugin, { queryClient }]]
      });

      expect(mockUseQuery).toHaveBeenCalledWith(
          expect.objectContaining({
              queryKey: ['survey-responses', null],
              enabled: expect.objectContaining({ value: false }),
          })
      );
  });

}); 