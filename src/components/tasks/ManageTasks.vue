<template>
  <PvToast />
  <PvSelectButton
    v-model="viewModel"
    :options="Object.values(MODEL_VIEWS)"
    class="flex my-2 select-button p-2"
    @change="handleViewChange($event.value)"
  />
  <div v-show="viewModel === MODEL_VIEWS.CREATE_TASK">
    <div v-if="!created" class="card px-3">
      <h1 class="text-center font-bold">Create a New Task</h1>
      <!-- <p class="login-title" align="left">Register for ROAR</p> -->
      <form class="p-fluid" @submit.prevent="handleNewTaskSubmit(!v$.$invalid)">
        <!-- Task name -->
        <div class="flex flex-column row-gap-3">
          <section class="form-section">
            <div class="p-input-icon-right">
              <label for="taskName">
                <small class="text-gray-400 font-bold">Task Name </small>
                <span class="required">*</span></label
              >
              <PvInputText
                v-model="v$.taskName.$model"
                name="taskName"
                :class="{ 'p-invalid': v$.taskName.$invalid && submitted }"
                aria-describedby="activation-code-error"
              />
            </div>
            <span v-if="v$.taskName.$error && submitted">
              <span v-for="(error, index) of v$.taskName.$errors" :key="index">
                <small class="p-error">{{ error.$message }}</small>
              </span>
            </span>
            <small
              v-else-if="(v$.taskName.$invalid && submitted) || v$.taskName.$pending" class="p-error">
              {{ v$.taskName.required?.$message.replace('Value', 'Task Name') }}
            </small>
          </section>
          <!-- Task ID -->
          <section class="form-section">
            <div class="p-input-icon-right">
              <label for="taskId">
                <small class="text-gray-400 font-bold">Task ID </small>
                <span class="required">*</span></label
              >
              <PvInputText
                v-model="v$.taskId.$model"
                name="taskId"
                :class="{ 'p-invalid': v$.taskId.$invalid && submitted }"
                aria-describedby="activation-code-error"
              />
            </div>
            <span v-if="v$.taskId.$error && submitted">
              <span v-for="(error, index) of v$.taskId.$errors" :key="index">
                <small class="p-error">{{ error.$message }}</small>
              </span>
            </span>
            <small
              v-else-if="(v$.taskId.$invalid && submitted) || v$.taskId.$pending" class="p-error">
              {{ v$.taskId.required?.$message.replace('Value', 'Task ID') }}
            </small>
          </section>
          <!-- Cover Image -->
          <section class="form-section">
            <div>
              <label for="coverImage">
                <small class="text-gray-400 font-bold">Cover Image (URL)</small>
              </label>
              <PvInputText v-model="taskFields.coverImage" name="coverImage" />
            </div>
          </section>
          <!--Description-->
          <section class="form-section">
            <div class="p-input-icon-right">
              <label for="description">
                <small class="text-gray-400 font-bold">Description</small>
              </label>
              <PvInputText v-model="taskFields.description" name="description" />
            </div>
          </section>
          <!--Task URL-->
          <section class="form-section">
            <div v-if="isExternalTask">
              <label for="taskURL">
                <small class="text-gray-400 font-bold">Task URL </small>
                <span class="required">*</span></label
              >
              <PvInputText
                v-model="v$.taskURL.$model"
                name="taskURL"
                :class="{ 'p-invalid': v$.taskURL.$invalid && submitted }"
                aria-describedby="first-name-error"
              />
              <span v-if="v$.taskURL.$error && submitted">
                <span v-for="(error, index) of v$.taskURL.$errors" :key="index">
                  <small class="p-error">{{ error.$message }}</small>
                </span>
              </span>
              <small
                v-else-if="(v$.taskURL.$invalid && submitted) || v$.taskURL.$pending" class="p-error">
                {{ v$.taskURL.required?.$message.replace('Value', 'Task URL') }}
              </small>
            </div>
          </section>
        </div>

        <div v-if="!isExternalTask">
          <h3 class="text-center">
            <strong>Configure Game Parameters</strong>
          </h3>
          <h4 class="text-center">Create the configurable game parameters for variants of this task.</h4>
          <div v-for="(param, index) in gameConfig" :key="index">
            <div class="flex gap-2 align-content-start flex-grow-0 params-container">
              <PvInputText v-model="param.name" placeholder="Name" />

              <PvDropdown v-model="param.type" :options="typeOptions" />

              <PvInputText v-if="param.type === 'string'" v-model="param.value" placeholder="Value" />

              <PvDropdown v-else-if="param.type === 'boolean'" v-model="param.value" :options="[true, false]" />

              <PvInputNumber v-else-if="param.type === 'number'" v-model="param.value" />

              <PvButton
                icon="pi pi-trash"
                class="delete-btn my-1 bg-primary text-white border-none border-round p-2 hover:bg-red-900"
                text
                @click="removeField(gameConfig, index)"
              />
            </div>
          </div>
        </div>

        <div v-else>
          <h3 class="text-center">Configure URL Parameters</h3>
          <h4 class="text-center">
            These parameters will be appended to the task URL to generate the variant URL for this task.
          </h4>
          <div v-for="(param, index) in taskParams" :key="index">
            <div class="flex gap-2 align-content-start flex-grow-0 params-container">
              <PvInputText v-model="param.name" placeholder="Name" />

              <PvDropdown v-model="param.type" :options="typeOptions" />

              <PvInputText v-if="param.type === 'string'" v-model="param.value" placeholder="Value" />

              <PvDropdown v-else-if="param.type === 'boolean'" v-model="param.value" :options="[true, false]" />

              <PvInputNumber v-else-if="param.type === 'number'" v-model="param.value" />

              <PvButton
                icon="pi pi-trash"
                text
                class="delete-btn bg-primary text-white border-none border-round p-2 hover:bg-red-900"
                @click="removeField(taskParams, index)"
              />
            </div>
          </div>
        </div>

        <div class="w-full flex justify-content-center">
          <div v-if="!isExternalTask" class="w-2">
            <PvButton
              label="Add Field"
              text
              icon="pi pi-plus"
              class="my-4 bg-primary text-white border-none border-round p-2 hover:bg-red-900"
              @click="addField(gameConfig)"
            />
          </div>
          <div v-else class="w-2">
            <PvButton
              label="Add Field"
              text
              icon="pi pi-plus"
              class="my-4 bg-primary text-white border-none border-round p-2 hover:bg-red-900"
              @click="addField(taskParams)"
            />
          </div>
        </div>
        <div class="flex flex-row align-items-center justify-content-center gap-2 flex-order-0 my-3">
          <div class="flex flex-row align-items-center">
            <PvCheckbox v-model="taskCheckboxData" input-id="chbx-demoTask" value="isDemoTask" />
            <label class="ml-1 mr-3" for="chbx-demoTask">Mark as <b>Demo Task</b></label>
          </div>
          <div class="flex flex-row align-items-center">
            <PvCheckbox v-model="taskCheckboxData" input-id="chbx-testTask" value="isTestTask" />
            <label class="ml-1 mr-3" for="chbx-testTask">Mark as <b>Test Task</b></label>
          </div>
          <div class="flex flex-row align-items-center">
            <PvCheckbox v-model="taskCheckboxData" input-id="chbx-externalTask" value="isExternalTask" />
            <label class="ml-1 mr-3" for="chbx-externalTask">Mark as <b>External Task</b> </label>
          </div>
          <div class="flex flex-row align-items-center">
            <PvCheckbox v-model="taskCheckboxData" input-id="chbx-registeredTask" value="isRegisteredTask" />
            <label class="ml-1 mr-3" for="chbx-externalTask">Mark as <b>Registered Task</b> </label>
          </div>
        </div>
        <div class="form-submit">
          <PvButton
            type="submit"
            label="Submit"
            class="submit-button bg-primary text-white border-none border-round p-2 hover:bg-red-900"
            severity="primary"
          />
        </div>
      </form>
    </div>

    <div v-else>
      <h2>Your task has been created!</h2>
      <p>
        Redirect to this URL upon task completion. ParticipantId can be any string, completed should be set to true.
      </p>
      <p>roar.education/?participantId=[$PARTICIPANT_ID]&completed=[$BOOLEAN]</p>
      <PvButton
        label="Create Another Task"
        class="submit-button bg-primary text-white border-none border-round p-2 hover:bg-red-900"
        @click="created = false"
      />
    </div>
  </div>

  <div v-show="viewModel === MODEL_VIEWS.UPDATE_TASK">
    <h1 class="text-center font-bold">Update a Task</h1>
    <form @submit.prevent="handleUpdateTask()">
      <section class="flex flex-column gap-2 mb-4 p-4">
        <label for="variant-fields" class="my-2">
          <small class="text-gray-400 font-bold">Select an Existing Task </small>
          <span class="required">*</span></label
        >
        <PvDropdown
          v-model="selectedTask"
          :options="formattedTasks"
          option-label="name"
          option-value="id"
          placeholder="Select a Task"
        />
      </section>

      <section v-if="taskData" class="flex flex-column align-items-start mt-4 p-4">
        <div class="flex flex-column w-full">
          <label for="fieldsOutput">
            <strong>Fields</strong>
          </label>
          <div v-for="(value, key) in taskData" :key="key">
            <div v-if="typeof key === 'string' && !ignoreFields.includes(key)">
              <div
                v-if="updatedTaskData[key as keyof typeof updatedTaskData] !== undefined"
                class="flex align-items-center justify-content-between gap-2 mb-1"
              >
                <label :for="key" class="w-1">
                  <em>{{ key }}</em>
                </label>
                <PvInputText :placeholder="typeof value" class="w-2 text-center" disabled />

                <PvInputText
                  v-if="typeof value === 'string'"
                  :id="key" 
                  v-model="updatedTaskData[key as keyof typeof updatedTaskData]"
                  :placeholder="value"
                  class="flex-grow-1"
                />
                <PvInputNumber
                  v-else-if="typeof value === 'number'"
                  :input-id="key"
                  v-model="updatedTaskData[key as keyof typeof updatedTaskData]"
                  class="flex-grow-1"
                />
                <PvDropdown
                  v-else-if="typeof value === 'boolean'"
                  :input-id="key"
                  v-model="updatedTaskData[key as keyof typeof updatedTaskData]"
                  :options="booleanDropDownOptions"
                  option-label="label"
                  option-value="value"
                  class="flex-grow-1"
                />
                <PvButton
                  type="button"
                  icon="pi pi-trash"
                  class="bg-primary text-white border-none border-round p-2 hover:bg-red-900"
                  text
                  @click="deleteParam(key)"
                />
              </div>
            </div>
          </div>
        </div>

        <div v-if="newFields.length > 0" class="w-full">
          <div v-for="(field, index) in newFields" :key="index" class="flex align-items-center column-gap-2 mb-1">
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
              class="bg-primary text-white border-none border-round p-2 hover:bg-red-900"
              text
              @click="removeNewField(field.name, newFields)"
            />
          </div>
        </div>
        <PvButton
          label="Add Field"
          text
          icon="pi pi-plus"
          class="my-4 bg-primary text-white border-none border-round p-2 hover:bg-red-900"
          @click="newField"
        />

        <div class="flex flex-column w-full">
          <label for="gameConfigOutput">
            <strong>Game Parameters</strong>
          </label>
          <div v-if="updatedTaskData.gameConfig">
             <div v-for="(param, paramName) in updatedTaskData.gameConfig" id="paramsOutput" :key="paramName as string" class="mb-1">
                <div
                 v-if="updatedTaskData.gameConfig[paramName as string] !== undefined"
                 class="flex align-items-center justify-content-end column-gap-2"
                >
                 <label :for="paramName as string" class="w-2">
                    <em>{{ paramName }} </em>
                 </label>
                 <PvInputText :id="'inputEditParamType_' + (paramName as string)" :placeholder="typeof param" class="w-2 text-center" disabled />
                 <PvInputText
                    v-if="typeof param === 'string'"
                    :id="'inputEditParam_' + (paramName as string)"
                    v-model="updatedTaskData.gameConfig[paramName as string]"
                    :placeholder="param"
                    class="flex-grow-1"
                 />
                 <PvInputNumber
                    v-else-if="typeof param === 'number'"
                    :input-id="'inputEditParam_' + (paramName as string)"
                    v-model="updatedTaskData.gameConfig[paramName as string]"
                    class="flex-grow-1"
                 />
                 <PvDropdown
                    v-else-if="typeof param === 'boolean'"
                    :input-id="'inputEditParam_' + (paramName as string)"
                    v-model="updatedTaskData.gameConfig[paramName as string]"
                    :options="booleanDropDownOptions"
                    option-label="label"
                    option-value="value"
                    class="flex-grow-1"
                 />
                 <PvButton
                    type="button"
                    icon="pi pi-trash"
                    class="bg-primary text-white border-none border-round p-2 hover:bg-red-900"
                    text
                    @click="deleteParam(paramName as string)"
                 />
                </div>
             </div>
          </div>
          <div v-if="addedGameConfig.length > 0">
            <div
              v-for="(field, index) in addedGameConfig"
              :key="index"
              class="flex align-items-center column-gap-2 mb-1"
            >
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
                class="bg-primary text-white border-none border-round p-2 hover:bg-red-900"
                text
                @click="removeNewField(field.name, addedGameConfig)"
              />
            </div>
          </div>
        </div>
        <PvButton
          label="Add Parameter"
          text
          icon="pi pi-plus"
          class="my-4 bg-primary text-white border-none border-round p-2 hover:bg-red-900"
          @click="addGameConfig"
        />
      </section>

      <PvButton type="submit" class="my-4 bg-primary text-white border-none border-round p-2 hover:bg-red-900"
        >Update Task</PvButton
      >
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch, type Ref } from 'vue';
import { required, requiredIf, url } from '@vuelidate/validators';
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
import { camelCase, cloneDeep } from 'lodash';
import { useAuthStore } from '@/store/auth';
// @ts-ignore - Missing type declarations
import useTasksQuery from '@/composables/queries/useTasksQuery';
// @ts-ignore - Missing type declarations
import useAddTaskMutation from '@/composables/mutations/useAddTaskMutation';
// @ts-ignore - Missing type declarations
import useUpdateTaskMutation from '@/composables/mutations/useUpdateTaskMutation';

