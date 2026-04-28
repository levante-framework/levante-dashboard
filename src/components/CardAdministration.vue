<template>
  <div class="p-card card-administration mb-4 w-full">
    <div class="card-admin-body w-full">
      <div class="flex flex-row w-full md:h-2rem sm:h-3rem">
        <div class="flex-grow-1 pr-3 mr-2 p-0 m-0">
          <h2 data-cy="h2-card-admin-title" class="sm:text-lg lg:text-lx m-0 h2-card-admin-title">
            {{ title }}
          </h2>
          <div class="flex flex-wrap align-items-center gap-2">
            <small class="m-0 ml-1">
              — Created by <span class="font-bold">{{ props.creatorName }}</span></small
            >
            <SyncStatusBadge :status="displayedSyncStatus" class="status-badge" />
          </div>
        </div>
        <div
          v-if="speedDialItems.length > 0 && (isSyncComplete || displayedSyncStatus === 'failed')"
          class="flex justify-content-end w-3"
        >
          <PvSpeedDial
            :action-button-props="{
              rounded: true,
              severity: 'danger',
              variant: 'outlined',
            }"
            :button-props="{
              rounded: true,
              severity: 'danger',
              variant: 'outlined',
            }"
            :model="speedDialItems"
            :tooltip-options="{
              event: 'hover',
              position: 'top',
            }"
            :transition-delay="80"
            class="administration-action"
            direction="left"
            hide-icon="pi pi-times"
            show-icon="pi pi-cog"
          />
          <PvConfirmPopup />
        </div>
      </div>
      <div class="card-admin-details">
        <span class="mr-1"><strong>Availability</strong>:</span>
        <span>
          {{ processedDates.start.toLocaleDateString() }} —
          {{ processedDates.end.toLocaleDateString() }}
        </span>
        <span :class="['status-badge', administrationStatusBadge]">
          {{ administrationStatus }}
        </span>
      </div>
      <div class="card-admin-assessments">
        <span class="mr-1"><strong>Tasks</strong>:</span>
        <template v-if="!isLoadingTasksDictionary">
          <span v-for="assessmentId in assessmentIds" :key="assessmentId" class="card-inline-list-item">
            <span>{{ tasksDictionary[assessmentId]?.name ?? assessmentId }}</span>
            <span
              v-if="showParams"
              v-tooltip.top="getTooltip('View parameters')"
              class="pi pi-info-circle cursor-pointer ml-1"
              style="font-size: 0.8rem"
              @click="toggleParams($event, assessmentId)"
            />
          </span>
        </template>

        <div v-if="showParams">
          <PvPopover v-for="assessmentId in assessmentIds" :key="assessmentId" :ref="paramPanelRefs[assessmentId]">
            <div v-if="getAssessment(assessmentId).variantId">
              Variant ID: {{ getAssessment(assessmentId).variantId }}
            </div>
            <div v-if="getAssessment(assessmentId).variantName">
              Variant Name: {{ getAssessment(assessmentId).variantName }}
            </div>
            <PvDataTable
              striped-rows
              class="p-datatable-small"
              table-style="min-width: 30rem"
              :value="toEntryObjects(params[assessmentId])"
            >
              <PvColumn field="key" header="Parameter" style="width: 50%"></PvColumn>
              <PvColumn field="value" header="Value" style="width: 50%"></PvColumn>
            </PvDataTable>
          </PvPopover>
        </div>
      </div>
      <PvTreeTable
        v-if="isSyncComplete"
        class="mt-3"
        lazy
        row-hover
        :loading="loadingTreeTable"
        :value="treeTableOrgs"
        @node-expand="onExpand"
      >
        <PvColumn field="name" expander style="width: 20rem"></PvColumn>
        <PvColumn field="id" header="" style="width: 14rem">
          <template #body="{ node }">
            <div v-if="node.data.id" class="flex m-0">
              <router-link
                v-if="isSyncComplete"
                :to="{
                  name: 'ProgressReport',
                  params: {
                    administrationId: props.id,
                    orgId: node.data.id,
                    orgType: node.data.orgType,
                  },
                }"
                class="no-underline text-black"
              >
                <PvButton
                  v-tooltip.top="getTooltip('See progress')"
                  class="m-0 bg-transparent text-bluegray-500 shadow-none border-none p-0 border-round"
                  style="color: var(--primary-color) !important"
                  severity="secondary"
                  text
                  raised
                  label="See Progress"
                  aria-label="See progress"
                  size="small"
                  data-cy="button-progress"
                />
              </router-link>
              <router-link
                v-if="!isLevante"
                :to="{
                  name: 'ScoreReport',
                  params: {
                    administrationId: props.id,
                    orgId: node.data.id,
                    orgType: node.data.orgType,
                  },
                }"
                class="no-underline"
              >
                <PvButton
                  v-tooltip.top="getTooltip('See Scores')"
                  class="m-0 mr-1 surface-0 text-bluegray-500 shadow-1 border-none p-2 border-round hover:surface-100"
                  style="height: 2.5rem; color: var(--primary-color) !important"
                  severity="secondary"
                  text
                  raised
                  label="Scores"
                  aria-label="Scores"
                  size="small"
                  data-cy="button-scores"
                />
              </router-link>
            </div>
          </template>
        </PvColumn>
      </PvTreeTable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, toValue, watchEffect } from 'vue';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { useRouter } from 'vue-router';
