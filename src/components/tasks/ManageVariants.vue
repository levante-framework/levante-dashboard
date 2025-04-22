<template>
  <PvToast />
  <PvSelectButton
    v-model="viewModel"
    :options="modelViews"
    class="flex my-2 select-button p-2"
    @change="handleViewChange($event.value)"
  />
  <div v-show="viewModel === 'Create Variant'">
    <div class="card px-3">
      <form class="p-fluid" @submit.prevent="handleVariantSubmit(!v$.$invalid)">
        <h1 class="text-center font-bold">Create a New Variant</h1>

        <div class="flex flex-column row-gap-3">
          <section class="form-section">
            <div class="flex justify-content-between align-items-center">
              <label for="variant-fields">
                <small class="text-gray-400 font-bold">Select an Existing Task </small>
                <span class="required">*</span></label
              >
              <div class="flex flex-column gap-2 align-items-end">
                <div class="flex flex-row align-items-center justify-content-end gap-2 flex-order-1">
                  <!--                    This does not seemt to function properly, comming it out for now.-->
                  <!--                    <label class="ml-7" for="chbx-registeredTask">Search registered tasks only?</label>-->
                  <!--                    <PvCheckbox v-model="registeredTasksOnly" input-id="chbx-registeredTask" :binary="true" />-->
                </div>
              </div>
            </div>
            <PvDropdown
              v-model="v$.selectedGame.$model"
              :options="formattedTasks"
              option-label="name"
              placeholder="Select a Game"
              :loading="isFetchingTasks"
              :class="{ 'p-invalid': v$.variantName.$invalid && submitted }"
              name="variant-fields"
              @click="clearFieldParamArrays()"
            ></PvDropdown>
            <span v-if="v$.selectedGame.$error && submitted">
              <span v-for="(error, index) of v$.selectedGame.$errors" :key="index">
                <small class="p-error">{{ error.$message }}</small>
              </span>
            </span>
            <small
              v-else-if="(v$.selectedGame.$invalid && submitted) || v$.selectedGame.$pending"
              class="p-error"
            >
              {{ v$.selectedGame.id?.required?.$message.replace('Value', 'Task selection') }}
            </small>
          </section>

          <section class="form-section">
            <div class="p-input-icon-right">
              <label for="variantName">
                <small class="text-gray-400 font-bold">Variant Name </small>
                <span class="required">*</span></label
              >
              <PvInputText
                v-model="v$.variantName.$model"
                name="variantName"
                :class="{ 'p-invalid': v$.variantName.$invalid && submitted }"
                aria-describedby="activation-code-error"
              />
            </div>
            <span v-if="v$.variantName.$error && submitted">
              <span v-for="(error, index) of v$.variantName.$errors" :key="index">
                <small class="p-error">{{ error.$message }}</small>
              </span>
            </span>
            <small
              v-else-if="(v$.variantName.$invalid && submitted) || v$.variantName.$pending"
              class="p-error"
            >
              {{ v$.variantName.required?.$message.replace('Value', 'Variant Name') }}
            </small>
          </section>
        </div>

        <div class="flex flex-column align-items-center">
          <h3 class="text-center">
            <strong>Configure Parameter Values</strong>
          </h3>
          <h4 class="text-center">
            Set the game parameters for a new variant of task <strong>{{ variantFields.selectedGame.id }}</strong>
          </h4>
          <div class="flex flex-column">
            <!--
            Each param looks like this:
            {"name": "someParam", "type": "string, boolean, or number", "value": "valueOfParam"}

            We want to assign the value of param.name to the value of the equivalent key in variantParams

            So if param.name is "someParam", then
            variantParams[param.name] returns the value of variantParams.someParam,which is the value that we want to change for a new variant