// --- Interfaces & Types ---

interface Task {
  id: string;
  taskName?: string;
  taskId: string;
  taskURL?: string;
  coverImage?: string;
  description?: string;
  gameConfig?: Record<string, any>; // Or a more specific interface if known
  taskParams?: Record<string, any> | null;
  external?: boolean;
  demoData?: boolean;
  testData?: boolean;
  registered?: boolean;
  lastUpdated?: any; // Consider Firestore Timestamp type if available
  parentDoc?: any; // Consider DocumentReference type if available
  [key: string]: any; // Allow other dynamic properties
}

interface ParamField {
  name: string;
  value: any; // Can be string, number, boolean
  type: 'string' | 'number' | 'boolean';
}

interface BooleanDropdownOption {
  label: string;
  value: boolean;
}

// Type for MODEL_VIEWS values
type ModelView = 'Create Task' | 'Update Task';

// Add types for Vuelidate validation state if needed
interface ValidationState {
  $invalid: boolean;
  $error: boolean;
  $pending: boolean; // Assuming $pending exists based on usage
  $errors: { $message: string }[];
  required?: { $message: string }; // Add specific validator types if known
  url?: { $message: string };
  // Add other potential properties from Vuelidate state
}

// --- Component Logic ---

const toast = useToast();
const initialized = ref(false);
const registeredTasksOnly = ref(true);
const taskCheckboxData = ref<string[]>();
const authStore = useAuthStore();
const { roarfirekit } = storeToRefs(authStore);

