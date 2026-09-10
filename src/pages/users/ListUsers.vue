<template>
  <main class="container main">
    <section class="main-body">
      <AppSpinner v-if="isLoading" />
      <div v-else>
        <!-- Page header -->
        <div class="flex flex-column mb-5">
          <div class="flex justify-content-between">
            <div class="flex align-items-center gap-3">
              <i class="pi pi-users text-gray-400 rounded" style="font-size: 1.6rem"></i>
              <div class="admin-page-header">User List</div>
            </div>
            <!-- Org summary card with expandable user counts -->
            <div class="bg-gray-100 px-5 py-2 rounded flex flex-column gap-3">
              <div class="flex flex-wrap align-items-center gap-2 justify-content-between">
                <div class="uppercase font-light font-sm text-gray-400 mr-2">
                  {{ displayOrgType }}
                </div>
                <div class="text-xl text-gray-600">
                  <b> {{ orgName }} </b>
                </div>
              </div>
              <div class="flex flex-column gap-2">
                <button
                  type="button"
                  class="flex flex-wrap gap-2 justify-content-between align-items-center cursor-pointer w-full border-none bg-transparent p-0 text-left"
                  :aria-expanded="isUserCountExpanded"
                  @click="isUserCountExpanded = !isUserCountExpanded"
                >
                  <div class="uppercase font-light font-sm text-gray-400 mb-1">
                    <i
                      :class="[
                        'pi text-gray-400 transition-transform transition-duration-200',
                        isUserCountExpanded ? 'pi-chevron-down' : 'pi-chevron-right',
                      ]"
                    ></i
                    >User Count
                  </div>
                  <div class="flex align-items-center gap-2">
                    <div class="text-xl text-gray-600">
                      <b> {{ nonAdminUsers.length }} </b>
                    </div>
                  </div>
                </button>
                <div
                  v-if="isUserCountExpanded"
                  class="flex flex-column gap-2 pl-3"
                  style="border-left: 2px solid var(--gray-300)"
                >
                  <div class="flex flex-wrap gap-2 justify-content-between">
                    <div class="uppercase font-light font-sm text-gray-400 mb-1">Children</div>
                    <div class="text-l text-gray-600">
                      <b> {{ childrenCount }} </b>
                    </div>
                  </div>
                  <div class="flex flex-wrap gap-2 justify-content-between">
                    <div class="uppercase font-light font-sm text-gray-400 mb-1">Caregivers</div>
                    <div class="text-l text-gray-600">
                      <b> {{ caregiversCount }} </b>
                    </div>
                  </div>
                  <div class="flex flex-wrap gap-2 justify-content-between">
                    <div class="uppercase font-light font-sm text-gray-400 mb-1">Teachers</div>
                    <div class="text-l text-gray-600">
                      <b> {{ teachersCount }} </b>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="text-md text-gray-500 ml-6">View users for {{ displayOrgType }} {{ orgName }}.</div>
        </div>
        <!-- Users table -->
        <RoarDataTable
          :columns="COLUMNS"
          :data="nonAdminUsers"
          :loading="isLoading || isFetching"
          :allow-export="true"
          :allow-filtering="false"
          :allow-column-selection="false"
          :allow-row-selection="true"
          :show-options-control="true"
          :show-options="false"
          @export-all="downloadAllUsers"
          @export-selected="downloadSelectedUsers"
          @edit-button="onEditButtonClick"
        />
      </div>
      <!-- Edit user modal -->
      <RoarModal
        title="Edit User"
        subtitle="View and update user information"
        :is-enabled="showEditModal"
        @modal-closed="onEditModalClosed"
      >
        <EditUserForm
          v-if="currentEditUser"
          :user="currentEditUser"
          @change="pendingUserUpdate = $event"
          @dirty="isUserDirty = $event"
        />
        <template #footer>
          <div class="flex gap-2">
            <PvButton
              tabindex="0"
              class="border-none border-round bg-white text-primary p-2 hover:surface-200"
              text
              label="Cancel"
              outlined
              @click="onEditModalClosed"
            ></PvButton>
            <PvButton
              tabindex="0"
              class="border-none border-round bg-primary text-white p-2 hover:surface-400"
              :label="isSubmitting ? 'Saving...' : 'Save'"
              :loading="isSubmitting"
              :disabled="!isUserDirty"
              @click="submitUpdateUserInfo"
            ></PvButton>
          </div>
        </template>
      </RoarModal>
    </section>
  </main>
</template>

<script setup lang="ts">
import PvButton from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import { computed, ref, watch } from 'vue';
import AppSpinner from '@/components/AppSpinner.vue';
import EditUserForm, { type EditableUser, type EditableUserUpdate } from '@/components/EditUserForm.vue';
import RoarModal from '@/components/modals/RoarModal.vue';
import RoarDataTable from '@/components/RoarDataTable.vue';
import useUpdateUserInfoMutation from '@/composables/mutations/useUpdateUserInfoMutation';
import useGetUsersByOrgQuery from '@/composables/queries/useGetUsersByOrgQuery';
import { TOAST_DEFAULT_LIFE_DURATION, TOAST_SEVERITIES } from '@/constants/toasts';
import { singularizeFirestoreCollection } from '@/helpers';
import { getChildLabel } from '@/helpers/childLabels';
import { deriveNextCsvFilename, downloadCsv, sanitizeCsvFilename, unparseCsvFile } from '@/helpers/csv';
import { logger } from '@/logger';
import { useAuthStore } from '@/store/auth';

// +-------+
// | Types |
// +-------+
interface UserTableColumn {
  header: string;
  field?: keyof EditableUser;
  dataType?: string;
  sort?: boolean;
  button?: boolean;
  eventName?: string;
  buttonIcon?: string;
}

