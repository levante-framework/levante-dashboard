<template>
  <PvButton
    class="surface-hover border-1 border-300 border-circle hover:bg-primary p-0 m-2"
    data-cy="button-edit-variant"
    @click="isVisible = true"
  >
    <i class="pi pi-pencil text-primary hover:text-white-alpha-90 p-2" style="font-size: 1rem"></i>
  </PvButton>

  <PvDialog
    v-model:visible="isVisible"
    :draggable="false"
    modal
    header="Edit Conditions"
    :close-on-escape="false"
    :style="{ width: '65vw' }"
    :breakpoints="{ '1199px': '85vw', '575px': '95vw' }"
  >
    <div class="flex w-full align-items-center justify-content-around">
      <div class="flex flex-column w-full my-3 gap-2">
        <div>
          <div class="text-sm font-light uppercase text-gray-400">Task Name</div>
          <div class="text-3xl font-bold uppercase">
            {{ assessment.task.name }}
          </div>
        </div>
        <div v-if="variantDisplayName" class="gap-2">
          <div class="text-sm font-light uppercase text-gray-500">Variant Name</div>
          <div class="text-xl">
            {{ variantDisplayName }}
          </div>
        </div>
      </div>
      <div class="flex w-6 justify-content-end">
        <img :src="assessment.task.image" class="w-5" />
      </div>
    </div>
    <div class="flex flex-column w-full my-2 gap-2">
      <div class="card p-fluid bg-gray-100 p-3">
        <div class="text-lg font-normal text-gray-500 uppercase mb-2">Assigned Conditions</div>
        <div
          v-if="assignedConditions.length > 0"
          class="flex flex-row flex-wrap justify-content-around align-content-center w-full font-semibold uppercase pr-6"
        >
          <p>Field</p>
          <p>Condition</p>
          <p>Value</p>
        </div>
        <div
          v-if="assignedConditions.length == 0"
          class="flex flex-column align-items-center justify-content-center py-2 gap-2"
        >
          <div class="text-xl uppercase font-bold">No Conditions Added</div>
          <div class="text-sm uppercase text-gray-700">
            Assignment will be
            <PvTag severity="warning" class="mx-1">ASSIGNED</PvTag> to all {{ isLevante ? 'users' : 'participants' }} in
            the
            {{ selectedGroup }}
          </div>
        </div>
        <!-- ASSIGNED CONDITIONS  -->
        <div v-for="(condition, index) in assignedConditions" :key="index">
          <div class="flex gap-2 align-content-start flex-grow-0 params-container mb-2">
            <div class="flex flex-row flex-wrap justify-content-between align-content-center gap-2 w-full">
              <PvSelect
                :model-value="condition.field"
                :options="fieldOptions"
                optionLabel="label"
                optionValue="value"
                class="w-full"
                placeholder="Select a Field"
                inputId="Field"
                @update:model-value="(field) => handleFieldChange(assignedConditions, index, field)"
              />
            </div>

            <div class="flex flex-row flex-wrap justify-content-between align-content-center gap-2 w-full">
              <PvSelect
                v-model="condition.op"
                :options="computedConditionOptions(condition.field)"
                optionLabel="label"
                optionValue="value"
                class="w-full"
                placeholder="Condition"
                inputId="Condition"
              />
            </div>

            <div class="flex flex-row flex-wrap justify-content-between align-content-center gap-2 w-full">
              <PvSelect
                v-model="condition.value"
                :options="computedValueOptions(condition.field)"
                optionLabel="label"
                optionValue="value"
                class="w-full"
                placeholder="Value"
              />
            </div>

            <PvButton
              icon="pi pi-trash"
              text
              class="bg-primary text-white w-2 border-round border-none hover:bg-red-900"
              @click="removeCondition(assignedConditions, index)"
            />
          </div>
        </div>

        <div class="flex flex-row-reverse justify-content-between align-items-center">
          <div class="mt-2 flex">
            <PvButton
              label="Add Condition"
              icon="pi pi-plus mr-2"
              class="bg-primary text-white border-none border-round p-2 hover:bg-red-900"
              data-cy="button-assigned-condition"
              @click="addAssignedCondition"
            />
          </div>
        </div>
      </div>
      <!-- OPTIONAL CONDITIONS -->
      <div>
        <div class="mt-2 flex flex-column gap-2">
          <div class="card p-fluid bg-gray-100 p-3">
            <div class="text-lg font-normal text-gray-500 uppercase mb-2">Optional Conditions</div>
            <div
              v-if="optionalConditions.length > 0"
              class="flex flex-row flex-wrap justify-content-around align-content-center w-full font-semibold uppercase pr-6"
            >
              <p>Field</p>
              <p>Condition</p>
              <p>Value</p>
            </div>
            <div
              v-if="optionalConditions.length == 0"
              class="flex flex-column align-items-center justify-content-center py-2 gap-2"
            >
              <div class="text-xl uppercase font-bold">No Conditions Added</div>
              <div v-if="isOptionalForAll" class="text-sm uppercase text-gray-700">
                Assignment will be
                <PvTag severity="success" class="mx-1">OPTIONAL</PvTag> for all
                {{ isLevante ? 'users' : 'participants' }} in the
                {{ selectedGroup }}
              </div>
              <div v-else class="text-sm uppercase text-gray-700">
                Assignment will
                <PvTag severity="danger" class="mx-1">NOT BE OPTIONAL</PvTag>
                for any {{ isLevante ? 'users' : 'participants' }} in the
                {{ selectedGroup }}
              </div>
            </div>

            <div v-for="(condition, index) in optionalConditions" :key="index">
              <div class="flex gap-2 align-content-start flex-grow-0 params-container mb-2">
                <div class="flex flex-row flex-wrap justify-content-between align-content-center gap-2 w-full">
                  <PvSelect
                    :model-value="condition.field"
                    :options="fieldOptions"
                    optionLabel="label"
                    optionValue="value"
                    class="w-full"
                    placeholder="Select a Field"
                    inputId="Field"
                    @update:model-value="(field) => handleFieldChange(optionalConditions, index, field)"
                  />
                </div>

                <div class="flex flex-row flex-wrap justify-content-between align-content-center gap-2 w-full">
                  <PvSelect
                    v-model="condition.op"
                    :options="computedConditionOptions(condition.field)"
                    optionLabel="label"
                    optionValue="value"
                    class="w-full"
                    placeholder="Condition"
                    inputId="Condition"
                  />
                </div>

                <div class="flex flex-row flex-wrap justify-content-between align-content-center gap-2 w-full">
                  <PvSelect
                    v-model="condition.value"
                    :options="computedValueOptions(condition.field)"
                    optionLabel="label"
                    optionValue="value"
                    class="w-full"
                    placeholder="Value"
                  />
                </div>

                <PvButton
                  icon="pi pi-trash"
                  text
                  class="bg-primary text-white w-2 border-round border-none hover:bg-red-900"
                  @click="removeCondition(optionalConditions, index)"
                />
              </div>
            </div>

            <div class="flex flex-row justify-content-between align-items-center">
              <div class="flex flex-row justify-content-end align-items-center gap-2 mr-2">
                <div class="uppercase text-md font-bold text-gray-600">
                  Make Assessment Optional For All
                  {{ isLevante ? 'Users' : 'Participants' }}
                </div>
                <PvToggleSwitch
                  v-model="isOptionalForAll"
                  data-cy="switch-optional-for-everyone"
                  @update:model-value="handleOptionalForAllSwitch"
                />
              </div>
              <div class="mt-2 flex gap-2">
                <PvButton
                  label="AddCondition"
                  icon="pi pi-plus mr-2"
                  class="bg-primary text-white border-none border-round p-2 hover:bg-red-900"
                  :disabled="isOptionalForAll === true"
                  data-cy="button-optional-condition"
                  @click="addOptionalCondition"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <PvDivider />
      <div class="flex flex-column align-items-center gap-1 mx-2">
        <div v-if="isOptionalForAllAndOptionalConditionsPresent" class="text-sm">
          <PvTag icon="pi pi-info-circle" severity="info">
            Making the assessment optional for all will override any optional conditions you have added.
          </PvTag>
        </div>
        <div v-if="errorSubmitText.length > 0" class="text-sm">
          <PvTag icon="pi pi-exclamation-triangle" severity="error" class="bg-transparent text-red-600">{{
            errorSubmitText
          }}</PvTag>
        </div>
      </div>
      <div class="flex justify-content-center gap-2">
        <PvButton
          type="button"
          class="bg-primary text-white border-none border-round p-2 hover:bg-red-900"
          label="Reset"
          text
          severity="error"
          @click="handleReset"
        ></PvButton>
        <PvButton
          type="button"
          class="bg-primary text-white border-none border-round p-2 hover:bg-red-900"
          label="Save"
          data-cy="button-save-conditions"
          @click="handleSave"
        ></PvButton>
      </div>
    </div>
  </PvDialog>
