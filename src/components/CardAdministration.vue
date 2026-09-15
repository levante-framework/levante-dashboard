<template>
  <div class="assignment">
    <div class="flex align-items-start w-full">
      <main class="assignment__main">
        <h1 class="assignment__name">{{ title }}</h1>

        <div class="assignment__details">
          <div class="assignment__detail">
            <p class="m-0 font-semibold">Status:</p>
            <div
              :class="[
                'assignment__badge',
                `assignment__badge--${displayedSyncStatus}`,
              ]"
            >
              <i
                v-if="displayedSyncStatus === 'complete'"
                class="pi pi-check font-semibold text-xs"
              ></i>

              <i
                v-if="displayedSyncStatus === 'failed'"
                class="pi pi-times font-semibold text-xs"
              ></i>

              <div
                v-if="displayedSyncStatus === 'pending'"
                class="assignment__badge-pulse"
              ></div>

              <p class="m-0">{{ statusToLabel[displayedSyncStatus!] }}</p>
            </div>
          </div>

          <div class="assignment__detail">
            <p class="m-0 font-semibold">Created by:</p>
            <p class="m-0">{{ props.creatorName }}</p>
          </div>

          <div class="assignment__detail">
            <div
              class="flex align-items-center gap-1"
              v-tooltip.top="getTooltip(administrationStatus, { showDelay: 0 })"
            >
              <div
                :class="[
                  'assignment__availability',
                  `assignment__availability--${administrationStatusBadge}`,
                ]"
              />
              <p class="m-0 font-semibold">Availability:</p>
            </div>
            <p class="m-0">
              {{ processedDates.start.toLocaleDateString() }}
              <i class="pi pi-angle-right text-xs text-gray-400"></i>
              {{ processedDates.end.toLocaleDateString() }}
            </p>
          </div>

          <div class="assignment__detail">
            <p class="m-0 font-semibold">Tasks:</p>
            <template v-if="!isLoadingTasksDictionary">
              <div class="flex align-items-center flex-wrap gap-2">
                <div
                  v-for="assessmentId in assessmentIds"
                  :key="assessmentId"
                  class="assignment__task"
                >
                  <span>
                    {{ tasksDictionary[assessmentId]?.name ?? assessmentId }}
                  </span>

                  <span
                    v-if="showParams"
                    v-tooltip.top="getTooltip('View parameters')"
                    class="pi pi-info-circle cursor-pointer ml-1"
                    style="font-size: 0.8rem"
                    @click="toggleParams($event, assessmentId)"
                  />
                </div>
              </div>
            </template>

            <div v-if="showParams">
              <PvPopover
                v-for="assessmentId in assessmentIds"
                :key="assessmentId"
                :ref="paramPanelRefs[assessmentId]"
              >
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
                  <PvColumn
                    field="key"
                    header="Parameter"
                    style="width: 50%"
                  ></PvColumn>
                  <PvColumn
                    field="value"
                    header="Value"
                    style="width: 50%"
                  ></PvColumn>
                </PvDataTable>
              </PvPopover>
            </div>
          </div>
        </div>
      </main>

      <div v-if="isSyncComplete" class="flex justify-content-end mr-4">
        <router-link
          :to="{
            name: 'AdministrationProgressReport',
            params: {
              administrationId: props.id,
            },
          }"
          class="no-underline text-black"
        >
          <PvButton
            v-tooltip.top="getTooltip('View assignment progress')"
            class="progress-report-button"
            icon="pi pi-chart-bar"
            severity="secondary"
            outlined
            label="View General Progress"
            aria-label="View assignment progress"
            size="small"
            data-cy="button-administration-progress"
          />
        </router-link>
      </div>

      <div
        v-if="isSyncComplete || displayedSyncStatus === 'failed'"
        class="assignment__actions"
      >
        <PvButton
          iconOnly
          rounded
          severity="danger"
          variant="outlined"
          v-tooltip.top="getTooltip('Edit assignment')"
          @click="onClickEditBtn"
        >
          <i class="pi pi-pencil"></i>
        </PvButton>
      </div>
    </div>

    <div
      v-if="isSyncComplete || displayedSyncStatus === 'failed'"
      class="assignment__progress-table"
    >
      <div
        class="assignment__progress-table__header"
        :class="{
          'assignment__progress-table__header--open': isProgressTableOpen,
        }"
        @click="onClickProgressTableHeader"
      >
        <p class="assignment__progress-table__toggle-label">See Progress Details</p>
        <i v-if="isProgressTableOpen" class="pi pi-angle-up"></i>
        <i v-else class="pi pi-angle-down"></i>
      </div>

      <div
        v-show="isProgressTableOpen"
        class="assignment__progress-table__body"
      >
        <PvTreeTable
          v-if="isSyncComplete"
          lazy
          row-hover
          :loading="loadingTreeTable"
          :value="treeTableOrgs"
          @node-expand="onExpand"
        >
          <PvColumn field="name" expander style="width: 20rem"></PvColumn>
          <PvColumn field="id" header="" style="width: 14rem">
            <template #body="{ node }">
              <div
                v-if="node.data.id"
                class="flex justify-content-end m-0 w-full"
              >
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
                    v-tooltip.top="getTooltip('View detailed progress')"
                    class="progress-report-button"
                    icon="pi pi-chart-line"
                    severity="secondary"
                    outlined
                    label="Progress Details"
                    aria-label="View detailed progress"
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
                    style="
                      height: 2.5rem;
                      color: var(--primary-color) !important;
                    "
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
  </div>
</template>

