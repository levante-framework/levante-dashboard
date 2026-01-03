<template>
  <main class="container main w-full">
    <section class="main-body">
      <div class="flex flex-column gap-6">
        <div class="flex flex-column gap-1">
          <div class="admin-page-header">E2E Results</div>
          <div class="text-md text-gray-500">
            Run tests from the UI (local dev runner).
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
                  v-tooltip.bottom="'Copy command'"
                  icon="pi pi-copy"
                  class="bg-primary text-white border-none"
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
                <div class="uppercase text-xs text-gray-500">Run link</div>
                <a
                  v-if="resultsStore.byId[selectedRow.id]?.lastRunUrl"
                  class="text-primary underline"
                  :href="resultsStore.byId[selectedRow.id].lastRunUrl"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open workflow run
                </a>
                <div v-else class="text-gray-500">-</div>
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
                        :disabled="!runnerAvailable || Boolean(running[row.id]) || (runnerKind === 'remote' && !canRunNow)"
                        @click="runTest(row)"
                      />
                      <PvButton
                        v-tooltip.bottom="'Details'"
                        icon="pi pi-info-circle"
                        :class="detailsButtonClass(row.id)"
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
                        :disabled="!runnerAvailable || Boolean(running[row.id]) || (runnerKind === 'remote' && !canRunNow)"
                        @click="runTest(row)"
                      />
                      <PvButton
                        v-tooltip.bottom="'Details'"
                        icon="pi pi-info-circle"
                        :class="detailsButtonClass(row.id)"
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
import { useAuthStore } from '@/store/auth';
import { fetchIssue } from '@/testing/githubIssues';
import RoarModal from '@/components/modals/RoarModal.vue';
import { ROLES } from '@/constants/roles';

const toast = useToast();
const resultsStore = useE2EResultsStore();
const authStore = useAuthStore();

const running = ref({});
const issueStateById = ref({});
const issueLinks = ref({});
const runnerAvailable = ref(false);
const runnerConfig = ref(null);
const isDetailsModalOpen = ref(false);
const selectedRowId = ref(null);
const runnerKind = ref('none'); // 'none' | 'local' | 'remote'

const selectedRow = computed(() => rows.value.find((r) => r.id === selectedRowId.value) ?? null);
const canRunNow = computed(() => {
  const roles = authStore.userData?.roles?.map((r) => r.role) ?? [];
  return roles.includes(ROLES.SUPER_ADMIN);
});

const rows = computed(() => {
  return e2eCatalog.map((entry) => {
    return {
      ...entry,
    };
  });
});

const bugRows = computed(() => rows.value.filter((r) => r.category === 'bugs'));
const taskRows = computed(() => rows.value.filter((r) => r.category === 'tasks'));