</template>

<script setup lang="ts">
import _cloneDeep from 'lodash/cloneDeep';
import _isEmpty from 'lodash/isEmpty';
import PvButton from 'primevue/button';
import PvColumn from 'primevue/column';
import PvDialog from 'primevue/dialog';
import PvDivider from 'primevue/divider';
import PvSelect from 'primevue/select';
import PvTag from 'primevue/tag';
import PvToggleSwitch from 'primevue/toggleswitch';
import { computed, onMounted, ref, toRaw } from 'vue';
import { isLevante } from '@/constants';
import { resolveVariantDisplayName } from '@/helpers';

interface FieldOption {
  label: string;
  value: string;
  project: string;
}

interface ConditionOption {
  label: string;
  value: string;
}

interface Condition {
  field: string;
  op: string;
  value: string;
}

interface ConditionsStructure {
  assigned?: {
    op: string;
    conditions: Condition[];
  };
  optional?:
    | boolean
    | {
        op: string;
        conditions: Condition[];
      };
}

interface Task {
  id: string;
  name: string;
  image?: string;
}

interface Variant {
  displayName?: string;
  name?: string;
  conditions?: ConditionsStructure;
}

interface Assessment {
  id: string;
  task: Task;
  variant?: Variant;
}

interface PreExistingAssessmentInfo {
  taskId: string;
  conditions?: ConditionsStructure;
}