// @ts-ignore - useAddTaskMutation is JS
const { mutate: addTask } = useAddTaskMutation();
// @ts-ignore - useUpdateTaskMutation is JS
const { mutate: updateTask } = useUpdateTaskMutation();

const isExternalTask = computed(() => !!taskCheckboxData.value?.includes('isExternalTask'));
const selectedTask = ref<string | null>(null);

// @ts-ignore - useTasksQuery is JS
const { data: tasks } = useTasksQuery(registeredTasksOnly, null, {
  enabled: initialized,
}) as { data: Ref<Task[] | undefined> }; // Assert the type of the returned data

const taskData = computed<Task | null | undefined>(() => {
  if (!selectedTask.value || !tasks.value) return null;
  // Add types to find callback parameter
  return tasks.value.find((task: Task) => task.id === selectedTask.value);
});

// Use reactive with explicit type. Initialize with empty object or cloneDeep(null)
let updatedTaskData = reactive<Partial<Task>>({});
let newFields = reactive<ParamField[]>([]);
let addedGameConfig = reactive<ParamField[]>([]);

const MODEL_VIEWS: Readonly<Record<string, ModelView>> = Object.freeze({
  CREATE_TASK: 'Create Task',
  UPDATE_TASK: 'Update Task',
});

const viewModel = ref<ModelView>(MODEL_VIEWS.CREATE_TASK);

