<template>
  <main class="container main w-full">
    <section class="main-body">
      <div class="flex flex-column gap-6">
        <div class="flex flex-column gap-1">
          <div class="admin-page-header">E2E Results</div>
          <div class="text-md text-gray-500">
            Run from the UI (local dev runner). Results are saved to
            <code>gs://levante-performance-dev/test-results/</code>
          </div>
          <div v-if="runnerAvailable && runnerConfig?.targetBaseUrl" class="text-sm text-gray-600">
            Target app: <code>{{ runnerConfig.targetBaseUrl }}</code>
          </div>
          <div v-if="!runnerAvailable" class="text-sm text-red-700">
            Run Test is disabled. Start dev server with <code>npm run dev:db:runner</code>.
          </div>
        </div>

        <RoarModal
          title="Test details"
          subtitle="Command + last run metadata"
          :is-enabled="isDetailsModalOpen"
          @modal-closed="isDetailsModalOpen = false"
        >
          <div v-if="selectedRow" class="flex flex-column gap-3">
            <div class="text-lg font-semibold text-gray-800">{{ selectedRow.name }}</div>

            <div class="flex flex-column gap-1">
              <div class="uppercase text-xs text-gray-500">Run command</div>
              <div class="flex gap-2 items-start">
                <code class="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-2 break-all flex-1">{{ selectedRow.runScript }}</code>
                <PvButton
                  icon="pi pi-copy"
                  class="bg-primary text-white border-none"
                  v-tooltip.bottom="'Copy command'"
                  @click="copyToClipboard(selectedRow.runScript)"
                />
              </div>
            </div>

            <div class="grid">
              <div class="col-12 md:col-6">
                <div class="uppercase text-xs text-gray-500">Last result</div>
                <div :class="resultClass(selectedRow.id)">{{ resultLabel(selectedRow.id) }}</div>
              </div>
              <div class="col-12 md:col-6">
                <div class="uppercase text-xs text-gray-500">Last run</div>
                <div class="text-gray-700">{{ formatLastRun(resultsStore.byId[selectedRow.id]?.lastRunAt) }}</div>
              </div>
              <div class="col-12 md:col-6">
                <div class="uppercase text-xs text-gray-500">Exit code</div>
                <div class="text-gray-700">{{ resultsStore.byId[selectedRow.id]?.lastExitCode ?? '-' }}</div>
              </div>
              <div class="col-12 md:col-6">
                <div class="uppercase text-xs text-gray-500">Run ID</div>
                <div class="text-gray-700 break-all">{{ resultsStore.byId[selectedRow.id]?.lastRunRunId ?? '-' }}</div>
              </div>
            </div>

            <div
              v-if="selectedRow.id === 'gh-0719-closed' && issueStateById[selectedRow.id] === 'closed' && resultsStore.byId[selectedRow.id]?.result === 'fail'"
              class="p-3 rounded border border-amber-200 bg-amber-50 text-amber-900"
            >
              This GitHub issue is marked <b>Closed</b>, but the current E2E repro is still <b>failing</b>.
              This usually means either the bug regressed, the fix was incomplete in the deployed environment, or the test is asserting outdated behavior.
              Check the log tail below for the actual assertion/error.
            </div>

            <div class="flex flex-column gap-1">
              <div class="uppercase text-xs text-gray-500">Last log tail</div>
              <pre class="text-xs bg-gray-900 text-gray-100 rounded p-3 overflow-auto" style="max-height: 18rem">{{
                resultsStore.byId[selectedRow.id]?.lastLogTail ?? '—'
              }}</pre>
              <div v-if="resultsStore.byId[selectedRow.id]?.lastLogPath" class="text-xs text-gray-500 break-all">
                Log file: <code>{{ resultsStore.byId[selectedRow.id].lastLogPath }}</code>
              </div>
            </div>
          </div>
        </RoarModal>

        <section class="flex flex-column gap-3">
          <div class="flex items-center justify-content-between">
            <div class="text-xl text-gray-700 font-semibold">Bugs</div>
          </div>

          <div class="overflow-auto rounded border border-gray-200 bg-white">
            <table class="min-w-full text-sm">
              <thead class="bg-gray-50 text-gray-600">
                <tr>
                  <th class="text-left p-3">Name</th>
                  <th class="text-left p-3 w-32">Run</th>
                  <th class="text-left p-3">Open/Closed</th>
                  <th class="text-left p-3">Result</th>
                  <th class="text-left p-3">Test last run</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in bugRows" :key="row.id" class="border-t border-gray-100">
                  <td class="p-3 font-medium text-gray-800 whitespace-nowrap">{{ row.name }}</td>
                  <td class="p-3">
                    <div class="flex items-center gap-2">
                      <PvButton
                        icon="pi pi-play"
                        class="bg-primary text-white border-none"
                        :loading="Boolean(running[row.id])"
                        :disabled="!runnerAvailable || Boolean(running[row.id])"
                        @click="runTest(row)"
                      />
                      <PvButton
                        icon="pi pi-info-circle"
                        class="bg-white text-gray-700 border border-gray-200"
                        v-tooltip.bottom="'Details'"
                        @click="openDetails(row)"
                      />
                    </div>
                  </td>
                  <td class="p-3 w-32 whitespace-nowrap">
                    <a
                      v-if="row.githubIssueNumber"
                      class="text-primary underline"
                      :href="issueLinks[row.id]"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {{ issueStateLabel(row.id) }}
                    </a>
                    <span v-else class="text-gray-500">-</span>
                  </td>
                  <td class="p-3 w-32 whitespace-nowrap">
                    <span :class="resultClass(row.id)">{{ resultLabel(row.id) }}</span>
                  </td>
                  <td class="p-3 whitespace-nowrap text-gray-600">
                    {{ formatLastRun(resultsStore.byId[row.id]?.lastRunAt) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="flex flex-column gap-3">
          <div class="flex items-center justify-content-between">
            <div class="text-xl text-gray-700 font-semibold">Tasks</div>
          </div>

          <div class="overflow-auto rounded border border-gray-200 bg-white">
            <table class="min-w-full text-sm">
              <thead class="bg-gray-50 text-gray-600">
                <tr>
                  <th class="text-left p-3">Name</th>
                  <th class="text-left p-3 w-32">Run</th>
                  <th class="text-left p-3">Status</th>
                  <th class="text-left p-3">Result</th>
                  <th class="text-left p-3">Test last run</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in taskRows" :key="row.id" class="border-t border-gray-100">
                  <td class="p-3 font-medium text-gray-800 whitespace-nowrap">{{ row.name }}</td>
                  <td class="p-3">
                    <div class="flex items-center gap-2">
                      <PvButton
                        icon="pi pi-play"
                        class="bg-primary text-white border-none"
                        :loading="Boolean(running[row.id])"
                        :disabled="!runnerAvailable || Boolean(running[row.id])"
                        @click="runTest(row)"
                      />
                      <PvButton
                        icon="pi pi-info-circle"
                        class="bg-white text-gray-700 border border-gray-200"
                        v-tooltip.bottom="'Details'"
                        @click="openDetails(row)"
                      />
                    </div>
                  </td>
                  <td class="p-3 w-32 whitespace-nowrap">
                    <span :class="taskStatusClass(row.id)">{{ taskStatusLabel(row.id) }}</span>
                  </td>
                  <td class="p-3 w-32 whitespace-nowrap">
                    <span :class="resultClass(row.id)">{{ resultLabel(row.id) }}</span>
                  </td>
                  <td class="p-3 whitespace-nowrap text-gray-600">
                    {{ formatLastRun(resultsStore.byId[row.id]?.lastRunAt) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import PvButton from 'primevue/button';
import { e2eCatalog } from '@/testing/e2eCatalog';
import { useE2EResultsStore } from '@/store/e2eResults';
import { fetchIssue } from '@/testing/githubIssues';
import RoarModal from '@/components/modals/RoarModal.vue';

const toast = useToast();
const resultsStore = useE2EResultsStore();

const running = ref({});
const issueStateById = ref({});
const issueLinks = ref({});
const runnerAvailable = ref(false);
const runnerConfig = ref(null);
const isDetailsModalOpen = ref(false);
const selectedRowId = ref(null);

const selectedRow = computed(() => rows.value.find((r) => r.id === selectedRowId.value) ?? null);

const rows = computed(() => {
  return e2eCatalog.map((entry) => {
    return {
      ...entry,
    };
  });
});

const bugRows = computed(() => rows.value.filter((r) => r.category === 'bugs'));
const taskRows = computed(() => rows.value.filter((r) => r.category === 'tasks'));

function formatLastRun(lastRunAt) {
  if (!lastRunAt) return '-';
  const date = new Date(lastRunAt);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

function resultLabel(id) {
  const result = resultsStore.byId[id]?.result ?? 'unknown';
  if (result === 'pass') return 'Pass';
  if (result === 'fail') return 'Fail';
  return 'Unknown';
}

function resultClass(id) {
  const result = resultsStore.byId[id]?.result ?? 'unknown';
  if (result === 'pass') return 'text-green-700 font-semibold';
  if (result === 'fail') return 'text-red-700 font-semibold';
  return 'text-gray-500';
}

function issueStateLabel(id) {
  const state = issueStateById.value[id] ?? 'unknown';
  if (state === 'open') return 'Open';
  if (state === 'closed') return 'Closed';
  return '…';
}

function taskStatusLabel(id) {
  const result = resultsStore.byId[id]?.result ?? 'unknown';
  if (result === 'pass') return 'Passing';
  if (result === 'fail') return 'Failing';
  return '—';
}

function taskStatusClass(id) {
  const result = resultsStore.byId[id]?.result ?? 'unknown';
  if (result === 'pass') return 'text-green-700 font-semibold';
  if (result === 'fail') return 'text-red-700 font-semibold';
  return 'text-gray-500';
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function pollUntilFinished(runId) {
  const statusRes = await fetch(`/__e2e/status?runId=${encodeURIComponent(runId)}`);
  if (!statusRes.ok) throw new Error(`Runner status failed: HTTP ${statusRes.status}`);
  const statusJson = await statusRes.json();
  if (statusJson.status === 'finished') return statusJson;
  await delay(1500);
  return await pollUntilFinished(runId);
}

async function runTest(row) {
  try {
    if (!runnerAvailable.value) {
      toast.add({
        severity: 'warn',
        summary: 'Runner not enabled',
        detail: 'Restart dev server with: npm run dev:db:runner',
        life: 8000,
      });
      return;
    }

    running.value[row.id] = true;

    const res = await fetch('/__e2e/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, command: row.runScript }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Runner request failed: HTTP ${res.status} ${res.statusText} body=${text}`);
    }

    const { runId } = await res.json();
    await resultsStore.setRunResult({ id: row.id, result: 'unknown', command: row.runScript, runId });

    const finished = await pollUntilFinished(runId);
    const result = finished.exitCode === 0 ? 'pass' : 'fail';
    await resultsStore.setRunResult({ id: row.id, result, command: row.runScript, runId });
    toast.add({
      severity: result === 'pass' ? 'success' : 'error',
      summary: 'Run complete',
      detail: `${row.name}: ${result.toUpperCase()}`,
      life: 4000,
    });
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Run failed',
      detail: e?.message ?? 'Unknown error',
      life: 8000,
    });
  } finally {
    running.value[row.id] = false;
  }
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast.add({ severity: 'success', summary: 'Copied', detail: 'Command copied to clipboard.', life: 2000 });
  } catch {
    toast.add({ severity: 'warn', summary: 'Copy failed', detail: 'Could not copy to clipboard.', life: 3000 });
  }
}

function openDetails(row) {
  selectedRowId.value = row.id;
  isDetailsModalOpen.value = true;
}

onMounted(async () => {
  try {
    const ping = await fetch('/__e2e/ping');
    runnerAvailable.value = ping.ok;
  } catch {
    runnerAvailable.value = false;
  }

  if (runnerAvailable.value) {
    try {
      const cfg = await fetch('/__e2e/config');
      if (cfg.ok) runnerConfig.value = await cfg.json();

      const res = await fetch('/__e2e/results?refresh=1');
      if (res.ok) {
        const json = await res.json();
        const byId = json?.byId ?? {};
        resultsStore.mergeFromRemote(byId);
      }
    } catch {
      // Ignore: local state still works; persistence requires gsutil/auth.
    }
  }

  const owner = 'levante-framework';
  const repo = 'levante-dashboard';
  const bugEntries = e2eCatalog.filter((e) => e.category === 'bugs' && typeof e.githubIssueNumber === 'number');

  await Promise.all(
    bugEntries.map(async (e) => {
      issueStateById.value[e.id] = 'unknown';
      try {
        const issue = await fetchIssue({ owner, repo, number: e.githubIssueNumber });
        issueStateById.value[e.id] = issue.state;
        issueLinks.value[e.id] = issue.html_url;
      } catch {
        issueStateById.value[e.id] = 'unknown';
      }
    }),
  );
});
</script>

