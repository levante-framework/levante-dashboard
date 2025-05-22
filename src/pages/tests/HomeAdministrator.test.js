import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref, nextTick } from 'vue';
import { shallowMount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import HomeAdministrator from '@/pages/HomeAdministrator.vue';
import PrimeVue from 'primevue/config';
import useAdministrationsListQuery from '@/composables/queries/useAdministrationsListQuery';

// Mock administration data
const mockAdministrations = [
  {
    id: 'admin-1',
    name: 'Reading Assessment',
    publicName: 'Reading Assessment',
    dates: {
      start: '2025-01-01T00:00:00.000Z',
      end: '2025-01-31T00:00:00.000Z',
      created: '2024-01-01T00:00:00.000Z'
    },
    assessments: [{ taskId: 'task-1', params: {} }],
    assignedOrgs: { groups: ['group-1'] },
    stats: { total: { assignment: { started: 1, completed: 0, assigned: 10 } } }
  },
  {
    id: 'admin-2',
    name: 'Math Assessment',
    publicName: 'Math Assessment',
    dates: {
      start: '2025-02-01T00:00:00.000Z',
      end: '2025-02-28T00:00:00.000Z',
      created: '2024-01-01T00:00:00.000Z'
    },
    assessments: [{ taskId: 'task-2', params: {} }],
    assignedOrgs: { groups: ['group-2'] },
    stats: { total: { assignment: { started: 2, completed: 1, assigned: 20 } } }
  }
];

describe('HomeAdministrator', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    
    // Essential mocks
    vi.mock('@bdelab/roar-utils', () => ({ default: {} }));
    
    vi.mock('@/store/auth', () => ({
      useAuthStore: vi.fn(() => ({
        $subscribe: vi.fn(),
        roarfirekit: ref({ restConfig: true })
      })),
    }));
    
    vi.mock('@/helpers/query/utils', () => ({
      orderByDefault: [{ field: { fieldPath: 'name' }, direction: 'ASCENDING' }]
    }));
    
    vi.mock('@/helpers/query/administrations', () => ({
      getTitle: vi.fn(item => item.name)
    }));
    
    vi.mock('@/composables/queries/useUserClaimsQuery', () => ({
      default: vi.fn(() => ({
        data: ref({
          id: 'test-user-id',
          claims: { super_admin: true }
        })
      }))
    }));
    
    vi.mock('@/composables/useUserType', () => ({
      default: vi.fn(() => ({
        isSuperAdmin: true
      }))
    }));
    
    vi.mock('vue-router', () => ({
      useRouter: () => ({ push: vi.fn() })
    }));
    
    vi.mock('@/composables/queries/useAdministrationsListQuery', () => ({
      default: vi.fn()
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  // Test for the header content
  it('renders page header and description', async () => {
    vi.mocked(useAdministrationsListQuery).mockReturnValue({
      data: ref([]),
      isLoading: ref(false),
      isFetching: ref(false),
      isError: ref(false)
    });

    const wrapper = shallowMount(HomeAdministrator, {
      global: {
        plugins: [PrimeVue],
        stubs: {
          CardAdministration: true,
          PvBlockUI: true,
          PvDataView: true,
          PvButton: true,
          PvAutoComplete: true,
          PvInputGroup: true,
          PvSelect: true,
          AppSpinner: true
        }
      }
    });
    
    await nextTick();
    
    // Check header content
    expect(wrapper.find('.admin-page-header').text()).toBe('All Assignments');
    expect(wrapper.text()).toContain('This page lists all the assignments that are administered to your users');
    expect(wrapper.text()).toContain('You can view and monitor completion and create new bundles of tasks, surveys, and questionnaires to be administered as assignments');
  });
  
  // Loading state test
  it('renders loading state', async () => {
    vi.mocked(useAdministrationsListQuery).mockReturnValue({
      data: ref([]),
      isLoading: ref(true),
      isFetching: ref(false),
      isError: ref(false)
    });

    const wrapper = shallowMount(HomeAdministrator, {
      global: {
        plugins: [PrimeVue],
        stubs: {
          CardAdministration: true,
          AppSpinner: {
            template: '<div class="mocked-spinner">Loading</div>'
          },
          PvBlockUI: true,
          PvDataView: true,
          PvButton: true,
          PvAutoComplete: true,
          PvInputGroup: true,
          PvSelect: true
        }
      }
    });
    
    await nextTick();
    
    expect(wrapper.find('.loading-container').exists()).toBe(true);
    expect(wrapper.find('.mocked-spinner').exists()).toBe(true);
    expect(wrapper.text()).toContain('Fetching Assignments');
  });
  
  // Search functionality test - testing the internal methods directly
  it('filters administrations when search is performed', async () => {
    // Create reactive data references
    const administrations = ref(mockAdministrations);
    
    // Mock the administrations query
    vi.mocked(useAdministrationsListQuery).mockReturnValue({
      data: administrations,
      isLoading: ref(false),
      isFetching: ref(false),
      isError: ref(false)
    });

    // Mount component with mocked stubs
    const wrapper = shallowMount(HomeAdministrator, {
      global: {
        plugins: [PrimeVue],
        stubs: {
          CardAdministration: true,
          PvBlockUI: true,
          PvDataView: true,
          PvButton: true,
          PvAutoComplete: true,
          PvInputGroup: true,
          PvSelect: true,
          AppSpinner: true
        }
      }
    });
    
    await nextTick();
    
    // Since we can't directly set data properties, we'll test the onSearch method
    // by manipulating the underlying refs through the component instance
    wrapper.vm.searchInput = 'Math';
    await wrapper.vm.onSearch();
    
    expect(wrapper.vm.search).toBe('Math');
    expect(wrapper.vm.filteredAdministrations.length).toBe(1);
    expect(wrapper.vm.filteredAdministrations[0].name).toBe('Math Assessment');
    
    // Test clear search
    await wrapper.vm.clearSearch();
    expect(wrapper.vm.search).toBe('');
    expect(wrapper.vm.searchInput).toBe('');
    expect(wrapper.vm.filteredAdministrations.length).toBe(2);
  });
});