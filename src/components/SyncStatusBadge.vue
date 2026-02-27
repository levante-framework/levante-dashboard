<template>
  <span
    v-if="status"
    :class="['sync-status-badge', `sync-status-${status}`]"
  >
    {{ status }}
  </span>
</template>

<script setup>
defineProps({
  status: {
    type: String,
    default: undefined,
    validator: (v) => !v || ['pending', 'complete', 'failure'].includes(v),
  },
});
</script>

<style scoped>
.sync-status-badge {
  font-weight: bold;
  font-family: var(--font-family);
  padding: 0.25rem 0.5rem;
  border-radius: var(--p-border-radius-xl);
  font-size: 0.7rem;
  text-transform: uppercase;
}

.sync-status-pending {
  background-color: rgba(var(--bright-yellow-rgb), 0.2);
  color: var(--bright-yellow);
}

.sync-status-complete {
  background-color: rgba(var(--bright-green-rgb), 0.2);
  color: var(--bright-green);
}

.sync-status-failure {
  background-color: rgba(var(--bright-red-rgb), 0.2);
  color: var(--bright-red);
}
</style>