-->
            <div
              v-for="(param, index) in mappedGameConfig"
              :key="index"
              class="flex align-items-center justify-content-center dynamic-param-container gap-4"
            >
              <div v-if="!deletedParams.includes(param.name)" class="flex align-items-center">
                <label for="inputParamName">Parameter:</label>

                <PvInputText id="inputParamName" v-model="variantParams[param.name]" :value="param.name" disabled />
              </div>

              <div class="flex align-items-center">
                <label for="inputParamType">Type:</label>
                <PvInputText id="inputParamType" v-model="param.type" :value="param.type" disabled />
              </div>

              <div class="flex align-items-center gap-2 flex-grow-1">
                <label for="inputParamValue">Value:</label>
                <PvInputText
                  v-if="param.type === 'string'"
                  id="inputParamValue"
                  v-model="variantParams[param.name]"
                  placeholder="Set game parameter to desired value"
                  class="flex-grow-1"
                />
                <PvDropdown
                  v-else-if="param.type === 'boolean'"
                  id="inputParamValue"
                  v-model="variantParams[param.name]"
                  :options="booleanDropDownOptions"
                  option-label="label"
                  option-value="value"
                  placeholder="Set game parameter to desired value"
                  class="flex-grow-1"
                />
                <PvInputNumber
                  v-else-if="param.type === 'number'"
                  id="inputParamValue"
                  v-model="variantParams[param.name]"
                  placeholder="Set game parameter to desired value"
                  class="flex-grow-1"
                />
              </div>

              <div>
                <PvButton
                  type="button"
                  icon="pi pi-trash"
                  class="my-4 bg-primary text-white border-none border-round p-2 hover:bg-red-900"
                  text
                  @click="moveToDeletedParams(param.name)"
                />
              </div>
            </div>

            <div v-if="newParams.length > 0" class="w-full">
              <div v-for="(field, index) in newParams" :key="index" class="flex align-items-center column-gap-2 mb-1">
                <PvInputText v-model="field.name" placeholder="Field Name" />
                <PvDropdown
                  v-model="field.type"
                  :options="['string', 'number', 'boolean']"
                  placeholder="Field Type"
                  class="w-fit"
                />

                <PvInputText
                  v-if="field.type === 'string'"
                  v-model="field.value"
                  placeholder="Field Value"
                  class="w-full"
                />
                <PvInputNumber
                  v-if="field.type === 'number'"
                  v-model="field.value"
                  placeholder="Field Value"
                  class="w-full"
                />
                <PvDropdown
                  v-if="field.type === 'boolean'"
                  v-model="field.value"
                  placeholder="Field Value"
                  :options="booleanDropDownOptions"
                  option-label="label"
                  option-value="value"
                  class="w-full"
                />
                <PvButton
                  type="button"
                  icon="pi pi-trash"
                  class="w-4rem bg-primary text-white border-none border-round p-2 hover:bg-red-900"
                  text
                  @click="removeField(field.name, newParams)"
                />
              </div>
            </div>
          </div>
          <PvButton
            label="Add Parameter"
            text
            icon="pi pi-plus"
            class="w-2 my-4 bg-primary text-white border-none border-round p-2 hover:bg-red-900"
            @click="newParam"
          />
        </div>
        <div class="flex flex-row align-items-center justify-content-center gap-2 flex-order-0 my-3">
          <div class="flex flex-row align-items-center">
            <PvCheckbox
              v-model="variantCheckboxData"
              input-id="chbx-demoVariant"
              name="variantCheckboxData"
              value="isDemoVariant"
            />
            <label class="ml-1 mr-3" for="chbx-demoVariant">Mark as <b>Demo Variant</b></label>
          </div>
          <div class="flex flex-row align-items-center">
            <PvCheckbox
              v-model="variantCheckboxData"
              input-id="chbx-testVariant"
              name="variantCheckboxData"
              value="isTestVariant"
            />
            <label class="ml-1 mr-3" for="chbx-testVariant">Mark as <b>Test Variant</b></label>
          </div>
          <div class="flex flex-row align-items-center">
            <div class="flex flex-row align-items-center">
              <PvCheckbox
                v-model="variantCheckboxData"
                input-id="chbx-registeredVariant"
                name="variantCheckboxData"
                value="isRegisteredVariant"
              />
              <label class="ml-1 mr-3" for="chbx-externalVariant">Mark as <b>Registered Variant</b></label>
            </div>
          </div>
        </div>
        <div class="form-submit">
          <PvButton
            type="submit"
            label="Submit"
            class="submit-button w-2 my-4 bg-primary text-white border-none border-round p-2 hover:bg-red-900"
            severity="primary"
          />
        </div>
      </form>
    </div>
  </div>

  <div v-show="viewModel === 'Update Variant'">
    <h1 class="text-center font-bold">Update a Variant</h1>
    <form @submit.prevent="handleUpdateVariant()">
      <section class="flex flex-column gap-2 mb-4 p-4">
        <label for="task-select" class="my-2">
          <small class="text-gray-400 font-bold">Select an Existing Task </small>
          <span class="required">*</span></label
        >
        <PvDropdown
          v-model="selectedTask"
          :options="formattedTasks"
          option-label="name"
          option-value="id"
          placeholder="Select a Game"
          @click="clearFieldParamArrays()"
        />
        <label for="variant-select" class="my-2">
          <small class="text-gray-400 font-bold">Select an Existing Variant </small>
          <span class="required">*</span></label
        >
        <PvDropdown
          v-model="selectedVariant"
          :options="filteredVariants"
          :option-label="(data) => (data.variant.name ? data.variant.name : data.variant.id)"
          option-value="variant"
          placeholder="Select a Variant"
          @click="clearFieldParamArrays()"
        />
      </section>

      <section v-if="selectedVariant" class="flex flex-column align-items-start mt-4 p-4">
        <div class="flex flex-column w-full">
          <label for="fieldsOutput">
            <strong>Fields</strong>
          </label>
          <div v-for="(value, key) in selectedVariant" id="fieldsOutput" :key="key">
            <div v-if="typeof key === 'string' && !ignoreFields.includes(key)">
              <div
                v-if="updatedVariantData[key as keyof typeof updatedVariantData] !== undefined"
                class="flex align-items-center justify-content-between gap-2 mb-1"
              >
                <label :for="key" class="w-1">
                  <em>{{ key }}</em>
                </label>
                <PvInputText :id="'inputEditVariantType_' + key" :placeholder="typeof value" disabled class="w-2 text-center" />
                <PvInputText
                  v-if="typeof value === 'string'"
                  :id="key" 
                  v-model="updatedVariantData[key as keyof typeof updatedVariantData]"
                  :placeholder="value"
                  class="flex-grow-1"
                />
                <PvInputNumber
                  v-else-if="typeof value === 'number'"
                  :input-id="key"
                  v-model="updatedVariantData[key as keyof typeof updatedVariantData]"
                  class="flex-grow-1"
                />
                <PvDropdown
                  v-else-if="typeof value === 'boolean'"
                  :input-id="key"
                  v-model="updatedVariantData[key as keyof typeof updatedVariantData]"
                  :options="booleanDropDownOptions"
                  option-label="label"
                  option-value="value"
                  class="flex-grow-1"
                />
                <PvButton
                  type="button"
                  icon="pi pi-trash"
                  class="my-4 bg-primary text-white border-none border-round p-2 hover:bg-red-900"
                  text
                  @click="deleteParam(key)"
                />
              </div>
            </div>
          </div>

          <div v-if="addedFields.length > 0" class="w-full">
            <div v-for="(field, index) in addedFields" :key="index" class="flex align-items-center column-gap-2 mb-1">
              <PvInputText v-model="field.name" placeholder="Field Name" />
              <PvDropdown v-model="field.type" :options="['string', 'number', 'boolean']" placeholder="Field Type" />

              <PvInputText
                v-if="field.type === 'string'"
                v-model="field.value"
                placeholder="Field Value"
                class="flex-grow-1"
              />
              <PvInputNumber
                v-if="field.type === 'number'"
                v-model="field.value"
                placeholder="Field Value"
                class="flex-grow-1"
              />
              <PvDropdown
                v-if="field.type === 'boolean'"
                v-model="field.value"
                placeholder="Field Value"
                :options="booleanDropDownOptions"
                option-label="label"
                option-value="value"
                class="flex-grow-1"
              />
              <PvButton
                type="button"
                icon="pi pi-trash"
                class="my-4 bg-primary text-white border-none border-round p-2 hover:bg-red-900"
                @click="removeField(field.name, addedFields)"
              />
            </div>
          </div>
        </div>
        <PvButton
          label="Add Field"
          text
          icon="pi pi-plus"
          class="my-4 bg-primary text-white border-none border-round p-2 hover:bg-red-900"
          @click="addField"
        />

        <!--          **** Disabling the function to edit game params for now ****-->

        <!--          <div class="flex flex-column w-8">-->
        <!--            <label for="paramsOutput">-->
        <!--              <strong>Game Params</strong>-->
        <!--            </label>-->
        <!--            <div v-for="(param, paramName) in selectedVariant.params" id="paramsOutput" :key="paramName" class="mb-1">-->
        <!--              <div-->
        <!--                v-if="updatedVariantData.params[paramName] !== undefined"-->
        <!--                class="flex align-items-center justify-content-end column-gap-2"-->
        <!--              >-->
        <!--                <label :for="paramName" class="w-2">-->
        <!--                  <em>{{ paramName }} </em>-->
        <!--                </label>-->
        <!--                <PvInputText id="inputEditParamType" :placeholder="typeof param" class="w-2" disabled />-->
        <!--                <PvInputText-->
        <!--                  v-if="typeof param === 'string'"-->
        <!--                  v-model="updatedVariantData.params[paramName]"-->
        <!--                  :placeholder="param"-->
        <!--                  class="flex-grow-1"-->
        <!--                />-->
        <!--                <PvInputNumber-->
        <!--                  v-else-if="typeof param === 'number'"-->
        <!--                  v-model="updatedVariantData.params[paramName]"-->
        <!--                  class="flex-grow-1"-->
        <!--                />-->
        <!--                <PvDropdown-->
        <!--                  v-else-if="typeof param === 'boolean'"-->
        <!--                  v-model="updatedVariantData.params[paramName]"-->
        <!--                  :options="booleanDropDownOptions"-->
        <!--                  option-label="label"-->
        <!--                  option-value="value"-->
        <!--                  class="flex-grow-1"-->
        <!--                />-->
        <!--                <PvButton type="button" @click="deleteParam(paramName)">Delete</PvButton>-->
        <!--              </div>-->
        <!--            </div>-->
        <!--            <div v-if="addedParams.length > 0">-->
        <!--              <div v-for="(field, index) in addedParams" :key="index" class="flex align-items-center column-gap-2 mb-1">-->
        <!--                <PvInputText v-model="field.name" placeholder="Field Name" />-->
        <!--                <PvDropdown v-model="field.type" :options="['string', 'number', 'boolean']" placeholder="Field Type" />-->
        <!--                <PvInputText-->
        <!--                  v-if="field.type === 'string'"-->
        <!--                  v-model="field.value"-->
        <!--                  placeholder="Field Value"-->
        <!--                  class="flex-grow-1"-->
        <!--                />-->
        <!--                <PvInputNumber-->
        <!--                  v-if="field.type === 'number'"-->
        <!--                  v-model="field.value"-->
        <!--                  placeholder="Field Value"-->
        <!--                  class="flex-grow-1"-->
        <!--                />-->
        <!--                <PvDropdown-->
        <!--                  v-if="field.type === 'boolean'"-->
        <!--                  v-model="field.value"-->
        <!--                  placeholder="Field Value"-->
        <!--                  :options="booleanDropDownOptions"-->
        <!--                  option-label="label"-->
        <!--                  option-value="value"-->
        <!--                  class="flex-grow-1"-->
        <!--                />-->
        <!--                <PvButton type="button" @click="removeField(field.name, addedParams)">Delete</PvButton>-->
        <!--              </div>-->
        <!--            </div>-->
        <!--          </div>-->
        <!--          <PvButton label="Add Param" text icon="pi pi-plus" class="my-4" @click="addParam" />-->
      </section>

      <PvButton type="submit" class="my-4 bg-primary text-white border-none border-round p-2 hover:bg-red-900"
        >Update Variant</PvButton
      >
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch, type Ref } from 'vue';
import { required } from '@vuelidate/validators';
import { useVuelidate } from '@vuelidate/core';
import { storeToRefs } from 'pinia';
import { useToast } from 'primevue/usetoast';
import PvButton from 'primevue/button';
import PvCheckbox from 'primevue/checkbox';
import PvDropdown from 'primevue/dropdown';
import PvInputNumber from 'primevue/inputnumber';
import PvInputText from 'primevue/inputtext';
import PvSelectButton from 'primevue/selectbutton';
import PvToast from 'primevue/toast';
import { cloneDeep, camelCase } from 'lodash';
import { useAuthStore } from '@/store/auth';
// @ts-ignore - Missing type declarations
import useTasksQuery from '@/composables/queries/useTasksQuery';
// @ts-ignore - Missing type declarations
import useTaskVariantsQuery from '@/composables/queries/useTaskVariantsQuery';
// @ts-ignore - Missing type declarations
import useAddTaskVariantMutation from '@/composables/mutations/useAddTaskVariantMutation';
// @ts-ignore - Missing type declarations
import useUpdateTaskVariantMutation from '@/composables/mutations/useUpdateTaskVariantMutation';

