import { ref, nextTick, type Ref } from 'vue';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTestingPinia, type TestingPinia } from '@pinia/testing';
import {
  QueryClient,
  VueQueryPlugin,
  useQuery,
  // Keep UseQueryOptions commented out
  // type UseQueryOptions,
} from '@tanstack/vue-query';
import { nanoid } from 'nanoid';
import { withSetup } from '@/test-support/withSetup';
import { useAuthStore } from '@/store/auth';
import { fetchSubcollection } from '@/helpers/query/utils';
import useSurveyResponsesQuery from './useSurveyResponsesQuery';

// --- Mocks ---
const mockFetchSubcollection = vi.fn().mockResolvedValue([]);
vi.mock('@/helpers/query/utils', () => ({
  fetchSubcollection: mockFetchSubcollection,
}));

const mockUseQuery = vi.fn();
vi.mock('@tanstack/vue-query', async (importOriginal) => {
  const original = await importOriginal<typeof import('@tanstack/vue-query')>();
  mockUseQuery.mockImplementation(original.useQuery);
  return {
    ...original,
    useQuery: mockUseQuery,
  };
});

// --- Types ---
// Placeholder type for the data returned by the query
interface SurveyResponse {
  id: string;
  // Add other relevant properties if known
}

// Assuming the auth store state structure
interface AuthState {
    roarUid: string | null;
    // Add other necessary state properties used by the composable
}

// --- Tests ---
describe('useSurveyResponsesQuery', () => {
  let piniaInstance: TestingPinia;
  let queryClient: QueryClient;

  beforeEach(() => {
    piniaInstance = createTestingPinia({ 
        createSpy: vi.fn, 
        // Set initial state if needed for all tests, otherwise set per test
        initialState: { 
            auth: { roarUid: null } // Assuming 'auth' is the store ID
        }
    });
    queryClient = new QueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  it('should call query with correct parameters when user ID is available', () => {
    const mockUserId = nanoid();
    const authStore = useAuthStore(piniaInstance);
    // Set state directly on the testing pinia instance
    piniaInstance.state.value.auth = { roarUid: mockUserId };

    withSetup(() => useSurveyResponsesQuery(), {
      // Pass Pinia instance potentially via global config or specific option
      global: {
          plugins: [piniaInstance, [VueQueryPlugin, { queryClient }]]
      }
    });

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['survey-responses', mockUserId],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({ value: true }),
    });
    expect(mockFetchSubcollection).toHaveBeenCalledWith(`users/${mockUserId}`, 'surveyResponses');
  });

  it('should correctly control the enabled state via passed query options', async () => {
    const mockUserId = nanoid();
    // Set initial state for the test
    piniaInstance.state.value.auth = { roarUid: mockUserId };

    const enableQuery = ref(false);
    const queryOptions = { enabled: enableQuery };

    withSetup(() => useSurveyResponsesQuery(queryOptions), {
      global: {
        plugins: [piniaInstance, [VueQueryPlugin, { queryClient }]]
      }
    });

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['survey-responses', mockUserId],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({ value: false }),
    });
    expect(mockFetchSubcollection).not.toHaveBeenCalled();

    enableQuery.value = true;
    await nextTick();

    expect(mockFetchSubcollection).toHaveBeenCalledWith(`users/${mockUserId}`, 'surveyResponses');
  });

  it('should only fetch data if the roarUid is available', async () => {
    const mockUserId = nanoid();
    // Start with null roarUid in state
    piniaInstance.state.value.auth = { roarUid: null };

    const queryOptions = { enabled: true };

    withSetup(() => useSurveyResponsesQuery(queryOptions), {
      global: {
        plugins: [piniaInstance, [VueQueryPlugin, { queryClient }]]
      }
    });

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['survey-responses', null],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({ value: false }),
    });
    expect(mockFetchSubcollection).not.toHaveBeenCalled();

    // Update state
    piniaInstance.state.value.auth.roarUid = mockUserId;
    await nextTick(); // Wait for reactivity propagation if necessary

    expect(mockFetchSubcollection).toHaveBeenCalledWith(`users/${mockUserId}`, 'surveyResponses');
  });

  it('should not let queryOptions override the internally computed value (missing roarUid)', async () => {
    // Ensure roarUid is null in state
    piniaInstance.state.value.auth = { roarUid: null }; 
    const queryOptions = { enabled: true };

    withSetup(() => useSurveyResponsesQuery(queryOptions), {
      global: {
        plugins: [piniaInstance, [VueQueryPlugin, { queryClient }]]
      }
    });

    expect(mockUseQuery).toHaveBeenCalledWith({
      queryKey: ['survey-responses', null],
      queryFn: expect.any(Function),
      enabled: expect.objectContaining({ value: false }),
    });
    expect(mockFetchSubcollection).not.toHaveBeenCalled();
  });
}); 