interface Props {
  assessment: Assessment;
  updateVariant: (id: string, conditions: ConditionsStructure) => void;
  preExistingAssessmentInfo?: PreExistingAssessmentInfo[];
}

const props = withDefaults(defineProps<Props>(), {
  preExistingAssessmentInfo: () => [],
});

const variantDisplayName = computed(() => resolveVariantDisplayName(props.assessment.variant ?? {}));

onMounted((): void => {
  getAllConditions(props.assessment.task.id);
  // LEVANTE assigns surveys as assessments, so we add a defualt for child only so researchers
  // do not accidently assign tasks to parents and teachers
  if (isLevante && !props.assessment.task.id.toLowerCase().includes('survey')) {
    const defaultCondition = { field: 'userType', op: 'EQUAL', value: 'student' };
    const hasIdenticalCondition = assignedConditions.value.some(
      (condition) =>
        condition.field === defaultCondition.field &&
        condition.op === defaultCondition.op &&
        condition.value === defaultCondition.value,
    );

    if (!hasIdenticalCondition) {
      assignedConditions.value.push({ ...defaultCondition });
    }
  }
});

const isVisible = ref<boolean>(false);
const assignedConditions = ref<Condition[]>([]);
const optionalConditions = ref<Condition[]>([]);
// Store optional conditions in case the isOptionalForAll is toggled on and off again (prevents the form from resetting to the original state)
const previousOptionalConditions = ref<Condition[]>([]);

