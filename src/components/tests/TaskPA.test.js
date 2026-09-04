import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive, ref } from 'vue';
import TaskPA from '../tasks/TaskPA.vue';

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

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
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

vi.mock('@bdelab/roar-pa', () => ({
  default: vi.fn().mockImplementation(() => ({
    run: vi.fn().mockReturnValue(new Promise(() => {})),
  })),
}));

vi.mock('@bdelab/roar-pa/lib/resources/roar-pa.css', () => ({}));

async function mountTaskPA(props = {}) {
  const wrapper = mount(TaskPA, {
    props: {
      taskId: 'pa',
      ...props,
    },
  });
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
  selectedAssignmentRef.value = null;
  userDataRef.value = { birthMonth: 6, birthYear: 2015 };
  isLoadingUserDataRef.value = false;
  mockAuthStore.isFirekitInit.mockReturnValue(true);
  startAssessment.mockResolvedValue({
    _taskInfo: { variantParams: {} },
  });
});

describe('TaskPA.vue', () => {
  describe('startTask', () => {
    it('should not start the task when there is no selected assignment', async () => {
      selectedAssignmentRef.value = null;

      const wrapper = await mountTaskPA();

      expect(startAssessment).not.toHaveBeenCalled();
      wrapper.unmount();
    });

    it('should not start the task when other launch conditions are met but selectedAssignment is null', async () => {
      selectedAssignmentRef.value = null;
      isLoadingUserDataRef.value = false;
      mockAuthStore.isFirekitInit.mockReturnValue(true);

      const wrapper = await mountTaskPA();
      await flushPromises();

      expect(startAssessment).not.toHaveBeenCalled();
      wrapper.unmount();
    });

    it('should start the task when selectedAssignment is present', async () => {
      selectedAssignmentRef.value = { id: 'assignment-1' };

      const wrapper = await mountTaskPA();

      expect(startAssessment).toHaveBeenCalledWith('assignment-1', 'pa', expect.any(String));
      wrapper.unmount();
    });

    it('should start the task when selectedAssignment is set after mount', async () => {
      selectedAssignmentRef.value = null;

      const wrapper = await mountTaskPA();

      expect(startAssessment).not.toHaveBeenCalled();

      selectedAssignmentRef.value = { id: 'assignment-1' };
      await flushPromises();

      expect(startAssessment).toHaveBeenCalledWith('assignment-1', 'pa', expect.any(String));
      wrapper.unmount();
    });
  });
});
