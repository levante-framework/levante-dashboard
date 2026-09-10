<template>
  <div class="flex flex-column gap-3 w-full">
    <div class="flex flex-column">
      <label class="font-light uppercase text-sm">UID</label>
      <div class="text-xl">{{ user.uid }}</div>
    </div>
    <div class="flex flex-column">
      <label class="font-light uppercase text-sm">Email</label>
      <div class="text-xl">{{ user.email }}</div>
    </div>
    <div class="flex flex-column">
      <label class="font-light uppercase text-sm">User Type</label>
      <div class="text-xl">{{ user.userType }}</div>
    </div>
    <div v-if="user.childLabel" class="flex flex-column">
      <label class="font-light uppercase text-sm">Child Label</label>
      <div class="text-xl">{{ user.childLabel }}</div>
    </div>
    <div class="flex flex-column">
      <label for="archived" class="font-light uppercase text-sm">Archived</label>
      <PvToggleSwitch v-model="archived" input-id="archived" />
    </div>
    <div class="flex flex-column">
      <label for="disabled" class="font-light uppercase text-sm">Disabled</label>
      <PvToggleSwitch v-model="disabled" input-id="disabled" />
    </div>
  </div>
</template>

<script lang="ts">
export interface EditableUser {
  uid: string;
  archived: boolean;
  disabled: boolean;
  email: string;
  userType: string;
  childLabel?: string;
}

export type EditableUserUpdate = Pick<EditableUser, 'uid' | 'archived' | 'disabled'>;
</script>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import PvToggleSwitch from 'primevue/toggleswitch';

// +-------+
// | Props |
// +-------+
const props = defineProps<{ user: EditableUser }>();
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

// Surface the edited values to the parent, but only once they diverge from the original.
watch([archived, disabled], () => {
  if (!isDirty.value) return;
  emit('change', { uid: props.user.uid, archived: archived.value, disabled: disabled.value });
});

// Keep the parent informed of dirty state so it can enable/disable submit.
watch(isDirty, (value) => emit('dirty', value), { immediate: true });
</script>