const computedValueOptions = (field: string): ConditionOption[] | undefined => {
  if (!field) return;

  if (field === 'age') {
    return [
      { label: '3', value: '3' },
      { label: '4', value: '4' },
      { label: '5', value: '5' },
      { label: '6', value: '6' },
      { label: '7', value: '7' },
      { label: '8', value: '8' },
      { label: '9', value: '9' },
      { label: '10', value: '10' },
      { label: '11', value: '11' },
      { label: '12', value: '12' },
    ];
  } else if (field === 'userType') {
    return [
      { label: 'Child', value: 'student' },
      { label: 'Caregiver', value: 'parent' },
      { label: 'Teacher', value: 'teacher' },
    ];
  }
};

const computedConditionOptions = (field: string): ConditionOption[] | undefined => {
  if (!field) return;

  if (field === 'age') {
    return [
      { label: 'Less Than', value: 'LESS_THAN' },
      { label: 'Greater Than', value: 'GREATER_THAN' },
      { label: 'Less Than or Equal', value: 'LESS_THAN_OR_EQUAL' },
      { label: 'Greater Than or Equal', value: 'GREATER_THAN_OR_EQUAL' },
      { label: 'Equal', value: 'EQUAL' },
      { label: 'Not Equal', value: 'NOT_EQUAL' },
    ];
  } else if (field === 'userType') {
    return [
      { label: 'Equal', value: 'EQUAL' },
      { label: 'Not Equal', value: 'NOT_EQUAL' },
    ];
  }
};

function handleFieldChange(conditions: Condition[], index: number, field: string): void {
  conditions[index] = { field, op: '', value: '' };
}

const removeCondition = (conditions: Condition[], index: number): void => {
  conditions.splice(index, 1);
};

function getAllConditions(taskId: string): void {
  const existingAssignedConditions = getAssignedConditions(taskId);
  const existingOptionalConditions = getOptionalConditions(taskId);

  setAssignedConditions(existingAssignedConditions);
  setOptionalConditions(existingOptionalConditions);
}

function getAssignedConditions(taskId: string): Condition[] | undefined {
  const fromVariant = props.assessment.variant?.conditions?.assigned?.conditions;
  if (fromVariant?.length) return fromVariant;

  return props.preExistingAssessmentInfo.find((assessment) => assessment.taskId === taskId)?.conditions?.assigned
    ?.conditions;
}

function getOptionalConditions(taskId: string): Condition[] {
  const variantOptional = props.assessment.variant?.conditions?.optional;

  if (variantOptional && typeof variantOptional === 'object' && 'conditions' in variantOptional) {
    isOptionalForAll.value = false;
    return variantOptional.conditions;
  }

  if (variantOptional === true) {
    isOptionalForAll.value = true;
    return [];
  }

  const task = props.preExistingAssessmentInfo.find((assessment) => assessment.taskId === taskId);
  const hasOptionalConditions = task?.conditions?.optional;

  if (hasOptionalConditions && typeof hasOptionalConditions === 'object' && 'conditions' in hasOptionalConditions) {
    isOptionalForAll.value = false;
    return hasOptionalConditions.conditions;
  }

  isOptionalForAll.value = !!task?.conditions?.optional;
  return [];
}

function setAssignedConditions(existingAssignedConditions: Condition[] | undefined): void {
  if (!existingAssignedConditions) return;
  assignedConditions.value = _cloneDeep(existingAssignedConditions);
}

function setOptionalConditions(existingOptionalConditions: Condition[]): void {
  if (!existingOptionalConditions.length) return;
  optionalConditions.value = _cloneDeep(existingOptionalConditions);
}

