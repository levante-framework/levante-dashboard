<template>
  <div v-if="!isDevelopment">
    <!-- Regular session timer for production -->
    <ConfirmDialog />
    <div
      v-if="showWarning && !dialogActive"
      class="session-warning"
      data-cy="session-warning"
    >
      <span class="warning-text">{{ $t('sessionTimer.sessionTimingOut', { minutes: timeRemainingMinutes }) }}</span>
      <PvButton
        class="p-button-sm p-button p-component p-button-success continue-button"
        data-cy="continue-session-button"
        @click="extendSession"
      >
        {{ $t('sessionTimer.continueSession') }}
      </PvButton>
    </div>
  </div>
  <div v-else>
    <!-- Mock session timer for development mode -->
    <div v-if="showDevWarning" class="dev-session-warning">
      <span class="dev-warning-text">Using mock SessionTimer for development</span>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useConfirm } from 'primevue/useconfirm';
import { storeToRefs } from 'pinia';
import PvButton from 'primevue/button';
import ConfirmDialog from 'primevue/confirmdialog';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'vue-router';

// For development mode, use simplified behavior
const isDevelopment = ref(import.meta.env.DEV);
const showDevWarning = ref(false);

// Only mount the development warning briefly
if (isDevelopment.value) {
  showDevWarning.value = true;
  setTimeout(() => {
    showDevWarning.value = false;
  }, 5000);
}

// Only proceed with session timer logic if not in dev mode
if (!isDevelopment.value) {
  const confirm = useConfirm();
  const router = useRouter();
  const authStore = useAuthStore();
  const { isAuthenticated } = storeToRefs(authStore);

  const inactivityTimeoutMinutes = 15;
  const warningTimeMinutes = 1;
  
  const inactivityTimeoutMs = inactivityTimeoutMinutes * 60 * 1000;
  const warningTimeMs = warningTimeMinutes * 60 * 1000;
  
  const inactivityTimer = ref(null);
  const warningTimer = ref(null);
  const dialogActive = ref(false);
  const showWarning = ref(false);
  const sessionExpired = ref(false);
  
  const timeRemainingMinutes = computed(() => {
    return Math.ceil(warningTimeMs / 60000);
  });
  
  const resetTimers = () => {
    clearTimeout(inactivityTimer.value);
    clearTimeout(warningTimer.value);
    inactivityTimer.value = setTimeout(showSessionWarning, inactivityTimeoutMs - warningTimeMs);
    showWarning.value = false;
    dialogActive.value = false;
  };
  
  const showSessionWarning = () => {
    if (sessionExpired.value) return;
    
    showWarning.value = true;
    warningTimer.value = setTimeout(expireSession, warningTimeMs);
  };
  
  const expireSession = () => {
    if (sessionExpired.value) return;
    
    sessionExpired.value = true;
    showWarning.value = false;
    
    dialogActive.value = true;
    confirm.require({
      message: 'Your session has expired due to inactivity.',
      header: 'Session Expired',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Log In Again',
      rejectLabel: 'Cancel',
      accept: () => {
        dialogActive.value = false;
        router.push({ name: 'Signin' });
      },
      reject: () => {
        dialogActive.value = false;
      }
    });
  };
  
  const extendSession = () => {
    resetTimers();
  };
  
  const setupListeners = () => {
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    
    activityEvents.forEach(eventType => {
      window.addEventListener(eventType, resetTimers, { passive: true });
    });
    
    return () => {
      activityEvents.forEach(eventType => {
        window.removeEventListener(eventType, resetTimers);
      });
    };
  };
  
  // Initialize session tracking when component mounts
  onMounted(() => {
    if (isAuthenticated.value) {
      resetTimers();
      return setupListeners();
    }
  });
  
  // Watch for authentication state changes
  watch(isAuthenticated, (newIsAuthenticated) => {
    if (newIsAuthenticated) {
      resetTimers();
      setupListeners();
      sessionExpired.value = false;
    } else {
      clearTimeout(inactivityTimer.value);
      clearTimeout(warningTimer.value);
      showWarning.value = false;
    }
  });
}
</script>

<style scoped>
.session-warning {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background-color: #fff3cd;
  color: #856404;
  padding: 10px 15px;
  z-index: 1000;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.warning-text {
  font-weight: bold;
}

.continue-button {
  margin-left: 10px;
}

.dev-session-warning {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background-color: #d1ecf1;
  color: #0c5460;
  padding: 8px 12px;
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 12px;
}

.dev-warning-text {
  font-style: italic;
}
</style>