// --- Interfaces & Types ---

// Reuse or redefine Task interface from ManageTasks.vue
interface Task {
  id: string;
  taskName?: string;
  gameConfig?: Record<string, any>;
  description?: string;
  image?: string; // Assuming image field exists
  demoData?: boolean;
  testData?: boolean;
  [key: string]: any;
}

interface Variant {
  id: string;
  name?: string;
  params?: Record<string, any>;
  task?: { id: string }; // Reference to parent task ID
  demoData?: boolean;
  testData?: boolean;
  registered?: boolean;
  [key: string]: any;
}

interface ParamField {
  name: string;
  value: any;
  type: string; // Keep as string for typeof results
}

interface MappedParam {
    name: string;
    type: string;
    value: any;
}

interface BooleanDropdownOption {
  label: string;
  value: boolean;
}

type ModelView = 'Create Variant' | 'Update Variant';

// --- Component Logic ---

const toast = useToast();
const initialized = ref(false);
const registeredTasksOnly = ref(true);
const variantCheckboxData = ref<string[]>();
const authStore = useAuthStore();
const { roarfirekit } = storeToRefs(authStore);

// @ts-ignore - JS Composables
const { mutate: addVariant } = useAddTaskVariantMutation();
// @ts-ignore - JS Composables
const { mutate: updateVariant } = useUpdateTaskVariantMutation();