// +-----------+
// | Constants |
// +-----------+
const COLUMNS: UserTableColumn[] = [
  {
    field: 'uid',
    header: 'UID',
    dataType: 'string',
    sort: false,
  },
  {
    field: 'email',
    header: 'User Login',
    dataType: 'string',
    sort: false,
  },
  {
    field: 'userType',
    header: 'User Type',
    dataType: 'string',
    sort: false,
  },
  {
    field: 'childLabel',
    header: 'Child Label',
    dataType: 'string',
    sort: false,
  },
  {
    header: 'Edit',
    button: true,
    eventName: 'edit-button',
    buttonIcon: 'pi pi-user-edit',
    sort: false,
  },
];
const CSV_EXPORT_COLUMNS = COLUMNS.filter((column) => !column.button);

// +-------+
// | Props |
// +-------+
const props = defineProps({
  orgType: {
    type: String,
    required: true,
  },
  orgId: {
    type: String,
    required: true,
  },
  orgName: {
    type: String,
    required: true,
  },
});

// +----------------------+
// | Composables & stores |
// +----------------------+
const authStore = useAuthStore();
const authReady = computed(() => authStore.isFirekitInit());

const toast = useToast();

// +----------------+
// | Reactive state |
// +----------------+
const currentEditUser = ref<EditableUser | null>(null);
const isUserCountExpanded = ref(false);
const isUserDirty = ref(false);
const pendingUserUpdate = ref<EditableUserUpdate | null>(null);
const showEditModal = ref(false);

// +---------------+
// | Data fetching |
// +---------------+
const {
  isLoading,
  isFetching,
  data: usersResult,
  isError,
} = useGetUsersByOrgQuery(props.orgType, props.orgId, authReady);

const { mutateAsync: updateUserInfo, isPending: isSubmitting } = useUpdateUserInfoMutation();

// +----------+
// | Computed |
// +----------+
const users = computed(() => usersResult.value?.users ?? []);

const nonAdminUsers = computed(() =>
  users.value
    .filter((user) => user.userType !== 'admin')
    .map((user) => ({ ...user, childLabel: getChildLabel(user.childLabelIndex) })),
);

const childrenCount = computed(() => {
  return nonAdminUsers.value.filter((user) => user.userType === 'child').length;
});

const caregiversCount = computed(() => {
  return nonAdminUsers.value.filter((user) => user.userType === 'caregiver').length;
});

const teachersCount = computed(() => {
  return nonAdminUsers.value.filter((user) => user.userType === 'teacher').length;
});

const displayOrgType = computed(() => {
  if (props.orgType === 'districts') {
    return 'Site';
  } else if (props.orgType === 'groups') {
    return 'Cohort';
  } else {
    return singularizeFirestoreCollection(props.orgType);
  }
});

// +----------+
// | Watchers |
// +----------+
watch(isError, (hasError) => {
  if (!hasError) return;
  toast.add({
    severity: TOAST_SEVERITIES.ERROR,
    summary: 'Failed to load users',
    // TODO: handle error cases to provide more specific error messages
    detail: 'An error occurred while loading users. Please try again.',
    life: TOAST_DEFAULT_LIFE_DURATION,
  });
});

// +------------+
// | CSV export |
// +------------+
const exportRowsToCsv = (rows: EditableUser[], filename: string) => {
  if (!rows.length) {
    toast.add({
      severity: TOAST_SEVERITIES.WARN,
      summary: 'No users to export',
      detail: 'There are no users available for this export.',
      life: TOAST_DEFAULT_LIFE_DURATION,
    });
    return;
  }

  const exportRows = rows.map((row) =>
    CSV_EXPORT_COLUMNS.reduce<Record<string, unknown>>((acc, column) => {
      if (column.field) acc[column.header] = row[column.field];
      return acc;
    }, {}),
  );
  const csv = unparseCsvFile(exportRows);

  downloadCsv(csv, deriveNextCsvFilename(sanitizeCsvFilename(filename), { timestamp: new Date() }));
};

const downloadAllUsers = () => {
  exportRowsToCsv(nonAdminUsers.value, `${props.orgName}-users`);
};

const downloadSelectedUsers = (rows: EditableUser[]) => {
  exportRowsToCsv(rows, `${props.orgName}-selected-users`);
};

// +-----------------+
// | Edit User Modal |
// +-----------------+
const onEditButtonClick = (event: EditableUser) => {
  currentEditUser.value = event;
  showEditModal.value = true;
};

const onEditModalClosed = () => {
  showEditModal.value = false;
  currentEditUser.value = null;
  pendingUserUpdate.value = null;
  isUserDirty.value = false;
};

const submitUpdateUserInfo = async () => {
  if (!pendingUserUpdate.value) return;

  const { uid } = pendingUserUpdate.value;

  try {
    await updateUserInfo({ users: [pendingUserUpdate.value] });
    toast.add({
      severity: TOAST_SEVERITIES.SUCCESS,
      summary: 'User updated',
      detail: 'The user was updated successfully.',
      life: TOAST_DEFAULT_LIFE_DURATION,
    });
    onEditModalClosed();
  } catch (error) {
    logger.error(new Error('Failed to update user info', { cause: error }), {
      tags: { composable: 'useUpdateUserInfoMutation' },
      uid,
    });
    toast.add({
      severity: TOAST_SEVERITIES.ERROR,
      summary: 'Failed to update user',
      detail: 'An error occurred while updating the user. Please try again.',
      life: TOAST_DEFAULT_LIFE_DURATION,
    });
  }
};
</script>
