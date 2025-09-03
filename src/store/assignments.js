import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAssignmentsStore = defineStore(
  'assignmentsStore',
  () => {
    const selectedAssignment = ref(null);
    const selectedStatus = ref('');

    function $reset() {
      selectedAssignment.value = null;
      selectedStatus.value = '';
    }

    function setSelectedAssignment(assignment) {
      selectedAssignment.value = assignment;
    }

    function setSelectedStatus(status) {
      selectedStatus.value = status;
    }

    return {
      // State
      selectedAssignment,
      selectedStatus,

      // Actions
      $reset,
      setSelectedAssignment,
      setSelectedStatus,
    };
  },
  {
    persist: {
      paths: ['selectedAssignment', 'selectedStatus'],
      storage: sessionStorage,
    },
  },
);
