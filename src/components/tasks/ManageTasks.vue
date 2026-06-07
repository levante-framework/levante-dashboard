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
      <form class="p-fluid" @submit.prevent="handleNewTaskSubmit(!createV$.$invalid)">
        <section class="flex flex-column align-items-start mt-4 p-4">
          <div class="flex flex-column w-full">
            <label for="create-fields">
              <strong>Fields</strong>
            </label>

            <div class="flex align-items-center justify-content-between gap-2 mb-1">
              <label for="create-taskName" class="w-1">
                <em>taskName</em>
                <span class="required">*</span>
              </label>
              <PvInputText placeholder="string" class="w-2 text-center" disabled />
              <PvInputText
                id="create-taskName"
                v-model="createV$.taskName.$model"
                :class="{ 'p-invalid': createV$.taskName.$invalid && submitted }"
                placeholder="Task Name"
                class="flex-grow-1"
              />
            </div>
            <small v-if="(createV$.taskName.$invalid && submitted) || createV$.taskName.$pending.$response" class="p-error mb-2">
              {{ createV$.taskName.required.$message.replace('Value', 'Task Name') }}
            </small>

            <div class="flex align-items-center justify-content-between gap-2 mb-1">
              <label for="create-taskId" class="w-1">
                <em>taskId</em>
                <span class="required">*</span>
              </label>
              <PvInputText placeholder="string" class="w-2 text-center" disabled />
              <PvInputText
                id="create-taskId"
                v-model="createV$.taskId.$model"
                :class="{ 'p-invalid': createV$.taskId.$invalid && submitted }"
                placeholder="Task ID"
                class="flex-grow-1"
              />
            </div>
            <small v-if="(createV$.taskId.$invalid && submitted) || createV$.taskId.$pending.$response" class="p-error mb-2">
              {{ createV$.taskId.required.$message.replace('Value', 'Task ID') }}
            </small>

            <div class="flex align-items-center justify-content-between gap-2 mb-1">
              <label for="create-taskURL" class="w-1">
                <em>taskURL</em>
              </label>
              <PvInputText placeholder="string" class="w-2 text-center" disabled />
              <PvInputText
                id="create-taskURL"
                v-model="createTaskData.taskURL"
                placeholder="Task URL"
                class="flex-grow-1"
              />
            </div>

            <div class="flex align-items-center justify-content-between gap-2 mb-1">
              <label for="create-registered" class="w-1">
                <em>registered</em>
              </label>
              <PvInputText placeholder="boolean" class="w-2 text-center" disabled />
              <PvDropdown
                id="create-registered"
                v-model="createTaskData.registered"
                :options="booleanDropDownOptions"
                option-label="label"
                option-value="value"
                class="flex-grow-1"
              />
            </div>

            <TaskUserTypesField v-model="createTaskData.userTypes" />

            <div class="flex align-items-center justify-content-between gap-2 mb-1">
              <label for="create-taskImage" class="w-1">
                <em>taskImage</em>
              </label>
              <PvInputText placeholder="string" class="w-2 text-center" disabled />
              <PvInputText
                id="create-taskImage"
                v-model="createTaskData.taskImage"
                placeholder="Cover Image URL"
                class="flex-grow-1"
              />
            </div>

            <div class="flex align-items-center justify-content-between gap-2 mb-1">
              <label for="create-taskDescription" class="w-1">
                <em>taskDescription</em>
              </label>
              <PvInputText placeholder="string" class="w-2 text-center" disabled />
              <PvInputText
                id="create-taskDescription"
                v-model="createTaskData.taskDescription"
                placeholder="Description"
                class="flex-grow-1"
              />
            </div>

            <div v-if="createNewFields.length > 0" class="w-full">
              <div
                v-for="(field, index) in createNewFields"
                :key="index"
                class="flex align-items-center column-gap-2 mb-1"
              >
                <PvInputText v-model="field.name" placeholder="Field Name" />
                <PvDropdown
                  v-model="field.type"
                  :options="fieldTypeOptions"
                  placeholder="Field Type"
                  @update:model-value="(type) => onDynamicFieldTypeChange(field, type)"
                />
                <PvInputText
                  v-if="field.type === 'string'"
                  v-model="field.value"
                  placeholder="Field Value"
                  class="flex-grow-1"
                />
                <PvInputNumber
                  v-else-if="field.type === 'number'"
                  v-model="field.value"
                  placeholder="Field Value"
                  class="flex-grow-1"
                />
                <PvDropdown
                  v-else-if="field.type === 'boolean'"
                  v-model="field.value"
                  placeholder="Field Value"
                  :options="booleanDropDownOptions"
                  option-label="label"
                  option-value="value"
                  class="flex-grow-1"
                />
                <TaskArrayFieldEditor
                  v-else-if="field.type === 'array'"
                  v-model="field.value"
                  v-model:item-type="field.itemType"
                />
                <PvButton
                  type="button"
                  icon="pi pi-trash"
                  class="bg-primary text-white border-none border-round p-2 hover:bg-red-900"
                  text
                  @click="removeNewField(field.name, createNewFields)"
                />
              </div>
            </div>

            <PvButton
              label="Add Field"
              text
              icon="pi pi-plus"
              class="my-4 bg-primary text-white border-none border-round p-2 hover:bg-red-900"
              @click="addCreateField"
            />
          </div>
        </section>

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
        @click="
          created = false;
          resetCreateTaskForm();
        "
      />
    </div>
  </div>

  <div v-show="viewModel === MODEL_VIEWS.UPDATE_TASK">
    <h1 class="text-center font-bold">Update a Task</h1>
    <form @submit.prevent="handleUpdateTask()">
      <section class="flex flex-column gap-2 mb-4 p-4">
        <label for="variant-fields" class="my-2">
          <small class="text-gray-400 font-bold">Select task</small>
          <span class="required">*</span></label
        >
        <PvDropdown
          v-model="selectedTask"
          :options="formattedTasks"
          option-label="name"
          option-value="id"
          placeholder="Select task"
        />
      </section>

      <section v-if="taskData" class="flex flex-column align-items-start mt-4 p-4">
        <div class="flex flex-column w-full">
          <label for="fieldsOutput">
            <strong>Fields</strong>
          </label>

          <div class="flex align-items-center justify-content-between gap-2 mb-1">
            <label for="update-taskName" class="w-1">
              <em>taskName</em>
            </label>
            <PvInputText placeholder="string" class="w-2 text-center" disabled />
            <PvInputText
              id="update-taskName"
              v-model="updatedTaskData.taskName"
              placeholder="Task Name"
              class="flex-grow-1"
            />
          </div>

          <div class="flex align-items-center justify-content-between gap-2 mb-1">
            <label for="update-id" class="w-1">
              <em>id</em>
            </label>
            <PvInputText placeholder="string" class="w-2 text-center" disabled />
            <PvInputText id="update-id" :model-value="selectedTask" disabled class="flex-grow-1" />
          </div>

          <div class="flex align-items-center justify-content-between gap-2 mb-1">
            <label for="update-taskURL" class="w-1">
              <em>taskURL</em>
            </label>
            <PvInputText placeholder="string" class="w-2 text-center" disabled />
            <PvInputText
              id="update-taskURL"
              v-model="updatedTaskData.taskURL"
              placeholder="Task URL"
              class="flex-grow-1"
            />
          </div>

          <div class="flex align-items-center justify-content-between gap-2 mb-1">
            <label for="update-registered" class="w-1">
              <em>registered</em>
            </label>
            <PvInputText placeholder="boolean" class="w-2 text-center" disabled />
            <PvDropdown
              id="update-registered"
              v-model="updatedTaskData.registered"
              :options="booleanDropDownOptions"
              option-label="label"
              option-value="value"
              class="flex-grow-1"
            />
          </div>

          <TaskUserTypesField v-model="updatedTaskData.userTypes" />

          <div class="flex align-items-center justify-content-between gap-2 mb-1">
            <label for="update-taskImage" class="w-1">
              <em>taskImage</em>
            </label>
            <PvInputText placeholder="string" class="w-2 text-center" disabled />
            <PvInputText
              id="update-taskImage"
              v-model="updatedTaskData.taskImage"
              placeholder="Cover Image URL"
              class="flex-grow-1"
            />
          </div>

          <div class="flex align-items-center justify-content-between gap-2 mb-1">
            <label for="update-taskDescription" class="w-1">
              <em>taskDescription</em>
            </label>
            <PvInputText placeholder="string" class="w-2 text-center" disabled />
            <PvInputText
              id="update-taskDescription"
              v-model="updatedTaskData.taskDescription"
              placeholder="Description"
              class="flex-grow-1"
            />
          </div>

          <div v-for="(value, key) in taskData" :key="key">
            <div v-if="!ignoreFields.includes(key)">
              <div
                v-if="updatedTaskData[key] !== undefined"
                class="flex align-items-center justify-content-between gap-2 mb-1"
              >
                <label :for="key" class="w-1">
                  <em>{{ key }}</em>
                </label>
                <PvInputText :placeholder="getFieldTypePlaceholder(value)" class="w-2 text-center" disabled />

                <PvInputText
                  v-if="typeof value === 'string'"
                  v-model="updatedTaskData[key]"
                  :placeholder="value"
                  class="flex-grow-1"
                />
                <PvInputNumber
                  v-else-if="typeof value === 'number'"
                  v-model="updatedTaskData[key]"
                  class="flex-grow-1"
                />
                <PvDropdown
                  v-else-if="typeof value === 'boolean'"
                  v-model="updatedTaskData[key]"
                  :options="booleanDropDownOptions"
                  option-label="label"
                  option-value="value"
                  class="flex-grow-1"
                />
                <TaskArrayFieldEditor
                  v-else-if="Array.isArray(value)"
                  v-model="updatedTaskData[key]"
                  :item-type="getArrayItemTypeForKey(key, value)"
                  @update:item-type="(type) => setArrayItemTypeForKey(key, type)"
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
            <PvDropdown
              v-model="field.type"
              :options="fieldTypeOptions"
              placeholder="Field Type"
              @update:model-value="(type) => onDynamicFieldTypeChange(field, type)"
            />

            <PvInputText
              v-if="field.type === 'string'"
              v-model="field.value"
              placeholder="Field Value"
              class="flex-grow-1"
            />
            <PvInputNumber
              v-else-if="field.type === 'number'"
              v-model="field.value"
              placeholder="Field Value"
              class="flex-grow-1"
            />
            <PvDropdown
              v-else-if="field.type === 'boolean'"
              v-model="field.value"
              placeholder="Field Value"
              :options="booleanDropDownOptions"
              option-label="label"
              option-value="value"
              class="flex-grow-1"
            />
            <TaskArrayFieldEditor
              v-else-if="field.type === 'array'"
              v-model="field.value"
              v-model:item-type="field.itemType"
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
      </section>

      <PvButton type="submit" class="my-4 bg-primary text-white border-none border-round p-2 hover:bg-red-900"
        >Update Task</PvButton
      >
    </form>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
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
import { tasksRepository } from '@/firebase/repositories/TasksRepository';
import useTasksQuery from '@/composables/queries/useTasksQuery';
import useAddTaskMutation from '@/composables/mutations/useAddTaskMutation';
import useUpdateTaskMutation from '@/composables/mutations/useUpdateTaskMutation';
import TaskArrayFieldEditor from '@/components/tasks/TaskArrayFieldEditor.vue';
import TaskUserTypesField from '@/components/tasks/TaskUserTypesField.vue';
import {
  buildUpsertTaskPayload,
  createEmptyDynamicField,
  createEmptyTaskData,
  formatTasksForDropdown,
  getFieldTypePlaceholder,
  hasRequiredUserTypes,
  inferArrayItemType,
  mapTaskToFormData,
  taskIdExists,
  TASK_IGNORED_FIELD_KEYS,
  TASK_RESERVED_FIELD_NAMES,
} from '@/helpers/taskFields';
import { TASK_FIELD_TYPES } from '@/types/taskField';

