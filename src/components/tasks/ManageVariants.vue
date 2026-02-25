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
              :class="['w-full', { 'p-invalid': v$.variantName.$invalid && submitted }]"
              name="variant-fields"
              @click="clearFieldParamArrays()"
            ></PvDropdown>
            <span v-if="v$.selectedGame.$error && submitted">
              <span v-for="(error, index) of v$.selectedGame.$errors" :key="index">
                <small class="p-error">{{ error.$message }}</small>
              </span>
            </span>
            <small
              v-else-if="(v$.selectedGame.$invalid && submitted) || v$.selectedGame.$pending.$response"
              class="p-error"
            >
              {{ v$.selectedGame.id.required.$message.replace('Value', 'Task selection') }}
            </small>
          </section>

          <template v-if="variantFields.selectedGame?.id">
            <div
              v-if="!schemaForSelectedTask && !isSchemaLoading"
              class="flex align-items-center gap-2 p-3 mt-2 surface-100 border-round border-1 border-blue-500"
            >
              <i class="pi pi-info-circle text-blue-600" />
              <span class="text-blue-800">
                No schema exists for this task yet. You can still create the config below; an inferred schema will be
                created from it when you save.
              </span>
            </div>

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
                v-else-if="(v$.variantName.$invalid && submitted) || v$.variantName.$pending.$response"
                class="p-error"
              >
                {{ v$.variantName.required.$message.replace('Value', 'Variant Name') }}
              </small>
            </section>
          </template>
        </div>

        <template v-if="variantFields.selectedGame?.id">
        <div class="flex flex-column align-items-center">
          <h3 class="text-center">
            <strong>Configure Parameter Values</strong>
            <span v-if="schemaForSelectedTask?.paramDefinitions" class="text-sm text-gray-500 font-normal ml-2">
              (from schema)
            </span>
          </h3>
          <h4 class="text-center">
            Set the game parameters for a new variant of task
            <strong>{{ variantFields.selectedGame?.id ?? '—' }}</strong>
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
              v-for="(param, index) in createVariantParamList.filter((p) => !deletedParams.includes(p.name))"
              :key="param.name"
              class="flex align-items-center justify-content-center dynamic-param-container gap-4"
            >
              <div class="flex align-items-center">
                <PvInputText id="inputParamName" :model-value="param.name" disabled />
              </div>

              <div class="flex align-items-center">
                <PvInputText id="inputParamType" :model-value="param.type" disabled />
              </div>

              <div class="flex align-items-center gap-2 flex-grow-1">
                <PvDropdown
                  v-if="param.name === 'language'"
                  id="inputParamValue"
                  v-model="createVariantParamsValues[param.name]"
                  :options="languageDropdownOptions"
                  option-label="displayName"
                  option-value="variantCode"
                  :option-disabled="(option) => option.disabled"
                  placeholder="Select language (full locale preferred)"
                  class="flex-grow-1"
                >
                  <template #value="slotProps">
                    <div v-if="slotProps.value" class="flex align-items-center gap-2">
                      <span :class="`fi fi-${getLanguageInfo(slotProps.value)?.flagCode}`"></span>
                      <span>{{ getLanguageInfo(slotProps.value)?.displayName }}</span>
                      <small v-if="getLanguageInfo(slotProps.value)?.isLegacy" class="text-orange-500">(legacy)</small>
                    </div>
                    <span v-else>{{ slotProps.placeholder }}</span>
                  </template>
                  <template #option="slotProps">
                    <div
                      v-if="slotProps.option.variantCode === '__separator__'"
                      class="text-center text-color-secondary font-italic py-2"
                      style="pointer-events: none"
                    >
                      {{ slotProps.option.displayName }}
                    </div>
                    <div v-else class="flex align-items-center gap-2">
                      <span :class="`fi fi-${slotProps.option.flagCode}`"></span>
                      <span>{{ slotProps.option.displayName }}</span>
                      <small class="text-color-secondary">({{ slotProps.option.variantCode }})</small>
                      <small v-if="slotProps.option.isLegacy" class="text-orange-500 ml-1">legacy</small>
                    </div>
                  </template>
                </PvDropdown>
                <PvInputText
                  v-else-if="param.type === 'string'"
                  id="inputParamValue"
                  v-model="createVariantParamsValues[param.name]"
                  placeholder="Set game parameter to desired value"
                  class="flex-grow-1"
                />
                <PvDropdown
                  v-else-if="param.type === 'boolean'"
                  id="inputParamValue"
                  v-model="createVariantParamsValues[param.name]"
                  :options="booleanDropDownOptions"
                  option-label="label"
                  option-value="value"
                  placeholder="Set game parameter to desired value"
                  class="flex-grow-1"
                />
                <PvInputNumber
                  v-else-if="param.type === 'number'"
                  id="inputParamValue"
                  v-model="createVariantParamsValues[param.name]"
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

            <template v-if="!schemaForSelectedTask?.paramDefinitions">
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
              <PvButton
                label="Add Parameter"
                text
                icon="pi pi-plus"
                class="w-full my-4 bg-primary text-white border-none border-round p-2 hover:bg-red-900"
                @click="newParam"
              />
            </template>
          </div>
        </div>
        <div class="flex flex-row align-items-center justify-content-center gap-2 flex-order-0 my-3">
          <div class="flex flex-row align-items-center">
            <PvCheckbox
              v-model="variantCheckboxData"
              input-id="chbx-registeredVariant"
              name="variantCheckboxData"
              value="isRegisteredVariant"
            />
            <label class="ml-1 mr-3" for="chbx-registeredVariant">Mark as <b>Registered Variant</b></label>
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
        </template>
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

      <section v-if="selectedVariant && selectedTask" class="flex flex-column gap-3 mt-4 p-4">
        <div
          v-if="
            schemaForUpdateTask &&
            selectedVariant.schemaVersion != null &&
            selectedVariant.schemaVersion < schemaForUpdateTask.version
          "
          class="flex align-items-center gap-2 p-3 surface-100 border-round border-1 border-amber-500"
        >
          <i class="pi pi-info-circle text-amber-600" />
          <span class="text-amber-800">
            This variant uses schema version {{ selectedVariant.schemaVersion }}. The latest is
            {{ schemaForUpdateTask.version }}. Consider updating the variant to use the latest schema (save will
            set schema version to {{ schemaForUpdateTask.version }}).
          </span>
        </div>
        <div
          v-if="
            selectedVariant.params &&
            Object.keys(selectedVariant.params).length > 0 &&
            !schemaForUpdateTask &&
            !isSchemaLoading
          "
          class="flex align-items-center gap-2 p-3 surface-100 border-round border-1 border-red-500"
        >
          <i class="pi pi-exclamation-triangle text-red-600" />
          <span class="text-red-800">
            No schema exists for this task's game params. Create a schema in the <strong>Schemas</strong> tab to
            validate and edit game params.
          </span>
        </div>
        <div class="flex flex-column w-full">
          <label for="fieldsOutput">
            <strong>Fields</strong>
          </label>
          <div v-for="(value, key) in selectedVariant" id="fieldsOutput" :key="key">
            <div v-if="!ignoreFields.includes(key)">
              <div
                v-if="updatedVariantData[key] !== undefined"
                class="flex align-items-center justify-content-between gap-2 mb-1"
              >
                <label :for="key" class="w-1">
                  <em>{{ key }}</em>
                </label>
                <PvInputText id="inputEditVariantType" :placeholder="typeof value" disabled class="w-2 text-center" />
                <PvInputText
                  v-if="typeof value === 'string'"
                  v-model="updatedVariantData[key]"
                  :placeholder="value"
                  class="flex-grow-1"
                />
                <PvInputNumber
                  v-else-if="typeof value === 'number'"
                  v-model="updatedVariantData[key]"
                  class="flex-grow-1"
                />
                <PvDropdown
                  v-else-if="typeof value === 'boolean'"
                  v-model="updatedVariantData[key]"
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

        <div v-if="schemaForUpdateTask" class="flex flex-column gap-1 p-3 surface-100 border-round">
          <div class="flex align-items-center gap-2 flex-wrap">
            <strong>Schema (task config definition)</strong>
            <span class="text-sm text-gray-600">Version {{ schemaForUpdateTask.version }}</span>
            <PvButton
              :label="showSchemaDetails ? 'Hide details' : 'Details'"
              :icon="showSchemaDetails ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
              icon-pos="right"
              severity="secondary"
              text
              size="small"
              class="p-0 text-sm"
              @click="showSchemaDetails = !showSchemaDetails"
            />
          </div>
          <div v-if="showSchemaDetails" class="flex flex-wrap gap-2 mt-2">
            <span
              v-for="(def, key) in schemaForUpdateTask.paramDefinitions"
              :key="key"
              class="text-sm px-2 py-1 surface-200 border-round"
            >
              {{ key }}: {{ def.type }}{{ def.required ? ' (required)' : '' }}
            </span>
          </div>
        </div>

        <div v-if="selectedVariant.params" class="flex flex-column w-full">
          <label for="paramsOutput">
            <strong>Game Params</strong>
            <span v-if="schemaForUpdateTask?.paramDefinitions" class="text-sm text-gray-500 ml-2">
              (validated against schema)
            </span>
          </label>
          <div
            v-if="
              schemaForUpdateTask?.paramDefinitions &&
              hasParamsNotInSchema
            "
            class="flex align-items-center gap-2 p-3 surface-100 border-round border-1 border-red-500 mb-2 flex-wrap"
          >
            <i class="pi pi-exclamation-triangle text-red-600 flex-shrink-0" />
            <span class="text-red-800 flex-grow-1">
              Some game params are not in the current schema. Update the schema in the <strong>Schemas</strong> tab
              to include them, or remove these params before saving.
            </span>
            <PvButton
              label="Update schema from current config"
              icon="pi pi-sync"
              severity="secondary"
              size="small"
              :loading="isSyncingSchemaFromConfig"
              :disabled="isSyncingSchemaFromConfig"
              class="flex-shrink-0"
              @click="syncSchemaFromCurrentConfig"
            />
          </div>
          <div v-for="(param, paramName) in selectedVariant.params" id="paramsOutput" :key="paramName" class="mb-1">
            <div
              v-if="updatedVariantData.params[paramName] !== undefined"
              class="flex align-items-center justify-content-end column-gap-2 p-2 border-round border-1"
              :class="
                schemaForUpdateTask?.paramDefinitions && !schemaForUpdateTask.paramDefinitions[paramName]
                  ? 'border-red-500 bg-red-50'
                  : 'border-transparent'
              "
            >
              <label :for="paramName" class="w-2">
                <em :class="{ 'text-red-600': schemaForUpdateTask?.paramDefinitions && !schemaForUpdateTask.paramDefinitions[paramName] }">
                  {{ paramName }}
                  <span v-if="schemaForUpdateTask?.paramDefinitions?.[paramName]?.required" class="text-red-500">*</span>
                </em>
              </label>
              <PvInputText
                :id="`inputEditParamType-${paramName}`"
                class="w-2"
                disabled
                :value="schemaForUpdateTask?.paramDefinitions?.[paramName]?.type ?? typeof param"
              />
              <PvInputText
                v-if="typeof param === 'string'"
                v-model="updatedVariantData.params[paramName]"
                :placeholder="param"
                class="flex-grow-1"
              />
              <PvInputNumber
                v-else-if="typeof param === 'number'"
                v-model="updatedVariantData.params[paramName]"
                class="flex-grow-1"
              />
              <PvDropdown
                v-else-if="typeof param === 'boolean'"
                v-model="updatedVariantData.params[paramName]"
                :options="booleanDropDownOptions"
                option-label="label"
                option-value="value"
                class="flex-grow-1"
              />
              <PvButton type="button" @click="deleteParam(paramName)">Delete</PvButton>
            </div>
          </div>
          <div v-if="addedParams.length > 0">
            <div v-for="(field, index) in addedParams" :key="index" class="flex align-items-center column-gap-2 mb-1">
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
              <PvButton type="button" @click="removeField(field.name, addedParams)">Delete</PvButton>
            </div>
          </div>
        </div>
        <PvButton label="Add Param" text icon="pi pi-plus" class="my-4" @click="addParam" />
      </section>

      <section class="flex flex-column gap-3 mt-4">
        <PvButton
          type="submit"
          class="my-4 bg-primary text-white border-none border-round p-2 hover:bg-red-900"  
        >
          Update Variant
        </PvButton>
      </section>
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
import useTasksQuery from '@/composables/queries/useTasksQuery';
import useTaskVariantsQuery from '@/composables/queries/useTaskVariantsQuery';
import useTaskSchemasQuery from '@/composables/queries/useTaskSchemasQuery';
import useAddTaskVariantMutation from '@/composables/mutations/useAddTaskVariantMutation';
import useUpdateTaskVariantMutation from '@/composables/mutations/useUpdateTaskVariantMutation';
import useUpsertTaskSchemaMutation from '@/composables/mutations/useUpsertTaskSchemaMutation';
import { getAllLanguageOptions, getPrimaryLanguageOptions, getLanguageInfo } from '@/helpers/languageDiscovery';

