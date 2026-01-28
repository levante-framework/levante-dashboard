import { defineStore } from 'pinia';
import { ref, Ref } from 'vue';

export const useLevanteStore = defineStore('levanteStore', () => {
  // State
  const hasUserConfirmed: Ref<boolean> = ref(false);
  const shouldUserConfirm: Ref<boolean> = ref(false);

  // Actions
  function setHasUserConfirmed(confirmed: boolean): void {
    if (confirmed) shouldUserConfirm.value = false; // Reset if user confirmed
    hasUserConfirmed.value = confirmed;
  }

  function setShouldUserConfirm(should: boolean): void {
    shouldUserConfirm.value = should;
  }

  return {
    // State
    hasUserConfirmed,
    shouldUserConfirm,

    // Actions
    setHasUserConfirmed,
    setShouldUserConfirm,
  };
});
