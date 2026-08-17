<template>
  <div
    v-if="status" 
    :class="['sync-status-hint', `sync-status-${status}`]"
    v-tooltip.top="getTooltip(displayLabel, {showDelay: 0})">
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { getTooltip } from '@/helpers';

const props = defineProps({
  status: {
    type: String,
    default: undefined,
    validator: (v) => !v || ['pending', 'complete', 'failed'].includes(v),
  },
});

const statusToLabel = {
  pending: 'Processing',
  complete: 'Assigned',
  failed: 'Failed',
};

const displayLabel = computed(() => (props.status ? statusToLabel[props.status] : ''));
</script>

<style scoped lang="scss">
.sync-status-hint {
  display: block;
  width: 10px;
  height: 10px;
  margin: 0;
  padding: 0;
  border-radius: 100%;
  position: relative;

  &.sync-status-pending {
    background-color: var(--bright-yellow);
    
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

  &.sync-status-complete {
    background-color: var(--bright-green);
  }

  &.sync-status-failed {
    background-color: var(--bright-red);
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
