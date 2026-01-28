<template>
  <div>
    <div v-if="props.isBasicView">
      <div class="flex gap-5 align-items-center justify-content-center">
        <div class="flex align-items-center gap-2">
          <PvAvatar
            :label="userInitial"
            shape="circle"
            style="background: var(--red-100); font-weight: 500; color: var(--primary-color)"
          />
          <div>
            <p v-if="userData?.displayName || userData?.username" class="m-0 p-0 font-semibold text-sm">
              {{ userData?.displayName || userData?.username }}
            </p>
            <p class="m-0 p-0 text-xs">{{ userData?.email }}</p>
          </div>
        </div>

        <PvButton data-cy="button-sign-out" @click="() => signOut()">
          <i class="pi pi-sign-out"></i> {{ $t('navBar.signOut') }}
        </PvButton>
      </div>
    </div>
    <div v-else class="flex gap-2 options-wrapper">
      <SiteSelector v-if="shouldUsePermissions" />

      <!-- Help dropdown -->
      <PvSelect
        :options="helpOptions"
        :optionValue="(o) => o.value"
        :optionLabel="(o) => o.label"
        class="options-help"
        @change="handleHelpChange"
      >
        <template #value>
          <i class="pi pi-question-circle"></i>
        </template>
      </PvSelect>
      <button ref="feedbackButton" style="display: none">Give me feedback</button>

      <!-- Profile dropdown -->
      <PvSelect
        :options="profileOptions"
        :optionValue="(o) => o.value"
        :optionLabel="(o) => o.label"
        class="options-settings"
        @change="handleProfileChange"
      >
        <template #value>
          <i class="pi pi-user"></i>
        </template>
      </PvSelect>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { storeToRefs } from 'pinia';
import useSignOutMutation from '@/composables/mutations/useSignOutMutation';
import PvButton from 'primevue/button';
import PvSelect from 'primevue/select';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { APP_ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/store/auth';
import PvAvatar from 'primevue/avatar';
import SiteSelector from './SiteSelector.vue';

interface Props {
  isBasicView: boolean;
}

interface DropdownOption {
  label: string;
  value: string;
}

interface DropdownChangeEvent {
  value: string;
}

const authStore = useAuthStore();
const { shouldUsePermissions, userData } = storeToRefs(authStore);
const i18n = useI18n();
const router = useRouter();
const { mutate: signOut } = useSignOutMutation();
const feedbackButton = ref<HTMLButtonElement | null>(null);

const props = defineProps<Props>();

const userInitial = computed(() => {
  const data: string =
    (userData.value?.displayName as string) ||
    (userData.value?.username as string) ||
    (userData.value?.email as string);

  return data[0]!.toUpperCase();
});

const helpOptions: DropdownOption[] = [
  { label: 'Researcher Documentation', value: 'researcherDocumentation' },
  { label: 'Report an Issue', value: 'reportAnIssue' },
];

const profileOptions: DropdownOption[] = [
  { label: 'Settings', value: 'settings' },
  { label: i18n.t('navBar.signOut'), value: 'signout' },
];

const handleHelpChange = (e: DropdownChangeEvent): void => {
  if (e.value === 'researcherDocumentation') {
    window.open('https://researcher.levante-network.org/', '_blank');
  } else if (e.value === 'reportAnIssue') {
    window.open('https://levante-support.freshdesk.com', '_blank');
  }
};

const handleProfileChange = (e: DropdownChangeEvent): void => {
  if (e.value === 'settings') {
    router.push({ path: APP_ROUTES.ACCOUNT_PROFILE });
  } else if (e.value === 'signout') {
    signOut();
  }
};
</script>

<style lang="scss">
.options-wrapper {
  @media (max-width: 768px) {
    .p-select-dropdown {
      display: none;
    }
  }
}
</style>