const addOptionalCondition = (): void => {
  optionalConditions.value.push({ field: '', op: '', value: '' });
};

const addAssignedCondition = (): void => {
  assignedConditions.value.push({ field: '', op: '', value: '' });
};

const isOptionalForAll = ref<boolean>(false);
const errorSubmitText = ref<string>('');

const handleOptionalForAllSwitch = (): void => {
  if (isOptionalForAll.value === true) {
    // Store the optional conditions in case the isOptionalForAll is toggled on and off again
    previousOptionalConditions.value = optionalConditions.value;
    optionalConditions.value = [];
  } else {
    optionalConditions.value = previousOptionalConditions.value;
  }
};

const isOptionalForAllAndOptionalConditionsPresent = computed((): boolean => {
  return isOptionalForAll.value && toRaw(previousOptionalConditions.value)?.length > 0;
});

const handleReset = (): void => {
  errorSubmitText.value = '';
  assignedConditions.value = [];
  optionalConditions.value = [];

  getAllConditions(props.assessment.task.id);
};

function hasDuplicateUserTypeConditions(conditions: Condition[]): boolean {
  const seen = new Set<string>();

  for (const condition of conditions) {
    if (condition.field !== 'userType') continue;
    const key = `${condition.op}:${condition.value}`;
    if (seen.has(key)) return true;
    seen.add(key);
  }

  return false;
}

const handleSave = (): void => {
  let error = false;

  // Check if any emppty fields in Assigned Conditions
  for (const condition of assignedConditions.value) {
    for (const [key, value] of Object.entries(condition)) {
      if (value === '') {
        errorSubmitText.value = 'Missing fields in Assigned Conditions';
        error = true;
      }
    }
  }

  // Check if any emppty fields in Optional Conditions
  for (const condition of optionalConditions.value) {
    for (const [key, value] of Object.entries(condition)) {
      if (value === '') {
        errorSubmitText.value = 'Missing fields in Optional Conditions';
        error = true;
      }
    }
  }

  if (hasDuplicateUserTypeConditions(assignedConditions.value)) {
    errorSubmitText.value = 'Duplicate User Type conditions in Assigned Conditions';
    error = true;
  }

  if (hasDuplicateUserTypeConditions(optionalConditions.value)) {
    errorSubmitText.value = 'Duplicate User Type conditions in Optional Conditions';
    error = true;
  }

  if (!error) {
    errorSubmitText.value = '';
    // If isOptionalForAll is true, then overwrite optional conditions by setting optional to true
    const [assignedConditionsToValues, optionalConditionsToValues] = conditionsToValues();
    const conditionsCopy = computedConditions(assignedConditionsToValues, optionalConditionsToValues);

    if (isOptionalForAll.value === true) {
      conditionsCopy.optional = true;
    }

    props.updateVariant(props.assessment.id, conditionsCopy);
    isVisible.value = false;
  }

  return;
};

// Conditions are stored as string values; clone for the save payload.
function conditionsToValues(): [Condition[], Condition[]] {
  return [_cloneDeep(assignedConditions.value), _cloneDeep(optionalConditions.value)];
}

const computedConditions = (assignedConditions: Condition[], optionalConditions: Condition[]): ConditionsStructure => {
  const conditions: ConditionsStructure = {};

  if (!_isEmpty(optionalConditions)) {
    conditions.optional = { op: 'AND', conditions: optionalConditions };
  }

  if (!_isEmpty(assignedConditions)) {
    conditions.assigned = { op: 'AND', conditions: assignedConditions };
  }

  return conditions;
};

const fieldOptions: FieldOption[] = [
  { label: 'User Type', value: 'userType', project: 'LEVANTE' },
  { label: 'Age', value: 'age', project: 'LEVANTE' },
];

const selectedGroup = computed((): string => {
  // This would need to be implemented based on your actual group selection logic
  return 'selected group';
});
</script>
