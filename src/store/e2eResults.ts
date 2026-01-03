import { defineStore } from 'pinia';
import { E2EResult } from '@/testing/e2eCatalog';
import { useAuthStore } from '@/store/auth';

export interface E2EStoredResult {
  result?: E2EResult;
  lastRunAt?: string;
  lastRunByUid?: string;
  lastRunByEmail?: string;
  lastRunCommand?: string;
  lastRunRunId?: string;
  lastRunUrl?: string;
  lastRunBaseUrl?: string;
  lastRunGitRef?: string;
  lastExitCode?: number;
  lastLogPath?: string;
  lastLogTail?: string;
}

export const useE2EResultsStore = defineStore('e2eResults', {
  state: () => ({
    byId: {} as Record<string, E2EStoredResult>,
  }),
  actions: {
    mergeFromRemote(byId: Record<string, Partial<E2EStoredResult>>) {
      for (const [id, rec] of Object.entries(byId ?? {})) {
        this.byId[id] = { ...(this.byId[id] ?? {}), ...(rec ?? {}) };
      }
    },
    async setRunResult(params: { id: string; result: E2EResult; command?: string; runId?: string }) {
      const authStore = useAuthStore();
      const lastRunAt = new Date().toISOString();
      const payload: E2EStoredResult = {
        result: params.result,
        lastRunAt,
        lastRunByUid: authStore.getUid(),
        lastRunByEmail: authStore.getEmail(),
        lastRunCommand: params.command,
        lastRunRunId: params.runId,
      };

      this.byId[params.id] = { ...(this.byId[params.id] ?? {}), ...payload };
      return true;
    },
  },
  persist: true,
});

