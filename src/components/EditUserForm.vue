<template>
  <div class="flex flex-column gap-3 w-full m-0 p-4">
    <div class="flex flex-column gap-2 w-full h-auto">
      <div class="row">
        <label class="font-bold text-xs text-color-secondary uppercase">
          UID
        </label>
        <p class="m-0 text-gray-400">{{ user.uid }}</p>
      </div>

      <div class="row">
        <label class="font-bold text-xs text-color-secondary uppercase">
          User Type
        </label>
        <p class="m-0">{{ user.userType }}</p>
      </div>

      <div class="row">
        <label class="font-bold text-xs text-color-secondary uppercase">
          Email
        </label>
        <p class="m-0">{{ user.email }}</p>
      </div>

      <div v-if="user.childLabel" class="row">
        <label class="font-bold text-xs text-color-secondary uppercase">
          Child Label
        </label>
        <PvInputText
          v-model="userChildLabel"
          placeholder="Label"
          size="small"
          type="text"
        />
      </div>

      <div v-if="user.userType === 'child'" class="row">
        <label class="font-bold text-xs text-color-secondary uppercase">
          Birth date
        </label>
        <PvDatePicker
          v-model="userChildBirthDate"
          fluid
          iconDisplay="input"
          placeholder="Select birth date"
          showIcon
          size="small"
        />
      </div>

      <div class="row">
        <label class="font-bold text-xs text-color-secondary uppercase">
          Archived
        </label>
        <PvToggleSwitch v-model="archived" input-id="archived" />
      </div>

      <div class="row">
        <label class="font-bold text-xs text-color-secondary uppercase">
          Disabled
        </label>
        <PvToggleSwitch v-model="disabled" input-id="disabled" />
      </div>

      <div class="row row--top">
        <div class="flex flex-column w-full gap-2">
          <label class="font-bold text-xs text-color-secondary uppercase">
            Groups
          </label>
          <div v-if="isLoading" class="text-md text-gray-500">Loading…</div>
          <div v-else-if="isError" class="text-md text-red-500">
            Failed to load groups.
          </div>
          <div v-else-if="orgs.length" class="flex flex-column gap-1 w-full">
            <div v-for="org in orgs" :key="org.id">
              <span class="text-color-secondary">&bull;</span>
              {{ org.name }}
              <span class="text-sm text-gray-500">
                ({{ _capitalize(org.orgType) }})
              </span>
            </div>
          </div>
          <div v-else class="text-md text-gray-500">None</div>
        </div>
      </div>

      <div class="row row--top">
        <div class="flex flex-column gap-2 w-full">
          <label class="font-bold text-xs text-color-secondary uppercase">
            Assignments
          </label>
          <div v-if="isLoading" class="text-md text-gray-500">Loading…</div>
          <div v-else-if="isError" class="text-md text-red-500">
            Failed to load assignments.
          </div>
          <div
            v-else-if="assignments.length"
            class="flex flex-column gap-2 w-full"
          >
            <div
              v-for="assignment in assignments"
              :key="assignment.id"
              class="flex gap-1"
            >
              <span class="text-color-secondary">&bull;</span>
              <div class="flex flex-column">
                <router-link
                  v-slot="{ href }"
                  :to="assignmentRoute(assignment)"
                  custom
                >
                  <a
                    :href="href"
                    class="font-medium text-primary no-underline hover:underline"
                    @click.prevent="onAssignmentClick(assignment)"
                  >
                    {{ assignment.name }}
                  </a>
                </router-link>
                <span class="font-medium text-xs text-gray-500">
                  {{ _capitalize(assignment.status) }} &bull;
                  {{ formatDate(assignment.dateOpened) }} –>
                  {{ formatDate(assignment.dateClosed) }}
                </span>
              </div>
            </div>
          </div>
          <div v-else class="text-md text-gray-500">None</div>
        </div>
      </div>
    </div>

    <PvConfirmDialog group="edit-user-nav" :draggable="false" />
  </div>