const toast = useToast();
const initialized = ref(false);
const registeredTasksOnly = ref(true);
const taskCheckboxData = ref();
const authStore = useAuthStore();
const { roarfirekit } = storeToRefs(authStore);

const { mutate: addTask } = useAddTaskMutation();
const { mutate: updateTask } = useUpdateTaskMutation();

const selectedTask = ref(null);

let taskData = computed(() => {
  if (!selectedTask.value) return null;
  return tasks.value.find((task) => task.id === selectedTask.value);
});

// Reactive clone for holding changes made to taskData without affecting the original taskData and avoiding reactivity issues
let updatedTaskData = reactive(cloneDeep(taskData.value));
// Array of objects which models the new fields for the task object being updated
// This array of objects is later converted back into an object and spread into the updatedTaskData object
let newFields = reactive([]);
const createNewFields = reactive([]);
const createTaskData = reactive(createEmptyTaskData());
const arrayItemTypesByKey = reactive({});

const MODEL_VIEWS = Object.freeze({
  CREATE_TASK: 'Create Task',
  UPDATE_TASK: 'Update Task',
});

const viewModel = ref(MODEL_VIEWS.CREATE_TASK);

const handleViewChange = (value) => {
  const selectedView = Object.values(MODEL_VIEWS).find((view) => view === value);
  if (selectedView) {
    viewModel.value = selectedView;
  }
};

