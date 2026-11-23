import * as VueQuery from '@tanstack/vue-query';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';
import ListGroups from '../groups/ListGroups.vue';

const state = vi.hoisted(() => ({
  orgs: [],
  superAdmin: true,
  setCurrentSite: vi.fn(),
  routerPush: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: state.routerPush,
    currentRoute: ref({ name: 'ListGroups', path: '/list-groups', fullPath: '/list-groups' }),
  }),
}));

vi.mock('@bdelab/roar-utils', () => ({ default: {} }));

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({}),
}));

vi.mock('@/store/auth', () => ({
  useAuthStore: vi.fn(() => ({
    $subscribe: vi.fn(),
    roarfirekit: ref({ restConfig: true }),
    isUserSuperAdmin: () => state.superAdmin,
    setCurrentSite: state.setCurrentSite,
    userData: state.userData,
    currentSite: ref('test-site'),
    shouldUsePermissions: ref(false),
    userClaims: ref({ useNewPermissions: false, siteRoles: {} }),
  })),
}));

vi.mock('@/composables/queries/useUserClaimsQuery', () => ({
  default: () => ({ data: ref({ useNewPermissions: false, siteRoles: {} }) }),
}));

vi.mock('@/composables/queries/_useDistrictsQuery', () => ({
  default: () => ({ data: ref([]), isLoading: ref(false) }),
}));

vi.mock('@/composables/queries/_useSchoolsQuery', () => ({
  default: () => ({ data: ref([]), isLoading: ref(false) }),
}));

vi.mock('@/composables/queries/useOrgsTableQuery', () => ({
  default: () => ({
    isLoading: ref(false),
    isFetching: ref(false),
    data: computed(() => state.orgs),
    isError: ref(false),
    error: ref(null),
  }),
}));

vi.mock('@/composables/queries/useAdministrationsListQuery', () => ({
  useFullAdministrationsListQuery: () => ({
    isLoading: ref(false),
    isFetching: ref(false),
    data: ref({ administrations: [] }),
    isError: ref(false),
    error: ref(null),
  }),
}));

vi.mock('@/composables/queries/useGetOrgInformationStatusQuery', () => ({
  useGetOrgInformationStatusQuery: () => ({
    data: state.statusData,
    isLoading: state.statusLoading,
  }),
}));

vi.mock('@/helpers/query/users', () => ({
  fetchUsersByOrg: vi.fn(async () => []),
  countUsersByOrg: vi.fn(async () => 0),
}));

vi.mock('@/components/PermissionGuard.vue', () => ({
  default: { name: 'PermissionGuard', template: '<div><slot /></div>' },
}));

vi.mock('@/components/EditOrgsForm.vue', () => ({
  default: { name: 'EditOrgsForm', template: '<div />' },
}));

vi.mock('@/components/modals/RoarModal.vue', () => ({
  default: { name: 'RoarModal', template: '<div><slot /></div>' },
}));

vi.mock('@/components/modals/AddGroupModal.vue', () => ({
  default: { name: 'AddGroupModal', template: '<div />' },
}));

vi.mock('@/components/modals/GroupAssignmentsModal.vue', () => ({
  default: { name: 'GroupAssignmentsModal', template: '<div />' },
}));

vi.mock('@/components/RoarDataTable.vue', () => ({
  default: {
    name: 'RoarDataTable',
    props: ['data', 'columns'],
    template: '<div class="roar-data-table" />',
  },
}));

function statusOf(orgType, progressByOrgId) {
  return {
    orgType,
    results: Object.entries(progressByOrgId).map(([orgId, progress]) => ({ orgId, progress })),
  };
}

function informationAction(wrapper) {
  const rows = wrapper.getComponent({ name: 'RoarDataTable' }).props('data');
  return rows[0]?.actions?.find((action) => action.name === 'information');
}

async function mountPage() {
  const wrapper = mount(ListGroups, {
    global: {
      directives: { tooltip: () => {} },
      plugins: [VueQuery.VueQueryPlugin, PrimeVue],
      stubs: { RouterLink: true },
    },
  });
  await flushPromises();
  return wrapper;
}

