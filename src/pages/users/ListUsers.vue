<template>
  <main class="container main">
    <section class="main-body">
      <div v-if="!isLoading">
        <div class="flex flex-column mb-5">
          <div class="flex justify-content-between">
            <div class="flex align-items-center gap-3">
              <i class="pi pi-users text-gray-400 rounded" style="font-size: 1.6rem"></i>
              <div class="admin-page-header">List Users</div>
            </div>
            <div class="bg-gray-100 px-5 py-2 rounded flex flex-column gap-3">
              <div class="flex flex-wrap align-items-center gap-2 justify-content-between">
                <div class="uppercase font-light font-sm text-gray-400 mr-2">
                  {{ displayOrgType }}
                </div>
                <div class="text-xl text-gray-600">
                  <b> {{ orgName }} </b>
                </div>
              </div>
              <div class="flex flex-wrap gap-2 justify-content-between">
                <div class="uppercase font-light font-sm text-gray-400 mb-1">Student Count</div>
                <div class="text-xl text-gray-600">
                  <b> {{ users?.length }} </b>
                </div>
              </div>
            </div>
          </div>
          <div class="text-md text-gray-500 ml-6">View users for the selected Group.</div>
        </div>

        <RoarDataTable
          v-if="users"
          :columns="columns"
          :data="users"
          :loading="isLoading || isFetching"
          :allow-export="false"
          :allow-filtering="false"
          @sort="onSort($event)"
          @edit-button="onEditButtonClick($event)"
        />
      </div>
      <AppSpinner v-else />
      <RoarModal
        title="Edit User Information"
        subtitle="Modify, add, or remove user information"
        :is-enabled="isModalEnabled"
        @modal-closed="isModalEnabled = false"
      >
        <EditUsersForm
          v-if="!showPassword"
          :user-data="currentEditUser"
          :edit-mode="true"
          :school-options="schoolOptions"
          :class-options="classOptions"
          :teacher-options="teacherOptions"
          :caregiver-options="caregiverOptions"
          @update:user-data="localUserData = $event"
        />
        <template #footer>
          <div>
            <div class="flex gap-2">
              <PvButton
                tabindex="0"
                class="border-none border-round bg-white text-primary p-2 hover:surface-200"
                text
                label="Cancel"
                outlined
                @click="closeModal"
              ></PvButton>
              <PvButton
                tabindex="0"
                class="border-none border-round bg-primary text-white p-2 hover:surface-400"
                label="Save Changes"
                @click="updateUserData"
                ><i v-if="isSubmitting" class="pi pi-spinner pi-spin"></i
              ></PvButton>
            </div>
          </div>
        </template>
      </RoarModal>
    </section>
  </main>
</template>
<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useToast } from 'primevue/usetoast';
import PvButton from 'primevue/button';
import PvInputText from 'primevue/inputtext';
import _isEmpty from 'lodash/isEmpty';
import { singularizeFirestoreCollection } from '@/helpers';
import { orgFetchAll } from '@/helpers/query/orgs';
import { ORG_TYPES } from '@/constants/orgTypes';
import { useAuthStore } from '@/store/auth';
import useOrgUsersQuery from '@/composables/queries/useOrgUsersQuery';
import AppSpinner from '@/components/AppSpinner.vue';
import EditUsersForm from '@/components/EditUsersForm.vue';
import RoarModal from '@/components/modals/RoarModal.vue';
import RoarDataTable from '@/components/RoarDataTable.vue';

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

const authStore = useAuthStore();
const { roarfirekit } = storeToRefs(authStore);
const initialized = ref(false);

let unsubscribe;
const init = () => {
  if (unsubscribe) unsubscribe();
  initialized.value = true;
};

unsubscribe = authStore.$subscribe(async (mutation, state) => {
  if (state.roarfirekit.restConfig) init();
});

onMounted(() => {
  if (roarfirekit.value.restConfig) init();
  isModalEnabled.value = false;
});

const toast = useToast();

const page = ref(0);
const orderBy = ref(null);

const {
  isLoading,
  isFetching,
  data: users,
} = useOrgUsersQuery(props.orgType, props.orgId, page, orderBy, {
  enabled: initialized,
});

