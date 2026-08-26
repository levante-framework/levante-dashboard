<template>
  <div class="app">
    <div class="flex flex-column align-items-center text-center p-8 px-5">
      <h2 class="font-semibold m-0">You do not currently belong to any active sites in the dashboard</h2>
      <p class="m-0 mt-3">Please contact a DCC administrator to be added to an active site</p>
      <PvButton
        class="mt-4"
        icon="pi pi-sign-out"
        label="Sign out"
        @click="signOut"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import PvButton from 'primevue/button';
import useSignOutMutation from '@/composables/mutations/useSignOutMutation';

const { mutate: signOut } = useSignOutMutation();
</script>