const toast = useToast();
const initialized = ref(false);
const registeredTasksOnly = ref(true);
const variantCheckboxData = ref();
const authStore = useAuthStore();
const { roarfirekit } = storeToRefs(authStore);

const { mutate: addVariant } = useAddTaskVariantMutation();
const { mutate: updateVariant } = useUpdateTaskVariantMutation();
const { mutateAsync: upsertSchema, isPending: isSyncingSchemaFromConfig } = useUpsertTaskSchemaMutation();

const selectedTask = ref(null);
const selectedVariant = ref(null);
const showSchemaDetails = ref(false);
// Reactive clone for holding changes made to variantData without affecting the original variantData and avoiding reactivity issues
let updatedVariantData = reactive(cloneDeep(selectedVariant.value));
// Array of objects which models the new fields added to the variant
// This array of objects is later converted back into an object and spread into the updatedVariantData object
let addedFields = reactive([]);

// Array of objects which models the new params added to the variant
// This array of objects is later converted back into an object and spread into the updatedVariantData object
let addedParams = reactive([]);
// Array of objects which models the new params added to the variant to be created
// This array of objects is later converted back into an object and spread into the variantParams object

let newParams = reactive([]);

const viewModel = ref('Create Variant');
const modelViews = ['Create Variant', 'Update Variant'];

