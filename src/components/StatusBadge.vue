<script setup lang="ts">
import { computed } from 'vue';

export type StatusBadgeStatus = 'default' | 'error' | 'info' | 'success' | 'warn';

interface Props {
  icon?: string;
  label?: string;
  pulse?: boolean;
  status?: StatusBadgeStatus;
}

const props = withDefaults(defineProps<Props>(), {
  icon: undefined,
  label: undefined,
  pulse: false,
  status: 'default',
});

const shouldDisplay = computed(() => props.icon?.length || props.label?.length);
</script>

<template>
  <div
    v-if="shouldDisplay"
    :class="['status-badge', `status-badge--${props.status}`]"
  >
    <div v-if="pulse" class="status-badge__pulse"></div>
    <i v-if="props.icon" :class="['status-badge__icon', props.icon]"></i>
    <p v-if="props.label" class="status-badge__label">{{ props.label }}</p>
  </div>
</template>

<style lang="scss">
.status-badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  height: auto;
  margin: 0;
  padding: 0.2rem 0.5rem;
  border-radius: 99999px;
  background-color: color-mix(in srgb, var(--bright-red) 10%, transparent);
  color: var(--bright-red);
  user-select: none;

  &__pulse {
    display: block;
    width: 6px;
    height: 6px;
    margin: 0 0.25rem 0 0;
    padding: 0;
    border-radius: 100%;
    background-color: currentColor;
    position: relative;

    &::before {
      content: "";
      position: absolute;
      inset: 0;
      border: 2px solid currentColor;
      border-radius: 100%;
      animation: pulse 1.5s ease-out infinite;
    }
  }

  &__icon {
    font-weight: 700;
    font-size: 0.7rem;
  }

  &__label {
    display: block;
    margin: 0;
    font-family: var(--font-family);
    font-weight: 700;
    font-size: 0.7rem;
    text-transform: uppercase;
  }

  &--error {
    background-color: color-mix(in srgb, var(--cb-gray) 10%, transparent);
    color: var(--cb-gray);
  }

  &--info {
    background-color: color-mix(in srgb, var(--info-blue) 15%, transparent);
    color: var(--info-blue);
  }

  &--success {
    background-color: color-mix(in srgb, var(--cb-blue) 10%, transparent);
    color: var(--cb-blue);
  }

  &--warn {
    background-color: color-mix(in srgb, var(--cb-orange) 15%, transparent);
    color: var(--cb-orange);
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
