<template>
  <span
    v-if="status"
    :class="['sync-status-badge', `sync-status-${status}`]"
  >
    {{ displayLabel }}
  </span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  status: {
    type: String,
    default: undefined,
    validator: (v) => !v || ['pending', 'complete', 'failed'].includes(v),
  },
});

const statusToLabel = {
  pending: 'assignment processing',
  complete: 'assigned',
  failed: 'assignment failed',
};

const displayLabel = computed(() =>
  props.status ? statusToLabel[props.status] : '',
);
</script>

<style scoped>
.sync-status-badge {
  font-weight: bold;
  font-family: var(--font-family);
  padding: 0.25rem 0.5rem;
  border-radius: var(--p-border-radius-xl);
  font-size: 0.7rem;
  text-transform: uppercase;
  border: 2px solid;
}

.sync-status-pending {
  border-color: var(--bright-yellow);
  color: var(--bright-yellow);
}

.sync-status-complete {
  border-color: var(--bright-green);
  color: var(--bright-green);
}

.sync-status-failed {
  border-color: var(--bright-red);
  color: var(--bright-red);
}
</style>
