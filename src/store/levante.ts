import { DriveStep } from 'driver.js';
import { defineStore } from 'pinia';
import { type Ref, ref } from 'vue';

export const useLevanteStore = defineStore(
  'levanteStore',
  () => {
    // State
    const assignmentsSelectedFilter: Ref<any> = ref(null);
    const assignmentsSelectedSorting: Ref<any> = ref(null);
    const hasUserConfirmed: Ref<boolean> = ref(false);
    const shouldUserConfirm: Ref<boolean> = ref(false);
    const wizardSteps: Ref<Array<DriveStep>> = ref([]);

    // Actions
    function $reset(): void {
      assignmentsSelectedFilter.value = null;
      assignmentsSelectedSorting.value = null;
      hasUserConfirmed.value = false;
      shouldUserConfirm.value = false;
      wizardSteps.value = [];
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

    function setWizardSteps(steps: Array<DriveStep>): void {
      wizardSteps.value = steps;
    }

    return {
      // State
      assignmentsSelectedFilter,
      assignmentsSelectedSorting,
      hasUserConfirmed,
      shouldUserConfirm,
      wizardSteps,

      // Actions
      $reset,
      setAssignmentsSelectedFilter,
      setAssignmentsSelectedSorting,
      setHasUserConfirmed,
      setShouldUserConfirm,
      setWizardSteps,
    };
  },
  {
    persist: {
      paths: ['assignmentsSelectedFilter', 'assignmentsSelectedSorting', 'wizardSteps'],
      storage: sessionStorage,
    },
  },
);