const handleViewChange = (value) => {
  const selectedView = modelViews.find((view) => view === value);
  if (selectedView) {
    viewModel.value = selectedView;
  }
};

// Fields to ignore when displaying variant data
const ignoreFields = ['id', 'lastUpdated', 'params', 'parentDoc', 'schemaVersion', 'updatedAt'];

const booleanDropDownOptions = [
  { label: 'true', value: true },
  { label: 'false', value: false },
];

// Language discovery and mapping - primary languages first, then legacy for compatibility
const languageDropdownOptions = computed(() => {
  const allLanguages = getAllLanguageOptions();
  const primaryLanguages = allLanguages.filter((lang) => !lang.isLegacy);
  const legacyLanguages = allLanguages.filter((lang) => lang.isLegacy);

  return [
    ...primaryLanguages,
    // Add separator if there are legacy options
    ...(legacyLanguages.length > 0
      ? [
          {
            variantCode: '__separator__',
            displayName: '──── Legacy (for compatibility) ────',
            dashboardLocale: '',
            flagCode: '',
            isLegacy: false,
            disabled: true,
          },
        ]
      : []),
    ...legacyLanguages,
  ];
});

watch(selectedVariant, (newVal) => {
  updatedVariantData = reactive(cloneDeep(newVal));
});

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

