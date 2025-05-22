import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref, nextTick } from 'vue';
import { shallowMount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import HomeAdministrator from '@/pages/HomeAdministrator.vue';
import PrimeVue from 'primevue/config';
import useAdministrationsListQuery from '@/composables/queries/useAdministrationsListQuery';

// Mock administration data for testing HomeAdministrator component
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

// Test suite for the HomeAdministrator component
describe('HomeAdministrator', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    
    // Set up all necessary mocks
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
        
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders static elements before data loads and empty table', async () => {

      vi.mocked(useAdministrationsListQuery).mockReturnValue({
        data: ref([]),
        isLoading: ref(false),
        isFetching: ref(false),
        isError: ref(false),
      });

      const wrapper = mount(HomeAdministrator, { 
            global: { 
                plugins: [VueQuery.VueQueryPlugin, PrimeVue], 
            },
        });

        await nextTick();
        expect(wrapper.text()).toContain('All Assignments');
        expect(wrapper.text()).toContain(
          "This page lists all the assignments that are administered to your users." +
          "You can view and monitor completion and create new bundles of tasks, surveys, and questionnaires to be administered as assignments."
        );
        expect(wrapper.text()).toContain('Search by name');
        expect(wrapper.text()).toContain('Sort by');
        expect(wrapper.text()).not.toContain('Fetching Assignments');
        expect(wrapper.text()).toContain('No Assignments Yet');
        expect(wrapper.text()).toContain('Go create your first assignment to get started');
    });

    it('renders loading state when data is loading', async () => {
      const mockedUseAdministrationsListQuery = vi.mocked(useAdministrationsListQuery);

      mockedUseAdministrationsListQuery.mockReturnValue({
        data: ref([]),
        isLoading: ref(true),
        isFetching: ref(false),
        isError: ref(false),
      });

      const wrapper = mount(HomeAdministrator, {
        global: {
          plugins: [VueQuery.VueQueryPlugin, PrimeVue],
        },
      });

      await nextTick();
      
      expect(wrapper.find('.loading-container').exists()).toBe(true);
      expect(wrapper.find('.levante-spinner-container').exists()).toBe(true);
      expect(wrapper.text()).toContain('Fetching Assignments');
    });


    it('Data table renders with administrations data', async() => {
      vi.mocked(useAdministrationsListQuery).mockReturnValue({
        data: ref([mockAdministration]),
        isLoading: ref(false),
        isFetching: ref(false),
        isError: ref(false),
      });

      const wrapper = mount(HomeAdministrator, { 
        global: { 
          plugins: [VueQuery.VueQueryPlugin, PrimeVue, ConfirmService, ToastService], 
          components: {
            'router-link': { template: '<a></a>' },
          },
          directives: {
            tooltip: {
            },
          },
        },
      });

      await nextTick();

      const card = wrapper.find('[data-cy="h2-card-admin-title"]');
      expect(card.exists()).toBe(true);
      expect(card.text()).toContain('Newest assignment');
    });

    it('Data table search functionality', async () => {
      vi.mocked(useAdministrationsListQuery).mockReturnValue({
        data: ref([mockAdministration]),
        isLoading: ref(false),
        isFetching: ref(false),
        isError: ref(false),
      });

      const wrapper = mount(HomeAdministrator, { 
        global: { 
          plugins: [VueQuery.VueQueryPlugin, PrimeVue, ConfirmService, ToastService], 
          components: {
            'router-link': { template: '<a></a>' },
          },
          directives: {
            tooltip: {},
          },
        },
      });

      await nextTick();

      const searchInput = wrapper.find('[data-cy="search-input"] input');
      expect(searchInput.exists()).toBe(true);

      await searchInput.setValue('New');
      await searchInput.trigger('keyup.enter');
      expect(wrapper.find('[data-cy="h2-card-admin-title"]').text()).toContain("Newest assignment");

      await searchInput.setValue('Fake');
      await searchInput.trigger('keyup.enter');
      expect(wrapper.find('[data-cy="h2-card-admin-title"]').exists()).toBe(false);
      
    });

    it('Data table sort functionality', async () => {
      const mockData = [
        { ...mockAdministration, id:'1', name: 'B Assignment', publicName: "B Assignment" },
        { ...mockAdministration, id: '2', name: 'A Assignment', publicName: "A Assignment" },
      ];

      vi.mocked(useAdministrationsListQuery).mockReturnValue({
        data: ref(mockData),
        isLoading: ref(false),
        isFetching: ref(false),
        isError: ref(false),
      });

      const wrapper = mount(HomeAdministrator, { 
        global: { 
          plugins: [VueQuery.VueQueryPlugin, PrimeVue, ConfirmService, ToastService], 
          components: {
            'router-link': { template: '<a></a>' },
          },
          directives: {
            tooltip: {},
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
});