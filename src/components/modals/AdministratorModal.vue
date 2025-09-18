<template>
  <PvDialog modal style="width: 100%; max-width: 600px" :visible="props.isVisible" @update:visible="handleOnClose">
    <template #header>
      <div class="flex flex-column gap-1">
        <h2 class="m-0 font-bold" data-testid="modalTitle">{{ modalTitle }}</h2>
      </div>
    </template>

    <div class="flex gap-2 m-0 mt-4">
      <div class="flex flex-column gap-1 w-full">
        <PvFloatLabel>
          <PvInputText id="first-name" v-model="firstName" class="w-full" data-cy="input-administrator-first-name" />
          <label for="first-name">First Name</label>
        </PvFloatLabel>
        <small v-if="v$.firstName.$error" class="p-error">First name is required.</small>
      </div>

      <div class="flex flex-column gap-1 w-full">
        <PvFloatLabel>
          <PvInputText id="middle-name" v-model="middleName" class="w-full" data-cy="input-administrator-middle-name" />
          <label for="middle-name">Middle Name</label>
        </PvFloatLabel>
        <small v-if="v$.lastName.$error" class="p-error">Middle name is required.</small>
      </div>

      <div class="flex flex-column gap-1 w-full">
        <PvFloatLabel>
          <PvInputText id="last-name" v-model="lastName" class="w-full" data-cy="input-administrator-last-name" />
          <label for="last-name">Last Name</label>
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
            placeholder="Site"
            :maxSelectedLabels="3"
            class="w-full md:w-80"
          />
          <label for="site">Site</label>
        </PvFloatLabel>
        <small v-if="v$.selectedDistricts.$error" class="p-error">Please select a site.</small>
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
        <PvButton
          class="border-none border-round bg-white text-primary p-2 hover:surface-200"
          label="Cancel"
          @click="handleOnClose"
        ></PvButton>

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
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

interface Emits {
  (event: 'close'): void;
}

interface Props {
  data?: any;
  isVisible?: boolean;
}

const emit = defineEmits<Emits>();

const props = withDefaults(defineProps<Props>(), {
  data: null,
  isVisible: false,
});

const authStore = useAuthStore();
const { roarfirekit } = storeToRefs(authStore);
const router = useRouter();
const toast = useToast();

const email = ref<string | null>(null);
const firstName = ref<string | null>(null);
const isSubmitting = ref(false);
const isTestData = ref(false);
const lastName = ref<string | null>(null);
const middleName = ref<string | null>(null);
const selectedDistricts = ref([]);

const v$ = useVuelidate(
  {
    email: { required },
    firstName: { required },
    isTestData: { required },
    lastName: { required },
    middleName: { required },
    selectedDistricts: { required },
  },
  {
    email,
    firstName,
    isTestData,
    lastName,
    middleName,
    selectedDistricts,
  },
);

const { data: districtsData } = useDistrictsListQuery();

const districts = computed(
  () => districtsData?.value?.map((district: any) => ({ value: district?.id, label: district?.name })) || [],
);
const modalTitle = computed(() => (props.data ? 'Edit Administrator' : 'Add Administrator'));
const submitBtnLabel = computed(() => (props.data ? 'Update Administrator' : 'Add Administrator'));
const submittingBtnLabel = computed(() => (props.data ? 'Updating Administrator' : 'Adding Administrator'));

function handleOnClose() {
  emit('close');
  resetForm();
}

function resetForm() {
  email.value = null;
  firstName.value = null;
  isTestData.value = false;
  lastName.value = null;
  middleName.value = null;
  selectedDistricts.value = [];

  isSubmitting.value = false;
}

async function submit() {
  isSubmitting.value = true;

  if (!(await roarfirekit.value.isEmailAvailable(email.value))) {
    isSubmitting.value = false;

    return toast.add({
      severity: 'error',
      summary: 'Error',
      detail: `Email ${email.value} is already in use. Please enter a different email address.`,
      life: TOAST_DEFAULT_LIFE_DURATION,
    });
  }

  const name = {
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

  await roarfirekit.value
    .createAdministrator(email.value, name, orgs, adminOrgs, isTestData.value)
    .then(() => {
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Administrator account created',
        life: TOAST_DEFAULT_LIFE_DURATION,
      });

      handleOnClose();

      router.push({ name: 'Home' });
    })
    .catch((error) => {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message,
        life: TOAST_DEFAULT_LIFE_DURATION,
      });

      console.error(error);
    });
}
</script>
