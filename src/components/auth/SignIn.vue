<template>
  <div class="card">
    <form class="p-fluid" @submit.prevent="handleFormSubmit(!v$.$invalid)">
      <div class="field mt-2">
        <div class="p-input-icon-right">
          <PvInputText
            :id="$t('authSignIn.emailId')"
            v-model="v$.email.$model"
            :class="{ 'w-full': true, 'p-invalid': invalid }"
            aria-describedby="email-error"
            :placeholder="$t('authSignIn.emailPlaceholder')"
            data-cy="input-username-email"
            @keyup="checkForCapsLock"
            @click="checkForCapsLock"
          />
        </div>
        <small v-if="invalid" class="p-error">{{ $t('authSignIn.incorrectEmailOrPassword') }}</small>
      </div>
      <div class="field mt-4 mb-5">
        <div>
          <!-- Email is currently being evaluated (loading state) -->
          <span v-if="evaluatingEmail">
            <PvSkeleton height="2.75rem" />
          </span>
          <!-- Email is entered, Password is desired -->
          <div v-else-if="allowPassword && allowLink">
            <PvPassword
              :id="$t('authSignIn.passwordId')"
              v-model="v$.password.$model"
              :class="{ 'w-full': true, 'p-invalid': invalid }"
              toggle-mask
              show-icon="pi pi-eye-slash"
              hide-icon="pi pi-eye"
              :feedback="false"
              :placeholder="$t('authSignIn.passwordPlaceholder')"
              data-cy="input-password"
              @keyup="checkForCapsLock"
              @click="checkForCapsLock"
            />
            <small
              class="text-link sign-in-method-link"
              data-cy="sign-in-with-email-link"
              @click="
                allowPassword = false;
                state.usePassword = false;
              "
              >{{ $t('authSignIn.signInWithEmailLinkInstead') }}</small
            >
            <small class="text-link sign-in-method-link" data-cy="sign-in-with-password" @click="handleForgotPassword"
              >Forgot password?</small
            >
          </div>
          <!-- Username is entered, Password is desired -->
          <PvPassword
            v-else-if="allowPassword"
            :id="$t('authSignIn.passwordId')"
            v-model="v$.password.$model"
            :class="{ 'w-full': true, 'p-invalid': invalid }"
            toggle-mask
            show-icon="pi pi-eye-slash"
            hide-icon="pi pi-eye"
            :feedback="false"
            :placeholder="$t('authSignIn.passwordPlaceholder')"
            data-cy="input-password"
            @keyup="checkForCapsLock"
            @click="checkForCapsLock"
          >
            <template #header>
              <h6>{{ $t('authSignIn.pickPassword') }}</h6>
            </template>
            <template #footer="sp">
              {{ sp.level }}
              <PvDivider />
              <p class="mt-2">{{ $t('authSignIn.suggestions') }}</p>
              <ul class="pl-2 ml-2 mt-0" style="line-height: 1.5">
                <li>{{ $t('authSignIn.atLeastOneLowercase') }}</li>
                <li>{{ $t('authSignIn.atLeastOneUppercase') }}</li>
                <li>{{ $t('authSignIn.atLeastOneNumeric') }}</li>
                <li>{{ $t('authSignIn.minimumCharacters') }}</li>
              </ul>
            </template>
          </PvPassword>
          <!-- Email is entered, MagicLink is desired login -->
          <div v-else-if="allowLink">
            <PvPassword
              :placeholder="$t('authSignIn.signInWithEmailLinkPlaceHolder')"
              disabled
              data-cy="password-disabled-for-email"
              class="w-full"
            />
            <small
              class="text-link sign-in-method-link"
              @click="
                allowPassword = true;
                state.usePassword = true;
              "
              >{{ $t('authSignIn.signInWithPasswordInstead') }}</small
            >
          </div>
          <!-- Email is entered, however it is an invalid email (prevent login) -->
          <div v-else>
            <PvPassword
              disabled
              class="p-invalid text-red-600 w-full"
              :placeholder="$t('authSignIn.invalidEmailPlaceholder')"
            />
          </div>
          <div v-if="capsLockEnabled" class="mt-2 p-error">⇪ Caps Lock is on!</div>
        </div>
      </div>
      <PvButton
        type="submit"
        class="mt-5 flex w-5 p-3 border-none border-round hover:bg-black-alpha-20"
        :label="$t('authSignIn.buttonLabel') + ' &rarr;'"
        data-cy="submit-sign-in-with-password"
      />
      <hr class="opacity-20 mt-5" />
    </form>
  </div>
  <RoarModal
    :is-enabled="forgotPasswordModalOpen"
    title="Forgot Password"
    subtitle="Enter your email to reset your password"
    small
    @modal-closed="forgotPasswordModalOpen = false"
  >
    <template #default>
      <div class="flex flex-column">
        <label>Email</label>
        <PvInputText v-model="forgotEmail" />
      </div>
    </template>
    <template #footer>
      <PvButton
        tabindex="0"
        class="border-none border-round bg-white text-primary p-2 hover:surface-200"
        text
        label="Cancel"
        outlined
        @click="closeForgotPasswordModal"
      ></PvButton>
      <PvButton
        tabindex="0"
        class="border-none border-round bg-primary text-white p-2 hover:surface-400"
        label="Send Reset Email"
        @click="sendResetEmail"
      ></PvButton>
    </template>
  </RoarModal>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { required, requiredUnless } from '@vuelidate/validators';