const { isFetching: isFetchingTasks, data: tasks } = useTasksQuery({
  enabled: initialized,
});

const { data: variants } = useTaskVariantsQuery(registeredTasksOnly, {
  enabled: initialized,
});

const formattedTasks = computed(() => {
  if (!tasks.value) return [];
  return tasks.value.map((task) => {
    return {
      name: task.taskName ?? task.id,
      ...task,
    };
  });
});

// Filter variants based on selected task
const filteredVariants = computed(() => {
  if (!variants.value || !selectedTask.value) {
    return [];
  }

  return variants.value.filter((variant) => variant.task.id === selectedTask.value);
});

// Fields for modeling  a new variant
const variantFields = reactive({
  variantName: '',
  selectedGame: {},
  // Based on type of account?
  external: true,
});

const { schema: schemaForSelectedTask, isFetching: isSchemaLoading } = useTaskSchemasQuery(
  computed(() => variantFields.selectedGame?.id ?? null),
  { enabled: computed(() => initialized.value) },
);

const { schema: schemaForUpdateTask } = useTaskSchemasQuery(
  computed(() => selectedTask.value ?? null),
  { enabled: computed(() => initialized.value) },
);

const hasParamsNotInSchema = computed(() => {
  const schema = schemaForUpdateTask.value;
  const params = selectedVariant.value?.params;
  if (!schema?.paramDefinitions || !params || typeof params !== 'object') return false;
  return Object.keys(params).some((key) => !(key in schema.paramDefinitions));
});

