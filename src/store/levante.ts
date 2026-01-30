import { defineStore } from 'pinia';
import { ref, Ref } from 'vue';

export const useLevanteStore = defineStore(
  'levanteStore',
  () => {
    // State
    const assignmentsSelectedFilter: Ref<any> = ref(null);
    const assignmentsSelectedSorting: Ref<any> = ref(null);

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

    return {
      // State
      assignmentsSelectedFilter,
      assignmentsSelectedSorting,

      // Actions
      $reset,
      setAssignmentsSelectedFilter,
      setAssignmentsSelectedSorting,
    };
  },
  {
    persist: {
      paths: ['assignmentsSelectedFilter', 'assignmentsSelectedSorting'],
      storage: sessionStorage,
    },
  },
);