import _fromPairs from 'lodash/fromPairs';
import _isEmpty from 'lodash/isEmpty';
import _mapValues from 'lodash/mapValues';
import _toPairs from 'lodash/toPairs';
import PvButton from 'primevue/button';
import PvColumn from 'primevue/column';
import PvConfirmPopup from 'primevue/confirmpopup';
import PvDataTable from 'primevue/datatable';
import PvPopover from 'primevue/popover';
import PvSpeedDial from 'primevue/speeddial';
import PvTreeTable from 'primevue/treetable';
import { batchGetDocs } from '@/helpers/query/utils';
import { taskDisplayNames } from '@/helpers/reports';
import useDsgfOrgQuery from '@/composables/queries/useDsgfOrgQuery';
import useTasksDictionaryQuery from '@/composables/queries/useTasksDictionaryQuery';
import useDeleteAdministrationMutation from '@/composables/mutations/useDeleteAdministrationMutation';
import useUpsertAdministrationMutation from '@/composables/mutations/useUpsertAdministrationMutation';
import { buildRetryAdministrationArgs } from '@/helpers/administrations';
import { SINGULAR_ORG_TYPES } from '@/constants/orgTypes';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';
import { TOAST_SEVERITIES, TOAST_DEFAULT_LIFE_DURATION } from '@/constants/toasts';
import { isLevante, getTooltip } from '@/helpers';
import { useQueryClient } from '@tanstack/vue-query';
import useAdministrationsQuery from '@/composables/queries/useAdministrationsQuery';
import { useAdministrationSyncStatus, type SyncStatus } from '@/composables/useAdministrationSyncStatus';
import { ADMINISTRATIONS_LIST_QUERY_KEY, ADMINISTRATIONS_QUERY_KEY } from '@/constants/queryKeys';
import { useAuthStore } from '@/store/auth';
import SyncStatusBadge from '@/components/SyncStatusBadge.vue';
import { usePermissions } from '@/composables/usePermissions';
import { ROLES } from '@/constants/roles';

// TODO: Remove this once we have a proper delete option
const SHOW_DELETE_OPTION = false;

interface Assessment {
  taskId: string;
  variantId?: string;
  variantName?: string;
  params: Record<string, any>;
}

interface Dates {
  start: string | Date;
  end: string | Date;
}

interface Assignees {
  [key: string]: any;
}

interface Props {
  id: string;
  title: string;
  publicName: string;
  dates: Dates;
  assignees: Assignees;
  assessments: Assessment[];
  showParams: boolean;
  isSuperAdmin: boolean;
  creatorName: string;
  syncStatus?: SyncStatus;
  currentPage?: number;
  rowsPerPage?: number;
  cardIndexInPage?: number;
  onDeleteAdministration?: (administrationId: string) => void;
}

interface SpeedDialItem {
  label: string;
  icon: string;
  command: (event?: any) => void;
}

interface TreeNode {
  key: string;
  data: {
    id?: string;
    name?: string;
    orgType?: string;
    districtId?: string;
    schoolId?: string;
    expanded?: boolean;
  };
  children?: TreeNode[];
}

const router = useRouter();
const queryClient = useQueryClient();
const authStore = useAuthStore();

const props = withDefaults(defineProps<Props>(), {
  creatorName: '--',
  syncStatus: 'complete',
  currentPage: 1,
  rowsPerPage: 10,
  cardIndexInPage: 0,
  onDeleteAdministration: () => {},
});

