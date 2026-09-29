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
        <p class="m-0">{{ user.childLabel }}</p>
      </div>

      <div v-if="user.userType === 'child'" class="row">
        <label class="font-bold text-xs text-color-secondary uppercase">
          Birth Date
        </label>
        <PvDatePicker
          v-model="userChildBirthDate"
          view="month"
          dateFormat="mm/yy"
          :minDate="BIRTH_DATE_MIN"
          :maxDate="BIRTH_DATE_MAX"
          :manual-input="false"
          fluid
          iconDisplay="input"
          placeholder="Select birth month/year"
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

      <div class="row">
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

      <div class="row">
        <div class="flex flex-column gap-2 w-full">
          <div class="flex justify-content-between align-items-center w-full">
            <label class="font-bold text-xs text-color-secondary uppercase">
              Assignments
            </label>

            <PvSelect
              v-model="selectedAssignmentStatus"
              :options="assignmentStatusOptions"
              optionLabel="label"
              optionValue="value"
              size="small"
            />
          </div>

          <div v-if="isLoading" class="text-md text-gray-500">Loading…</div>
          <div v-else-if="isError" class="text-md text-red-500">
            Failed to load assignments.
          </div>
          <div
            v-else-if="filteredAssignments.length"
            class="flex flex-column gap-2 w-full"
          >
            <div
              v-for="assignment in filteredAssignments"
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
                    class="flex align-items-center gap-2 font-medium text-color-secondary no-underline hover:text-primary"
                    @click.prevent="onAssignmentClick(assignment)"
                  >
                    {{ assignment.name }} <i class="pi pi-external-link font-bold text-sm"></i>
                  </a>
                </router-link>
                <span class="font-medium text-xs text-gray-500">
                  <span :class="`assignment-status assignment-status--${assignment.status}`">{{ _capitalize(assignment.status) }}</span> &bull;
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

export interface EditableUserUpdate {
  uid: string;
  archived?: boolean;
  disabled?: boolean;
  birthMonth?: number;
  birthYear?: number;
}
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
import PvDatePicker from "primevue/datepicker";
import PvSelect from 'primevue/select';

// +-----------+
// | Constants |
// +-----------+
const BIRTH_DATE_MIN = new Date(new Date().getFullYear() - 18, 0, 1);
const BIRTH_DATE_MAX = new Date(new Date().getFullYear() - 2, 11, 31);

// +-------+
// | Props |
// +-------+
const props = withDefaults(
  defineProps<{
    user: EditableUser;
    orgs?: UserOverviewOrg[];
    assignments?: UserOverviewAssignment[];
    birthMonth?: number;
    birthYear?: number;
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
const userChildBirthDate = ref<Date | null>(toBirthDate(props.birthMonth, props.birthYear));
const assignmentStatusOptions = ref([
  { label: 'All', value: 'all', },
  { label: 'Closed', value: 'closed', },
  { label: 'Open', value: 'open', },
  { label: 'Upcoming', value: 'upcoming', },
]);
const selectedAssignmentStatus = ref('all');
const filteredAssignments = computed(() => {
  if (selectedAssignmentStatus.value === "all") return props.assignments;
  return props.assignments.filter(
    (assignment) => assignment.status === selectedAssignmentStatus.value,
  ) || [];
});

// +----------+
// | Computed |
// +----------+
// The birth date is only ever a month/year (see the mm/yy picker), so surface
// those parts for both the dirty check and the emitted update.
const childBirthMonth = computed(() =>
  userChildBirthDate.value ? userChildBirthDate.value.getMonth() + 1 : undefined,
);
const childBirthYear = computed(() =>
  userChildBirthDate.value ? userChildBirthDate.value.getFullYear() : undefined,
);

// Dirty is derived here, next to the state it depends on; the parent just
// consumes it to enable/disable submit.
const isDirty = computed(
  () =>
    archived.value !== props.user.archived ||
    disabled.value !== props.user.disabled ||
    childBirthMonth.value !== props.birthMonth ||
    childBirthYear.value !== props.birthYear,
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

// Birth month/year arrive from the user overview, which loads after the modal
// opens, so reseed the picker whenever they change.
watch([() => props.birthMonth, () => props.birthYear], ([month, year]) => {
  userChildBirthDate.value = toBirthDate(month, year);
});

// Surface only the fields that diverge from the original so the parent submits
// a minimal update; uid is always included to identify the user.
watch([archived, disabled, userChildBirthDate], () => {
  const update: EditableUserUpdate = { uid: props.user.uid };
  if (archived.value !== props.user.archived) update.archived = archived.value;
  if (disabled.value !== props.user.disabled) update.disabled = disabled.value;
  if (childBirthMonth.value !== props.birthMonth) update.birthMonth = childBirthMonth.value;
  if (childBirthYear.value !== props.birthYear) update.birthYear = childBirthYear.value;
  emit("change", update);
});

// Surface dirty state so the parent can enable/disable submit.
watch(isDirty, (value) => emit("dirty", value), { immediate: true });

// +---------+
// | Methods |
// +---------+
// Build a Date from a 1-indexed month and year, or null when either is missing.
function toBirthDate(month?: number, year?: number): Date | null {
  if (month === undefined || year === undefined) return null;
  return new Date(year, month - 1, 1);
}

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
}

.assignment-status {
  font-weight: 700;
  text-transform: uppercase;

  &.assignment-status--closed { color: var(--bright-red); }
  &.assignment-status--open { color: var(--bright-green); }
  &.assignment-status--upcoming { color: var(--bright-yellow); }
}
</style>
