<template>
  <div
    :id="hasControls ? variant.id : undefined"
    :class="
      hasControls
        ? ['h-6rem', isActive()]
        : 'flex-1 flex h-6rem flex-row gap-2 border-1 border-round surface-border bg-white-alpha-90 mb-2 hover:surface-hover'
    "
  >
    <div v-if="hasControls" class="variant-card-controls">
      <PvButton
        class="variant-card-control variant-card-control--close"
        @click="handleRemove"
        ><i class="pi pi-times" style="font-size: 1rem"></i
      ></PvButton>
      <PvButton
        class="variant-card-control"
        @click="handleMoveUp"
        ><i class="pi pi-sort-up" style="font-size: 1rem"></i
      ></PvButton>
      <PvButton
        class="variant-card-control"
        @click="handleMoveDown"
        ><i class="pi pi-sort-down" style="font-size: 1rem"></i
      ></PvButton>
    </div>
    <div class="w-full my-2 flex flex-row align-items-center p-0">
      <img
        class="w-4rem shadow-2 border-round"
        :class="{ 'ml-2': !hasControls }"
        :src="variant.task.image || backupImage"
        :alt="variant.task.name"
      />
      <div :class="hasControls ? 'pl-2' : 'h-auto m-0 p-0 pl-2'">
        <div class="flex align-items-center flex-row">
          <span class="font-bold">{{ variant.task.name }}</span>
          <PvButton
            v-if="hasControls || isUserSuperAdmin()"
            class="ml-2 p-0 surface-hover border-none border-circle hover:text-100 hover:bg-primary"
            @click="toggle($event)"
            ><i
              v-tooltip.top="getTooltip('View parameters')"
              class="pi pi-info-circle text-primary p-1 border-circle hover:text-100"
            ></i
          ></PvButton>

          <i
            v-if="!isParticipant && variant?.variant?.registered"
            v-tooltip.top="getTooltip('Variant is up-to-date', { showDelay: 0 })"
            class="pi pi-verified ml-1 variant-up-to-date"
          ></i>

          <i
            v-else-if="!isParticipant && !variant?.variant?.registered"
            v-tooltip.top="getTooltip('Variant is outdated', { showDelay: 0 })"
            class="pi pi-exclamation-triangle ml-1 variant-outdated"
          ></i>

          <div v-if="variant?.variant?.params?.cat" class="flex ml-2 gap-2">
            <PvTag severity="warn" rounded><div class="font-semibold text-xs">Adaptive</div></PvTag>
          </div>
        </div>
        <div :class="hasControls ? 'flex-col align-items-center gap-2' : 'w-full'">
          <p class="m-0">
            <span class="font-semibold text-sm">Variant name: </span>
            <span class="text-sm">{{ resolveVariantDisplayName(variant.variant) }}</span>
          </p>
          <p v-if="hasControls && formattedAssignedConditions" class="m-0">
            <span class="font-semibold text-sm">Assigned to: </span>
            <span class="text-sm">{{ formattedAssignedConditions }}</span>
          </p>
        </div>
      </div>
      <PvPopover ref="op" append-to="body" class="border-1 surface-border" style="width: 40vh">
        <div class="flex justify-content-end mt-0 mb-2">
          <PvButton
            class="p-0 surface-hover border-none border-circle -rotate-45 hover:text-100 hover:bg-primary"
            @click="visible = true"
            ><i
              v-tooltip.top="getTooltip('Click to expand')"
              class="pi pi-arrows-h border-circle p-2 text-primary hover:text-100"
            ></i
          ></PvButton>
        </div>
        <div class="flex gap-2 flex-column w-full pr-3">
          <VariantParamsTable :params="variant.variant.params" table-class="text-sm" />
        </div>
      </PvPopover>
    </div>
    <div v-if="!hasControls" class="m-auto">
      <PvButton
        class="surface-hover border-1 border-300 border-circle m-0 hover:bg-primary p-0 m-2"
        data-cy="selected-variant"
        @click="handleSelect"
        ><i class="pi pi-chevron-right text-primary hover:text-white-alpha-90 p-2" style="font-size: 1rem"></i
      ></PvButton>
    </div>
    <div v-else class="mr-0 pl-0 flex flex-column">
      <EditVariantDialog
        :assessment="variant"
        :update-variant="updateVariant"
        :pre-existing-assessment-info="preExistingAssessmentInfo"
      />
      <PvButton
        v-if="variant.variant?.conditions?.assigned || variant.variant?.conditions?.optional"
        class="surface-hover border-1 border-300 border-circle m-0 hover:bg-primary p-0 m-2"
        @click="toggleShowContent()"
        ><i :class="iconClass()" style="font-size: 1rem"></i
      ></PvButton>
    </div>
  </div>
  <div
    v-if="showContent"
    class="flex-1 flex flex-column border-1 border-round surface-border surface-hover mb-2 hover:surface-ground mr-2 ml-2 pb-2"
    style="margin-top: -25px"
  >
    <div v-for="section in conditionTables" :key="section.key" class="flex gap-2 mt-2 flex-column w-full pr-3">
      <p class="font-bold mt-3 mb-1 ml-3">{{ section.label }}</p>
      <PvDataTable
        class="p-datatable-small ml-3 border-1 surface-border"
        table-style="min-width:50vh"
        :value="section.rows"
        scrollable
        scroll-height="300px"
      >
        <PvColumn
          field="field"
          header="Field"
          style="width: 33%; text-align: left; padding-left: 1vh; padding: 0.8vh"
        ></PvColumn>
        <PvColumn field="op" header="Operation" style="width: 33%; text-align: left; padding-left: 1vh; padding: 0.8vh">
        </PvColumn>
        <PvColumn field="value" header="Value" style="width: 33%; text-align: left; padding-left: 1vh; padding: 0.8vh">
        </PvColumn>
      </PvDataTable>
    </div>
    <div v-if="variant.variant?.conditions?.optional === true" class="flex mt-3 flex-column w-full ml-3 pr-5">
      <PvTag severity="success"> Assignment optional for all participants </PvTag>
    </div>
    <div
      v-if="!variant.variant?.conditions?.assigned && !variant.variant?.conditions?.optional"
      class="flex mt-2 flex-column w-full px-3 ml-3"
    >
      <PvTag severity="danger"> Assignment required for all participants </PvTag>
    </div>
  </div>
  <PvDialog v-model:visible="visible" modal header="Parameters" :style="{ width: '50rem' }">
    <div class="flex gap-2 flex-column w-full pr-3">
      <VariantParamsTable :params="variant.variant.params" table-class="text-xl" />
    </div>
  </PvDialog>
