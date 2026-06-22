<template>
  <footer id="footer" :class="`footer footer--${props.variant}`">
    <div class="footer__copyright">
      &copy; {{ fullYear }}
      <a href="https://levante-network.org/" target="_blank" class="footer__link">{{ APP_NAME }}</a> — Dashboard adapted
      from
      <a href="https://roar.stanford.edu/" target="_blank" class="footer__link">ROAR</a>
    </div>

    <div class="footer__privacy-policy">
      <router-link :to="{ path: '/privacy-policy' }" class="footer__link">Privacy Policy</router-link>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { APP_NAME } from '@/constants';
import { computed } from 'vue';

interface Props {
  variant?: 'primary' | 'secondary';
}

const fullYear = computed(() => new Date().getFullYear());

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
});
</script>

<style lang="scss" scoped>
.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  width: 100%;
  height: auto;
  min-height: 56px;
  margin: 0;
  padding: 0.5rem 2rem;
  background-color: white;
  border-top: 1px solid var(--surface-d);
  font-weight: 500;
  font-size: 14px;
  color: var(--text-color-secondary);
  position: fixed;
  top: auto;
  bottom: 0;
  left: 0;
  z-index: 1;

  &.footer--secondary {
    background-color: var(--secondary-color);
    border-top: none;
    color: rgba(white, 0.75);

    .footer__link {
      color: white;
    }
  }
}

.footer__link {
  color: var(--primary-color);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}
</style>
