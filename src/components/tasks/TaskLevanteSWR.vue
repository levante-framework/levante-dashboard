<template>
  <div id="jspsych-target" class="game-target" translate="no" />
</template>

<script setup>
import _get from 'lodash/get';
import { storeToRefs } from 'pinia';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import useCompleteAssessmentMutation from '@/composables/mutations/useCompleteAssessmentMutation';
import useUserChildDataQuery from '@/composables/queries/useUserChildDataQuery';
import { startAssessmentWithRetry } from '@/helpers/startAssessmentWithRetry';
import { logger } from '@/logger';
import { useAssignmentsStore } from '@/store/assignments';
import { useAuthStore } from '@/store/auth';
import packageLockJson from '../../../package-lock.json';

const props = defineProps({
  taskId: { type: String, default: 'levante-swr' },
});

let RoarSWR;
let roarApp;
let checkGameStarted;
let isUnmounted = false;

const { version } = packageLockJson.packages['node_modules/levante-swr'];
const router = useRouter();
const taskStarted = ref(false);
const gameStarted = ref(false);
const authStore = useAuthStore();
const { roarfirekit } = storeToRefs(authStore);
const { getUserId } = authStore;
const { isFirekitInit } = authStore;
const assignmentsStore = useAssignmentsStore();
const { selectedAssignment } = storeToRefs(assignmentsStore);

const { mutateAsync: completeAssessmentMutate } = useCompleteAssessmentMutation();

const isTaskSWRReady = ref(false);
const initialized = ref(false);
let unsubscribe;
const init = () => {
  if (unsubscribe) unsubscribe();
  initialized.value = true;
};
const handlePopState = () => {
  router.go(0);
};

unsubscribe = authStore.$subscribe(async (_mutation, state) => {
  if (state.roarfirekit.restConfig) init();
});

const { isLoading: isLoadingUserData, data: userData } = useUserChildDataQuery({
  enabled: initialized,
});

// The following code intercepts the back button and instead forces a refresh.
// We add { once: true } to prevent an infinite loop.
window.addEventListener('popstate', handlePopState, { once: true });

onMounted(async () => {
  try {
    const module = await import('levante-swr');
    RoarSWR = module.default;
    isTaskSWRReady.value = true;
  } catch (error) {
    alert(
      'An error occurred while loading the task. Please refresh the page and try again. If the error persists, please submit an issue report.',
    );
    logger.error(new Error('Failed to import the game module', { cause: error }), {
      tags: { function: 'onMounted', component: 'TaskLevanteSWR' },
      taskId: props.taskId,
      userId: getUserId(),
    });
  }

  if (roarfirekit.value.restConfig) init();
});

onBeforeUnmount(() => {
  isUnmounted = true;
  window.removeEventListener('popstate', handlePopState);
  if (checkGameStarted) clearInterval(checkGameStarted);
  roarApp?.abort();
});

watch(
  [isFirekitInit, isTaskSWRReady, isLoadingUserData, selectedAssignment],
  async ([newFirekitInitValue, newIsTaskSWRReady, newLoadingUserData, newSelectedAssignment]) => {
    if (
      !taskStarted.value &&
      newSelectedAssignment &&
      newIsTaskSWRReady &&
      !newLoadingUserData &&
      newFirekitInitValue
    ) {
      taskStarted.value = true;
      await startTask(selectedAssignment);
    }
  },
  { immediate: true },
);

function goHome() {
  if (isUnmounted) return;
  assignmentsStore.setHomeRefresh();
  router.push({ name: 'Home' });
}

async function startTask(selectedAdmin) {
  let startAssessmentSucceeded = false;

  try {
    checkGameStarted = setInterval(() => {
      // Poll for the preload trials progress bar to exist and then begin the game
      let gameLoading = document.querySelector('.jspsych-content-wrapper');
      if (gameLoading) {
        gameStarted.value = true;
        clearInterval(checkGameStarted);
      }
    }, 100);

    const appKit = await startAssessmentWithRetry(() =>
      authStore.roarfirekit.startAssessment(selectedAdmin.value?.id, props.taskId, version),
    );

    startAssessmentSucceeded = true;

    const userParams = {
      grade: '',
      birthMonth: _get(userData.value, 'birthMonth'),
      birthYear: _get(userData.value, 'birthYear'),
    };

    // Local copy of levante-roar-swr/assets, served from public/levante-swr.
    const gameParams = {
      ...appKit._taskInfo.variantParams,
      assetBase: '/levante-swr',
    };

    if (isUnmounted) return;

    roarApp = new RoarSWR(appKit, gameParams, userParams, logger);

    await roarApp.run().then(async () => {
      if (isUnmounted) return;

      await completeAssessmentMutate({
        adminId: selectedAdmin.value?.id,
        taskId: props.taskId,
      });

      goHome();
    });
  } catch (error) {
    if (isUnmounted) return;

    // Only unlatch when the callable never succeeded. A later failure means the
    // assessment is already started server-side, so the watcher must not relaunch it.
    if (!startAssessmentSucceeded) {
      taskStarted.value = false;
    }

    alert(
      'An error occurred while starting the task. Please refresh the page and try again. If the error persists, please submit an issue report.',
    );
    logger.error(new Error('Failed to start task', { cause: error }), {
      tags: { function: 'startTask', component: 'TaskLevanteSWR' },
      administrationId: selectedAdmin.value?.id,
      taskId: props.taskId,
      userId: getUserId(),
    });
  } finally {
    clearInterval(checkGameStarted);
  }
}
</script>
<style>
@import 'levante-swr/lib/resources/roar-swr.css';

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
