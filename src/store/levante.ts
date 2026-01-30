import { defineStore } from 'pinia';
import { ref, Ref } from 'vue';

export const useLevanteStore = defineStore(
  'levanteStore',
  () => {
    // State
    const assignmentsDefaultSorting: Ref<any> = ref(null);

    // Actions
    function $reset(): void {
      assignmentsDefaultSorting.value = null;
    }

    function setAssignmentsDefaultSorting(sorting: any): void {
      assignmentsDefaultSorting.value = sorting;
    }

    return {
      // State
      assignmentsDefaultSorting,

      // Actions
      $reset,
      setAssignmentsDefaultSorting,
    };
  },
  {
    persist: {
      paths: ['assignmentsDefaultSorting'],
      storage: sessionStorage,
    },
  },
);