watch(taskData, (newVal) => {
  updatedTaskData = reactive({
    ...cloneDeep(newVal),
    ...(newVal ? mapTaskToFormData(newVal) : createEmptyTaskData()),
  });
  Object.keys(arrayItemTypesByKey).forEach((key) => delete arrayItemTypesByKey[key]);
  if (newVal) {
    Object.entries(newVal).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        arrayItemTypesByKey[key] = inferArrayItemType(value);
      }
    });
  }
});

const ignoreFields = [...TASK_IGNORED_FIELD_KEYS];
const reservedFieldNames = [...TASK_RESERVED_FIELD_NAMES];
const fieldTypeOptions = [...TASK_FIELD_TYPES];

const booleanDropDownOptions = [
  { label: 'true', value: true },
  { label: 'false', value: false },
];

const submitted = ref(false);
const created = ref(false);

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
});

const { data: tasks } = useTasksQuery(registeredTasksOnly, null, {
  enabled: initialized,
});

const formattedTasks = computed(() => {
  if (!tasks.value) return [];
  return formatTasksForDropdown(tasks.value);
});

const createRules = {
  taskName: { required },
  taskId: { required },
};

const createV$ = useVuelidate(createRules, createTaskData);

const newField = () => {
  newFields.push(createEmptyDynamicField());
};

