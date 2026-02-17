import { defineStore } from 'pinia';
import { ref, Ref } from 'vue';

export const useLevanteStore = defineStore(
  'levanteStore',
  () => {
    // State
    const assignmentsSelectedFilter: Ref<any> = ref(null);
    const assignmentsSelectedSorting: Ref<any> = ref(null);
    const hasUserConfirmed: Ref<boolean> = ref(false);
    const shouldUserConfirm: Ref<boolean> = ref(false);

    // Actions
    function $reset(): void {
      assignmentsSelectedFilter.value = null;
      assignmentsSelectedSorting.value = null;
    }

    function setAssignmentsSelectedFilter(filter: any): void {
      assignmentsSelectedFilter.value = filter;
    }

    function setAssignmentsSelectedSorting(sorting: any): void {
      assignmentsSelectedSorting.value = sorting;
    }

    function setHasUserConfirmed(confirmed: boolean): void {
      if (confirmed) shouldUserConfirm.value = false; // Reset if user confirmed
      hasUserConfirmed.value = confirmed;
    }

    function setShouldUserConfirm(should: boolean): void {
      shouldUserConfirm.value = should;
    }

    return {
      // State
      assignmentsSelectedFilter,
      assignmentsSelectedSorting,
      hasUserConfirmed,
      shouldUserConfirm,

      // Actions
      $reset,
      setAssignmentsSelectedFilter,
      setAssignmentsSelectedSorting,
      setHasUserConfirmed,
      setShouldUserConfirm,
    };
  },
  {
    persist: {
      paths: ['assignmentsSelectedFilter', 'assignmentsSelectedSorting'],
      storage: sessionStorage,
    },
  },
);
