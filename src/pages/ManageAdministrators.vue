<template>
  <div class="p-5">
    <template v-if="isPageLoading">
      <div class="flex justify-center items-center h-96">
        <LevanteSpinner fullscreen/>
      </div>
    </template>

    <template v-else>
      <PvTabs v-if="isUserSuperAdminComputed" v-model:value="adminPageTab" class="mb-2">
        <PvTabList>
          <PvTab value="researchers">Researchers</PvTab>
          <PvTab value="super-admins">Super admins</PvTab>
        </PvTabList>
      </PvTabs>

      <div v-show="!isUserSuperAdminComputed || adminPageTab === 'researchers'">
        <div class="flex align-items-start gap-3 flex-wrap">
          <div class="flex flex-column flex-1">
            <div class="flex align-items-center gap-2 flex-wrap">
              <h2 class="admin-page-header m-0">Researchers</h2>
              <DocsButton
                href="https://researcher.levante-network.org/dashboard/administrator-log-in"
                label="Documentation"
              />
            </div>
            <span
              v-if="currentSiteName && adminPageTab === 'researchers'"
              class="flex align-items-center gap-1 m-0 mt-1 text-lg text-gray-500"
            >
              <i class="pi pi-building"></i>{{ currentSiteName }}
            </span>
          </div>
          <div class="flex flex-column align-items-end gap-1">
            <PermissionGuard :required-role="ROLES.ADMIN">
              <PvButton :disabled="isAddResearcherButtonDisabled" @click="isAdministratorModalVisible = true">
                <i class="pi pi-plus"></i>Add Researcher
              </PvButton>
            </PermissionGuard>
          </div>
        </div>

        <div v-if="canManageResearchers" class="how-to-section mb-4 mt-4">
          <h3>Researcher permissions</h3>
          <div class="text-md text-gray-500 mb-1 line-height-3">
            Each kind of researcher account has a different role. Roles determine what actions a researcher can take on
            the dashboard within a particular site. See
            <a
              href="https://researcher.levante-network.org/dashboard/permissions"
              target="_blank"
              rel="noopener noreferrer"
            >researcher roles and permissions</a>
            for a description of each role.
          </div>
        </div>
        <div v-else class="how-to-section mb-4 mt-4">
          <h3>View researchers</h3>
          <div class="text-md text-gray-500 mb-1 line-height-3">
            See other research administrators in your site. For details on administrator roles, see
            <a
              href="https://researcher.levante-network.org/dashboard/permissions"
              target="_blank"
              rel="noopener noreferrer"
            >researcher roles and permissions</a>.
          </div>
        </div>

        <div class="m-0 mt-5">
          <div
            v-if="needsSiteSelectionForAddResearcher"
            class="flex align-items-center justify-content-center border-1 border-round surface-border surface-ground p-6 text-center text-amber-700 dark:text-amber-400 leading-normal min-h-[12rem]"
            role="status"
          >
            Select a specific site (not &quot;All sites&quot;) to add a researcher or use the actions column.
          </div>
          <RoarDataTable
            v-else
            key="administrators-researchers"
            sortable
            :allow-filtering="false"
            :columns="tableColumns"
            :data="tableData"
            :loading="isAdminsLoading || isAdminsFetching || isAdminsRefetching"
            :row-class="getRowClass"
          />
        </div>
      </div>

      <div v-show="isUserSuperAdminComputed && adminPageTab === 'super-admins'">
        <div class="flex align-items-center gap-2">
          <div class="flex flex-column flex-1">
            <h2 class="admin-page-header m-0">Super admins</h2>
            <span class="m-0 mt-1 text-lg text-gray-500">Platform-wide access</span>
          </div>
          <PermissionGuard :required-role="ROLES.SUPER_ADMIN">
            <PvButton
              :disabled="isSuperAdminsLoading || isSuperAdminsFetching || isSuperAdminsRefetching"
              @click="isAdministratorModalVisible = true"
            >
              <i class="pi pi-plus"></i>Add Super Admin
            </PvButton>
          </PermissionGuard>
        </div>

        <div class="m-0 mt-5">
          <RoarDataTable
            key="administrators-super-admins"
            sortable
            :allow-filtering="false"
            :columns="tableColumns"
            :data="tableData"
            :loading="isSuperAdminsLoading || isSuperAdminsFetching || isSuperAdminsRefetching"
            :row-class="getRowClass"
          />
        </div>
      </div>

      <AddAdministratorModal
        :data="administrator"
        :is-visible="isAdministratorModalVisible"
        :variant="addAdministratorModalVariant"
        @close="closeAdministratorModal"
        @refetch="onAdministratorsRefetch"
      />

      <PvDialog
        v-model:visible="isRemovalVerificationModalVisible"
        modal
        header="Confirm Removal"
        :style="{ width: '32rem' }"
        @hide="closeRemovalVerificationModal"
      >
        <div class="flex flex-column gap-3">
          <p class="text-sm text-gray-600">
            To remove this researcher from the site, type
            <span class="font-semibold text-gray-900">{{ removalTargetLabel }}</span>
            and select Remove. This action cannot be undone.
          </p>

          <div class="flex flex-column gap-2">
            <label class="text-sm font-medium text-gray-700">Researcher name</label>
            <PvInputText
              v-model="removalConfirmationInput"
              autofocus
              placeholder="Type researcher name"
              class="w-full"
            />
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2 w-full">
            <PvButton
              label="Cancel"
              class="p-button-text"
              severity="secondary"
              :disabled="isRemovingAdministrator"
              @click="closeRemovalVerificationModal"
            />
            <PvButton
              label="Remove"
              severity="danger"
              :loading="isRemovingAdministrator"
              :disabled="!isRemovalConfirmationValid || isRemovingAdministrator"
              @click="executeAdministratorRemoval"
            />
          </div>
        </template>
      </PvDialog>

      <PvConfirmDialog :draggable="false" />
    </template>
  </div>
