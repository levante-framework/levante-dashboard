import * as VueQuery from '@tanstack/vue-query';
import { createPinia, setActivePinia } from 'pinia';
import { mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

let HomeAdministrator;

const mockState = vi.hoisted(() => {
  const { createRequire } = require('node:module');
  const { ref } = createRequire(import.meta.url)('vue');
  return {
    mockCurrentSite: ref('site-1'),
    mockUserData: ref({ displayName: 'Test Admin' }),
    assignmentsData: ref([]),
    assignmentsLoading: ref(false),
    schoolsData: ref([]),
    schoolsLoading: ref(false),
    classesData: ref([]),
    classesLoading: ref(false),
    cohortsData: ref([]),
    cohortsLoading: ref(false),
    usersData: ref([]),
    usersLoading: ref(false),
  };
});

vi.mock('@bdelab/roar-utils', () => ({ default: {} }));

vi.mock('@/store/auth', () => ({
  useAuthStore: vi.fn(() => ({
    $subscribe: vi.fn(),
    currentSite: mockState.mockCurrentSite,
    userData: mockState.mockUserData,
  })),
}));

vi.mock('@/composables/queries/useGetAssignmentsBySiteId', () => ({
  useGetAssignmentsBySiteId: () => ({
    data: mockState.assignmentsData,
    isLoading: mockState.assignmentsLoading,
  }),
}));

vi.mock('@/composables/queries/useGetSchoolsBySiteId', () => ({
  useGetSchoolsBySiteId: () => ({
    data: mockState.schoolsData,
    isLoading: mockState.schoolsLoading,
  }),
}));

vi.mock('@/composables/queries/useGetClassesBySiteId', () => ({
  useGetClassesBySiteId: () => ({
    data: mockState.classesData,
    isLoading: mockState.classesLoading,
  }),
}));

vi.mock('@/composables/queries/useGetCohortsBySiteId', () => ({
  useGetCohortsBySiteId: () => ({
    data: mockState.cohortsData,
    isLoading: mockState.cohortsLoading,
  }),
}));

vi.mock('@/composables/queries/useGetUsersBySiteId', () => ({
  useGetUsersBySiteId: () => ({
    data: mockState.usersData,
    isLoading: mockState.usersLoading,
  }),
}));

vi.mock('@/components/LevanteSpinner.vue', () => ({
  default: {
    name: 'LevanteSpinner',
    template: '<div data-cy="home-admin-spinner" />',
    props: ['fullscreen'],
  },
}));

const mountOptions = {
  global: {
    plugins: [VueQuery.VueQueryPlugin, PrimeVue],
    stubs: {
      RouterLink: {
        props: ['to'],
        template: '<span class="router-link-stub"><slot /></span>',
      },
    },
  },
};

function resetMockState() {
  mockState.mockCurrentSite.value = 'site-1';
  mockState.mockUserData.value = { displayName: 'Test Admin' };
  mockState.assignmentsData.value = [];
  mockState.assignmentsLoading.value = false;
  mockState.schoolsData.value = [];
  mockState.schoolsLoading.value = false;
  mockState.classesData.value = [];
  mockState.classesLoading.value = false;
  mockState.cohortsData.value = [];
  mockState.cohortsLoading.value = false;
  mockState.usersData.value = [];
  mockState.usersLoading.value = false;
}

describe('HomeAdministrator.vue', () => {
  beforeAll(async () => {
    ({ default: HomeAdministrator } = await import('../HomeAdministrator.vue'));
  });

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'));
    resetMockState();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders fullscreen spinner while queries are loading', () => {
    mockState.usersLoading.value = true;

    const wrapper = mount(HomeAdministrator, mountOptions);

    expect(wrapper.find('[data-cy="home-admin-spinner"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('Welcome,');
  });

  it('shows welcome text and display name when loaded', () => {
    const wrapper = mount(HomeAdministrator, mountOptions);

    expect(wrapper.find('[data-cy="home-admin-spinner"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Welcome,');
    expect(wrapper.text()).toContain('Test Admin');
  });

  it('falls back to first middle last when displayName is absent', () => {
    mockState.mockUserData.value = {
      name: { first: 'Ada', middle: 'M', last: 'Lovelace' },
    };

    const wrapper = mount(HomeAdministrator, mountOptions);

    expect(wrapper.text()).toContain('Ada M Lovelace');
  });

  it('when no site is selected, prompts to select a site and shows placeholders for totals', () => {
    mockState.mockCurrentSite.value = 'any';

    const wrapper = mount(HomeAdministrator, mountOptions);

    const siteMessages = wrapper.findAll('.info--site-not-selected');
    expect(siteMessages.length).toBeGreaterThanOrEqual(1);
    expect(wrapper.text()).toContain('Select a site to see stats');

    const totalsRow = wrapper.text();
    const dashSegments = totalsRow.match(/Total:\s*-/g) ?? [];
    expect(dashSegments.length).toBeGreaterThanOrEqual(3);
  });

  it('when a site is selected, shows user type breakdown and totals from query data', () => {
    mockState.usersData.value = [
      { userType: 'teacher' },
      { userType: 'Teacher' },
      { userType: 'parent' },
      { userType: 'student' },
    ];

    const wrapper = mount(HomeAdministrator, mountOptions);

    expect(wrapper.text()).toContain('Teachers');
    expect(wrapper.text()).toContain('Caregivers');
    expect(wrapper.text()).toContain('Children');
    expect(wrapper.text()).toContain('Total:');
    expect(wrapper.text()).toContain('4');
  });

  it('when a site is selected, classifies assignments into open, upcoming, and past buckets', () => {
    mockState.assignmentsData.value = [
      {
        dates: {
          start: '2025-06-01T00:00:00.000Z',
          end: '2025-06-30T23:59:59.999Z',
        },
      },
      {
        dates: {
          start: '2025-07-01T00:00:00.000Z',
          end: '2025-07-31T23:59:59.999Z',
        },
      },
      {
        dates: {
          start: '2025-01-01T00:00:00.000Z',
          end: '2025-05-01T00:00:00.000Z',
        },
      },
    ];

    const wrapper = mount(HomeAdministrator, mountOptions);

    expect(wrapper.text()).toContain('Open Assignments');
    expect(wrapper.text()).toContain('Upcoming Assignments');
    expect(wrapper.text()).toContain('Past Assignments');
    expect(wrapper.text()).toMatch(/1Open Assignments/);
    expect(wrapper.text()).toMatch(/1Upcoming Assignments/);
    expect(wrapper.text()).toMatch(/1Past Assignments/);
    expect(wrapper.text()).toContain('View open');
    expect(wrapper.text()).toContain('View upcoming');
    expect(wrapper.text()).toContain('View closed');
  });

  it('renders sorted schools and class parent school labels when a site is selected', () => {
    mockState.schoolsData.value = [
      { id: 's2', name: 'Beta School' },
      { id: 's1', name: 'Alpha School' },
    ];
    mockState.classesData.value = [{ id: 'c1', name: 'Room 1', schoolId: 's2' }];

    const wrapper = mount(HomeAdministrator, mountOptions);

    expect(wrapper.text()).toContain('Alpha School');
    expect(wrapper.text()).toContain('Beta School');
    expect(wrapper.text()).toContain('Beta School');
    expect(wrapper.text()).toContain('Room 1');

    const userLinks = wrapper.findAll('.group-item-link');
    expect(userLinks.length).toBeGreaterThanOrEqual(2);
  });

  it('shows empty-state copy for schools when none exist', () => {
    mockState.schoolsData.value = [];

    const wrapper = mount(HomeAdministrator, mountOptions);

    expect(wrapper.text()).toContain('There are no schools yet');
  });

  it('shows documentation link with expected href', () => {
    const wrapper = mount(HomeAdministrator, mountOptions);

    const docLink = wrapper.find('[data-cy="docs-button"]');
    expect(docLink.exists()).toBe(true);
    expect(docLink.attributes('href')).toBe('https://researcher.levante-network.org/dashboard/add-users');
  });
});
