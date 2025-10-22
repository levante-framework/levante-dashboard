<template>
  <PvDialog
    modal
    style="width: 100%; max-width: 600px"
    :draggable="false"
    :visible="props.isVisible"
    @update:visible="handleOnClose"
  >
    <template #header>
      <div class="flex flex-column gap-1">
        <h2 class="m-0 font-bold" data-testid="modalTitle">{{ modalTitle }}</h2>
      </div>
    </template>

    <div class="flex gap-2 m-0 mt-4">
      <div class="flex flex-column gap-1 w-full">
        <PvFloatLabel>
          <PvInputText id="first-name" v-model="firstName" class="w-full" data-cy="input-administrator-first-name" />
          <label for="first-name">First name</label>
        </PvFloatLabel>
        <small v-if="v$.firstName.$error" class="p-error">First name is required.</small>
      </div>

      <div class="flex flex-column gap-1 w-full">
        <PvFloatLabel>
          <PvInputText id="middle-name" v-model="middleName" class="w-full" data-cy="input-administrator-middle-name" />
          <label for="middle-name">Middle name</label>
        </PvFloatLabel>
      </div>

      <div class="flex flex-column gap-1 w-full">
        <PvFloatLabel>
          <PvInputText id="last-name" v-model="lastName" class="w-full" data-cy="input-administrator-last-name" />
          <label for="last-name">Last name</label>
        </PvFloatLabel>
        <small v-if="v$.lastName.$error" class="p-error">Last name is required.</small>
      </div>
    </div>

    <div class="w-full m-0 mt-5">
      <div class="flex flex-column gap-1 w-full">
        <PvFloatLabel>
          <PvInputText id="email" v-model="email" class="w-full" data-cy="input-administrator-email" />
          <label for="email">Email</label>
        </PvFloatLabel>
        <small v-if="v$.email.$error" class="p-error">Email is required.</small>
      </div>
    </div>

    <div class="w-full m-0 mt-5">
      <div class="flex flex-column gap-1 w-full">
        <PvFloatLabel>
          <PvMultiSelect
            v-model="selectedDistricts"
            :options="districts"
            optionLabel="label"
            optionValue="value"
            filter
            :maxSelectedLabels="3"
            class="w-full md:w-80"
          />
          <label for="site">Site(s)</label>
        </PvFloatLabel>
        <small v-if="v$.selectedDistricts.$error" class="p-error">Please select at least one site.</small>
      </div>
    </div>

    <div class="flex justify-content-center w-full mt-4">
      <div class="flex gap-2 items-center">
        <PvCheckbox v-model="isTestData" input-id="chbx-externalTask" :binary="true" />
        <label for="chbx-externalTask">Mark as <b>Test Administrator</b></label>
      </div>
    </div>

    <template #footer>
      <div class="modal-footer">
        <PvButton class="p-button-secondary p-button-outlined" label="Cancel" @click="handleOnClose"></PvButton>

        <PvButton :disabled="isSubmitting" :label="submitBtnLabel" data-testid="submitBtn" @click="submit">
          <div v-if="isSubmitting"><i class="pi pi-spinner pi-spin mr-1"></i> {{ submittingBtnLabel }}</div>
        </PvButton>
      </div>
    </template>
  </PvDialog>
</template>

<script lang="ts" setup>
import useDistrictsListQuery from '@/composables/queries/useDistrictsListQuery';
import { TOAST_DEFAULT_LIFE_DURATION } from '@/constants/toasts';
import { useAuthStore } from '@/store/auth';
import { Name } from '@levante-framework/firekit/lib/interfaces';
import useVuelidate from '@vuelidate/core';
import { required } from '@vuelidate/validators';
import _cloneDeep from 'lodash/cloneDeep';
import { storeToRefs } from 'pinia';
import PvButton from 'primevue/button';
import PvCheckbox from 'primevue/checkbox';
import PvDialog from 'primevue/dialog';
import PvFloatLabel from 'primevue/floatlabel';
import PvInputText from 'primevue/inputtext';
import PvMultiSelect from 'primevue/multiselect';
import { useToast } from 'primevue/usetoast';
import { computed, ref, watch } from 'vue';

interface Emits {
  (event: 'close'): void;
  (event: 'refetch'): void;
}

interface Props {
  data?: any;
  isVisible?: boolean;
}