// Validation rules for variantFields
const variantRules = {
  variantName: { required },
  selectedGame: {
    id: { required },
  },
};
const v$ = useVuelidate(variantRules, variantFields);
const submitted = ref(false);

// Turn mappedGameConfig into an object {key: value, key: value...} which models gameConfig, filtered for deleted params
// This builds the object of parameters that will be sent to the DB
const variantParams = computed(() => {
  const params = reactive({});

  if (!mappedGameConfig.value) {
    return params;
  }

  mappedGameConfig.value.forEach((param) => {
    params[param.name] = param.value;
  });

  return params;
});

// Turn the gameConfig object into an array of key/value pairs [{name: 'key', value: 'value', type: 'type'}...]
const mappedGameConfig = computed(() => {
  if (!variantFields.selectedGame?.gameConfig) return [];
  return Object.entries(variantFields.selectedGame.gameConfig).map(([key, value]) => ({
    name: key,
    type: typeof value,
    value: value,
  }));
});

const createVariantParamList = computed(() => {
  const schema = schemaForSelectedTask.value;
  const gameConfig = variantFields.selectedGame?.gameConfig;
  if (schema?.paramDefinitions) {
    return Object.entries(schema.paramDefinitions).map(([name, def]) => {
      const existing = gameConfig?.[name];
      const value =
        existing !== undefined && existing !== null
          ? existing
          : def.type === 'number'
            ? 0
            : def.type === 'boolean'
              ? false
              : '';
      return { name, type: def.type, value };
    });
  }
  return mappedGameConfig.value;
});

const createVariantParamsValues = reactive({});
watch(
  createVariantParamList,
  (list) => {
    list.forEach((p) => {
      if (!(p.name in createVariantParamsValues)) {
        createVariantParamsValues[p.name] = p.value;
      }
    });
    Object.keys(createVariantParamsValues).forEach((key) => {
      if (!list.some((p) => p.name === key)) delete createVariantParamsValues[key];
    });
  },
  { immediate: true },
);

// Keep track of params that are not needed for the particular variant when creating a new variant
const deletedParams = ref([]);

const moveToDeletedParams = (paramName) => {
  deletedParams.value.push(paramName);
  delete createVariantParamsValues[paramName];
};

// Delete the param from the updatedVariantData object when updating a variant
const deleteParam = (param) => {
  if (updatedVariantData['params'][param] !== undefined) {
    delete updatedVariantData['params'][param];
  }
  delete updatedVariantData[param];
};

// Add a new field to the updatedVariantData object when updating a variant
const addField = () => {
  addedFields.push({ name: '', value: '', type: 'string' });
};

// Remove a field from the addedFields array when updating a variant
const removeField = (field, array) => {
  const updatedFields = array.filter((item) => item.name !== field);
  array.splice(0, array.length, ...updatedFields);
};

// Add a new param to the updatedVariantData object when updating a variant
const addParam = () => {
  addedParams.push({ name: '', value: '', type: 'string' });
};

// Add a new param to the newParams array when creating a new variant
const newParam = () => {
  newParams.push({ name: '', value: '', type: 'string' });
};

// Convert an array of paramType objects into a single object
function convertParamsToObj(paramType) {
  return paramType.reduce((acc, item) => {
    if (item.name) {
      // Check if name is not empty
      acc[camelCase(item.name)] = item.value;
    }
    return acc;
  }, {});
}

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

function checkVariantExists(value) {
  variants.value.forEach((item) => {
    if (value === item.variant?.name) {
      toast.add({
        severity: 'error',
        summary: 'Oops!',
        detail: `Variant with name '${value}' already exists. Please choose a different name.`,
        life: 3000,
      });
      return true;
    }
    return false;
  });
}