</template>

<script lang="ts" setup>
import { usePermissions } from '@/composables/usePermissions';
import { AdminSubResource } from '@levante-framework/permissions-core';
import AddAdministratorModal from '@/components/modals/AddAdministratorModal.vue';
import DocsButton from '@/components/DocsButton.vue';
import LevanteSpinner from '@/components/LevanteSpinner.vue';
import RoarDataTable from '@/components/RoarDataTable.vue';
import useAdminsBySiteQuery from '@/composables/queries/useAdminsBySiteQuery';
import useSuperAdminsQuery from '@/composables/queries/useSuperAdminsQuery';
import { TOAST_DEFAULT_LIFE_DURATION } from '@/constants/toasts';
import { useAuthStore } from '@/store/auth';
import { storeToRefs } from 'pinia';
import PvButton from 'primevue/button';
import PvTab from 'primevue/tab';
import PvTabList from 'primevue/tablist';
import PvTabs from 'primevue/tabs';
import PvConfirmDialog from 'primevue/confirmdialog';
import PvDialog from 'primevue/dialog';
import PvInputText from 'primevue/inputtext';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { computed, ref, watch } from 'vue';
import PermissionGuard from '@/components/PermissionGuard.vue';
import { ROLES } from '@/constants/roles';

interface AdministratorName {
  first?: string;
  middle?: string;
  last?: string;
}

interface AdministratorRole {
  role: string;
  siteId: string;
  siteName: string;
}

interface AdministratorOrganizations {
  districts?: string[];
  schools?: string[];
  classes?: string[];
  groups?: string[];
  families?: string[];
}

interface AdministratorRecord {
  id: string;
  displayName?: string;
  email?: string;
  name?: AdministratorName;
  roles?: AdministratorRole[];
  adminOrgs?: AdministratorOrganizations;
  createdAt?: string;
  [key: string]: unknown;
}

interface AdministratorAction {
  name: string;
  tooltip: string;
  icon: string;
  callback: () => void;
}

interface AdministratorTableRow extends AdministratorRecord {
  fullName: string;
  actions: AdministratorAction[];
  isCurrentUser: boolean;
}

const authStore = useAuthStore();
const { currentSite, currentSiteName, roarfirekit, shouldUsePermissions } = storeToRefs(authStore);
const { can, hasRole, permissionsLoaded } = usePermissions();

const isUserSuperAdminComputed = computed(() => authStore.isUserSuperAdmin());
const adminPageTab = ref<'researchers' | 'super-admins'>('researchers');

const canManageResearchers = computed(() => {
  if (!shouldUsePermissions.value) return true;
  return hasRole(ROLES.ADMIN);
});
const confirm = useConfirm();
const toast = useToast();