</template>

<script lang="ts">
import type { GetUserOverviewResult } from '@levante-framework/levante-zod';

export interface EditableUser {
  uid: string;
  archived: boolean;
  disabled: boolean;
  email: string;
  userType: string;
  childLabel?: string;
}

export type EditableUserUpdate = Pick<EditableUser, 'uid' | 'archived' | 'disabled'>;

export type UserOverviewOrg = GetUserOverviewResult['orgs'][number];
export type UserOverviewAssignment = GetUserOverviewResult['assignments'][number];
</script>

<script setup lang="ts">
import _capitalize from "lodash/capitalize";
import PvConfirmDialog from "primevue/confirmdialog";
import PvToggleSwitch from "primevue/toggleswitch";
import { useConfirm } from "primevue/useconfirm";
import { computed, ref, watch } from "vue";
import { type RouteLocationRaw, useRouter } from "vue-router";
import PvInputText from "primevue/inputtext";
import PvDatePicker from "primevue/datepicker";

// +-------+
// | Props |
// +-------+
const props = withDefaults(
  defineProps<{
    user: EditableUser;
    orgs?: UserOverviewOrg[];
    assignments?: UserOverviewAssignment[];
    isLoading?: boolean;
    isError?: boolean;
  }>(),
  { orgs: () => [], assignments: () => [], isLoading: false, isError: false },
);
const emit = defineEmits<{
  change: [update: EditableUserUpdate];
  dirty: [isDirty: boolean];
}>();

// +----------------------+
// | Composables & stores |
// +----------------------+
const confirm = useConfirm();
const router = useRouter();

// +----------------+
// | Reactive state |
// +----------------+
const archived = ref(props.user.archived);
const disabled = ref(props.user.disabled);
const userChildLabel = ref(props.user?.childLabel);
const userChildBirthDate = ref(new Date());

// +----------+
// | Computed |
// +----------+
// Dirty is derived here, next to the state it depends on; the parent just
// consumes it to enable/disable submit.
const isDirty = computed(
  () =>
    archived.value !== props.user.archived ||
    disabled.value !== props.user.disabled,
);

// +----------+
// | Watchers |
// +----------+
// Reset the local edit state whenever a different user is loaded.
watch(
  () => props.user,
  (user) => {
    archived.value = user.archived;
    disabled.value = user.disabled;
  },
);

// Surface the edited values so the parent always holds the current update.
watch([archived, disabled], () => {
  emit("change", {
    uid: props.user.uid,
    archived: archived.value,
    disabled: disabled.value,
  });
});

// Surface dirty state so the parent can enable/disable submit.
watch(isDirty, (value) => emit("dirty", value), { immediate: true });

// +---------+
// | Methods |
// +---------+
function assignmentRoute(assignment: UserOverviewAssignment): RouteLocationRaw {
  return {
    name: "AdministrationProgressReport",
    params: { administrationId: assignment.id },
  };
}

// Navigating to an assignment unmounts this form, so guard against silently
// discarding unsaved toggle changes: confirm first when the form is dirty.
function onAssignmentClick(assignment: UserOverviewAssignment): void {
  const to = assignmentRoute(assignment);
  if (!isDirty.value) {
    router.push(to);
    return;
  }
  confirm.require({
    group: "edit-user-nav",
    header: "Discard unsaved changes?",
    message:
      "You have unsaved changes that will be lost if you navigate away. Continue?",
    icon: "pi pi-exclamation-triangle",
    rejectClass: "p-button-secondary p-button-outlined",
    rejectLabel: "Cancel",
    acceptLabel: "Continue",
    accept: () => router.push(to),
  });
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}
</script>

<style lang="scss">
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  height: auto;
  min-height: 36px;
  padding: 0.5rem 0 0;
  border-top: 1px solid var(--gray-200);

  &:first-of-type {
    border-top: none;
    padding: 0;
  }

  &.row--top {
    align-items: flex-start;
  }
}
</style>