const columns = ref([
  {
    field: 'id',
    header: 'UID',
    dataType: 'string',
    sort: false,
  },
  {
    field: 'username',
    header: 'Username',
    dataType: 'string',
    sort: false,
  },
  // {
  //   field: 'studentData.grade',
  //   header: 'Grade',
  //   dataType: 'string',
  //   sort: false,
  // },
  // {
  //   field: 'studentData.dob',
  //   header: 'Date of Birth',
  //   dataType: 'date',
  //   sort: false,
  // },
  {
    field: 'userType',
    header: 'User Type',
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
]);

const displayOrgType = computed(() => {
  if (props.orgType === 'districts') {
    return 'Site';
  } else if (props.orgType === 'groups') {
    return 'Cohort';
  } else {
    return singularizeFirestoreCollection(props.orgType);
  }
});

const currentEditUser = ref(null);
const isModalEnabled = ref(false);
const schoolOptions = ref([]);
const classOptions = ref([]);

const selectedDistrict = ref(null);
const selectedSchool = ref(null);
const orgOrderBy = ref(null);

const teacherOptions = computed(() => {
  if (!users.value) return [];
  return users.value
    .filter((user) => user.userType === 'teacher')
    .map((user) => {
      const name = user.name?.first || user.name?.last ? `${user.name?.first ?? ''} ${user.name?.last ?? ''}`.trim() : '';
      const label = name || user.email || user.username || user.id;
      return {
        id: user.id,
        label,
        schools: user.schools?.current ?? [],
        classes: user.classes?.current ?? [],
      };
    });
});

const caregiverOptions = computed(() => {
  if (!users.value) return [];
  return users.value
    .filter((user) => user.userType === 'parent')
    .map((user) => {
      const name = user.name?.first || user.name?.last ? `${user.name?.first ?? ''} ${user.name?.last ?? ''}`.trim() : '';
      const label = name || user.email || user.username || user.id;
      return {
        id: user.id,
        label,
        schools: user.schools?.current ?? [],
        classes: user.classes?.current ?? [],
      };
    });
});

// +-----------------+
// | Edit User Modal |
// +-----------------+
const localUserData = ref(null);

const loadEditOptions = async (user) => {
  const districtId = user?.districts?.current?.[0] ?? (props.orgType === 'districts' ? props.orgId : null);
  selectedDistrict.value = districtId ?? 'any';
  selectedSchool.value = user?.schools?.current?.[0] ?? null;

  try {
    schoolOptions.value = await orgFetchAll(
      ref(ORG_TYPES.SCHOOLS),
      selectedDistrict,
      ref(null),
      orgOrderBy,
      ['id', 'name'],
      false,
      authStore.userData?.id ?? null,
    );
  } catch (error) {
    console.error('Error loading schools:', error);
    schoolOptions.value = [];
  }

  try {
    classOptions.value = await orgFetchAll(
      ref(ORG_TYPES.CLASSES),
      selectedDistrict,
      selectedSchool,
      orgOrderBy,
      ['id', 'name', 'schoolId'],
      false,
      authStore.userData?.id ?? null,
    );
  } catch (error) {
    console.error('Error loading classes:', error);
    classOptions.value = [];
  }
};

const onEditButtonClick = (event) => {
  currentEditUser.value = event;
  isModalEnabled.value = true;
  loadEditOptions(event);
  console.log(event);
};

const isSubmitting = ref(false);

// Hidden until we refactor to update users how we want
const updateUserData = async () => {
  if (!localUserData.value) return;
  isSubmitting.value = true;

  const { teacherLinkIds, caregiverLinkIds, orgIds, birthMonth, birthYear, email, ...userData } = localUserData.value;

  try {
    const selectedSchoolName = schoolOptions.value.find((option) => option.id === orgIds?.schools?.[0])?.name;
    const selectedClassName = classOptions.value.find((option) => option.id === orgIds?.classes?.[0])?.name;

    const editPayload = {
      uid: currentEditUser.value.id,
      month: birthMonth ? String(birthMonth) : undefined,
      year: birthYear ? String(birthYear) : undefined,
      school: selectedSchoolName,
      class: selectedClassName,
    };

    await roarfirekit.value.editUsers([editPayload]);

    if (currentEditUser.value?.userType === 'student') {
      const teacherIdsCsv = Array.isArray(teacherLinkIds) ? teacherLinkIds.join(',') : '';
      const caregiverIdsCsv = Array.isArray(caregiverLinkIds) ? caregiverLinkIds.join(',') : '';
      const usersPayload = [
        {
          id: currentEditUser.value.id,
          uid: currentEditUser.value.id,
          userType: 'child',
          teacherId: teacherIdsCsv,
          parentId: caregiverIdsCsv,
        },
        ...(teacherLinkIds ?? []).map((teacherId) => ({
          id: teacherId,
          uid: teacherId,
          userType: 'teacher',
        })),
        ...(caregiverLinkIds ?? []).map((parentId) => ({
          id: parentId,
          uid: parentId,
          userType: 'parent',
        })),
      ];

      await roarfirekit.value.linkUsers({
        users: usersPayload,
        siteId: authStore.currentSite,
        replaceLinks: true,
      });
    }

    isSubmitting.value = false;
    closeModal();
    toast.add({
      severity: 'success',
      summary: 'Updated',
      detail: 'User has been updated',
      life: 3000,
    });
  } catch (error) {
    console.log('Error occurred during submission:', error);
    isSubmitting.value = false;
  }
};

const closeModal = () => {
  isModalEnabled.value = false;
  localUserData.value = null;
};

const onSort = (event) => {
  const _orderBy = (event.multiSortMeta ?? []).map((item) => ({
    field: { fieldPath: item.field },
    direction: item.order === 1 ? 'ASCENDING' : 'DESCENDING',
  }));
  orderBy.value = !_isEmpty(_orderBy) ? _orderBy : null;
};

// +-----------------+
// | Update Password |
// +-----------------+
// Password update removed for mockup parity
</script>