const administrator = ref<AdministratorRecord | null>(null);
const isAdministratorModalVisible = ref(false);
const isRemovalVerificationModalVisible = ref(false);
const removalConfirmationInput = ref('');
const isRemovingAdministrator = ref(false);

const isAllSitesSelected = computed(() => currentSite.value === 'any');

const needsSiteSelectionForAddResearcher = computed(
  () => !currentSite.value || currentSite.value === 'any',
);

const isSuperAdminsTabActive = computed(() => adminPageTab.value === 'super-admins');

const {
  data: adminsData,
  isLoading: isAdminsLoading,
  isFetching: isAdminsFetching,
  isRefetching: isAdminsRefetching,
  refetch: adminsRefetch,
} = useAdminsBySiteQuery();

const {
  data: superAdminsData,
  isLoading: isSuperAdminsLoading,
  isFetching: isSuperAdminsFetching,
  isRefetching: isSuperAdminsRefetching,
  refetch: superAdminsRefetch,
} = useSuperAdminsQuery(isSuperAdminsTabActive);

const isPageLoading = computed(() => {
  if (!permissionsLoaded.value) return true;
  if (isUserSuperAdminComputed.value && adminPageTab.value === 'super-admins') {
    return isSuperAdminsLoading.value;
  }
  if (!currentSite.value) return false;
  return isAdminsLoading.value;
});

const isAddResearcherButtonDisabled = computed(
  () =>
    isAdminsLoading.value ||
    isAdminsFetching.value ||
    isAdminsRefetching.value ||
    needsSiteSelectionForAddResearcher.value,
);

const addAdministratorModalVariant = computed(() =>
  isUserSuperAdminComputed.value && adminPageTab.value === 'super-admins' ? 'super-admin' : 'researcher',
);

const currentUserId = computed(() => authStore.getUid());

function hasOnlySuperAdminRoles(admin: AdministratorRecord): boolean {
  const roles = admin.roles ?? [];
  if (roles.length === 0) {
    return false;
  }
  return roles.every((r) => r.role === ROLES.SUPER_ADMIN);
}

const tableData = computed<AdministratorTableRow[]>(() => {
  const isSuperList =
    isUserSuperAdminComputed.value && adminPageTab.value === 'super-admins';

  let admins: AdministratorRecord[];
  if (isSuperList) {
    admins = (superAdminsData?.value as AdministratorRecord[] | undefined) ?? [];
  } else {
    const raw = (adminsData?.value as AdministratorRecord[] | undefined) ?? [];
    admins = raw.filter((admin) => !hasOnlySuperAdminRoles(admin));
  }

  return admins
    .map((admin) => {
      const baseName = formatAdministratorName(admin) || '--';
      const targetRole = isSuperList
        ? (admin.roles?.find((r) => r.role === ROLES.SUPER_ADMIN)?.role as AdminSubResource)
        : (admin.roles?.find((r) => r.siteId === currentSite.value)?.role as AdminSubResource);
      const isCurrentUser = admin.id === currentUserId.value;
      const fullName = isCurrentUser ? `${baseName} (You)` : baseName;

      const actions: AdministratorAction[] = [];

      if (isSuperList) {
        if (!isCurrentUser && targetRole && can('admins', 'update', targetRole)) {
          actions.push({
            name: 'edit',
            tooltip: 'Edit',
            icon: 'pi pi-pen-to-square',
            callback: () => onClickEditBtn(admin),
          });
        }
      } else {
        if (!isCurrentUser && !isAllSitesSelected.value && targetRole && can('admins', 'update', targetRole)) {
          actions.push({
            name: 'edit',
            tooltip: 'Edit',
            icon: 'pi pi-pen-to-square',
            callback: () => onClickEditBtn(admin),
          });
        }

        if (!isCurrentUser && !isAllSitesSelected.value && targetRole && can('admins', 'delete', targetRole)) {
          actions.push({
            name: 'remove',
            tooltip: 'Remove',
            icon: 'pi pi-trash',
            callback: () => onClickRemoveBtn(admin),
          });
        }
      }

      return {
        ...admin,
        fullName,
        actions,
        isCurrentUser,
      };
    })
    .sort((a, b) => {
      const aCreatedAt = new Date((a.createdAt as string | undefined) ?? '').getTime() || 0;
      const bCreatedAt = new Date((b.createdAt as string | undefined) ?? '').getTime() || 0;
      return bCreatedAt - aCreatedAt;
    });
});