const selectedTask = ref<string | null>(null);
const selectedVariant = ref<Variant | null>(null);

// Use reactive with explicit type. Initialize with empty object
let updatedVariantData = reactive<Partial<Variant>>({});
let addedFields = reactive<ParamField[]>([]);
let newParams = reactive<ParamField[]>([]);

const viewModel = ref<ModelView>('Create Variant');
const modelViews: ModelView[] = ['Create Variant', 'Update Variant'];

const handleViewChange = (value: any) => {
  const selectedView = modelViews.find((view) => view === value);
  if (selectedView) {
    viewModel.value = selectedView;
  }
};

const ignoreFields = ['id', 'lastUpdated', 'params', 'parentDoc', 'task']; // Add 'task'

const booleanDropDownOptions: BooleanDropdownOption[] = [
  { label: 'true', value: true },
  { label: 'false', value: false },
];

watch(selectedVariant, (newVal) => {
  // Ensure newVal is not null before cloning
  Object.assign(updatedVariantData, cloneDeep(newVal ?? {}));
  clearFieldParamArrays(); // Clear dynamic fields
});

let unsubscribe: Function | undefined;
const init = () => {
  if (unsubscribe) unsubscribe();
  initialized.value = true;
};

unsubscribe = authStore.$subscribe(async (mutation, state) => {
  if (state.roarfirekit?.restConfig) init();
});