const handleViewChange = (value: any) => { // Value from event might be less specific initially
  const selectedView = Object.values(MODEL_VIEWS).find((view) => view === value);
  if (selectedView) {
    viewModel.value = selectedView;
  }
};

watch(taskData, (newVal) => {
  // Ensure proper cloning and reactivity
  Object.assign(updatedTaskData, cloneDeep(newVal ?? {}));
  clearFieldConfigArrays(); // Clear dynamic fields when task changes
});

const ignoreFields = ['id', 'lastUpdated', 'gameConfig', 'parentDoc'];

const typeOptions: ParamField['type'][] = ['string', 'number', 'boolean'];

const booleanDropDownOptions: BooleanDropdownOption[] = [
  { label: 'true', value: true },
  { label: 'false', value: false },
];

const submitted = ref(false);
const created = ref(false);

let unsubscribe: Function | undefined;
const init = () => {
  if (unsubscribe) unsubscribe();
  initialized.value = true;
};

unsubscribe = authStore.$subscribe(async (mutation, state) => {
  // Add type check for state if possible
  if (state.roarfirekit?.restConfig) init();
});

onMounted(() => {
  if (roarfirekit.value?.restConfig) init();
});

const formattedTasks = computed(() => {
  if (!tasks.value) return [];
  return tasks.value.map((task) => ({
    name: task.taskName ?? task.id, // Display name
    ...task,
  }));
});

