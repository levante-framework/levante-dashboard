<template>
  <div class="mx-auto max-w-3xl p-6">
    <h1 class="mb-2 text-2xl font-semibold">Levante in a Box</h1>
    <p class="mb-6 text-surface-600">
      Offline collection for pack
      <span class="font-mono">{{ siteConfig?.packId || '…' }}</span>
      ({{ siteConfig?.language || '…' }})
    </p>

    <div v-if="error" class="mb-4 rounded border border-red-300 bg-red-50 p-3 text-red-800">{{ error }}</div>
    <div v-if="status" class="mb-4 rounded border border-green-300 bg-green-50 p-3 text-green-900">{{ status }}</div>

    <section class="mb-8 rounded border border-surface-200 p-4">
      <h2 class="mb-3 text-lg font-medium">Add participant</h2>
      <div class="flex flex-wrap items-end gap-3">
        <label class="flex flex-col gap-1 text-sm">
          Name
          <input v-model="newName" class="rounded border border-surface-300 px-3 py-2" type="text" />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          Birth month
          <input v-model="newBirthMonth" class="w-24 rounded border border-surface-300 px-3 py-2" type="text" placeholder="1-12" />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          Birth year
          <input v-model="newBirthYear" class="w-28 rounded border border-surface-300 px-3 py-2" type="text" placeholder="2018" />
        </label>
        <button class="rounded bg-primary px-4 py-2 text-white" type="button" @click="onAddUser">Add</button>
      </div>
      <p class="mt-2 text-sm text-surface-500">Local-only users are included in the export for later cloud ingest.</p>
    </section>

    <section class="mb-8">
      <h2 class="mb-3 text-lg font-medium">Participants</h2>
      <ul class="divide-y divide-surface-200 rounded border border-surface-200">
        <li v-for="user in roster" :key="user.localUserId" class="flex items-center justify-between gap-3 p-3">
          <div>
            <div class="font-medium">{{ user.displayName }}</div>
            <div class="text-sm text-surface-500">
              {{ user.localUserId }}
              <span v-if="user.source === 'local'"> · local</span>
              <span v-else> · pack</span>
            </div>
          </div>
          <button class="rounded border border-surface-300 px-3 py-1.5" type="button" @click="selectUser(user)">
            Select
          </button>
        </li>
        <li v-if="!roster.length" class="p-3 text-surface-500">No participants yet.</li>
      </ul>
    </section>

    <section v-if="selectedUser" class="mb-8 rounded border border-surface-200 p-4">
      <h2 class="mb-2 text-lg font-medium">Tasks for {{ selectedUser.displayName }}</h2>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="task in siteConfig?.tasks || []"
          :key="task.taskId"
          class="rounded bg-primary px-4 py-2 text-white"
          type="button"
          @click="startTask(task.taskId)"
        >
          {{ task.label || task.taskId }}
        </button>
      </div>
    </section>

    <section class="rounded border border-surface-200 p-4">
      <h2 class="mb-3 text-lg font-medium">Export results</h2>
      <p class="mb-3 text-sm text-surface-600">
        {{ runCount }} local run(s) stored. Download a JSON file to upload later from a connected machine.
      </p>
      <div class="flex flex-wrap gap-2">
        <button class="rounded bg-primary px-4 py-2 text-white" type="button" @click="onExport">Download export</button>
        <button class="rounded border border-surface-300 px-4 py-2" type="button" @click="refreshRunCount">Refresh count</button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { OfflineAppkit } from '@/offline/OfflineAppkit';
import {
  addLocalUser,
  getSelectedUser,
  loadMergedRoster,
  loadSiteConfig,
  setSelectedUser,
} from '@/offline/roster';
import type { OfflineRosterEntry, OfflineSiteConfig } from '@/offline/types';

const router = useRouter();
const siteConfig = ref<OfflineSiteConfig | null>(null);
const roster = ref<OfflineRosterEntry[]>([]);
const selectedUser = ref<OfflineRosterEntry | null>(null);
const error = ref('');
const status = ref('');
const runCount = ref(0);
const newName = ref('');
const newBirthMonth = ref('');
const newBirthYear = ref('');

async function refreshRunCount() {
  const runs = await OfflineAppkit.loadAll();
  runCount.value = runs.length;
}

async function refreshRoster() {
  roster.value = await loadMergedRoster('/offline-pack');
}

function selectUser(user: OfflineRosterEntry) {
  selectedUser.value = user;
  setSelectedUser(user);
  status.value = `Selected ${user.displayName}`;
}

function onAddUser() {
  error.value = '';
  if (!newName.value.trim()) {
    error.value = 'Name is required.';
    return;
  }
  const user = addLocalUser({
    displayName: newName.value,
    birthMonth: newBirthMonth.value || undefined,
    birthYear: newBirthYear.value || undefined,
  });
  newName.value = '';
  void refreshRoster().then(() => selectUser(user));
}

function startTask(taskId: string) {
  if (!selectedUser.value) return;
  setSelectedUser(selectedUser.value);
  router.push({ name: 'OfflineTask', params: { taskId } });
}

async function onExport() {
  error.value = '';
  try {
    const payload = await OfflineAppkit.exportAll(siteConfig.value?.packId, roster.value);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${siteConfig.value?.packId || 'offline'}-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    status.value = `Exported ${payload.runs.length} run(s).`;
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  }
}

onMounted(async () => {
  try {
    siteConfig.value = await loadSiteConfig('/offline-pack');
    await refreshRoster();
    selectedUser.value = getSelectedUser();
    await refreshRunCount();
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  }
});
</script>