const { hasRole } = usePermissions();

const confirm = useConfirm();
const toast = useToast();

const { mutateAsync: deleteAdministration } = useDeleteAdministrationMutation();
const {
  mutate: upsertAdministration,
  isPending: isRetrying,
} = useUpsertAdministrationMutation();

const now = computed(() => new Date());

const isCurrent = computed(() => {
  const opened = new Date(props?.dates?.start);
  const closed = new Date(props?.dates?.end);
  return opened <= now.value && closed >= now.value;
});

const isUpcoming = computed(() => new Date(props?.dates?.start) > now.value);

const administrationStatus = computed((): string => {
  if (isCurrent.value) return 'Open';
  else if (isUpcoming.value) return 'Upcoming';
  else return 'Closed';
});

const administrationStatusBadge = computed((): string => administrationStatus.value.toLowerCase());

const isOnCurrentPage = computed(() => {
  const { currentPage, rowsPerPage, cardIndexInPage } = props;
  if (currentPage == null || rowsPerPage == null || cardIndexInPage == null) return false;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const globalIndex = startIndex + cardIndexInPage;
  return globalIndex >= startIndex && globalIndex < endIndex;
});

const administrationIds = computed(() => (props.id ? [props.id] : []));
const shouldPoll = computed(() => isOnCurrentPage.value && props.syncStatus === 'pending');
const shouldFetchForRetry = computed(
  () => isOnCurrentPage.value && (props.syncStatus === 'pending' || props.syncStatus === 'failed'),
);

const { data: polledAdministrations } = useAdministrationsQuery(administrationIds, {
  enabled: shouldFetchForRetry,
  refetchInterval: computed(() => (shouldPoll.value ? 5000 : false)) as never,
} as never);

const administrationDataRef = computed(() => {
  const admins = polledAdministrations.value;
  if (admins?.length) return admins[0];
  return { syncStatus: props.syncStatus };
});

const { displayedSyncStatus } = useAdministrationSyncStatus(administrationDataRef, {
  defaultStatus: props.syncStatus,
  administrationId: props.id,
  updateListCacheOnChange: true,
});

const isSyncComplete = computed(() => displayedSyncStatus.value === 'complete');

const canRetry = computed(
  () =>
    displayedSyncStatus.value === 'failed' &&
    administrationDataRef.value &&
    typeof administrationDataRef.value === 'object' &&
    'name' in administrationDataRef.value,
);