const tableColumns = computed(() => {
  const hasActions = tableData.value.some((row) => row.actions && row.actions.length > 0);

  const columns: { field: string; header: string; dataType: string; sort?: boolean }[] = [
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
  ];

  if (hasActions) {
    columns.push({
      field: 'actions',
      header: 'Actions',
      dataType: 'string',
      sort: false,
    });
  }

  return columns;
});


function onAdministratorsRefetch() {
  void adminsRefetch();
  if (isUserSuperAdminComputed.value) {
    void superAdminsRefetch();
  }
}

const closeAdministratorModal = () => {
  administrator.value = null;
  isAdministratorModalVisible.value = false;
};

const removalTargetLabel = computed(() => {
  if (!administrator.value) {
    return '';
  }

  return formatAdministratorName(administrator.value);
});

const isRemovalConfirmationValid = computed(() => {
  if (!removalTargetLabel.value) {
    return false;
  }

  return (
    removalTargetLabel.value.trim().toLowerCase() === removalConfirmationInput.value.trim().toLowerCase()
  );
});

const openRemovalVerificationModal = () => {
  removalConfirmationInput.value = '';
  isRemovalVerificationModalVisible.value = true;
};

const closeRemovalVerificationModal = () => {
  removalConfirmationInput.value = '';
  isRemovalVerificationModalVisible.value = false;
  administrator.value = null;
};

watch(adminPageTab, () => {
  closeAdministratorModal();
  closeRemovalVerificationModal();
});

const onClickRemoveBtn = (admin: AdministratorRecord) => {
  administrator.value = admin;

  confirm.require({
    message: 'You are about to remove this researcher from the site. Are you sure you want to do this?',
    header: 'Remove Researcher from Site',
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary p-button-outlined',
    rejectLabel: 'No',
    acceptLabel: 'Yes',
    accept: async () => {
      openRemovalVerificationModal();
    },
    reject: () => {
      administrator.value = null;
    },
  });
};

const onClickEditBtn = (admin: AdministratorRecord) => {
  administrator.value = admin;
  isAdministratorModalVisible.value = true;
};

async function executeAdministratorRemoval() {
  if (!administrator.value || !isRemovalConfirmationValid.value || isRemovingAdministrator.value) {
    return;
  }

  const siteId = currentSite.value;

  if (!siteId) {
    toast.add({
      severity: 'warn',
      summary: 'Missing Site',
      detail: 'Select a site before removing a researcher.',
      life: TOAST_DEFAULT_LIFE_DURATION,
    });

    administrator.value = null;
    closeRemovalVerificationModal();
    return;
  }

  isRemovingAdministrator.value = true;

  try {
    await roarfirekit
      .value!.removeAdministratorFromSite(administrator.value.id, siteId);

    onAdministratorsRefetch();

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Researcher removed from site successfully',
      life: TOAST_DEFAULT_LIFE_DURATION,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error removing researcher';

    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: errorMessage,
      life: TOAST_DEFAULT_LIFE_DURATION,
    });

    console.error('Error removing researcher from site.', error);
  } finally {
    administrator.value = null;
    closeRemovalVerificationModal();
    isRemovingAdministrator.value = false;
  }
}

function formatAdministratorName(admin?: AdministratorRecord | null) {
  if (admin?.name) {
    return [admin.name.first, admin.name.middle, admin.name.last].filter(Boolean).join(' ').trim();
  }

  if (admin?.displayName) {
    return admin.displayName;
  }

  return '--';
}

function getRowClass(data: AdministratorTableRow) {
  return data.isCurrentUser ? 'current-user-row' : '';
}
</script>

<style lang="scss" scoped>
.page-title-row :deep(.docs-button) {
  font-size: 0.875rem;
  padding: 0.375rem 0.75rem;
}

.how-to-section {
  background-color: #f8f9fa;
  border-radius: 0.5rem;
  padding: 1.5rem;
  margin: 2rem 0;

  h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: var(--primary-color);
    font-size: 1.2rem;
    font-weight: bold;
  }
}
</style>
