<template>
  <LevanteSpinner v-if="!gameStarted" fullscreen />
  <div id="jspsych-target" class="game-target" translate="no" />
</template>
<script setup>
import { onMounted, onBeforeUnmount, watch, ref } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import _get from 'lodash/get';
import { useAuthStore } from '@/store/auth';
import { useGameStore } from '@/store/game';
import useUserChildDataQuery from '@/composables/queries/useUserChildDataQuery';
import useCompleteAssessmentMutation from '@/composables/mutations/useCompleteAssessmentMutation';
import packageLockJson from '../../../package-lock.json';
import LevanteSpinner from '@/components/LevanteSpinner.vue';

const props = defineProps({
  taskId: { type: String, required: true, default: 'swr' },
});

let TaskLauncher;

const taskId = props.taskId;
const { version } = packageLockJson.packages['node_modules/@bdelab/roar-swr'];
const router = useRouter();
const taskStarted = ref(false);
const gameStarted = ref(false);
const authStore = useAuthStore();
const gameStore = useGameStore();
const { isFirekitInit, roarfirekit } = storeToRefs(authStore);

const { mutateAsync: completeAssessmentMutate } = useCompleteAssessmentMutation();

const initialized = ref(false);
let unsubscribe;
const init = () => {
  if (unsubscribe) unsubscribe();
  initialized.value = true;
};
const handlePopState = () => {
  router.go(0);
};

unsubscribe = authStore.$subscribe(async (mutation, state) => {
  if (state.roarfirekit.restConfig) init();
});

const { isLoading: isLoadingUserData, data: userData } = useUserChildDataQuery({
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
  try {
    TaskLauncher = (await import('@bdelab/roar-swr')).default;
  } catch (error) {
    console.error('An error occurred while importing the game module.', error);
  }

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

async function startTask(selectedAdmin) {
  try {
    let checkGameStarted = setInterval(function () {
      // Poll for the preload trials progress bar to exist and then begin the game
      let gameLoading = document.querySelector('.jspsych-content-wrapper');
      if (gameLoading) {
        gameStarted.value = true;
        clearInterval(checkGameStarted);
      }
    }, 100);

    const appKit = await authStore.roarfirekit.startAssessment(selectedAdmin.value.id, taskId, version);

    const userParams = {
      grade: '',
      birthMonth: _get(userData.value, 'birthMonth'),
      birthYear: _get(userData.value, 'birthYear'),
    };

    const gameParams = { ...appKit._taskInfo.variantParams };

    const roarApp = new TaskLauncher(appKit, gameParams, userParams, 'jspsych-target');

    await roarApp.run().then(async () => {
      // Handle any post-game actions.
      await completeAssessmentMutate({
        adminId: selectedAdmin.value.id,
        taskId,
      });

      // Navigate to home, but first set the refresh flag to true.
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
</script>
<style>
@import '@bdelab/roar-swr/lib/resources/roar-swr.css';

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
