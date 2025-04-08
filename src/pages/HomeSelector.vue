<template>
  <div v-if="isLoading">
    <div class="text-center col-full">
      <AppSpinner />
      <p class="text-center">{{ $t('homeSelector.loading') }}</p>
    </div>
  </div>

  <div v-else>
    <HomeParticipant v-if="isParticipant" />
    <HomeAdministrator v-else-if="isAdminUser" />
  </div>

  <ConsentModal
    v-if="!isLoading && showConsent && isAdminUser"
    :consent-text="confirmText"
    :consent-type="consentType"
    :on-confirm="updateConsent"
  />

  <ResyncAccountsModal
    v-if="!isLoading && showResyncModal && isAdminUser"
    @confirm="dismissResyncModal"
  />
</template>

<script setup>
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import _isEmpty from 'lodash/isEmpty';
import { useAuthStore } from '@/store/auth';
import { useGameStore } from '@/store/game';
import useUserType from '@/composables/useUserType';
import useUserDataQuery from '@/composables/queries/useUserDataQuery';
import useUserClaimsQuery from '@/composables/queries/useUserClaimsQuery';
import useUpdateConsentMutation from '@/composables/mutations/useUpdateConsentMutation';
import { CONSENT_TYPES } from '@/constants/consentTypes';
import { APP_ROUTES } from '@/constants/routes';
import { isLevante } from '@/helpers';

const HomeParticipant = defineAsyncComponent(() => import('@/pages/HomeParticipant.vue'));
const HomeAdministrator = defineAsyncComponent(() => import('@/pages/HomeAdministrator.vue'));
const ConsentModal = defineAsyncComponent(() => import('@/components/ConsentModal.vue'));
const ResyncAccountsModal = defineAsyncComponent(() => import('@/components/ResyncAccountsModal.vue'));

const authStore = useAuthStore();
const { roarfirekit, ssoProvider, isReady: isAuthStoreReady } = storeToRefs(authStore);

const router = useRouter();
const i18n = useI18n();

const { mutateAsync: updateConsentStatus } = useUpdateConsentMutation();

if (ssoProvider.value) {
  console.log('Detected SSO authentication, redirecting...');
  router.replace({ path: APP_ROUTES.SSO });
}

const gameStore = useGameStore();
const { requireRefresh } = storeToRefs(gameStore);

const { isLoading: isLoadingUserData, data: userData } = useUserDataQuery(null, {
  enabled: isAuthStoreReady,
});

const { isLoading: isLoadingClaims, data: userClaims } = useUserClaimsQuery({
  enabled: isAuthStoreReady,
});

const { isAdmin, isSuperAdmin, isParticipant } = useUserType(userClaims);

const isAdminUser = computed(() => isAdmin.value || isSuperAdmin.value);

const isLoading = computed(() => {
  console.log(`[HomeSelector isLoading Simplified] isAuthStoreReady: ${isAuthStoreReady.value}`);
  return !isAuthStoreReady.value;
});

const showConsent = ref(false);
const consentType = computed(() => {
  if (isAdminUser.value) {
    return CONSENT_TYPES.TOS;
  } else {
    return i18n.locale.value.includes('es') ? CONSENT_TYPES.ASSENT_ES : CONSENT_TYPES.ASSENT;
  }
});

const confirmText = ref('');
const consentVersion = ref('');

async function updateConsent() {
  await updateConsentStatus({ consentType, consentVersion });
}

async function checkConsent() {
  if (isLevante || !isAdminUser.value) return;

  const consentStatus = userData.value?.legal?.[consentType.value];
  const consentDoc = await authStore.getLegalDoc(consentType.value);

  consentVersion.value = consentDoc.version;

  if (!consentStatus?.[consentDoc.version]) {
    confirmText.value = consentDoc.text;
    showConsent.value = true;
    return;
  }

  const legalDocs = consentStatus?.[consentDoc.version] || [];
  if (!Array.isArray(legalDocs)) return;
  const signedBeforeAugFirst = legalDocs.some((doc) => isSignedBeforeAugustFirst(doc.dateSigned));

  if (signedBeforeAugFirst) {
    confirmText.value = consentDoc.text;
    showConsent.value = true;
  }
}

function isSignedBeforeAugustFirst(signedDate) {
  const currentDate = new Date();
  const augustFirstThisYear = new Date(currentDate.getFullYear(), 7, 1); // August 1st of the current year
  return new Date(signedDate) < augustFirstThisYear;
}

// ResyncAccounts Modal Logic
const RESYNC_MODAL_KEY = 'resync_accounts_modal_viewed';
const showResyncModal = ref(false);

function checkResyncModalStatus() {
  if (!isAdminUser.value) return;
  
  const modalViewed = localStorage.getItem(RESYNC_MODAL_KEY);
  if (!modalViewed) {
    showResyncModal.value = true;
  }
}

function dismissResyncModal() {
  showResyncModal.value = false;
  localStorage.setItem(RESYNC_MODAL_KEY, 'true');
}

watch(
  [userData, isAdminUser],
  async ([updatedUserData, updatedAdminUserState]) => {
    if (isAuthStoreReady.value && !_isEmpty(updatedUserData) && updatedAdminUserState) {
      await checkConsent();
      checkResyncModalStatus();
    }
  },
  { immediate: true },
);

onMounted(async () => {
  console.log('[HomeSelector onMounted] - Store Ready Status:', authStore.isReady);
  if (requireRefresh.value) {
    requireRefresh.value = false;
    router.go(0);
  }
});
</script>