onMounted(() => {
  if (roarfirekit.value?.restConfig) init();
});

// @ts-ignore - JS Composable
const { isFetching: isFetchingTasks, data: tasks } = useTasksQuery({
  enabled: initialized,
}) as { isFetching: Ref<boolean>; data: Ref<Task[] | undefined> };

// @ts-ignore - JS Composable
const { data: variants } = useTaskVariantsQuery(registeredTasksOnly, {
  enabled: initialized,
}) as { data: Ref<Variant[] | undefined> };

const formattedTasks = computed(() => {
  if (!tasks.value) return [];
  // Add explicit type for task parameter
  return tasks.value.map((task: Task) => ({
    name: task.taskName ?? task.id,
    ...task,
  }));
});

const filteredVariants = computed(() => {
  if (!variants.value || !selectedTask.value) {
    return [];
  }
  // Add explicit type for variant parameter
  return variants.value.filter((variant: Variant) => variant.task?.id === selectedTask.value);
});

// Define the structure Vuelidate expects
const variantFields = reactive<{ 
    variantName: string; 
    selectedGame: Partial<Task>; // Use Partial<Task> 
    external: boolean; 
}> ({
  variantName: '',
  selectedGame: {},
  external: true,
});

const variantRules = {
  variantName: { required },
  selectedGame: {
    id: { required }, // Validate the id within selectedGame
  },
};
const v$ = useVuelidate(variantRules, variantFields);
const submitted = ref(false);

const variantParams = computed<Record<string, any>>(() => {
  const params: Record<string, any> = {}; // Initialize explicitly

  if (!mappedGameConfig.value) {
    return params;
  }

  mappedGameConfig.value.forEach((param) => {
    if (param.name) { // Ensure name exists before assignment
       params[param.name] = param.value;
    }
  });

  return params;
});

