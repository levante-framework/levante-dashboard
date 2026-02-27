import { type Ref, computed, watch } from 'vue';
import { useQueryClient } from '@tanstack/vue-query';
import { ADMINISTRATIONS_LIST_QUERY_KEY } from '@/constants/queryKeys';

export type SyncStatus = 'pending' | 'complete' | 'failure';

type AdministrationLike = {
  id?: string;
  syncStatus?: string;
  sync_status?: string;
  syncData?: unknown;
  sync_data?: unknown;
};

function extractRawStatus(data: AdministrationLike | null | undefined): string | undefined {
  if (!data) return undefined;
  const raw = data.syncStatus ?? data.sync_status ?? data.syncData ?? data.sync_data;
  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>;
    return (obj.status ?? obj.value) as string | undefined;
  }
  return raw as string | undefined;
}

export function isAdministrationSyncPending(data: AdministrationLike | null | undefined): boolean {
  return extractRawStatus(data) === 'pending';
}

function normalizeSyncStatus(raw: string | undefined): SyncStatus | undefined {
  if (raw === 'pending' || raw === 'failure') return raw;
  if (raw === 'complete' || raw === 'completed') return 'complete';
  if (raw) return 'complete';
  return undefined;
}

export interface UseAdministrationSyncStatusOptions {
  defaultStatus?: SyncStatus;
  administrationId?: string;
  updateListCacheOnChange?: boolean;
}

export function useAdministrationSyncStatus(
  administrationDataRef: Ref<AdministrationLike | null | undefined>,
  options: UseAdministrationSyncStatusOptions = {},
) {
  const { defaultStatus = 'complete', administrationId, updateListCacheOnChange = false } = options;
  const queryClient = useQueryClient();

  const displayedSyncStatus = computed((): SyncStatus | undefined => {
    const raw = extractRawStatus(administrationDataRef.value);
    return normalizeSyncStatus(raw) ?? defaultStatus;
  });

  const isPending = computed(() => displayedSyncStatus.value === 'pending');

  if (updateListCacheOnChange && administrationId) {
    watch(
      displayedSyncStatus,
      (newStatus, oldStatus) => {
        if (oldStatus === 'pending' && newStatus !== 'pending') {
          queryClient.setQueriesData(
            { queryKey: [ADMINISTRATIONS_LIST_QUERY_KEY], exact: false },
            (oldData: unknown) => {
              if (!Array.isArray(oldData)) return oldData;
              return oldData.map((admin: { id?: string }) =>
                admin?.id === administrationId ? { ...admin, syncStatus: newStatus } : admin,
              );
            },
          );
        }
      },
      { flush: 'sync' },
    );
  }

  return { displayedSyncStatus, isPending };
}