import { useVuelidate } from '@vuelidate/core';
import _debounce from 'lodash/debounce';
import PvButton from 'primevue/button';
import PvDivider from 'primevue/divider';
import PvInputText from 'primevue/inputtext';
import PvPassword from 'primevue/password';
import PvSkeleton from 'primevue/skeleton';
import { useAuthStore } from '@/store/auth';
import RoarModal from '../modals/RoarModal.vue';

interface SignInState {
  email: string;
  password: string;
  useLink: boolean;
  usePassword: boolean;
}

interface Props {
  invalid?: boolean;
}

interface Emits {
  (e: 'submit', state: SignInState): void;
  (e: 'update:email', email: string): void;
}

const authStore = useAuthStore();
const { roarfirekit } = storeToRefs(authStore);

const emit = defineEmits<Emits>();
const props = withDefaults(defineProps<Props>(), {
  invalid: false,
});

const state = reactive<SignInState>({
  email: '',
  password: '',
  useLink: false,
  usePassword: true,
});

const rules = {
  email: { required },
  password: {
    requiredIf: requiredUnless(() => state.useLink),
  },
};
const submitted = ref<boolean>(false);
const v$ = useVuelidate(rules, state);
const capsLockEnabled = ref<boolean>(false);
const forgotPasswordModalOpen = ref<boolean>(false);

const handleFormSubmit = (isFormValid: boolean): void => {
  submitted.value = true;
  if (!isFormValid) {
    return;
  }
  emit('submit', state);
};

const isValidEmail = (email: string): boolean => {
  var re =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
};

const evaluatingEmail = ref<boolean>(false);
const allowPassword = ref<boolean>(true);
const allowLink = ref<boolean>(true);

const validateRoarEmail = _debounce(
  async (email: string): Promise<void> => {
    // Don't evaluate empty or invalid emails
    if (!email || !email.includes('@')) {
      evaluatingEmail.value = false;
      return;
    }

    try {
      // First handle levante emails
      if (email.includes('levante')) {
        allowPassword.value = true;
        allowLink.value = false;
        state.useLink = false;
        evaluatingEmail.value = false;
        return;
      }

      // If they get this far, User is a an admin or using username/password
      allowPassword.value = true; // Password is always allowed
      allowLink.value = true;
      state.useLink = allowLink.value;
      evaluatingEmail.value = false;
    } catch (error) {
      console.error('Error evaluating email:', error);
      evaluatingEmail.value = false;
    }
  },
  250,
  { maxWait: 1000 },
);

function checkForCapsLock(e: Event): void {
  // Make sure the event is a keyboard event.
  // Using password autofill will trigger a regular
  //   event which does not have a getModifierState method.
  if (e instanceof KeyboardEvent) {
    capsLockEnabled.value = e.getModifierState('CapsLock');
  }
}

const forgotEmail = ref<string>('');
function handleForgotPassword(): void {
  console.log('Opening modal for forgot password');
  forgotPasswordModalOpen.value = true;
  // e.preventDefault();
}
function closeForgotPasswordModal(): void {
  forgotPasswordModalOpen.value = false;
  forgotEmail.value = '';
}
function sendResetEmail(): void {
  console.log('Submitting forgot password with email', forgotEmail.value);
  roarfirekit.value.sendPasswordResetEmail(forgotEmail.value);
  closeForgotPasswordModal();
}

watch(
  () => state.email,
  async (email: string) => {
    emit('update:email', email);
    if (isValidEmail(email)) {
      evaluatingEmail.value = true;
      validateRoarEmail(email);
    }
  },
);
</script>
<style scoped>
.submit-button {
  margin-top: 0.5rem;
  display: flex;
  background-color: #e5e5e5;
  color: black;
  border: none;
  width: 11.75rem;
}

.submit-button:hover {
  background-color: #b7b5b5;
  color: black;
}
.text-link {
  cursor: pointer;
  color: var(--text-color-secondary);
  font-weight: bold;
  text-decoration: underline;
}

.text-link:hover {
  color: var(--primary-color-text);
}
.sign-in-method-link {
  margin-top: 0.5rem;
  display: flex;
  justify-content: flex-end;
  width: 100%;
}
</style>