const addCreateField = () => {
  createNewFields.push(createEmptyDynamicField());
};

const onDynamicFieldTypeChange = (field, type) => {
  const nextField = createEmptyDynamicField(type);
  field.type = nextField.type;
  field.value = nextField.value;
  if (nextField.itemType) {
    field.itemType = nextField.itemType;
  } else {
    delete field.itemType;
  }
};

const getArrayItemTypeForKey = (key, value) => arrayItemTypesByKey[key] ?? inferArrayItemType(value);

const setArrayItemTypeForKey = (key, type) => {
  arrayItemTypesByKey[key] = type;
};

// Removes a field from the newFields or createNewFields array
const removeNewField = (field, array) => {
  const updatedFields = array.filter((item) => item.name !== field);
  array.splice(0, array.length, ...updatedFields);
};

// Deletes a parameter from the updatedTaskData object
const deleteParam = (param) => {
  delete updatedTaskData[param];
};

// Takes the array of objects that will be added to the current data object in Firestore
// and checks if any of the new fields are duplicates of existing fields to prevent overwriting data
const checkForDuplicates = (newItemsArray, currentDataObject) => {
  if (currentDataObject === undefined) return { isDuplicate: false, duplicateField: '' };

  const keys = Object.keys(currentDataObject);
  for (const newItem of newItemsArray) {
    if (keys.includes(newItem.name)) {
      return { isDuplicate: true, duplicateField: newItem.name };
    }
  }
  return { isDuplicate: false, duplicateField: '' };
};

// Helper function to check for errors before updating a task
// Returns true if there are errors, false if there are none
const checkForErrors = () => {
  if (!selectedTask.value) {
    toast.add({
      severity: 'error',
      summary: 'Oops!',
      detail: 'Please select a task to update.',
      life: 3000,
    });
    return true;
  }

  if (!updatedTaskData.taskName?.trim()) {
    toast.add({
      severity: 'error',
      summary: 'Oops!',
      detail: 'Task Name is required.',
      life: 3000,
    });
    return true;
  }

  if (!hasRequiredUserTypes(updatedTaskData.userTypes)) {
    toast.add({
      severity: 'error',
      summary: 'Oops!',
      detail: 'User Types must include at least one unique value from caregiver, student, and teacher.',
      life: 3000,
    });
    return true;
  }

  if (newFields.length > 0) {
    const reservedField = newFields.find((field) => reservedFieldNames.includes(field.name));
    if (reservedField) {
      toast.add({
        severity: 'error',
        summary: 'Oops!',
        detail: `Field name "${reservedField.name}" is reserved.`,
        life: 3000,
      });
      return true;
    }

    const { isDuplicate, duplicateField } = checkForDuplicates(newFields, updatedTaskData);
    if (isDuplicate) {
      toast.add({
        severity: 'error',
        summary: 'Oops!',
        detail: `Duplicate field name detected: ${duplicateField}.`,
        life: 3000,
      });
      return true;
    }
  }
  return false;
};

