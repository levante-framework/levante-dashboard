<template>
  <div>
    <div
      v-if="props.isBasicView"
      class="nav-user-wrapper flex align-items-center gap-2 bg-gray-100"
    >
      <div class="flex gap-2 align-items-center justify-content-center">
        <PvButton
          text
          data-cy="button-sign-out"
          class="no-underline h-2 p-1 m-0 text-primary border-none border-round h-2rem text-sm hover:bg-red-900 hover:text-white"
          @click="() => signOut()"
        >
          {{ $t("navBar.signOut") }}
        </PvButton>
      </div>
    </div>
    <div v-else class="flex gap-2">
      <!-- Help dropdown -->
      <PvSelect
        :options="helpOptions"
        :optionValue="(o) => o.value"
        :optionLabel="(o) => o.label"
        @change="handleHelpChange"
      >
        <template #value>
          <i class="pi pi-question-circle"></i>
        </template>
      </PvSelect>
      <button ref="feedbackButton" style="display: none">
        Give me feedback
      </button>

      <!-- Profile dropdown -->
      <PvSelect
        :options="profileOptions"
        :optionValue="(o) => o.value"
        :optionLabel="(o) => o.label"
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
import { ref, watchEffect, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import PvButton from 'primevue/button';
import PvSelect from 'primevue/select';
import useSignOutMutation from '@/composables/mutations/useSignOutMutation';
import { useAuthStore } from '@/store/auth';
import { APP_ROUTES } from '@/constants/routes';

interface Props {
  isBasicView?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isBasicView: false,
});

const { t } = useI18n();
const router = useRouter();
const authStore = useAuthStore();

const { mutate: signOut } = useSignOutMutation();

const feedbackButton = ref(null);

const helpOptions = computed(() => [
  {
    label: t('navBar.help'),
    value: 'help',
  },
  {
    label: t('navBar.signOut'),
    value: 'signOut',
  },
]);

const profileOptions = [
  { label: 'Settings', value: 'settings' },
  { label: t('navBar.signOut'), value: 'signout' },
];

const handleHelpChange = (e: { value: string }) => {
  if (e.value === 'help') {
    // Handle help action
    console.log('Help selected');
  } else if (e.value === 'signout') {
    signOut();
  }
};

const handleProfileChange = (e: { value: string }) => {
  if (e.value === 'settings') {
    router.push({ path: APP_ROUTES.ACCOUNT_PROFILE });
  } else if (e.value === 'signout') {
    signOut();
  }
};

watchEffect(() => {
  const feedbackElement = document.getElementById('sentry-feedback');
  if (feedbackElement) {
    if (!props.isBasicView) {
      feedbackElement.style.setProperty('display', 'none');
    }
  }
});
</script>

<style>
.nav-user-wrapper {
  display: flex;
  align-items: center;
  outline: 1.2px solid rgba(0, 0, 0, 0.1);
  border-radius: 0.3rem;
  padding: 0.5rem 0.8rem;
}
</style>