// For modeling a task to submit to the DB
// Use a more specific type or cast for Vuelidate if Partial<Task> causes issues
const taskFields = reactive<{
  taskName: string;
  taskURL: string;
  taskId: string;
  coverImage: string;
  description: string;
  gameConfig: Record<string, any>;
  external: boolean;
}>({ // Define the exact structure Vuelidate expects
  taskName: '',
  taskURL: '',
  taskId: '',
  coverImage: '',
  description: '',
  gameConfig: {},
  external: false,
});

// Validation rules for task fields
const taskRules = {
  taskName: { required },
  taskURL: { required: requiredIf(() => isExternalTask.value), url }, // Use function for requiredIf
  taskId: { required },
};

const v$ = useVuelidate(taskRules, taskFields);

const gameConfig = ref<ParamField[]>([
  {
    name: '',
    value: '',       // Initial value depends on type, maybe null?
    type: 'string', // Default type
  },
]);

const taskParams = ref<ParamField[]>([
  {
    name: '',
    value: '',
    type: 'string',
  },
]);

function addField(type: ParamField[]) {
  type.push({
    name: '',
    value: null, // Use null or type-specific default
    type: 'string',
  });
}

function removeField(type: ParamField[], index: number) {
  type.splice(index, 1);
}

const newField = () => {
  newFields.push({ name: '', value: null, type: 'string' });
};