const mappedGameConfig = computed<MappedParam[]>(() => {
  const gameConfig = variantFields.selectedGame?.gameConfig;
  if (!gameConfig || typeof gameConfig !== 'object') { // Add check for object type
    return [];
  }

  // Filter out non-string keys before mapping
  return Object.entries(gameConfig)
    .filter(([key]) => typeof key === 'string') 
    .map(([key, value]): MappedParam => ({
      name: key,
      type: typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'string', // More specific type check
      value: value,
  }));
});

const deletedParams = ref<string[]>([]);

const moveToDeletedParams = (paramName: string) => {
  // This logic seems flawed, directly mutating computed refs is not ideal.
  // Consider managing the source data (variantFields.selectedGame.gameConfig) instead.
  // For now, just add to deletedParams to track.
  if (!deletedParams.value.includes(paramName)) {
      deletedParams.value.push(paramName);
  }
  // Commenting out direct mutation of computed refs - needs rework
  // const index = mappedGameConfig.value.findIndex(p => p.name === paramName);
  // if (index > -1) {
  //   mappedGameConfig.value.splice(index, 1); // This won't work as expected
  // }
  // if (variantParams.value[paramName] !== undefined) {
  //    delete variantParams.value[paramName]; // This won't work as expected
  // }
};

const deleteParam = (paramName: string) => {
   // Check if params exists before deleting
  if (updatedVariantData.params && updatedVariantData.params[paramName] !== undefined) {
    delete updatedVariantData.params[paramName];
  }
   // Also delete from top level if applicable
   if (updatedVariantData[paramName as keyof typeof updatedVariantData] !== undefined) { // Cast here
       delete updatedVariantData[paramName as keyof typeof updatedVariantData]; // Cast here
   }
};

const addField = () => {
  addedFields.push({ name: '', value: null, type: 'string' });
};

const removeField = (fieldName: string, array: ParamField[]) => {
  const index = array.findIndex(item => item.name === fieldName);
  if (index > -1) {
      array.splice(index, 1);
  }
};

const newParam = () => {
  newParams.push({ name: '', value: null, type: 'string' });
};

function convertParamsToObj(paramArray: ParamField[]): Record<string, any> {
  return paramArray.reduce((acc: Record<string, any>, item) => {
    if (item.name) {
      acc[camelCase(item.name)] = item.value;
    }
    return acc;
  }, {});
}

const checkForDuplicates = (
    newItemsArray: ParamField[], 
    currentDataObject: Record<string, any> | undefined | null // Allow null
): { isDuplicate: boolean; duplicateField: string } => {
  if (!currentDataObject) return { isDuplicate: false, duplicateField: '' }; // Handle null/undefined

  const keys = Object.keys(currentDataObject); // Safe now
  for (const newItem of newItemsArray) {
    if (newItem.name && keys.includes(newItem.name)) {
      return { isDuplicate: true, duplicateField: newItem.name };
    }
  }
  return { isDuplicate: false, duplicateField: '' };
};

// Return boolean or undefined
function checkVariantExists(value: string): boolean | undefined {
  if (!variants.value) return false;
  // Add explicit type for item
  const exists = variants.value.some((item: Variant) => value === item.name);
  if (exists) {
      toast.add({
        severity: 'error',
        summary: 'Oops!',
        detail: `Variant with name '${value}' already exists. Please choose a different name.`,
        life: 3000,
      });
      return true;
  }
  return false;
}

const checkForErrors = (): boolean => {
  if (addedFields.length > 0) {
    const { isDuplicate, duplicateField } = checkForDuplicates(addedFields, updatedVariantData);
    if (isDuplicate) {
      toast.add({ severity: 'error', summary: 'Oops!', detail: `Duplicate field name detected: ${duplicateField}.`, life: 3000 });
      return true;
    }
  }

  if (newParams.length > 0) {
    // Pass variantParams computed value, ensure it's not null/undefined
    const currentParams = variantParams.value ?? {}; 
    const { isDuplicate, duplicateField } = checkForDuplicates(newParams, currentParams);
    if (isDuplicate) {
      toast.add({ severity: 'error', summary: 'Oops!', detail: `Duplicate param name detected: ${duplicateField}.`, life: 3000 });
      return true;
    }
  }
  return false; // Explicitly return false if no errors
};