// Helper function to check for errors before updating a task
// Returns true if there are errors, false if there are none
const checkForErrors = () => {
  if (addedFields.length > 0) {
    const { isDuplicate, duplicateField } = checkForDuplicates(addedFields, updatedVariantData);
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

  if (newParams.length > 0) {
    const currentParams = viewModel.value === 'Create Variant' ? createVariantParamsValues : variantParams.value;
    const { isDuplicate, duplicateField } = checkForDuplicates(newParams, currentParams);
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
};

function validateGameParamsAgainstSchema(params, paramDefinitions) {
  if (!paramDefinitions || typeof params !== 'object') return { valid: true };
  const defs = paramDefinitions;
  for (const key of Object.keys(defs)) {
    const def = defs[key];
    const value = params[key];
    if (def.required && (value === undefined || value === null || value === '')) {
      return { valid: false, message: `Game param "${key}" is required.` };
    }
    if (value !== undefined && value !== null && value !== '') {
      const actualType = typeof value;
      if (def.type === 'number' && actualType !== 'number') {
        return { valid: false, message: `Game param "${key}" must be a number.` };
      }
      if (def.type === 'boolean' && actualType !== 'boolean') {
        return { valid: false, message: `Game param "${key}" must be true or false.` };
      }
      if (def.type === 'string' && actualType !== 'string') {
        return { valid: false, message: `Game param "${key}" must be a string.` };
      }
    }
  }
  return { valid: true };
}

function buildParamDefinitionsFromParams(params) {
  if (!params || typeof params !== 'object') return {};
  const defs = {};
  for (const [key, value] of Object.entries(params)) {
    const t = typeof value;
    if (t === 'string' || t === 'number' || t === 'boolean') {
      defs[key] = { type: t, required: false };
    }
  }
  return defs;
}

const syncSchemaFromCurrentConfig = async () => {
  if (!selectedTask.value || !selectedVariant.value || !authStore.currentSite) return;
  const convertedParams = convertParamsToObj(addedParams);
  const mergedParams = { ...(updatedVariantData.params ?? {}), ...convertedParams };
  const paramDefinitions = buildParamDefinitionsFromParams(mergedParams);
  if (Object.keys(paramDefinitions).length === 0) {
    toast.add({
      severity: 'warn',
      summary: 'No params',
      detail: 'No game params to build a schema from.',
      life: 3000,
    });
    return;
  }
  try {
    const result = await upsertSchema({ taskId: selectedTask.value, paramDefinitions });
    const newVersion = result?.version;
    if (newVersion == null) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to create schema.', life: 3000 });
      return;
    }
    const convertedFields = convertParamsToObj(addedFields);
    const variantData = {
      taskId: selectedTask.value,
      variantId: selectedVariant.value.id,
      siteId: authStore.currentSite,
      data: {
        ...updatedVariantData,
        ...convertedFields,
        schemaVersion: newVersion,
        params: mergedParams,
      },
    };
    await updateVariant(variantData, {
      onSuccess: () => {
        toast.add({
          severity: 'success',
          summary: 'Schema and variant updated',
          detail: 'Schema was updated from current config and variant was saved with the new schema version.',
          life: 4000,
        });
      },
      onError: (err) => {
        toast.add({
          severity: 'error',
          summary: 'Variant update failed',
          detail: 'Schema was updated but saving the variant failed. Try saving again.',
          life: 4000,
        });
        console.error(err);
      },
    });
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to update schema from config.',
      life: 3000,
    });
    console.error(err);
  }
};

const handleUpdateVariant = async () => {
  // Check for errors before updating a variant; end function if errors are found
  if (checkForErrors()) return;

  // Additional error checking; could be combined into checkForErrors()
  // With some additional logic
  if (!selectedTask.value) {
    toast.add({
      severity: 'error',
      summary: 'Invalid Form',
      detail: 'Please select a task.',
      life: 3000,
    });
    return;
  }

  if (!selectedVariant.value) {
    toast.add({
      severity: 'error',
      summary: 'Invalid Form',
      detail: 'Please select a variant.',
      life: 3000,
    });
    return;
  }

  const hasGameParams =
    selectedVariant.value.params && Object.keys(selectedVariant.value.params).length > 0;
  const schema = schemaForUpdateTask.value;
  if (hasGameParams && !schema) {
    toast.add({
      severity: 'error',
      summary: 'Schema required for game params',
      detail:
        'No schema exists for this task\'s game params. Create a schema in the Schemas tab to validate and save.',
      life: 5000,
    });
    return;
  }

  const convertedFields = convertParamsToObj(addedFields);
  const convertedParams = convertParamsToObj(addedParams);
  const mergedParams = { ...(updatedVariantData.params ?? {}), ...convertedParams };

  if (schema?.paramDefinitions) {
    const paramKeysNotInSchema = Object.keys(mergedParams).filter(
      (key) => !(key in schema.paramDefinitions),
    );
    if (paramKeysNotInSchema.length > 0) {
      toast.add({
        severity: 'error',
        summary: 'Game params not in schema',
        detail:
          'Some game params are not in the current schema. Update the schema in the Schemas tab to include them, or remove these params: ' +
          paramKeysNotInSchema.join(', '),
        life: 5000,
      });
      return;
    }
    const validation = validateGameParamsAgainstSchema(mergedParams, schema.paramDefinitions);
    if (!validation.valid) {
      toast.add({
        severity: 'error',
        summary: 'Game params validation',
        detail: validation.message,
        life: 5000,
      });
      return;
    }
  }

  const latestSchemaVersion = schemaForUpdateTask.value?.version;
  const variantData = {
    taskId: selectedTask.value,
    variantId: selectedVariant.value.id,
    siteId: authStore.currentSite,
    data: {
      ...updatedVariantData,
      ...convertedFields,
      ...(latestSchemaVersion != null && { schemaVersion: latestSchemaVersion }),
      params: {
        ...(updatedVariantData.params ?? {}),
        ...convertedParams,
      },
    },
  };

  await updateVariant(variantData, {
    onSuccess: () => {
      toast.add({
        severity: 'success',
        summary: 'Hoorah!',
        detail: 'Variant successfully updated.',
        life: 3000,
      });
      resetUpdateVariantForm();
    },
    onError: (error) => {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Unable to update variant, please try again.',
        life: 3000,
      });
      console.error('Failed to update task.', error);
    },
  });
};

