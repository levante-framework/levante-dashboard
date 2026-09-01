import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import Login from '@/pages/Login.vue';

const authRefs = vi.hoisted(() => ({}));

const captured = vi.hoisted(() => ({
  logInWithEmailAndPassword: [],
  initiateLoginWithEmailLink: [],
  googlePopupCalls: 0,
  googleRedirectCalls: 0,
  resetPasswordEmails: [],
  routerPushes: [],
  confirmRequests: [],
}));

const mobileState = vi.hoisted(() => ({ isMobile: false }));

const emailLinkState = vi.hoisted(() => ({ rejectWith: null }));

const loggerErrors = vi.hoisted(() => []);

vi.mock('@/logger', () => ({
  logger: {
    error: (...args) => {
      loggerErrors.push(args);
    },
  },
}));

vi.mock('pinia', async (importOriginal) => {
  const actual = await importOriginal();
  const { ref } = await import('vue');

  Object.assign(authRefs, {
    spinner: ref(false),
    routeToProfile: ref(false),
    ssoProvider: ref(null),
    userClaims: ref(null),
    roarfirekit: ref(null),
  });

  return {
    ...actual,
    storeToRefs: () => ({
      spinner: authRefs.spinner,
      routeToProfile: authRefs.routeToProfile,
      ssoProvider: authRefs.ssoProvider,
      userClaims: authRefs.userClaims,
      roarfirekit: authRefs.roarfirekit,
    }),
  };
});

vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({
    require: (options) => {
      captured.confirmRequests.push(options);
    },
  }),
}));

vi.mock('@/store/auth', () => ({
  useAuthStore: () => ({
    $subscribe: vi.fn(),
    setUserClaims: vi.fn(),
    setUserData: vi.fn(),
    getUserId: () => null,
    isUserAdmin: () => false,
    isUserSuperAdmin: () => false,
    logInWithEmailAndPassword: (args) => {
      captured.logInWithEmailAndPassword.push(args);
      return Promise.resolve();
    },
    initiateLoginWithEmailLink: (args) => {
      captured.initiateLoginWithEmailLink.push(args);
      if (emailLinkState.rejectWith) return Promise.reject(emailLinkState.rejectWith);
      return Promise.resolve();
    },
    signInWithGooglePopup: () => {
      captured.googlePopupCalls += 1;
      return Promise.resolve();
    },
    signInWithGoogleRedirect: () => {
      captured.googleRedirectCalls += 1;
      return Promise.resolve();
    },
  }),
}));

vi.mock('@/store/assignments', () => ({
  useAssignmentsStore: () => ({
    setUserAssignments: vi.fn(),
  }),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: (arg) => {
      captured.routerPushes.push(arg);
    },
  }),
}));

vi.mock('@/constants/routes', () => ({
  APP_ROUTES: {
    HOME: '/',
    SSO: '/sso',
    ACCOUNT_PROFILE: '/profile',
  },
}));

vi.mock('@/helpers', () => ({
  isEmailValid: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  isMobileBrowser: () => mobileState.isMobile,
}));

vi.mock('@/helpers/assignments', () => ({
  sortAssignmentsByDateOpened: vi.fn((x) => x),
}));

vi.mock('@/helpers/query/assignments', () => ({
  getUserAssignments: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/helpers/query/utils', () => ({
  fetchDocById: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/components/LanguageSelector.vue', () => ({
  default: {
    name: 'LanguageSelector',
    template: '<div class="language-selector-stub" />',
  },
}));

const PvInputTextStub = {
  name: 'PvInputText',
  props: ['modelValue'],
  inheritAttrs: false,
  emits: ['update:modelValue', 'blur', 'keydown', 'keyup'],
  template:
    '<input v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @blur="$emit(\'blur\')" @keydown="$emit(\'keydown\', $event)" @keyup="$emit(\'keyup\', $event)" />',
};

const PvPasswordStub = {
  name: 'PvPassword',
  props: ['modelValue'],
  inheritAttrs: false,
  emits: ['update:modelValue', 'blur', 'keydown', 'keyup'],
  template:
    '<input v-bind="$attrs" type="password" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @blur="$emit(\'blur\')" @keydown="$emit(\'keydown\', $event)" @keyup="$emit(\'keyup\', $event)" />',
};

const PvButtonStub = {
  name: 'Button',
  props: ['type', 'disabled', 'label', 'text', 'tabindex'],
  inheritAttrs: false,
  emits: ['click'],
  template:
    '<button :type="type || \'button\'" :disabled="disabled" v-bind="$attrs" @click="$emit(\'click\')"><slot />{{ label }}</button>',
};