describe('ListGroups org information actions', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    state.orgs = [];
    state.superAdmin = true;
    state.userData = ref({ roles: [{ role: 'super_admin' }] });
    state.statusData = ref(undefined);
    state.statusLoading = ref(false);
    state.setCurrentSite.mockClear();
    state.routerPush.mockClear();
  });

  it('shows a pulsing icon for a site that has not started, and opens that site', async () => {
    state.orgs = [{ id: 'site-2', name: 'North' }];
    state.statusData = ref(statusOf('site', { 'site-2': 'not-started' }));

    const wrapper = await mountPage();
    const action = informationAction(wrapper);

    expect(action).toMatchObject({ icon: 'pi pi-info-circle', status: 'error', pulse: true });
    action.callback();

    expect(state.setCurrentSite).toHaveBeenCalledWith('site-2', 'North');
    expect(state.routerPush).toHaveBeenCalledWith({
      name: 'SurveyFormPreview',
      params: { formType: 'site' },
      query: { orgId: 'site-2' },
    });
  });

  it('shows an eye when the site information is complete, and opens the read-only view', async () => {
    state.orgs = [{ id: 'site-2', name: 'North' }];
    state.statusData = ref(statusOf('site', { 'site-2': 'complete' }));

    const wrapper = await mountPage();
    const action = informationAction(wrapper);

    expect(action).toMatchObject({
      icon: 'pi pi-eye',
      status: 'success',
      tooltip: 'Information for this site is complete',
    });
    action.callback();

    expect(state.setCurrentSite).toHaveBeenCalledWith('site-2', 'North');
    expect(state.routerPush).toHaveBeenCalledWith({
      name: 'OrgInformationView',
      params: { formType: 'site' },
      query: { orgId: 'site-2' },
    });
  });

  it('opens a complete school view without changing the navbar site', async () => {
    state.orgs = [{ id: 'school-1', name: 'Alpha' }];
    state.statusData = ref(statusOf('school', { 'school-1': 'complete' }));

    const wrapper = await mountPage();
    await wrapper.findAll('.p-tab')[1].trigger('click');
    await flushPromises();

    const action = informationAction(wrapper);
    expect(action).toMatchObject({ icon: 'pi pi-eye', tooltip: 'Information for this school is complete' });
    action.callback();

    expect(state.setCurrentSite).not.toHaveBeenCalled();
    expect(state.routerPush).toHaveBeenCalledWith({
      name: 'OrgInformationView',
      params: { formType: 'school' },
      query: { orgId: 'school-1' },
    });
  });

  it('shows a spinner while the status is loading', async () => {
    state.orgs = [{ id: 'site-2', name: 'North' }];
    state.statusLoading = ref(true);

    const wrapper = await mountPage();

    expect(informationAction(wrapper)).toMatchObject({ icon: 'pi pi-spinner pi-spin' });
  });

  it('opens the clicked school without changing the navbar site', async () => {
    state.orgs = [{ id: 'school-1', name: 'Alpha' }];
    state.statusData = ref(statusOf('school', { 'school-1': 'incomplete' }));

    const wrapper = await mountPage();
    await wrapper.findAll('.p-tab')[1].trigger('click');
    await flushPromises();

    const action = informationAction(wrapper);
    expect(action).toMatchObject({ icon: 'pi pi-info-circle', pulse: true, tooltip: 'School information is missing' });
    action.callback();

    expect(state.setCurrentSite).not.toHaveBeenCalled();
    expect(state.routerPush).toHaveBeenCalledWith({
      name: 'SurveyFormPreview',
      params: { formType: 'school' },
      query: { orgId: 'school-1' },
    });
  });

  it('shows the info icon without the edit icon for a site admin', async () => {
    state.superAdmin = false;
    state.userData = ref({ roles: [{ role: 'site_admin', siteId: 'test-site' }] });
    state.orgs = [{ id: 'site-2', name: 'North' }];
    state.statusData = ref(statusOf('site', { 'site-2': 'incomplete' }));

    const wrapper = await mountPage();
    const actions = wrapper.getComponent({ name: 'RoarDataTable' }).props('data')[0].actions;

    expect(actions.map((action) => action.name)).toEqual(['information']);
  });

  it('hides the info icon when the site admin role belongs to another site', async () => {
    state.superAdmin = false;
    state.userData = ref({ roles: [{ role: 'site_admin', siteId: 'other-site' }] });
    state.orgs = [{ id: 'site-2', name: 'North' }];
    state.statusData = ref(statusOf('site', { 'site-2': 'not-started' }));

    const wrapper = await mountPage();
    const actions = wrapper.getComponent({ name: 'RoarDataTable' }).props('data')[0].actions;

    expect(actions.map((action) => action.name)).not.toContain('information');
  });

  it('does not show an information icon on the classes tab', async () => {
    state.orgs = [{ id: 'class-1', name: 'Class One' }];

    const wrapper = await mountPage();
    await wrapper.findAll('.p-tab')[2].trigger('click');
    await flushPromises();

    const actions = wrapper.getComponent({ name: 'RoarDataTable' }).props('data')[0].actions;
    expect(actions.map((action) => action.name)).toEqual(['edit']);
  });
});
