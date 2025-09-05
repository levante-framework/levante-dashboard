import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useGameStore = defineStore(
  'gameStore',
  () => {
    const requireRefresh = ref(false);
    const selectedAdmin = ref(undefined);

    function $reset() {
      requireRefresh.value = false;
      selectedAdmin.value = undefined;
    }

    function requireHomeRefresh() {
      requireRefresh.value = true;
    }

    return {
      // State
      requireRefresh,
      selectedAdmin,

      // Actions
      $reset,
      requireHomeRefresh,
    };
  },
  {
    persist: {
      paths: ['requireRefresh', 'selectedAdmin'],
      storage: sessionStorage,
    },
  },
);
