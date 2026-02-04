import UserActions from '@/components/UserActions.vue';
import * as VueQuery from '@tanstack/vue-query';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PvButton from 'primevue/button';
import PrimeVue from 'primevue/config';
import PvSelect from 'primevue/select';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { createI18n } from 'vue-i18n';
import { createRouter, createMemoryHistory } from 'vue-router';
import { useAuthStore } from '@/store/auth';

vi.mock('@/composables/queries/useUserClaimsQuery', () => ({
  default: vi.fn(() => ({
    data: ref({
      //
    }),
  })),
}));
vi.mock('@/composables/queries/useDistrictsListQuery', () => ({
  default: vi.fn(() => ({
    data: ref([]),
    isLoading: ref(false),
  })),
}));

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      navBar: {
        signOut: 'Sign Out',
      },
    },
  },
});

afterEach(() => {
  vi.restoreAllMocks();
});

beforeEach(() => {
  setActivePinia(createPinia());
});

describe('UserActions', () => {
  it('should redirect user to notion after selecting Report an Issue in the dropdown', async () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => {});
    const authStore = useAuthStore();
    authStore.userData = {
      email: 'test@example.com',
      displayName: 'Test User',
    };
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<div />' } }],
    });
    await router.push('/');
    await router.isReady();

    const wrapper = mount(UserActions, {
      props: {
        isBasicView: false,
      },
      global: {
        plugins: [VueQuery.VueQueryPlugin, PrimeVue, i18n, router],
        components: {
          PvButton,
          PvSelect,
        },
      },
    });

    const selects = wrapper.findAllComponents(PvSelect);
    const helpSelect = selects[0];

    helpSelect.vm.$emit('change', { value: 'reportAnIssue' });

    expect(windowOpenSpy).toHaveBeenCalledWith('https://levante-support.freshdesk.com', '_blank');
  });
});
