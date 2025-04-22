<template>
  <div id="jspsych-target" class="game-target" translate="no" />
  <div v-if="!gameStarted" class="col-full text-center">
    <h1>{{ $t('tasks.preparing') }}</h1>
    <AppSpinner />
  </div>
</template>
<script setup lang="ts">
import { onMounted, watch, ref, onBeforeUnmount, computed } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import _get from 'lodash/get';
import { useAuthStore } from '@/store/auth';
import { useGameStore } from '@/store/game';
import type { FirebasePerformance } from 'firebase/performance';
import type { Store } from 'pinia';
// @ts-ignore - Missing type declarations
import useUserStudentDataQuery from '@/composables/queries/useUserStudentDataQuery';
// @ts-ignore - Missing type declarations
import useCompleteAssessmentMutation from '@/composables/mutations/useCompleteAssessmentMutation';
import packageLockJson from '../../../package-lock.json';
import { TaskLauncher } from '@levante-framework/core-tasks';

// --- Define Auth Store State Interface ---
interface AuthState {
  roarfirekit: any; // Replace 'any' with specific type if available
  performanceInstance: FirebasePerformance | null;
  // Add other state properties used in this component if needed
  // firebaseUser: { adminFirebaseUser: any | null; appFirebaseUser: any | null; };
  // userClaims: any | null;
}

// Define the type for the store instance itself
// Use Store<Id, State, Getters, Actions> if getters/actions typing is needed
type TypedAuthStore = Store<'authStore', AuthState>; 
// --- End Interface Definition ---

const props = defineProps({
  taskId: { type: String, required: true, default: 'sre' },
  language: { type: String, required: true, default: 'en' },
});

const taskId = props.taskId;
const { version } = packageLockJson.packages['node_modules/@bdelab/roar-sre'];
const router = useRouter();
const taskStarted = ref(false);
const gameStarted = ref(false);
const authStore = useAuthStore() as TypedAuthStore; // Cast the store instance
const gameStore = useGameStore();
const { isFirekitInit, roarfirekit, performanceInstance } = storeToRefs(authStore); // Destructure performanceInstance normally
const { mutateAsync: completeAssessmentMutate } = useCompleteAssessmentMutation();

const initialized = ref(false);
let unsubscribe: Function | undefined; // Type as Function or undefined
const init = async () => {
  if (unsubscribe) unsubscribe();
  initialized.value = true;
  if (performanceInstance.value) {
    try {
      const { selectedAdmin } = storeToRefs(gameStore);
      if (!selectedAdmin.value) {
        console.error('TaskSRE: selectedAdmin is null, cannot start assessment.');
        return;
      }
      const adminIdStr = String(selectedAdmin.value.id);
      
      const appKit = await roarfirekit.value.startAssessment(adminIdStr, taskId, version);

      const userDob = _get(userData.value, 'studentData.dob');
      const userDateObj = new Date(userDob);

      const userParams = {
        grade: _get(userData.value, 'studentData.grade'),
        birthMonth: userDateObj.getMonth() + 1,
        birthYear: userDateObj.getFullYear(),
        language: props.language,
      };

      const gameParams = { ...appKit._taskInfo.variantParams };

      const roarApp = new TaskLauncher(
        appKit,
        gameParams,
        userParams,
        performanceInstance.value,
        'jspsych-target'
      );

      await roarApp.run().then(async () => {
        if (selectedAdmin.value) {
          await completeAssessmentMutate({ adminId: String(selectedAdmin.value.id), taskId });
        }

        gameStore.requireHomeRefresh();
        router.push({ name: 'Home' });
      });
    } catch (error) {
      console.error('An error occurred while starting the task:', error);
      alert(
        'An error occurred while starting the task. Please refresh the page and try again. If the error persists, please submit an issue report.',
      );
    }
  } else {
    console.warn('TaskSRE: Performance instance not ready when init was called.');
  }
};

const handlePopState = () => {
  router.go(0);
};

unsubscribe = authStore.$subscribe(async (mutation, state) => {
  if (state.roarfirekit.restConfig) init();
});

const { isLoading: isLoadingUserData, data: userData } = useUserStudentDataQuery({
  enabled: initialized,
});

// The following code intercepts the back button and instead forces a refresh.
// We add { once: true } to prevent an infinite loop.
window.addEventListener(
  'popstate',
  () => {
    handlePopState();
  },
  { once: true },
);

onMounted(async () => {
  if (roarfirekit.value.restConfig) init();
});

onBeforeUnmount(() => {
  window.removeEventListener('popstate', handlePopState);
});

watch(
  [isFirekitInit, isLoadingUserData],
  async ([newFirekitInitValue, newLoadingUserData]) => {
    if (newFirekitInitValue && !newLoadingUserData && !taskStarted.value) {
      taskStarted.value = true;
      const { selectedAdmin } = storeToRefs(gameStore);
      await startTask(selectedAdmin);
    }
  },
  { immediate: true },
);

async function startTask(selectedAdmin: any) { // Explicitly type as any for now
  try {
    if (!selectedAdmin.value) {
      console.error('TaskSRE: selectedAdmin is null, cannot start task.');
      return;
    }
    const adminIdStr = String(selectedAdmin.value.id);

    let checkGameStarted = setInterval(function () {
      // Poll for the preload trials progress bar to exist and then begin the game
      let gameLoading = document.querySelector('.jspsych-content-wrapper');
      if (gameLoading) {
        gameStarted.value = true;
        clearInterval(checkGameStarted);
      }
    }, 100);

    const appKit = await roarfirekit.value.startAssessment(adminIdStr, taskId, version);

    const userDob = _get(userData.value, 'studentData.dob');
    const userDateObj = new Date(userDob);

    const userParams = {
      grade: _get(userData.value, 'studentData.grade'),
      birthMonth: userDateObj.getMonth() + 1,
      birthYear: userDateObj.getFullYear(),
      language: props.language,
    };

    const gameParams = { ...appKit._taskInfo.variantParams };

    const roarApp = new TaskLauncher(
      appKit,
      gameParams,
      userParams,
      performanceInstance.value,
      'jspsych-target'
    );

    await roarApp.run().then(async () => {
      if (selectedAdmin.value) {
        await completeAssessmentMutate({ adminId: String(selectedAdmin.value.id), taskId });
      }

      gameStore.requireHomeRefresh();
      router.push({ name: 'Home' });
    });
  } catch (error) {
    console.error('An error occurred while starting the task:', error);
    alert(
      'An error occurred while starting the task. Please refresh the page and try again. If the error persists, please submit an issue report.',
    );
  }
}

const selectedAdmin = computed(() => gameStore.selectedAdmin);
</script>
<style>
@import '@bdelab/roar-sre/lib/resources/roar-sre.css';

.game-target {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.game-target:focus {
  outline: none;
}
</style>