const handleUpdateVariant = async () => {
  if (checkForErrors()) return;

  if (!selectedTask.value) {
    toast.add({ severity: 'error', summary: 'Invalid Form', detail: 'Please select a task.', life: 3000 });
    return;
  }

  if (!selectedVariant.value?.id) { // Check for selectedVariant.id
    toast.add({ severity: 'error', summary: 'Invalid Form', detail: 'Please select a variant.', life: 3000 });
    return;
  }

  const convertedFields = convertParamsToObj(addedFields);
  // Combine existing params (if any) with new ones if param editing is re-enabled
  const finalData: Partial<Variant> = {
      ...updatedVariantData,
      ...convertedFields,
      // params: { ...updatedVariantData.params, ...convertedParams }
  };
  delete finalData.id; // Don't send id in data payload

  const variantUpdatePayload = {
    taskId: selectedTask.value,
    variantId: selectedVariant.value.id,
    data: finalData,
  };

  await updateVariant(variantUpdatePayload, {
    onSuccess: () => {
      toast.add({ severity: 'success', summary: 'Hoorah!', detail: 'Variant successfully updated.', life: 3000 });
      resetUpdateVariantForm();
    },
    onError: (error: any) => {
      toast.add({ severity: 'error', summary: 'Error', detail: 'Unable to update variant, please try again.', life: 3000 });
      console.error('Failed to update variant.', error);
    },
  });
};

const handleVariantSubmit = async (isFormValid: boolean) => {
  if (checkForErrors()) return;
  if (checkVariantExists(variantFields.variantName)) return;

  submitted.value = true;
  if (!isFormValid) {
    return;
  }

  const isDemoData = !!variantCheckboxData.value?.includes('isDemoVariant');
  const isTestData = !!variantCheckboxData.value?.includes('isTestVariant');
  const isRegisteredVariant = !!variantCheckboxData.value?.includes('isRegisteredVariant');

  const convertedParams = convertParamsToObj(newParams);
  const combinedParams = { ...variantParams.value, ...convertedParams };

  // Ensure selectedGame has an id before proceeding
  if (!variantFields.selectedGame?.id) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'Selected task is missing an ID.', life: 3000 });
      return;
  }

  const newVariantObject: Partial<Variant> = reactive({
    // taskId: variantFields.selectedGame.id, // Task ID is part of the mutation call, not payload data usually
    name: variantFields.variantName, // Changed from variantName
    params: combinedParams,         // Changed from variantParams
    demoData: isDemoData,             // Nested structure based on ManageTasks?
    testData: isTestData, 
    registered: isRegisteredVariant,
     // Include inherited properties if needed
    // taskDescription: variantFields.selectedGame.description,
    // taskImage: variantFields.selectedGame.image,
  });

  const addPayload = {
      taskId: variantFields.selectedGame.id, 
      data: newVariantObject 
  };

  await addVariant(addPayload, {
    onSuccess: () => {
      toast.add({ severity: 'success', summary: 'Hoorah!', detail: 'Variant successfully created.', life: 3000 });
      submitted.value = false;
      resetCreateVariantForm();
    },
    onError: (error: any) => {
      toast.add({ severity: 'error', summary: 'Error', detail: 'Unable to create variant, please try again.', life: 3000 });
      console.error('Failed to add variant.', error);
    },
  });
};

function resetCreateVariantForm() {
  Object.assign(variantFields, {
    variantName: '',
    selectedGame: {},
    external: true,
  });
  // Reset source refs for variantParams computed property
  deletedParams.value = [];
  newParams.splice(0, newParams.length);

  variantCheckboxData.value = [];
  clearFieldParamArrays(); // This might be redundant if newParams is cleared
}

const resetUpdateVariantForm = () => {
  selectedTask.value = null;
  selectedVariant.value = null;
  // Reset updatedVariantData properly
  Object.keys(updatedVariantData).forEach(key => delete updatedVariantData[key]);
  clearFieldParamArrays();
};

const clearFieldParamArrays = () => {
  addedFields.splice(0, addedFields.length);
  newParams.splice(0, newParams.length);
};

</script>

<style>
.submit-button {
  margin: auto;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  display: flex;
  border: none;
  width: 11.75rem;
}

.submit-button:hover {
  background-color: #2b8ecb;
  color: black;
}

.select-button .p-button:last-of-type:not(:only-of-type) {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  border-top-right-radius: 25rem;
  border-bottom-right-radius: 25rem;
}

.select-button .p-button:first-of-type:not(:only-of-type) {
  border-top-left-radius: 25rem;
  border-bottom-left-radius: 25rem;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
</style>
