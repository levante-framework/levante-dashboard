<template>
  <div class="p-5">
    <div class="flex gap-5">
      <div class="flex flex-column flex-1">
        <h2 class="admin-page-header m-0">Manage Administrators</h2>
        <p class="m-0 mt-1 text-gray-500">Add, edit, and manage administrators of a site</p>
      </div>

      <PvButton size="small" @click="openAdministratorModal"><i class="pi pi-plus"></i>Add Administrator</PvButton>
    </div>

    <div class="m-0 mt-5">
      <RoarDataTable
        key="administrators"
        sortable
        :allow-filtering="false"
        :columns="tableColumns"
        :data="tableData"
        :loading="isAdminsLoading || isAdminsRefetching"
      />
    </div>

    <AdministratorModal
      :data="administrator"
      :is-visible="isAdministratorModalVisible"
      @close="closeAdministratorModal"
      @refetch="adminsRefetch"
    />

    <PvConfirmDialog :draggable="false" />
  </div>
</template>

<script lang="ts" setup>
import AdministratorModal from '@/components/modals/AdministratorModal.vue';
import RoarDataTable from '@/components/RoarDataTable.vue';
import useAdminsBySiteQuery from '@/composables/queries/useAdminsBySiteQuery';
import { TOAST_DEFAULT_LIFE_DURATION } from '@/constants/toasts';
import { useAuthStore } from '@/store/auth';
import { storeToRefs } from 'pinia';
import PvButton from 'primevue/button';
import PvConfirmDialog from 'primevue/confirmdialog';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { computed, ref } from 'vue';

// Refs
const isAdministratorModalVisible = ref(false);
const administrator = ref(null);

// Mocks
// @TODO Remove mocks
const siteIdMock = ref('PEXNEtRwzNleLwxpidaj');
const siteNameMock = ref('Brasil');

// Hooks
const authStore = useAuthStore();
const { roarfirekit } = storeToRefs(authStore);
const confirm = useConfirm();
const toast = useToast();

// Queries
const {
  data: adminsData = [],
  isLoading: isAdminsLoading,
  isRefetching: isAdminsRefetching,
  refetch: adminsRefetch,
} = useAdminsBySiteQuery(siteIdMock, siteNameMock);

// Computed
const tableData = computed(
  () =>
    adminsData.value
      ?.map((admin: any) => {
        const firstName = admin?.name?.first || '';
        const middleName = admin?.name?.middle || '';
        const lastName = admin?.name?.last || '';
        const fullName = `${firstName} ${middleName} ${lastName}`;

        return {
          ...admin,
          fullName,
          actions: [
            {
              name: 'edit',
              tooltip: 'Edit',
              icon: 'pi pi-pen-to-square',
              callback: () => onClickEditBtn(admin),
            },
            {
              name: 'remove',
              tooltip: 'Remove',
              icon: 'pi pi-trash',
              callback: () => onClickRemoveBtn(admin),
            },
          ],
        };
      })
      ?.sort((a: any, b: any) => {
        const aCreatedAt = new Date(a.createdAt).getTime() || 0;
        const bCreatedAt = new Date(b.createdAt).getTime() || 0;
        return bCreatedAt - aCreatedAt;
      }),
);

const tableColumns = computed(() => [
  {
    field: 'fullName',
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

// Helper functions
const closeAdministratorModal = () => {
  administrator.value = null;
  isAdministratorModalVisible.value = false;
};

const onClickRemoveBtn = (admin: any) => {
  administrator.value = admin;

  confirm.require({
    message: 'You are about to remove this administrator from the site.',
    header: 'Remove Administrator from Site',
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary p-button-outlined',
    rejectLabel: 'Cancel',
    acceptLabel: 'Remove',
    accept: async () => {
      await roarfirekit
        .value!.removeAdministratorFromSite(admin.id, siteIdMock.value)
        .then(() => {
          administrator.value = null;

          adminsRefetch();

          toast.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Administrator account removed successfully',
            life: TOAST_DEFAULT_LIFE_DURATION,
          });
        })
        .catch((error) => {
          administrator.value = null;

          toast.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message,
            life: TOAST_DEFAULT_LIFE_DURATION,
          });

          console.error('Error removing administrator from site', error);
        });
    },
    reject: () => {
      administrator.value = null;
    },
  });
};

const onClickEditBtn = (admin: any) => {
  administrator.value = admin;
  openAdministratorModal();
};

const openAdministratorModal = () => {
  isAdministratorModalVisible.value = true;
};
</script>