function detailsButtonClass(id) {
  const isClosed = issueStateById.value[id] === 'closed';
  const result = resultsStore.byId[id]?.result ?? 'unknown';

  if (isClosed && result === 'pass') return 'bg-green-50 text-green-800 border border-green-300';
  if (isClosed && result === 'fail') return 'bg-red-50 text-red-800 border border-red-300';
  return 'bg-amber-50 text-amber-900 border border-amber-300';
}

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
  if (runnerKind.value === 'remote') {
    const token = (await authStore.getIdToken().catch(() => undefined)) ?? '';
    if (!token) throw new Error('Not authenticated');
    const statusRes = await fetch(`/api/e2e/status?runId=${encodeURIComponent(runId)}`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
    const ct = statusRes.headers.get('content-type') ?? '';
    if (!statusRes.ok) throw new Error(`Runner status failed: HTTP ${statusRes.status}`);
    if (!ct.includes('application/json')) throw new Error('Runner status returned non-JSON response');
    const statusJson = await statusRes.json();
    if (statusJson.status === 'completed') return statusJson;
    await delay(3000);
    return await pollUntilFinished(runId);
  }

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
        detail: runnerKind.value === 'remote' ? 'Remote runner not available.' : 'Restart dev server with: npm run dev:db:runner',
        life: 8000,
      });
      return;
    }

    if (runnerKind.value === 'remote' && !canRunNow.value) {
      toast.add({
        severity: 'warn',
        summary: 'Run disabled',
        detail: 'Only SuperAdmins can run tests. You can still view results.',
        life: 6000,
      });
      return;
    }

    running.value[row.id] = true;

    const baseUrl = window.location.origin;
    const token = (await authStore.getIdToken().catch(() => undefined)) ?? '';
    const endpoint = runnerKind.value === 'remote' ? '/api/e2e/run' : '/__e2e/run';
    const clientRunId = crypto.randomUUID();
    const payload =
      runnerKind.value === 'remote'
        ? { specId: row.id, baseUrl, gitRef: import.meta.env.VITE_PREVIEW_CHANNEL || 'main', clientRunId }
        : { id: row.id, command: row.runScript };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(runnerKind.value === 'remote' && token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Runner request failed: HTTP ${res.status} ${res.statusText} body=${text}`);
    }

    const runContentType = res.headers.get('content-type') ?? '';
    if (!runContentType.includes('application/json')) {
      const text = await res.text().catch(() => '');
      runnerAvailable.value = false;
      throw new Error(`Runner is not active (expected JSON, got ${runContentType || 'unknown'}): ${text.slice(0, 120)}`);
    }

    const json = await res.json();
    const runId = json?.runId ?? null;
    const effectiveRunId = runnerKind.value === 'remote' ? json?.clientRunId ?? clientRunId : runId;
    await resultsStore.setRunResult({
      id: row.id,
      result: 'unknown',
      command: row.runScript,
      runId: effectiveRunId ?? undefined,
    });

    const finished = await pollUntilFinished(effectiveRunId);
    if (runnerKind.value === 'local') {
      const result = finished.exitCode === 0 ? 'pass' : 'fail';
      await resultsStore.setRunResult({ id: row.id, result, command: row.runScript, runId });
    } else {
      await refreshRemoteResults();
    }

    toast.add({
      severity: 'success',
      summary: runnerKind.value === 'local' ? 'Run complete' : 'Run queued',
      detail: `${row.name}`,
      life: 3500,
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

async function refreshRemoteResults() {
  const token = (await authStore.getIdToken().catch(() => undefined)) ?? '';
  if (!token) return;
  const res = await fetch('/api/e2e/results', {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  });
  const ct = res.headers.get('content-type') ?? '';
  if (!res.ok || !ct.includes('application/json')) return;
  const json = await res.json().catch(() => null);
  resultsStore.mergeFromRemote(json?.byId ?? {});
}

onMounted(async () => {
  // Prefer local runner in DEV; otherwise use remote runner via /api.
  runnerAvailable.value = false;
  runnerKind.value = 'none';

  if (import.meta.env.DEV) {
    try {
      const ping = await fetch('/__e2e/ping', { headers: { Accept: 'application/json' } });
      const pingContentType = ping.headers.get('content-type') ?? '';
      if (ping.ok && pingContentType.includes('application/json')) {
        const pingJson = await ping.json().catch(() => null);
        if (pingJson?.ok) {
          runnerAvailable.value = true;
          runnerKind.value = 'local';
        }
      }
    } catch {
      // ignore
    }
  }

  if (!runnerAvailable.value) {
    try {
      const token = (await authStore.getIdToken().catch(() => undefined)) ?? '';
      if (!token) throw new Error('Not authenticated');
      const ping = await fetch('/api/e2e/ping', { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } });
      const ct = ping.headers.get('content-type') ?? '';
      if (ping.ok && ct.includes('application/json')) {
        const pingJson = await ping.json().catch(() => null);
        if (pingJson?.ok) {
          runnerAvailable.value = true;
          runnerKind.value = 'remote';
          runnerConfig.value = { targetBaseUrl: window.location.origin };
        }
      }
    } catch {
      // ignore
    }
  }

  if (runnerAvailable.value) {
    try {
      if (runnerKind.value === 'local') {
        const cfg = await fetch('/__e2e/config');
        const cfgContentType = cfg.headers.get('content-type') ?? '';
        if (cfg.ok && cfgContentType.includes('application/json')) runnerConfig.value = await cfg.json();

        const res = await fetch('/__e2e/results?refresh=1');
        const resultsContentType = res.headers.get('content-type') ?? '';
        if (res.ok && resultsContentType.includes('application/json')) {
          const json = await res.json();
          const byId = json?.byId ?? {};
          resultsStore.mergeFromRemote(byId);
        }
      } else if (runnerKind.value === 'remote') {
        await refreshRemoteResults();
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

