import * as VueQuery from '@tanstack/vue-query';
import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRouter } from 'vue-router';
import { APP_ROUTES } from '@/constants/routes';
import { useAssignmentsStore } from '@/store/assignments';
import { useAuthStore } from '@/store/auth';
import { useLevanteStore } from '@/store/levante';
import { useSurveyStore } from '@/store/survey';
import { withSetup } from '@/test-support/withSetup.js';
import useLogoutMutation from './useLogoutMutation';

vi.mock('vue-router', () => ({
  useRouter: vi.fn(),
}));

vi.mock('@/store/auth', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('@/store/assignments', () => ({
  useAssignmentsStore: vi.fn(),
}));

vi.mock('@/store/levante', () => ({
  useLevanteStore: vi.fn(),
}));

vi.mock('@/store/survey', () => ({
  useSurveyStore: vi.fn(),
}));

describe('useLogoutMutation', () => {
  let queryClient: VueQuery.QueryClient;
  let resolveLogout: () => void;

  beforeEach(() => {
    queryClient = new VueQuery.QueryClient({ defaultOptions: { mutations: { retry: false } } });
    vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(useAuthStore).mockReturnValue({
      logout: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveLogout = resolve;
          }),
      ),
      $reset: vi.fn(),
      initFirekit: vi.fn(),
    } as unknown as ReturnType<typeof useAuthStore>);
    vi.mocked(useAssignmentsStore).mockReturnValue({ $reset: vi.fn() } as unknown as ReturnType<
      typeof useAssignmentsStore
    >);
    vi.mocked(useLevanteStore).mockReturnValue({ $reset: vi.fn() } as unknown as ReturnType<typeof useLevanteStore>);
    vi.mocked(useSurveyStore).mockReturnValue({ reset: vi.fn() } as unknown as ReturnType<typeof useSurveyStore>);
  });

  afterEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('redirects to login only after logout resolves', async () => {
    const [result] = withSetup(() => useLogoutMutation(), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    const pending = result.mutateAsync();
    await flushPromises();

    expect(useAuthStore().logout).toHaveBeenCalledOnce();
    expect(useRouter().push).not.toHaveBeenCalled();

    resolveLogout();
    await pending;

    expect(useAuthStore().$reset).toHaveBeenCalledOnce();
    expect(useRouter().push).toHaveBeenCalledOnce();
    expect(useRouter().push).toHaveBeenCalledWith({ path: APP_ROUTES.LOGIN });
  });

  it('hard-redirects to login without re-initializing Firekit when logout fails', async () => {
    const assignSpy = vi.spyOn(window.location, 'assign').mockImplementation(() => {});
    const initFirekit = vi.fn();
    vi.mocked(useAuthStore).mockReturnValue({
      logout: vi.fn().mockRejectedValue(new Error('sign-out failed')),
      $reset: vi.fn(),
      initFirekit,
    } as unknown as ReturnType<typeof useAuthStore>);

    const [result] = withSetup(() => useLogoutMutation(), {
      plugins: [[VueQuery.VueQueryPlugin, { queryClient }]],
    });

    await expect(result.mutateAsync()).rejects.toThrow('sign-out failed');

    // Local session is still torn down, but Firekit is NOT re-initialized (that would resurrect
    // the live Firebase session), and we hard-redirect rather than client-navigate.
    expect(useAuthStore().$reset).toHaveBeenCalledOnce();
    expect(initFirekit).not.toHaveBeenCalled();
    expect(assignSpy).toHaveBeenCalledWith(APP_ROUTES.LOGIN);
    expect(useRouter().push).not.toHaveBeenCalled();

    assignSpy.mockRestore();
  });
});
