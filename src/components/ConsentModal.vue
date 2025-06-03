<template>
  <PvToast />
  <PvConfirmDialog
    v-model:visible="dialogVisible"
    group="consent"
    class="confirm"
    :draggable="false"
    :close-on-escape="false"
  >
    <template #message>
      <div class="scrolling-box">
        <!-- @TODO: Add sanitization! -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-html="markdownToHtml"></div>
      </div>
    </template>
  </PvConfirmDialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import * as Sentry from '@sentry/vue';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import PvConfirmDialog from 'primevue/confirmdialog';
import PvToast from 'primevue/toast';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import _lowerCase from 'lodash/lowerCase';
import { TOAST_SEVERITIES, TOAST_DEFAULT_LIFE_DURATION } from '@/constants/toasts';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import PvButton from 'primevue/button';
import PvDialog from 'primevue/dialog';

const i18n = useI18n();
const router = useRouter();
const authStore = useAuthStore() as any;

interface Props {
  consentText: string;
  consentType: string;
  onConfirm?: () => Promise<void>;
}

const props = withDefaults(defineProps<Props>(), {
  onConfirm: undefined,
});

const confirm = useConfirm();
const toast = useToast();

const dialogVisible = ref(false);
const isSubmitting = ref(false);

const markdownToHtml = computed(() => {
  const rawHtml = marked(props.consentText);
  return DOMPurify.sanitize(rawHtml);
});

const consentTypeText = computed(() => {
  return _lowerCase(props.consentType);
});

const isVisible = computed(() => {
  return authStore.userData?.consent?.[props.consentType] === false;
});

const handleConfirm = () => {
  confirm.require({
    message: 'Do you agree to the terms and conditions?',
    header: 'Confirmation',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: {
      label: 'Cancel',
      severity: 'secondary',
      outlined: true,
    },
    acceptProps: {
      label: 'Save',
    },
    accept: async () => {
      if (!props.onConfirm) return;

      try {
        await new Promise((resolve) => setTimeout(resolve, 600));
        await props.onConfirm();

        toast.add({
          severity: TOAST_SEVERITIES.INFO,
          summary: 'Success',
          detail: 'Consent updated successfully',
          life: 3000,
        });
      } catch (error) {
        console.error('Error updating consent:', error);
        toast.add({
          severity: TOAST_SEVERITIES.ERROR,
          summary: 'Error',
          detail: 'Failed to update consent',
          life: 3000,
        });
      }
    },
    reject: () => {
      authStore.signOut();
      router.push({ name: 'SignOut' });
    },
  });
};

onMounted(() => {
  dialogVisible.value = true;
  handleConfirm();
});
</script>

<style>
.scrolling-box {
  width: 50vw;
  height: 50vh;
  min-width: 33vw;
  min-height: 25vh;
  padding: 1rem;
  overflow: scroll;
  border: 2px solid var(--surface-d);
  border-radius: 5px;
}

/* .confirm .p-confirm-dialog-reject {
  display: block !important;
} */

.p-dialog .p-dialog-content {
  padding: 1rem;
}

.confirm .p-dialog-footer {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}

.p-dialog .p-dialog-footer {
  padding: 1rem;
}

.confirm .p-dialog-header-close {
  display: none !important;
}
</style>