const onRetry = () => {
  const admin = administrationDataRef.value;
  if (!canRetry.value || !admin || typeof admin !== 'object' || !props.id) return;
  const args = buildRetryAdministrationArgs(
    admin as Record<string, unknown>,
    toValue(authStore.currentSite) ?? undefined,
  );
  upsertAdministration(args, {
    onSuccess: () => {
      toast.add({
        severity: TOAST_SEVERITIES.SUCCESS,
        summary: 'Success',
        detail: 'Assignment sync has been retried. Please check back in a few minutes.',
        life: TOAST_DEFAULT_LIFE_DURATION,
      });
      queryClient.invalidateQueries({ queryKey: [ADMINISTRATIONS_LIST_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [ADMINISTRATIONS_QUERY_KEY] });
    },
    onError: (error: Error) => {
      toast.add({
        severity: TOAST_SEVERITIES.ERROR,
        summary: 'Error',
        detail: error.message,
        life: TOAST_DEFAULT_LIFE_DURATION,
      });
    },
  });
};

const speedDialItems = computed((): SpeedDialItem[] => {
  const items: SpeedDialItem[] = [];

  // TODO: Change this to admin when edit assignment refactor is complete
  if (SHOW_DELETE_OPTION && isSyncComplete.value && isUpcoming.value && hasRole(ROLES.SUPER_ADMIN)) {
    items.push({
      label: 'Delete',
      icon: 'pi pi-trash',
      command: (event) => {
        confirm.require({
          target: event.originalEvent.currentTarget,
          message: 'Are you sure you want to delete this administration?',
          icon: 'pi pi-exclamation-triangle',
          accept: async () => {
            props?.onDeleteAdministration?.(props?.id);

            toast.add({
              severity: TOAST_SEVERITIES.INFO,
              summary: 'Confirmed',
              detail: `The deletion of ${props.title} is being processed. Please check back in a few minutes.`,
              life: TOAST_DEFAULT_LIFE_DURATION,
            });

            await deleteAdministration(props.id);
            queryClient.invalidateQueries({ queryKey: [ADMINISTRATIONS_LIST_QUERY_KEY] });
            console.log(`Administration ${props.title} deleted successfully`);
          },
          reject: () => {
            toast.add({
              severity: TOAST_SEVERITIES.ERROR,
              summary: 'Rejected',
              detail: `Failed to delete administration ${props.title}`,
              life: TOAST_DEFAULT_LIFE_DURATION,
            });
          },
        });
      },
    });
  }
  if (hasRole(ROLES.ADMIN) && isSyncComplete.value) {
    items.push({
      label: 'Edit',
      icon: 'pi pi-pencil',
      command: () => {
        router.push({
          name: 'EditAssignment',
          params: { adminId: props.id },
        });
      },
    });
  }
  if (hasRole(ROLES.ADMIN) && displayedSyncStatus.value === 'failed' && canRetry.value) {
    items.push({
      label: 'Retry',
      icon: 'pi pi-sync',
      command: () => onRetry(),
    });
  }
  return items;
});

const processedDates = computed(() => {
  return _mapValues(props.dates, (date) => {
    return new Date(date);
  });
});

const assessmentIds: string[] = props.assessments
  .map((assessment) => assessment.taskId.toLowerCase())
  .sort((p1, p2) => {
    return ((taskDisplayNames as any)[p1]?.order ?? 0) - ((taskDisplayNames as any)[p2]?.order ?? 0);
  });

const paramPanelRefs: Record<string, any> = _fromPairs(
  props.assessments.map((assessment) => [assessment.taskId.toLowerCase(), ref()]),
);

const params: Record<string, Record<string, any>> = _fromPairs(
  props.assessments.map((assessment) => [assessment.taskId.toLowerCase(), assessment.params]),
);

const toEntryObjects = (inputObj: Record<string, any>): Array<{ key: string; value: any }> => {
  return _toPairs(inputObj).map(([key, value]) => ({ key, value }));
};

const toggleParams = (event: Event, id: string): void => {
  paramPanelRefs[id].value[0].toggle(event);
};

function getAssessment(assessmentId: string): Assessment | undefined {
  return props.assessments.find((assessment) => assessment.taskId.toLowerCase() === assessmentId);
}

const enableQueries = ref<boolean>(false);

onMounted((): void => {
  enableQueries.value = true;
});

const { data: tasksDictionary, isLoading: isLoadingTasksDictionary } = useTasksDictionaryQuery();

const { data: orgs, isLoading: isLoadingDsgfOrgs } = useDsgfOrgQuery(props.id, props.assignees, {
  enabled: enableQueries,
  staleTime: 0,
  gcTime: 0,
});

const loadingTreeTable = computed((): boolean => {
  return isLoadingDsgfOrgs.value || expanding.value;
});

const treeTableOrgs = ref<TreeNode[]>([]);

const cloneTreeNodes = (nodes: TreeNode[] = []): TreeNode[] =>
  nodes.map((node) => ({
    ...node,
    data: { ...node.data },
    ...(node.children ? { children: cloneTreeNodes(node.children) } : {}),
  }));

watchEffect(() => {
  treeTableOrgs.value = cloneTreeNodes(orgs.value ?? []);
});

const expanding = ref<boolean>(false);
const onExpand = async (node: TreeNode): Promise<void> => {
  if (
    node.data.orgType === SINGULAR_ORG_TYPES.SCHOOLS &&
    node.children &&
    node.children.length > 0 &&
    !node.data.expanded
  ) {
    expanding.value = true;

    const classPaths = node.children.map(({ data }) => `classes/${data.id}`);
    const classDocs = await batchGetDocs(classPaths, ['name', 'schoolId']);

    // Lazy node is a copy of the expanding node. We will insert more detailed
    // children nodes later.
    const lazyNode: TreeNode = {
      key: node.key,
      data: {
        ...node.data,
        expanded: true,
      },
    };

    const childNodes: TreeNode[] = [];
    classDocs.forEach((orgDoc: Record<string, unknown> | undefined, index: number) => {
      if (!orgDoc) return;
      const { collection = FIRESTORE_COLLECTIONS.CLASSES, ...nodeData } = orgDoc;
      if (_isEmpty(nodeData)) return;
      childNodes.push({
        key: `${node.key}-${index}`,
        data: {
          orgType: (SINGULAR_ORG_TYPES as any)[String(collection).toUpperCase()],
          ...nodeData,
        },
      });
    });

    lazyNode.children = childNodes;

    // Replace the existing nodes with a map that inserts the child nodes at the
    // appropriate position
    const newNodes = treeTableOrgs.value.map((n) => {
      // First, match on the districtId if the expanded school is part of a district
      if (n.data.id === node.data.districtId) {
        const newNode = {
          ...n,
          // Replace the existing school child nodes with a map that inserts the
          // classes at the appropriate position
          children: n.children?.map((child) => {
            if (child.data.id === node.data.id) {
              return lazyNode;
            }
            return child;
          }),
        };
        return newNode;
        // Next check to see if the expanded node was the school node itself
      } else if (n.data.id === node.data.id) {
        return lazyNode;
      }

      return n;
    });

    for (const districtNode of newNodes ?? []) {
      for (const schoolNode of districtNode?.children ?? []) {
        if (schoolNode.children) {
          schoolNode.children = schoolNode.children.toSorted((a, b) =>
            (a.data.name || '').localeCompare(b.data.name || ''),
          );
        }
      }
    }

    treeTableOrgs.value = newNodes;
    expanding.value = false;
  }
};
</script>

<style lang="scss">
.p-treetable-header-cell {
  display: none;
}

.p-confirm-popup .p-confirm-popup-footer button {
  background-color: var(--primary-color);
  border: none;
  border-radius: 0.35rem;
  padding: 0.4em;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  color: white;
}

.p-confirm-popup .p-confirm-popup-footer button:hover {
  background-color: var(--red-900);
}

.card-admin-assessments {
  margin-top: 10px;
}

.p-dataview-paginator-top {
  border-bottom: 0px solid transparent !important;
}

.card-administration {
  text-align: left;
  width: 100%;
  background: var(--surface-b);
  border: 1px solid var(--gray-200);
  border-radius: calc(var(--border-radius) * 4);
  display: flex;
  flex-direction: row;
  gap: 2rem;
  padding: 2rem;
  overflow-y: hidden;
  overflow-x: auto;

  .card-admin-chart {
    width: 12ch;
    @media (max-width: 768px) {
      display: none;
    }
  }

  .card-admin-body {
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    align-content: start;
  }

  .break {
    flex-basis: 100%;
    height: 0;
  }

  .card-admin-title {
    font-weight: bold;
    width: 100%;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--surface-d);
    flex: 1 1 100%;
  }

  .card-admin-link {
    margin-top: 2rem;
    width: 100%;
  }

  .card-admin-class-list {
    width: 100%;
    margin-top: 2rem;
  }

  .cursor-pointer {
    cursor: pointer;
  }
}