const removeNewField = (fieldName: string, array: ParamField[]) => {
  const index = array.findIndex(item => item.name === fieldName);
  if (index > -1) {
    array.splice(index, 1);
  }
};

const deleteParam = (paramName: string) => {
  // Delete from gameConfig within updatedTaskData if it exists
  if (updatedTaskData.gameConfig && updatedTaskData.gameConfig[paramName] !== undefined) {
    delete updatedTaskData.gameConfig[paramName];
  }
  // Also delete potential top-level duplicates if necessary
  if (updatedTaskData[paramName as keyof typeof updatedTaskData] !== undefined) {
     delete updatedTaskData[paramName as keyof typeof updatedTaskData];
  }
};

const addGameConfig = () => {
  addedGameConfig.push({ name: '', value: null, type: 'string' });
};

// Type the return value
const checkForDuplicates = (newItemsArray: ParamField[], currentDataObject: Record<string, any> | undefined): { isDuplicate: boolean; duplicateField: string } => {
  if (currentDataObject === undefined) return { isDuplicate: false, duplicateField: '' };

  const keys = Object.keys(currentDataObject);
  for (const newItem of newItemsArray) {
    if (newItem.name && keys.includes(newItem.name)) { // Check if name exists
      return { isDuplicate: true, duplicateField: newItem.name };
    }
  }
  return { isDuplicate: false, duplicateField: '' };
};

const checkForErrors = (): boolean => {
  if (!selectedTask.value) {
    toast.add({ severity: 'error', summary: 'Oops!', detail: 'Please select a task to update.', life: 3000 });
    return true;
  }

  if (newFields.length > 0) {
    const { isDuplicate, duplicateField } = checkForDuplicates(newFields, updatedTaskData);
    if (isDuplicate) {
      toast.add({ severity: 'error', summary: 'Oops!', detail: `Duplicate field name detected: ${duplicateField}.`, life: 3000 });
      return true;
    }
  }

  if (addedGameConfig.length > 0) {
    const currentConfig = updatedTaskData.gameConfig ?? {};
    const { isDuplicate, duplicateField } = checkForDuplicates(addedGameConfig, currentConfig);
    if (isDuplicate) {
      toast.add({ severity: 'error', summary: 'Oops!', detail: `Duplicate gameConfig field name detected: ${duplicateField}.`, life: 3000 });
      return true;
    }
  }
  return false;
};

const handleUpdateTask = async () => {
  if (checkForErrors()) return;

  const convertedFields = convertParamsToObj(newFields);
  const convertedGameConfig = convertParamsToObj(addedGameConfig);

  // Construct the final data object, ensuring gameConfig is handled correctly
  const finalData: Partial<Task> = {
    ...updatedTaskData,
    ...convertedFields,
    gameConfig: {
      ...(updatedTaskData.gameConfig ?? {}),
      ...convertedGameConfig,
    },
  };

  // Remove fields that shouldn't be sent in update (like id, which is separate)
  delete finalData.id;
  // Clean up any empty gameConfig object if nothing is inside
  if (Object.keys(finalData.gameConfig ?? {}).length === 0) {
    delete finalData.gameConfig;
  }

  const updatePayload = {
    taskId: selectedTask.value, // Keep taskId separate
    data: finalData,
  };

  await updateTask(updatePayload, {
    onSuccess: () => {
      toast.add({ severity: 'success', summary: 'Hoorah!', detail: 'Task successfully updated.', life: 3000 });
      resetUpdateTaskForm();
    },
    onError: (error: any) => { // Type error
      toast.add({ severity: 'error', summary: 'Error', detail: 'Unable to update task, please try again.', life: 3000 });
      console.error('Failed to update task.', error);
    },
  });
};