</template>

<script setup lang="ts">
import { ROLES } from '@levante-framework/permissions-core';
import _toPairs from 'lodash/toPairs';
import PvButton from 'primevue/button';
import PvColumn from 'primevue/column';
import PvDataTable from 'primevue/datatable';
import PvDialog from 'primevue/dialog';
import PvPopover from 'primevue/popover';
import PvTag from 'primevue/tag';
import { computed, h, ref } from 'vue';
import EditVariantDialog from '@/components/EditVariantDialog.vue';
import { usePermissions } from '@/composables/usePermissions';
import { getTooltip, resolveVariantDisplayName } from '@/helpers';
import { useAuthStore } from '@/store/auth';

interface Condition {
  field: string;
  op: string;
  value: any;
}

interface VariantConditions {
  assigned?: {
    conditions: Condition[];
  };
  optional?:
    | boolean
    | {
        conditions: Condition[];
      };
}

interface VariantData {
  displayName?: string;
  name: string;
  params: Record<string, any>;
  conditions?: VariantConditions;
  registered?: boolean;
}

interface TaskData {
  name: string;
  image?: string;
}

export interface VariantObject {
  id: string;
  variant: VariantData;
  task: TaskData;
}

interface Props {
  variant: VariantObject;
  hasControls?: boolean;
  updateVariant: (variant: VariantObject) => void;
  preExistingAssessmentInfo?: any[];
}

interface Emits {
  remove: [variant: VariantObject];
  select: [variant: VariantObject];
  moveUp: [variant: VariantObject];
  moveDown: [variant: VariantObject];
}

const PARAM_COL_STYLE = 'width: 50%; text-align: left; padding-left: 1vh; padding-top: 0.15vh; padding-bottom: 0.1vh';

const props = withDefaults(defineProps<Props>(), {
  hasControls: false,
  preExistingAssessmentInfo: () => [],
});

const emit = defineEmits<Emits>();
const authStore = useAuthStore();
const { isUserSuperAdmin } = authStore;
const { userRole } = usePermissions();

const isParticipant = computed(() => userRole?.value === ROLES.PARTICIPANT);

const backupImage = '/src/assets/roar-logo.png';
const showContent = ref<boolean>(false);
const op = ref<any>(null);
const visible = ref<boolean>(false);