<script setup lang="ts">
import { useQueryClient } from '@tanstack/vue-query';
import _fromPairs from 'lodash/fromPairs';
import _isEmpty from 'lodash/isEmpty';
import _mapValues from 'lodash/mapValues';
import _toPairs from 'lodash/toPairs';
import PvButton from 'primevue/button';
import PvColumn from 'primevue/column';
import PvDataTable from 'primevue/datatable';
import PvPopover from 'primevue/popover';
import PvTreeTable from 'primevue/treetable';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, toValue, watchEffect } from 'vue';
import { useRouter } from 'vue-router';
import useUpsertAdministrationMutation from '@/composables/mutations/useUpsertAdministrationMutation';
import useAdministrationsQuery from '@/composables/queries/useAdministrationsQuery';
import useDsgfOrgQuery from '@/composables/queries/useDsgfOrgQuery';
import useTasksDictionaryQuery from '@/composables/queries/useTasksDictionaryQuery';
import { type SyncStatus, useAdministrationSyncStatus } from '@/composables/useAdministrationSyncStatus';
import { isLevante } from '@/constants';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';
import { SINGULAR_ORG_TYPES } from '@/constants/orgTypes';
import { ADMINISTRATIONS_LIST_QUERY_KEY, ADMINISTRATIONS_QUERY_KEY } from '@/constants/queryKeys';
import { TOAST_DEFAULT_LIFE_DURATION, TOAST_SEVERITIES } from '@/constants/toasts';
import { getTooltip } from '@/helpers';
import { buildRetryAdministrationArgs } from '@/helpers/administrations';
import { batchGetDocs } from '@/helpers/query/utils';
import { taskDisplayNames } from '@/helpers/reports';
import { useAuthStore } from '@/store/auth';

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

interface Props {
  id: string;
  title: string;
  publicName: string;
  dates: Dates;
  assignees: any;
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

const statusToLabel = {
  pending: 'Processing',
  complete: 'Assigned',
  failed: 'Failed',
};

const toast = useToast();

const { mutate: upsertAdministration, isPending: isRetrying } = useUpsertAdministrationMutation();

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
      queryClient.invalidateQueries({
        queryKey: [ADMINISTRATIONS_LIST_QUERY_KEY],
      });
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

const isProgressTableOpen = ref(false);
const onClickProgressTableHeader = () => (isProgressTableOpen.value = !isProgressTableOpen.value);

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

const onClickEditBtn = () => {
  router.push({
    name: 'EditAssignment',
    params: { adminId: props.id },
  });
};
</script>

<style lang="scss">
.assignment {
  display: block;
  width: 100%;
  height: auto;
  margin: 0;
  padding: 1.5rem;
  background-color: var(--surface-b);
  border: 1px solid var(--gray-200);
  border-radius: calc(var(--border-radius) * 4);
  overflow-x: hidden;

  &__main {
    flex: 1;
  }

  &__name {
    display: block;
    margin: 0 0 1rem;
    font-weight: 700;
    font-size: 1.25rem;
  }

  &__details {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  &__detail {
    display: flex;
    align-items: start;
    gap: 0.25rem;
    min-height: 1.25rem;
    font-size: 14px;
  }

  &__badge {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin: 0;
    padding: 0.2rem 0.5rem;
    border-radius: 99999px;
    font-family: var(--font-family);
    font-weight: 700;
    font-size: 0.7rem;
    text-transform: uppercase;

    &--complete {
      background-color: rgba(var(--bright-green-rgb), 0.15);
      color: var(--bright-green);
    }

    &--failed {
      background-color: rgba(var(--bright-red-rgb), 0.15);
      color: var(--bright-red);
    }

    &--pending {
      background-color: rgba(var(--bright-yellow-rgb), 0.15);
      color: var(--bright-yellow);
    }
  }

  &__badge-pulse {
    display: block;
    width: 10px;
    height: 10px;
    margin: 0 0.25rem 0 0;
    padding: 0;
    border-radius: 100%;
    background-color: var(--bright-yellow);
    position: relative;

    &::before,
    &::after {
      content: "";
      position: absolute;
      inset: 0;
      border: 2px solid var(--bright-yellow);
      border-radius: 100%;
      animation: pulse 2s ease-out infinite;
    }

    &::after {
      animation-delay: 1s;
    }
  }

  &__availability {
    display: block;
    width: 10px;
    height: 10px;
    margin: 0;
    padding: 0;
    border-radius: 100%;
  }

  &__availability--upcoming {
    background-color: var(--bright-yellow);
  }

  &__availability--open {
    background-color: var(--bright-green);
  }

  &__availability--closed {
    background-color: var(--gray-400);
  }

  &__task {
    display: block;
    margin: 0;
    padding: 0.25rem 0.35rem;
    background-color: var(--surface-d);
    border-radius: 6px;
    line-height: 1;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    flex-shrink: none;
    gap: 1rem;

    .p-button {
      padding: 0.5rem;
      flex-shrink: none;
    }
  }

  &__progress-table {
    display: block;
    width: 100%;
    height: auto;
    margin: 1rem 0 0;
    padding: 0;
    border: 1px solid var(--gray-200);
    border-radius: 0.65rem;
    overflow: hidden;

    &__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      height: auto;
      margin: 0;
      padding: 0.75rem;
      background-color: white;
      cursor: pointer;

      &--open {
        background-color: transparent;
      }
    }

    &__toggle-label {
      display: block;
      margin: 0;
      font-weight: 600;
      font-size: 14px;
      user-select: none;
    }

    .p-treetable-thead {
      display: none;
    }
  }
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }

  100% {
    transform: scale(2.5);
    opacity: 0;
  }
}
</style>
