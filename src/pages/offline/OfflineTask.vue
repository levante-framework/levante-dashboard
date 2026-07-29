<template>
  <div>
    <div v-if="error" class="fixed left-4 top-4 z-50 max-w-lg rounded border border-red-300 bg-red-50 p-3 text-red-800">
      {{ error }}
      <button class="ml-3 underline" type="button" @click="goHome">Back</button>
    </div>
    <div v-if="!gameStarted && !error" class="fixed left-4 top-4 z-50 rounded bg-white/90 px-3 py-2 text-sm shadow">
      Loading {{ taskId }}…
    </div>
    <div id="jspsych-target" class="game-target" translate="no" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { OfflineAppkit } from '@/offline/OfflineAppkit';
import { getSelectedUser, loadSiteConfig } from '@/offline/roster';

const route = useRoute();
const router = useRouter();
const taskId = String(route.params.taskId || '');
const error = ref('');
const gameStarted = ref(false);

function goHome() {
  router.push({ name: 'OfflineHome' });
}

onMounted(async () => {
  try {
    const user = getSelectedUser();
    if (!user) {
      throw new Error('No participant selected. Go back and select a user.');
    }

    const siteConfig = await loadSiteConfig('/offline-pack');
    const taskConfig = siteConfig.tasks.find((task) => task.taskId === taskId);
    if (!taskConfig) {
      throw new Error(`Task ${taskId} is not in site-config.json`);
    }

    const coreTasks = await import('@levante-framework/core-tasks');
    const TaskLauncher = coreTasks.TaskLauncher;

    const variantParams = {
      language: siteConfig.language,
      taskName: taskId,
      assetBaseUrl: siteConfig.assetBaseUrl,
      ...(taskConfig.variantParams || {}),
    };

    const appKit = new OfflineAppkit({
      localUserId: user.localUserId,
      roarUid: user.roarUid,
      assessmentPid: user.assessmentPid,
      assignmentId: siteConfig.assignmentId,
      taskId,
      packId: siteConfig.packId,
      variantParams,
    });

    const userParams = {
      birthMonth: user.birthMonth || '1',
      birthYear: user.birthYear || '2018',
    };

    const poll = setInterval(() => {
      if (document.querySelector('.jspsych-content-wrapper')) {
        gameStarted.value = true;
        clearInterval(poll);
      }
    }, 100);

    const launcher = new TaskLauncher(appKit as any, variantParams, userParams);
    await launcher.run();
    clearInterval(poll);
    router.push({ name: 'OfflineHome' });
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  }
});
</script>

<style>
@import '@levante-framework/core-tasks/lib/resources/core-tasks.css';

.game-target {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>