const handleVariantSubmit = async (isFormValid) => {
  if (checkForErrors()) return;

  if (checkVariantExists(variantFields.variantName)) return;

  if (!isFormValid) return;

  submitted.value = true;
  const isRegisteredVariant = !!variantCheckboxData.value?.find((item) => item === 'isRegisteredVariant');
  const convertedParams = convertParamsToObj(newParams) ?? {};
  const hasSchema = !!schemaForSelectedTask.value?.paramDefinitions;
  const combinedParams = hasSchema
    ? { ...createVariantParamsValues }
    : { ...createVariantParamsValues, ...convertedParams };

  let schemaVersion = schemaForSelectedTask.value?.version;
  let schemaCreatedAt = schemaForSelectedTask.value?.createdAt;
  if (variantFields.selectedGame?.id && schemaVersion == null && Object.keys(combinedParams).length > 0) {
    const paramDefinitions = buildParamDefinitionsFromParams(combinedParams);
    try {
      const result = await upsertSchema({
        taskId: variantFields.selectedGame.id,
        paramDefinitions,
      });
      schemaVersion = result?.version ?? undefined;
      if (result?.createdAt != null) schemaCreatedAt = result.createdAt;
    } catch (err) {
      toast.add({
        severity: 'error',
        summary: 'Schema creation failed',
        detail: 'Could not create inferred schema. Try again or create a schema in the Schemas tab first.',
        life: 5000,
      });
      console.error(err);
      submitted.value = false;
      return;
    }
  }

  const newVariantObject = reactive({
    taskId: variantFields.selectedGame.id,
    taskDescription: variantFields.selectedGame.description,
    taskImage: variantFields.selectedGame.image,
    variantName: variantFields.variantName,
    variantParams: combinedParams,
    demoData: {
      task: !!variantFields.selectedGame?.demoData,
      variant: false,
    },
    testData: {
      task: !!variantFields.selectedGame?.testData,
      variant: false,
    },
    registered: isRegisteredVariant,
    siteId: authStore.currentSite,
    ...(schemaVersion != null && { schemaVersion }),
    ...(schemaCreatedAt != null && { schemaCreatedAt }),
  });

  await addVariant(newVariantObject, {
    onSuccess: () => {
      toast.add({
        severity: 'success',
        summary: 'Hoorah!',
        detail: 'Variant successfully created.',
        life: 3000,
      });
      submitted.value = false;
      resetCreateVariantForm();
    },
    onError: (error) => {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Unable to create variant, please try again.',
        life: 3000,
      });
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
  Object.keys(createVariantParamsValues).forEach((k) => delete createVariantParamsValues[k]);
  deletedParams.value = [];
  variantCheckboxData.value = [];
  clearFieldParamArrays();
}

const resetUpdateVariantForm = () => {
  selectedTask.value = null;
  selectedVariant.value = null;
  updatedVariantData = {};
  clearFieldParamArrays();
};

const clearFieldParamArrays = () => {
  addedFields = reactive([]);
  addedParams = reactive([]);
  newParams = reactive([]);
  deletedParams.value = [];
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