const formattedAssignedConditions = computed((): string => {
  const conditions = props.variant.variant?.conditions?.assigned?.conditions;
  if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
    return '';
  }

  const processedStrings = conditions
    .filter((entry) => entry.field !== 'age')
    .map((entry) => {
      const valueStr = String(entry.value ?? '');
      if (!valueStr) return '';

      let displayValue = valueStr;
      if (entry.field === 'userType' && valueStr.toLowerCase() === 'student') {
        displayValue = 'child';
      }

      if (entry.field === 'userType' && valueStr.toLowerCase() === 'parent') {
        displayValue = 'caregiver';
      }

      if (entry.field === 'userType' && displayValue.toLowerCase() === 'child') {
        return entry.op === 'EQUAL' ? 'Children' : 'Not Children';
      }

      const capitalizedValue = displayValue.charAt(0).toUpperCase() + displayValue.slice(1);

      return entry.op === 'EQUAL' ? `${capitalizedValue}s` : `Not ${capitalizedValue}s`;
    })
    .filter((str) => str !== '');

  return processedStrings.length > 0 ? processedStrings.join(', ') : '';
});

const handleRemove = (): void => {
  emit('remove', props.variant);
};

const handleSelect = (): void => {
  emit('select', props.variant);
};

const handleMoveUp = (): void => {
  emit('moveUp', props.variant);
};

const handleMoveDown = (): void => {
  emit('moveDown', props.variant);
};

function toggleShowContent(): void {
  showContent.value = !showContent.value;
}

function iconClass(): string {
  return showContent.value
    ? 'pi pi-chevron-up text-primary hover:text-white-alpha-90 p-2'
    : 'pi pi-chevron-down text-primary hover:text-white-alpha-90 p-2';
}

const parseConditions = (variant: any): Condition[] | undefined => {
  return variant?.conditions;
};

const conditionTables = computed(() => {
  const sections: Array<{ key: string; label: string; rows: Condition[] }> = [];
  const assigned = parseConditions(props.variant.variant?.conditions?.assigned);
  if (assigned && assigned.length > 0) {
    sections.push({ key: 'assigned', label: 'Assigned Conditions:', rows: assigned });
  }

  const optional = props.variant.variant?.conditions?.optional;
  if (optional && optional !== true) {
    const rows = parseConditions(optional);
    if (rows && rows.length > 0) {
      sections.push({ key: 'optional', label: 'Optional Conditions:', rows });
    }
  }

  return sections;
});

const isActive = (): string => {
  return !showContent.value
    ? 'flex-1 flex flex-row gap-2 border-1 border-round surface-border bg-white-alpha-90 mb-2 hover:surface-hover z-1 relative'
    : 'flex-1 flex flex-row gap-2 border-1 border-round surface-border bg-white-alpha-90 mb-2 hover:surface-hover z-1 relative shadow-2';
};

const displayParamList = (inputObj: Record<string, any>): Array<{ key: string; value: any }> => {
  return _toPairs(inputObj).map(([key, value]) => ({ key, value }));
};

const VariantParamsTable = (tableProps: { params: Record<string, unknown>; tableClass?: string }) =>
  h(
    PvDataTable,
    {
      class: ['p-datatable-small ml-3 border-1 surface-border', tableProps.tableClass],
      headerStyle: 'font-size: 20px;',
      value: displayParamList(tableProps.params),
      scrollable: true,
      scrollHeight: '300px',
    },
    () => [
      h(PvColumn, { field: 'key', header: 'Parameter', style: PARAM_COL_STYLE }),
      h(PvColumn, { field: 'value', header: 'Value', style: PARAM_COL_STYLE }),
    ],
  );

const toggle = (event: Event): void => {
  op.value.toggle(event);
};
</script>

<style scoped lang="scss">
.variant-card-controls {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  min-width: 2rem;
  border-radius: 0.3rem 0 0 0.3rem;
  border-right: 2px solid white;
  background: white;
  overflow: hidden;

  .variant-card-control {
    display: flex;
    flex: 1;
    justify-content: center;
    align-items: center;
    margin: 0;
    padding: 0;
    background: var(--surface-c);
    border: none;
    border-radius: 0;
    color: var(--text-color-secondary);
    transition: all 0.2s ease-out;

    .pi {
      font-weight: 600 !important;
      font-size: 14px !important;
      transition: all 0.2s ease-out;
    }

    &.variant-card-control--close {
      background: rgba(var(--bright-red-rgb), 0.1);
      color: var(--bright-red);

      .pi {
        font-size: 12px !important;
      }

      &:hover {
        background: var(--bright-red);
      }
    }

    &:hover {
      background: var(--text-color);
      border: none;
      color: white;
    }
  }
}

.variant-outdated,
.variant-up-to-date {
  cursor: pointer;
}

.variant-outdated {
  color: var(--bright-yellow);
}

.variant-up-to-date {
  color: var(--bright-green);
}
</style>
