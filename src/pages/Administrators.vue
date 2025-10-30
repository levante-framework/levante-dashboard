<template>
  <div class="p-5">
    <div class="flex align-items-center gap-2">
      <div class="flex flex-column flex-1">
        <h2 class="admin-page-header m-0">Administrators</h2>
      </div>

      <div v-if="!shouldUsePermissions" class="flex align-items-center gap-2 m-2">
        <label for="site-select">Site:</label>
        <PvSelect
          :options="siteOptions"
          :optionValue="(o) => o.value"
          :optionLabel="(o) => o.label"
          :value="selectedSite?.value"
          class="options-site"
          @change="handleSiteChange"
        >
          <template #value>
            <i class="pi pi-building"></i>
            {{ selectedSite?.label || 'Select site' }}
          </template>
        </PvSelect>
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
        :loading="isAdminsLoading || isAdminsFetching || isAdminsRefetching"
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
import useDistrictsListQuery from '@/composables/queries/useDistrictsListQuery';
import { TOAST_DEFAULT_LIFE_DURATION } from '@/constants/toasts';
import { useAuthStore } from '@/store/auth';
import { storeToRefs } from 'pinia';
import PvButton from 'primevue/button';
import PvConfirmDialog from 'primevue/confirmdialog';
import PvSelect from 'primevue/select';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { computed, ref, watch } from 'vue';

const authStore = useAuthStore();
const { currentSite, roarfirekit, shouldUsePermissions, sites } = storeToRefs(authStore);
const { isUserSuperAdmin } = authStore;
const confirm = useConfirm();
const toast = useToast();

const administrator = ref(null);
const isAdministratorModalVisible = ref(false);

// @TODO Replace the following query
const { data: districtsData } = useDistrictsListQuery();

const siteOptions = computed(() => {
  if (isUserSuperAdmin()) {
    // For super admin, use districts data
    return (
      districtsData.value?.map((district: any) => ({
        label: district.name,
        value: district.id,
      })) || []
    );
  } else {
    // For regular admin, use sites from auth store
    return (
      sites.value?.map((site: any) => ({
        label: site.siteName,
        value: site.siteId,
      })) || []
    );
  }
});

const selectedSite = computed({
  get: () => siteOptions.value?.find((siteOption) => siteOption?.value === currentSite.value) || null,
  set: (value) => {
    if (value?.value) {
      currentSite.value = value.value;
    }
  },
});

watch(siteOptions, (newSiteOptions) => {
  selectedSite.value = newSiteOptions[0];
});

const {
  data: adminsData = [],
  isLoading: isAdminsLoading,
  isFetching: isAdminsFetching,
  isRefetching: isAdminsRefetching,
  refetch: adminsRefetch,
} = useAdminsBySiteQuery(selectedSite, {
  enabled: computed(() => !!selectedSite.value),
});

const tableData = computed(
  () =>
    adminsData.value
      ?.map((admin: any) => {
        const firstName = admin?.name?.first || '';
        const middleName = admin?.name?.middle || '';
        const lastName = admin?.name?.last || '';
        const fullName = admin?.name ? `${firstName} ${middleName} ${lastName}` : '--';

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
        .value!.removeAdministratorFromSite(admin.id, selectedSite.value?.value || currentSite.value)
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

const handleSiteChange = (e): void => {
  currentSite.value = e.value;
};

const onClickEditBtn = (admin: any) => {
  administrator.value = admin;
  openAdministratorModal();
};

const openAdministratorModal = () => {
  isAdministratorModalVisible.value = true;
};
</script>