// Emits
const emit = defineEmits<Emits>();

// Props
const props = withDefaults(defineProps<Props>(), {
  data: null,
  isVisible: false,
});

// Hooks
const authStore = useAuthStore();
const { roarfirekit } = storeToRefs(authStore);
const toast = useToast();

// Queries
const { data: districtsData } = useDistrictsListQuery();

// Computed
const districts = computed(
  () => districtsData?.value?.map((district: any) => ({ value: district?.id, label: district?.name })) || [],
);

const modalTitle = computed(() => (props?.data ? 'Edit Administrator' : 'Add Administrator'));
const submitBtnLabel = computed(() => (props?.data ? 'Update Administrator' : 'Add Administrator'));
const submittingBtnLabel = computed(() => (props?.data ? 'Updating Administrator' : 'Adding Administrator'));

// Refs
const email = ref<string>('');
const firstName = ref<string>('');
const isSubmitting = ref(false);
const isTestData = ref(false);
const lastName = ref<string>('');
const middleName = ref<string>('');
const selectedDistricts = ref([]);

const v$ = useVuelidate(
  {
    email: { required },
    firstName: { required },
    lastName: { required },
    selectedDistricts: { required },
  },
  {
    email,
    firstName,
    lastName,
    selectedDistricts,
  },
);

watch(
  () => props.data,
  (newData) => {
    if (newData) {
      const newFirstName = newData?.name?.first;
      const newMiddleName = newData?.name?.middle;
      const newLastName = newData?.name?.last;

      email.value = newData.email ?? null;
      firstName.value = newFirstName;
      isTestData.value = newData.testData ?? false;
      lastName.value = newLastName;
      middleName.value = newMiddleName;
      selectedDistricts.value = newData.districts?.all ?? [];
    } else {
      resetForm();
    }
  },
  { immediate: true },
);

// Helper functions
function handleOnClose() {
  emit('close');
  resetForm();
}

function resetForm() {
  email.value = '';
  firstName.value = '';
  isTestData.value = false;
  lastName.value = '';
  middleName.value = '';
  selectedDistricts.value = [];

  isSubmitting.value = false;
}

async function submit() {
  isSubmitting.value = true;

  if (email.value.trim().length <= 0) {
    isSubmitting.value = false;

    return toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Email address is required',
      life: TOAST_DEFAULT_LIFE_DURATION,
    });
  }

  if (!props?.data && !(await roarfirekit.value!.isEmailAvailable(email.value))) {
    isSubmitting.value = false;

    return toast.add({
      severity: 'error',
      summary: 'Error',
      detail: `Email ${email.value} is already in use. Please enter a different email address.`,
      life: TOAST_DEFAULT_LIFE_DURATION,
    });
  }

  const name: Name = {
    first: firstName.value,
    middle: middleName.value,
    last: lastName.value,
  };

  const adminOrgs = {
    districts: selectedDistricts.value?.map((id: string) => id) ?? [],
    schools: [],
    classes: [],
    groups: [],
    families: [],
  };

  // Build orgs from admin orgs. Orgs should contain all of the admin orgs. And
  // also their parents.
  const orgs = _cloneDeep(adminOrgs);

  // If props.data, we are updating an existing administrator.
  if (props?.data) {
    return await roarfirekit
      .value!.updateAdministrator(props?.data?.id, email.value, name, orgs, adminOrgs, isTestData.value)
      .then(() => {
        isSubmitting.value = false;

        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Administrator account updated successfully',
          life: TOAST_DEFAULT_LIFE_DURATION,
        });

        emit('refetch');

        handleOnClose();
      })
      .catch((error) => {
        isSubmitting.value = false;

        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message,
          life: TOAST_DEFAULT_LIFE_DURATION,
        });

        console.error('Error updating administrator', error);
      });
  }

  return await roarfirekit
    .value!.createAdministrator(email.value, name, orgs, adminOrgs, isTestData.value)
    .then(() => {
      isSubmitting.value = false;

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Administrator account created successfully',
        life: TOAST_DEFAULT_LIFE_DURATION,
      });

      emit('refetch');

      handleOnClose();
    })
    .catch((error) => {
      isSubmitting.value = false;

      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message,
        life: TOAST_DEFAULT_LIFE_DURATION,
      });

      console.error('Error creating administrator', error);
    });
}
</script>
