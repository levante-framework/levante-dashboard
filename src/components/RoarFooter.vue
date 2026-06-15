<template>
  <footer id="roarFooter" :class="`roar-footer roar-footer--${props.variant}`">
    <p class="roar-footer__content">
      Dashboard adapted from <a href="https://roar.stanford.edu/" target="_blank" class="roar-footer__link">ROAR</a>
    </p>
  </footer>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary';
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
});
</script>

<style lang="scss" scoped>
.roar-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  width: 100%;
  height: auto;
  margin: 0;
  padding: 0.5rem 2rem;
  background-color: white;
  border-top: 1px solid var(--surface-d);

  &.roar-footer--secondary {
    background-color: var(--secondary-color);
    border-top: none;

    .roar-footer__content {
      color: rgba(white, 0.75);
    }

    .roar-footer__link {
      color: white;
    }
  }
}

.roar-footer__content {
  display: block;
  margin: 0;
  font-weight: 500;
  font-size: 14px;
  color: var(--text-color-secondary);
  text-align: center;
}

.roar-footer__link {
  color: var(--primary-color);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}
</style>