const handleNewTaskSubmit = async (isFormValid: boolean) => {
  submitted.value = true;
  if (!isFormValid) {
    return;
  }

  const isDemoData = !!taskCheckboxData.value?.includes('isDemoTask');
  const isTestData = !!taskCheckboxData.value?.includes('isTestTask');
  const isExternal = isExternalTask.value; // Use computed value
  const isRegisteredTask = !!taskCheckboxData.value?.includes('isRegisteredTask');

  const convertedGameConfig = convertParamsToObj(gameConfig.value); // Use .value for Ref
  const convertedTaskParams = isExternal ? convertParamsToObj(taskParams.value) : null;

  // Build the new task object with types
  const newTaskObject: Partial<Task> = reactive({
    taskId: taskFields.taskId,
    taskName: taskFields.taskName,
    description: taskFields.description, // Changed from taskDescription
    coverImage: taskFields.coverImage,   // Changed from taskImage
    gameConfig: convertedGameConfig,
    taskParams: convertedTaskParams,
    demoData: isDemoData,
    testData: isTestData,
    registered: isRegisteredTask,
    external: isExternal,
  });

  if (isExternal && taskFields.taskURL) {
    newTaskObject.taskURL = buildTaskURL(taskFields.taskURL, taskParams); // Pass Ref taskParams
  }

  await addTask(newTaskObject, {
    onSuccess: () => {
      created.value = true;
      // Reset form fields here
      // TODO: Implement form reset logic
    },
    onError: (error: any) => { // Type error
      toast.add({ severity: 'error', summary: 'Error', detail: 'Unable to create task, please try again.', life: 3000 });
      console.error('Failed to add task.', error);
    },
  });
};

// Add return type Record<string, any>
function convertParamsToObj(paramArray: ParamField[]): Record<string, any> {
  return paramArray.reduce((acc: Record<string, any>, item) => {
    if (item.name) {
      acc[camelCase(item.name)] = item.value;
    }
    return acc;
  }, {});
}

// Add return type string
function buildTaskURL(baseURL: string, paramsRef: Ref<ParamField[]>): string {
  const params = paramsRef.value; // Get array from Ref
  let queryParams = baseURL.includes('?') ? '&' : '?'; // Start with ? or &

  // Add types to forEach parameters
  params.forEach((param: ParamField, i: number) => {
    if (param.name) {
      const separator = (i === 0 && !baseURL.includes('?')) || (i > 0) ? '&' : ''; // Use & if not first param or if URL already has ?
       if (i === 0 && !baseURL.includes('?')){
          queryParams = queryParams.slice(0, -1); // Remove initial separator if it is the first parameter
       }
      queryParams += `${separator}${param.name}=${param.value}`;
    }
  });

  // Avoid adding trailing '?' or '&' if no params were added
  if (queryParams.length === 1) {
      return baseURL;
  }


  return baseURL + queryParams;
}

const resetUpdateTaskForm = () => {
  selectedTask.value = null;
  // Reset updatedTaskData to empty or initial state
  Object.keys(updatedTaskData).forEach(key => delete updatedTaskData[key]);
  clearFieldConfigArrays();
};

const clearFieldConfigArrays = () => {
  newFields.splice(0, newFields.length); // Clear reactive array properly
  addedGameConfig.splice(0, addedGameConfig.length); // Clear reactive array properly
};
</script>

<style>
/* Vuelidate $pending might not exist directly like $error, adjust template checks */
/* Example: Check v$.fieldName.$pending instead of v$.fieldName.$pending.$response */

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

.delete-btn {
  padding: 0.8rem;
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
