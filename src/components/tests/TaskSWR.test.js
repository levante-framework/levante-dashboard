import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive, ref } from 'vue';
import { logger } from '@/logger';
import TaskSWR from '../tasks/TaskSWR.vue';

const startAssessment = vi.fn().mockResolvedValue({
  _taskInfo: { variantParams: {} },
});

const selectedAssignmentRef = ref(null);
const userDataRef = ref({ birthMonth: 6, birthYear: 2015 });
const isLoadingUserDataRef = ref(false);

const mockAssignmentsStore = {
  selectedAssignment: selectedAssignmentRef,
  setHomeRefresh: vi.fn(),
};

const mockAuthStore = reactive({
  $subscribe: vi.fn(),
  roarfirekit: ref({
    restConfig: true,
    startAssessment,
  }),
  getUserId: vi.fn(() => 'user-1'),
  isFirekitInit: vi.fn(() => true),
});

const routerPush = vi.fn();

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerPush,
    go: vi.fn(),
  }),
}));

vi.mock('@/store/assignments', () => ({
  useAssignmentsStore: vi.fn(() => mockAssignmentsStore),
}));

vi.mock('@/store/auth', () => ({
  useAuthStore: vi.fn(() => mockAuthStore),
}));

vi.mock('@/composables/queries/useUserChildDataQuery', () => ({
  default: vi.fn(() => ({
    isLoading: isLoadingUserDataRef,
    data: userDataRef,
  })),
}));

vi.mock('@/composables/mutations/useCompleteAssessmentMutation', () => ({
  default: vi.fn(() => ({
    mutateAsync: vi.fn(),
  })),
}));

vi.mock('@/logger', () => ({
  logger: {
    error: vi.fn(),
    capture: vi.fn(),
  },
}));

vi.mock('@bdelab/roar-swr', () => ({
  default: vi.fn().mockImplementation(() => ({
    run: vi.fn().mockReturnValue(new Promise(() => {})),
  })),
}));

vi.mock('@bdelab/roar-swr/lib/resources/roar-swr.css', () => ({}));

async function mountTaskSWR(props = {}) {
  const wrapper = mount(TaskSWR, {
    props: {
      taskId: 'swr',
      ...props,
    },
  });
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
  document.body.innerHTML = '';
  selectedAssignmentRef.value = null;
  userDataRef.value = { birthMonth: 6, birthYear: 2015 };
  isLoadingUserDataRef.value = false;
  mockAuthStore.isFirekitInit.mockReturnValue(true);
  startAssessment.mockResolvedValue({
    _taskInfo: { variantParams: {} },
  });
});

describe('TaskSWR.vue', () => {
  describe('startTask', () => {
    it('should not start the task when there is no selected assignment', async () => {
      selectedAssignmentRef.value = null;

      const wrapper = await mountTaskSWR();

      expect(startAssessment).not.toHaveBeenCalled();
      wrapper.unmount();
    });

    it('should not start the task when other launch conditions are met but selectedAssignment is null', async () => {
      selectedAssignmentRef.value = null;
      isLoadingUserDataRef.value = false;
      mockAuthStore.isFirekitInit.mockReturnValue(true);

      const wrapper = await mountTaskSWR();
      await flushPromises();

      expect(startAssessment).not.toHaveBeenCalled();
      wrapper.unmount();
    });

    it('should start the task when selectedAssignment is present', async () => {
      selectedAssignmentRef.value = { id: 'assignment-1', assessments: [{ taskId: 'swr' }] };

      const wrapper = await mountTaskSWR();

      expect(startAssessment).toHaveBeenCalledWith('assignment-1', 'swr', expect.any(String));
      // The launch event fires only once the game has rendered.
      document.body.innerHTML = '<div class="jspsych-content-wrapper"></div>';
      await vi.waitFor(() =>
        expect(logger.capture).toHaveBeenCalledWith('Task Launched', {
          adminId: 'assignment-1',
          taskId: 'swr',
        }),
      );
      wrapper.unmount();
    });

    it('should start the task when selectedAssignment is set after mount', async () => {
      selectedAssignmentRef.value = null;

      const wrapper = await mountTaskSWR();

      expect(startAssessment).not.toHaveBeenCalled();

      selectedAssignmentRef.value = { id: 'assignment-1', assessments: [{ taskId: 'swr' }] };
      await flushPromises();

      expect(startAssessment).toHaveBeenCalledWith('assignment-1', 'swr', expect.any(String));
      // The launch event fires only once the game has rendered.
      document.body.innerHTML = '<div class="jspsych-content-wrapper"></div>';
      await vi.waitFor(() =>
        expect(logger.capture).toHaveBeenCalledWith('Task Launched', {
          adminId: 'assignment-1',
          taskId: 'swr',
        }),
      );
      wrapper.unmount();
    });

    it('should not record a launch before the game renders', async () => {
      selectedAssignmentRef.value = { id: 'assignment-1', assessments: [{ taskId: 'swr' }] };

      const wrapper = await mountTaskSWR();

      // startAssessment resolved, but the game has not rendered yet.
      expect(startAssessment).toHaveBeenCalledWith('assignment-1', 'swr', expect.any(String));
      expect(logger.capture).not.toHaveBeenCalled();

      // Let the game render so the poll clears its interval.
      document.body.innerHTML = '<div class="jspsych-content-wrapper"></div>';
      await vi.waitFor(() => expect(logger.capture).toHaveBeenCalled());
      wrapper.unmount();
    });

    it('returns home without starting when the task is not on the assignment', async () => {
      selectedAssignmentRef.value = {
        id: 'assignment-1',
        assessments: [{ taskId: 'caregiver-survey' }],
      };

      const wrapper = await mountTaskSWR();

      expect(startAssessment).not.toHaveBeenCalled();
      expect(routerPush).toHaveBeenCalledWith({ name: 'Home' });
      expect(mockAssignmentsStore.setHomeRefresh).toHaveBeenCalled();
      expect(logger.capture).toHaveBeenCalledWith('Task not on assignment', {
        administrationId: 'assignment-1',
        taskId: 'swr',
      });
      expect(logger.error).not.toHaveBeenCalled();
      wrapper.unmount();
    });

    it('returns home without the refresh alert when start reports the task is missing', async () => {
      selectedAssignmentRef.value = {
        id: 'assignment-1',
        assessments: [{ taskId: 'swr' }],
      };
      startAssessment.mockRejectedValue({ code: 'functions/not-found' });
      vi.stubGlobal('alert', vi.fn());

      const wrapper = await mountTaskSWR();
      await flushPromises();

      expect(window.alert).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
      expect(routerPush).toHaveBeenCalledWith({ name: 'Home' });
      wrapper.unmount();
      vi.unstubAllGlobals();
    });
  });
});