describe('Login.vue', () => {
  let wrapper;

  const mountLogin = (options = {}) =>
    mount(Login, {
      global: {
        stubs: {
          AppSpinner: { template: '<div class="app-spinner-stub" />' },
          RoarModal: {
            props: ['isEnabled'],
            template: '<div class="roar-modal-stub" v-if="isEnabled"><slot /><slot name="footer" /></div>',
          },
          InputText: PvInputTextStub,
          Password: PvPasswordStub,
          Button: PvButtonStub,
          Message: { template: '<div class="pv-message-stub"><slot /></div>' },
        },
        mocks: {
          $t: (key) => key,
        },
        ...options.global,
      },
      ...options,
    });

  const switchToResearcherMode = async () => {
    await wrapper
      .findAllComponents(PvButtonStub)
      .find((b) => b.text().includes('pageSignIn.researcherLoginBtn'))
      .trigger('click');
    await nextTick();
  };

  const openTroubleOnSignInModal = async () => {
    await wrapper
      .findAll('small')
      .find((s) => s.text().includes('Trouble logging in?'))
      .trigger('click');
    await nextTick();
  };

  const clickModalButton = async (label) => {
    await wrapper
      .find('.roar-modal-stub')
      .findAll('button')
      .find((b) => b.text().includes(label))
      .trigger('click');
    await nextTick();
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mobileState.isMobile = false;
    captured.logInWithEmailAndPassword.length = 0;
    captured.initiateLoginWithEmailLink.length = 0;
    captured.googlePopupCalls = 0;
    captured.googleRedirectCalls = 0;
    captured.resetPasswordEmails.length = 0;
    captured.routerPushes.length = 0;
    captured.confirmRequests.length = 0;
    emailLinkState.rejectWith = null;
    loggerErrors.length = 0;
    authRefs.spinner.value = false;
    authRefs.routeToProfile.value = false;
    authRefs.ssoProvider.value = null;
    authRefs.userClaims.value = null;
    authRefs.roarfirekit.value = {
      sendPasswordResetEmail: (email) => {
        captured.resetPasswordEmails.push(email);
        return Promise.resolve();
      },
    };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    wrapper?.unmount();
  });

  it('renders participant mode by default', () => {
    wrapper = mountLogin();
    expect(wrapper.find('.login.login--participant').exists()).toBe(true);
    expect(wrapper.text()).toContain('participant');
  });

  it('switches to researcher mode when the researcher button is clicked', async () => {
    wrapper = mountLogin();
    const buttons = wrapper.findAllComponents(PvButtonStub);
    const researcherBtn = buttons.find((b) => b.text().includes('pageSignIn.researcherLoginBtn'));
    expect(researcherBtn).toBeDefined();
    await researcherBtn.trigger('click');
    await nextTick();
    expect(wrapper.find('.login.login--researcher').exists()).toBe(true);
    expect(wrapper.text()).toContain('Log in to access your dashboard');
  });

  it('switches back to participant mode from researcher mode', async () => {
    wrapper = mountLogin();
    await wrapper
      .findAllComponents(PvButtonStub)
      .find((b) => b.text().includes('pageSignIn.researcherLoginBtn'))
      .trigger('click');
    await nextTick();
    await wrapper
      .findAllComponents(PvButtonStub)
      .find((b) => b.text().includes('Participant Login'))
      .trigger('click');
    await nextTick();
    expect(wrapper.find('.login.login--participant').exists()).toBe(true);
  });

  it('shows researcher-only links in researcher mode', async () => {
    wrapper = mountLogin();
    await wrapper
      .findAllComponents(PvButtonStub)
      .find((b) => b.text().includes('pageSignIn.researcherLoginBtn'))
      .trigger('click');
    await nextTick();
    expect(wrapper.text()).toContain('Trouble logging in?');
    expect(wrapper.text()).toContain('Read sign in docs');
    expect(wrapper.text()).toContain('Stanford DCC Sign in');
  });

  it('calls logInWithEmailAndPassword with normalized email when a username is submitted', async () => {
    wrapper = mountLogin();
    await wrapper.find('[data-cy="input-username-email"]').setValue('user.name');
    await wrapper.find('[data-cy="input-password"]').setValue('secret123');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();
    expect(captured.logInWithEmailAndPassword).toEqual([
      {
        email: 'user.name@levante.com',
        password: 'secret123',
      },
    ]);
  });

  it('calls logInWithEmailAndPassword with the email as-is when an email is submitted', async () => {
    wrapper = mountLogin();
    await wrapper.find('[data-cy="input-username-email"]').setValue('user.name@example.com');
    await wrapper.find('[data-cy="input-password"]').setValue('secret123');
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();
    expect(captured.logInWithEmailAndPassword).toEqual([
      {
        email: 'user.name@example.com',
        password: 'secret123',
      },
    ]);
  });

  it('does not call logInWithEmailAndPassword when fields are empty', async () => {
    wrapper = mountLogin();
    await wrapper.find('form').trigger('submit.prevent');
    await flushPromises();
    expect(captured.logInWithEmailAndPassword).toHaveLength(0);
  });

  it('initiates email link login from the trouble logging in modal', async () => {
    wrapper = mountLogin();
    await switchToResearcherMode();
    await openTroubleOnSignInModal();
    await wrapper.find('.roar-modal-stub').findAll('input')[0].setValue('researcher@test.com');
    await clickModalButton('Login Link');
    await flushPromises();
    expect(captured.initiateLoginWithEmailLink).toEqual([{ email: 'researcher@test.com' }]);
    expect(captured.confirmRequests).toHaveLength(1);
    captured.confirmRequests[0].accept();
    expect(captured.routerPushes).toContainEqual({ name: 'Home' });
  });

  it('surfaces the server message and skips Sentry when the email link is for an unregistered address', async () => {
    const notRegistered = new Error('That email is not registered.');
    notRegistered.code = 'levante/email-not-registered';
    emailLinkState.rejectWith = notRegistered;
    wrapper = mountLogin();
    await switchToResearcherMode();
    await openTroubleOnSignInModal();
    await wrapper.find('.roar-modal-stub').findAll('input')[0].setValue('unknown@test.com');
    await clickModalButton('Login Link');
    await flushPromises();
    expect(captured.confirmRequests).toHaveLength(0);
    expect(wrapper.text()).toContain('That email is not registered.');
    expect(loggerErrors).toHaveLength(0);
  });

  it('shows a fallback message and reports to Sentry when the email link request fails unexpectedly', async () => {
    emailLinkState.rejectWith = new Error('network down');
    wrapper = mountLogin();
    await switchToResearcherMode();
    await openTroubleOnSignInModal();
    await wrapper.find('.roar-modal-stub').findAll('input')[0].setValue('researcher@test.com');
    await clickModalButton('Login Link');
    await flushPromises();
    expect(captured.confirmRequests).toHaveLength(0);
    expect(wrapper.text()).toContain('There was a problem sending the sign-in link. Please try again.');
    expect(loggerErrors).toHaveLength(1);
  });

  it('shows a fallback message and reports to Sentry when the reset email request fails unexpectedly', async () => {
    wrapper = mountLogin();
    authRefs.roarfirekit.value = {
      sendPasswordResetEmail: () => Promise.reject(new Error('network down')),
    };
    await switchToResearcherMode();
    await openTroubleOnSignInModal();
    await wrapper.find('.roar-modal-stub').findAll('input')[0].setValue('valid@mail.com');
    await clickModalButton('Reset Password');
    await flushPromises();
    expect(captured.confirmRequests).toHaveLength(0);
    expect(wrapper.text()).toContain('There was a problem sending the password reset email. Please try again.');
    expect(loggerErrors).toHaveLength(1);
  });

  it('uses Google popup on desktop when Stanford DCC Sign in is clicked', async () => {
    wrapper = mountLogin();
    await wrapper
      .findAllComponents(PvButtonStub)
      .find((b) => b.text().includes('pageSignIn.researcherLoginBtn'))
      .trigger('click');
    await nextTick();
    mobileState.isMobile = false;
    await wrapper
      .find('.login-card')
      .findAll('span')
      .find((s) => s.text().includes('Stanford DCC Sign in'))
      .trigger('click');
    await flushPromises();
    expect(captured.googlePopupCalls).toBe(1);
    expect(captured.googleRedirectCalls).toBe(0);
  });

  it('uses Google redirect on mobile when Stanford DCC Sign in is clicked', async () => {
    wrapper = mountLogin();
    await wrapper
      .findAllComponents(PvButtonStub)
      .find((b) => b.text().includes('pageSignIn.researcherLoginBtn'))
      .trigger('click');
    await nextTick();
    mobileState.isMobile = true;
    await wrapper
      .find('.login-card')
      .findAll('span')
      .find((s) => s.text().includes('Stanford DCC Sign in'))
      .trigger('click');
    await flushPromises();
    expect(captured.googleRedirectCalls).toBe(1);
    expect(captured.googlePopupCalls).toBe(0);
  });

  it('opens the trouble logging in modal and sends reset email for valid email', async () => {
    wrapper = mountLogin();
    await switchToResearcherMode();
    await openTroubleOnSignInModal();
    expect(wrapper.find('.roar-modal-stub').exists()).toBe(true);
    await wrapper.find('.roar-modal-stub').findAll('input')[0].setValue('valid@mail.com');
    await clickModalButton('Reset Password');
    await flushPromises();
    expect(captured.resetPasswordEmails).toEqual(['valid@mail.com']);
  });

  it('does not send reset email when forgot-password email is invalid', async () => {
    wrapper = mountLogin();
    await switchToResearcherMode();
    await openTroubleOnSignInModal();
    await wrapper.find('.roar-modal-stub').findAll('input')[0].setValue('not-an-email');
    await clickModalButton('Reset Password');
    await flushPromises();
    expect(captured.resetPasswordEmails).toHaveLength(0);
  });

  it('shows spinner overlay when spinner ref is true', async () => {
    wrapper = mountLogin();
    authRefs.spinner.value = true;
    await nextTick();
    expect(wrapper.find('.spinner-wrapper').exists()).toBe(true);
    expect(wrapper.find('.app-spinner-stub').exists()).toBe(true);
  });
});