const handleUpdateTask = async () => {
  if (checkForErrors()) return;

  await updateTask(
    buildUpsertTaskPayload({
      taskName: updatedTaskData.taskName,
      taskId: selectedTask.value,
      taskDescription: updatedTaskData.taskDescription,
      taskImage: updatedTaskData.taskImage,
      taskURL: updatedTaskData.taskURL,
      userTypes: updatedTaskData.userTypes,
    }),
    {
    onSuccess: () => {
      toast.add({
        severity: 'success',
        summary: 'Hoorah!',
        detail: 'Task successfully updated.',
        life: 3000,
      });
      resetUpdateTaskForm();
    },
    onError: (error) => {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Unable to update task, please try again.',
        life: 3000,
      });
      console.error('Failed to update task.', error);
    },
  });
};

const handleNewTaskSubmit = async (isFormValid) => {
  submitted.value = true;

  if (!isFormValid) {
    return;
  }

  if (!hasRequiredUserTypes(createTaskData.userTypes)) {
    toast.add({
      severity: 'error',
      summary: 'Oops!',
      detail: 'User Types must include at least one unique value from caregiver, student, and teacher.',
      life: 3000,
    });
    return;
  }

  let existingTasks = [];
  const siteId = authStore.currentSite;
  if (!siteId) {
    toast.add({
      severity: 'error',
      summary: 'Oops!',
      detail: 'Current site is required to create a task.',
      life: 3000,
    });
    return;
  }

  try {
    existingTasks = await tasksRepository.getTasks({ siteId });
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Unable to verify task ID availability, please try again.',
      life: 3000,
    });
    console.error('Failed to fetch tasks for ID validation.', error);
    return;
  }

  if (taskIdExists(existingTasks, createTaskData.taskId)) {
    toast.add({
      severity: 'error',
      summary: 'Oops!',
      detail: `Task ID "${createTaskData.taskId.trim()}" already exists.`,
      life: 3000,
    });
    return;
  }

  const reservedField = createNewFields.find((field) => reservedFieldNames.includes(field.name));
  if (reservedField) {
    toast.add({
      severity: 'error',
      summary: 'Oops!',
      detail: `Field name "${reservedField.name}" is reserved.`,
      life: 3000,
    });
    return;
  }

  const { isDuplicate, duplicateField } = checkForDuplicates(createNewFields, createTaskData);
  if (isDuplicate) {
    toast.add({
      severity: 'error',
      summary: 'Oops!',
      detail: `Duplicate field name detected: ${duplicateField}.`,
      life: 3000,
    });
    return;
  }

  await addTask(buildUpsertTaskPayload(createTaskData), {
    onSuccess: () => {
      created.value = true;
      resetCreateTaskForm();
    },
    onError: (error) => {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Unable to create task, please try again.',
        life: 3000,
      });
      console.error('Failed to add task.', error);
    },
  });
};

function convertParamsToObj(paramType) {
  const target = paramType.value !== undefined ? paramType.value : paramType;

  return target.reduce((acc, item) => {
    if (item.name) {
      acc[camelCase(item.name)] = item.type === 'array' ? [...item.value] : item.value;
    }
    return acc;
  }, {});
}

function resetCreateTaskForm() {
  Object.assign(createTaskData, createEmptyTaskData());
  createNewFields.splice(0, createNewFields.length);
  taskCheckboxData.value = [];
  submitted.value = false;
  createV$.value.$reset();
}

const resetUpdateTaskForm = () => {
  selectedTask.value = null;
  updatedTaskData = reactive(cloneDeep(taskData.value));
  clearFieldConfigArrays();
};

const clearFieldConfigArrays = () => {
  newFields = reactive([]);
  createNewFields.splice(0, createNewFields.length);
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