.card-inline-list-item {
  position: relative;

  &:not(:last-of-type):after {
    content: ', ';
  }
}

.card-admin-details {
  display: flex;
  justify-content: start;
  align-items: center;
}

.status-badge {
  font-weight: bold;
  font-family: var(--font-family);
  padding: 0.25rem 0.5rem;
  border-radius: var(--p-border-radius-xl);
  font-size: 0.7rem;
  margin: 0 0 0 0.8rem;
  text-transform: uppercase;

  &.open {
    background: rgba(var(--bright-green-rgb), 0.2);
    color: var(--bright-green);
  }

  &.closed {
    background-color: rgba(var(--bright-red-rgb), 0.2);
    color: var(--bright-red);
  }

  &.upcoming {
    background-color: rgba(var(--bright-yellow-rgb), 0.2);
    color: var(--bright-yellow);
  }
}

.h2-card-admin-title {
  float: left;
  font-weight: bold;

  @media (max-width: 768px) {
    font-size: 1.1rem;
  }
}

.administration-action {
  display: flex;
  justify-content: end;
  align-items: center;

  .p-speeddial-item {
    width: 2rem;
    height: 2rem;
    margin: 0;
    padding: 0;

    .p-button {
      display: flex;
      width: 2rem;
      height: 2rem;
      margin: 0;
      padding: 0;
    }
  }

  &.p-speeddial-open {
    .p-speeddial-button {
      background: var(--primary-color);
      border: 1px solid var(--primary-color);
      color: white;

      &:hover {
        background: var(--primary-color-hover);
        border: 1px solid var(--primary-color-hover);
        color: white;
      }
    }
  }
}
</style>
