<template>
  <div class="p-5">
    <div class="flex items-start gap-5">
      <div class="flex flex-column flex-1">
        <h2 class="admin-page-header m-0">Manage Administrators</h2>
        <p class="m-0 mt-1 text-gray-500">Add, edit, and manage administrator roles for your site</p>
      </div>
      <PvButton @click="() => null"><i class="pi pi-plus"></i>Add Administrator</PvButton>
    </div>

    <div class="m-0 mt-5">
      <RoarDataTable
        key="administrators"
        sortable
        :columns="columns"
        :data="admins"
        :loading="false"
        :allow-filtering="false"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import RoarDataTable from '@/components/RoarDataTable.vue';
import useAdminsBySiteIdQuery from '@/composables/queries/useAdminsBySiteIdQuery';
import { ROLES } from '@/constants/roles';
import { useAuthStore } from '@/store/auth';
import { Role } from '@/types';
import { storeToRefs } from 'pinia';
import PvButton from 'primevue/button';
import { computed, ComputedRef } from 'vue';

const authStore = useAuthStore();
const { userData } = storeToRefs(authStore);

const roles: ComputedRef<Role[]> = computed(() => {
  return userData.value?.roles?.map((role: Role) => {
    if (role?.role === ROLES.ADMIN || role?.role === ROLES.SUPER_ADMIN) {
      return role;
    }
  });
});

// Replace the "roles.value[0]!.siteId" with siteId from global state
const { data: admins = [], isLoading: isLoadingAdmins } = useAdminsBySiteIdQuery(roles.value[0]!.siteId);

const columns = computed(() => [
  {
    field: 'displayName',
    header: 'Name',
    dataType: 'string',
  },
  {
    field: 'email',
    header: 'Email',
    dataType: 'string',
  },
  {
    field: 'roles',
    header: 'Role',
    dataType: 'string',
  },
  {
    field: 'actions',
    header: 'Actions',
    dataType: 'string',
    sort: false,
  },
]);
</script>

<style lang="scss"></style>
