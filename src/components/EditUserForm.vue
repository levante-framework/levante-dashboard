<template>
  <div class="flex flex-column gap-3 w-full">
    <div class="grid">
      <div class="col-12 md:col-6 flex flex-column">
        <label class="font-light uppercase text-sm">UID</label>
        <div class="text-lg">{{ user.uid }}</div>
      </div>
      <div class="col-12 md:col-6 flex flex-column">
        <label class="font-light uppercase text-sm">Email</label>
        <div class="text-lg">{{ user.email }}</div>
      </div>
      <div class="col-12 md:col-6 flex flex-column">
        <label class="font-light uppercase text-sm">User Type</label>
        <div class="text-lg">{{ user.userType }}</div>
      </div>
      <div v-if="user.childLabel" class="col-12 md:col-6 flex flex-column">
        <label class="font-light uppercase text-sm">Child Label</label>
        <div class="text-lg">{{ user.childLabel }}</div>
      </div>
    </div>

    <div class="grid">
      <div class="col-12 md:col-6 flex flex-column">
        <label class="font-light uppercase text-sm">Groups</label>
        <div v-if="isLoading" class="text-md text-gray-500">Loading…</div>
        <div v-else-if="isError" class="text-md text-red-500">Failed to load groups.</div>
        <div v-else-if="orgs.length" class="flex flex-column gap-1">
          <div v-for="org in orgs" :key="org.id">
            {{ org.name }} <span class="text-sm text-gray-500">({{ _capitalize(org.orgType) }})</span>
          </div>
        </div>
        <div v-else class="text-md text-gray-500">None</div>
      </div>
      <div class="col-12 md:col-6 flex flex-column">
        <label class="font-light uppercase text-sm">Assignments</label>
        <div v-if="isLoading" class="text-md text-gray-500">Loading…</div>
        <div v-else-if="isError" class="text-md text-red-500">Failed to load assignments.</div>
        <div v-else-if="assignments.length" class="flex flex-column gap-2">
          <div v-for="assignment in assignments" :key="assignment.id" class="flex flex-column">
            <router-link :to="assignmentRoute(assignment)" class="text-primary hover:underline">{{
              assignment.name
            }}</router-link>
            <span class="text-sm text-gray-500">
              {{ _capitalize(assignment.status) }} · {{ formatDate(assignment.dateOpened) }} –
              {{ formatDate(assignment.dateClosed) }}
            </span>
          </div>
        </div>
        <div v-else class="text-md text-gray-500">None</div>
      </div>
    </div>

    <div class="flex flex-wrap align-items-center gap-5">
      <div class="flex align-items-center gap-2">
        <PvToggleSwitch v-model="archived" input-id="archived" />
        <label for="archived" class="font-light uppercase text-sm">Archived</label>
      </div>
      <div class="flex align-items-center gap-2">
        <PvToggleSwitch v-model="disabled" input-id="disabled" />
        <label for="disabled" class="font-light uppercase text-sm">Disabled</label>
      </div>
    </div>
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
import _capitalize from 'lodash/capitalize';
import PvToggleSwitch from 'primevue/toggleswitch';
import { computed, ref, watch } from 'vue';
import type { RouteLocationRaw } from 'vue-router';

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

// +----------------+
// | Reactive state |
// +----------------+
const archived = ref(props.user.archived);
const disabled = ref(props.user.disabled);

// +----------+
// | Computed |
// +----------+
// Dirty is derived here, next to the state it depends on; the parent just
// consumes it to enable/disable submit.
const isDirty = computed(
  () => archived.value !== props.user.archived || disabled.value !== props.user.disabled,
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
  emit('change', { uid: props.user.uid, archived: archived.value, disabled: disabled.value });
});

// Surface dirty state so the parent can enable/disable submit.
watch(isDirty, (value) => emit('dirty', value), { immediate: true });

// +---------+
// | Methods |
// +---------+
function assignmentRoute(assignment: UserOverviewAssignment): RouteLocationRaw {
  return { name: 'AdministrationProgressReport', params: { administrationId: assignment.id } };
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}
</script>
