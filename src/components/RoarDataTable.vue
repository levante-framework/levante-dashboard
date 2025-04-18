<template>
  <div v-if="!props.data">
    <SkeletonTable />
  </div>
  <div v-else class="options-container">
    <div class="flex justify-content-end mr-3 mt-2 button-container">
      <button type="button" class="text-red-700 cursor-pointer options-toggle" @click.prevent="toggleControls">
        {{ showControls ? 'Hide Options' : 'Show Options' }}
      </button>
    </div>
    <div v-if="showControls" class="w-full gap-1 pt-1 flex justify-content-center align-items-center flex-wrap mb-4">
      <div v-if="props.allowFiltering || props.allowColumnSelection || props.allowExport" class="w-full gap-1 pt-1 flex justify-content-center align-items-center flex-wrap mt-3">
        <slot name="filterbar"></slot>
        <PvFloatLabel v-if="props.allowColumnSelection" >
          <PvMultiSelect
            id="ms-columns"
            v-tooltip.top="'Show and hide columns'"
            :model-value="selectedColumns"
            :options="inputColumns"
            option-label="header"
            :max-selected-labels="3"
            class="w-2 md:w-10rem"
            selected-items-label="{0} columns selected"
            @update:model-value="onColumnToggle"
          />
          <label for="ms-columns" class="view-label2">Select Columns</label>
        </PvFloatLabel>
        <PvFloatLabel v-if="props.allowColumnSelection">
          <PvMultiSelect
            id="ms-freeze"
            :model-value="frozenColumns"
            :options="inputColumns"
            option-label="header"
            :max-selected-labels="3"
            class="w-2 md:w-10rem"
            selected-items-label="{0} columns frozen"
            :show-toggle-all="false"
            @update:model-value="onFreezeToggle"
          />
          <label for="ms-columns" class="view-label2">Freeze Columns</label>
        </PvFloatLabel>
        <span v-if="props.allowExport" class="flex flex-row flex-wrap justify-content-end gap-2 max-h-3 export-wrapper">
          <PvButton
            v-if="allowExport"
            v-tooltip.bottom="
              `Export scores for ${selectedRows.length} student${
                selectedRows.length > 1 ? 's' : ''
              } to CSV file for spreadsheet import`
            "
            label="Export Selected"
            :badge="selectedRows?.length?.toString()"
            :disabled="selectedRows.length === 0"
            class="m-1 m-1 h-3rem bg-primary text-white border-none border-round h-2rem text-sm hover:bg-red-900"
            @click="exportCSV(true)"
          />
          <PvButton
            v-if="allowExport"
            v-tooltip.bottom="'Export all scores for all students to a CSV file for spreadsheet import.'"
            label="Export Whole Table"
            class="m-1 h-3rem bg-primary text-white border-none border-round h-2rem text-sm hover:bg-red-900"
            @click="exportCSV(false)"
          />
        </span>
      </div>
    </div>
    <div class="flex flex-column">
      <span style="height: 10px">
        <div class="relative flex justify-content-end mt-0 mr-2 z-1" style="top: 25px; width: 20%; left: 80%">
          <slot />
        </div>
      </span>
      <span>
        <PvDataTable
          ref="dataTable"
          v-model:filters="refFilters"
          v-model:selection="selectedRows"
          class="scrollable-container"
          :class="{ compressed: compressedRows }"
          :value="data"
          :row-hover="true"
          :reorderable-columns="true"
          :resizable-columns="true"
          :export-filename="exportFilename"
          removable-sort
          sort-mode="multiple"
          :multi-sort-meta="lazyPreSorting"
          show-gridlines
          filter-display="menu"
          paginator
          :rows="pageLimit"
          :always-show-paginator="true"
          paginator-position="both"
          :rows-per-page-options="[10, 25, 50, 100]"
          :total-records="totalRecords"
          :loading="loading"
          scrollable
          :select-all="selectAll"
          data-cy="roar-data-table"
          @select-all-change="onSelectAll"
          @row-select="onSelectionChange"
          @row-unselect="onSelectionChange"
        >
          <PvColumn
            selection-mode="multiple"
            header-style="background-color: var(--primary-color); border:none;"
            :reorderable-column="false"
            frozen
          />
          <PvColumn
            v-for="(col, index) of computedColumns"
            :key="col.field + '_' + index"
            :field="col.field"
            :data-type="col.dataType"
            :sortable="col.sort !== false"
            :show-filter-match-modes="!col.useMultiSelect && col.dataType !== 'score' && col.dataType !== 'progress'"
            :show-filter-operator="col.allowMultipleFilters === true"
            :filter-field="col?.filterField ? col.filterField : col.field"
            :show-add-button="col.allowMultipleFilters === true"
            :frozen="col.pinned"
            :style="col.style"
            align-frozen="left"
            header-style="background:var(--primary-color); color:white; padding-top:0; margin-top:0; padding-bottom:0; margin-bottom:0; border:0; margin-left:0"
          >
            <template #header>
              <div
                v-tooltip.top="`${toolTipByHeader(col.header)}`"
                :style="[
                  toolTipByHeader(col.header).length > 0
                    ? 'text-decoration: underline dotted #0000CD; text-underline-offset: 3px'
                    : null,
                ]"
              >
                {{ col.header }}
              </div>
            </template>
            <template #body="{ data: colData }">
              <!-- If column is a score field, use a dedicated component to render tags and scores -->
              <div v-if="col.field && col.field?.split('.')[0] === 'scores'">
                <TableScoreTag :col-data="colData" :col="col" />
              </div>
              <div v-else-if="col.dataType == 'progress'">
                <PvTag
                  v-if="_get(colData, col.field)"
                  :severity="_get(colData, col.severityField || '')"
                  :value="_get(colData, col.field)"
                  :icon="_get(colData, col.iconField || '')"
                  class="progress-tag"
                  rounded
                />
              </div>
              <div
                v-else-if="col.tagOutlined && _get(colData, col.tagColor || '')"
                class="circle"
                :style="`border: 1px solid black; background-color: ${_get(colData, col.tagColor || '')}; color: ${
                  _get(colData, col.tagColor || '') === 'white' ? 'black' : 'white'
                }; outline: 1px dotted #0000CD; outline-offset: 3px`"
              />
              <div v-else-if="col.chip && col.dataType === 'array' && _get(colData, col.field) !== undefined">
                <PvChip v-for="chip in _get(colData, col.field)" :key="chip" :label="chip" />
              </div>
              <div v-else-if="col.link">
                <router-link :to="{ name: col.routeName, params: colData.routeParams }">
                  <PvButton
                    v-tooltip.right="colData.tooltip"
                    severity="secondary"
                    text
                    class="border border-round surface-200 p-2 hover:surface-500"
                    :label="colData.routeParams.buttonLabel"
                    :aria-label="col.routeTooltip"
                    :icon="col.routeIcon"
                    style="color: black !important"
                    data-cy="route-button"
                    size="small"
                  />
                </router-link>
                <span v-if="colData.userCount !== undefined && colData.userCount !== null" class="font-semibold text-sm ml-2">
                  {{ colData.userCount }}
                </span>
              </div>
              <div v-else-if="col.button">
                <PvButton
                  severity="secondary"
                  text
                  class="border border-round surface-200 text-primary p-2 hover:surface-500 hover:text-white"
                  :label="col.buttonLabel"
                  :aria-label="col.buttonTooltip"
                  :icon="col.buttonIcon"
                  style="color: black !important"
                  data-cy="event-button"
                  size="small"
                  @click="col.eventName && $emit(col.eventName, colData)"
                />
              </div>
              <div v-else-if="col.dataType === 'date'">
                {{ getFormattedDate(_get(colData, col.field)) }}
              </div>
              <div v-else-if="col.field === 'user.lastName'">
                {{ _get(colData, col.field) }}
              </div>
              <div v-else>
                {{ _get(colData, col.field) }}
              </div>
            </template>
            <template v-if="col.dataType" #sorticon="{ sorted, sortOrder }">
              <i v-if="!sorted && currentSort.length === 0" class="pi pi-sort-alt ml-2" />
              <i v-if="sorted && sortOrder === 1" class="pi pi-sort-amount-down-alt ml-2" />
              <i v-else-if="sorted && sortOrder === -1" class="pi pi-sort-amount-up-alt ml-2" />
            </template>
            <template v-if="col.dataType" #filter="{ filterModel }">
              <div v-if="col.dataType === 'text' && !col.useMultiSelect" class="filter-content">
                <PvInputText v-model="filterModel.value" type="text" class="p-column-filter" placeholder="Filter" />
              </div>
              <PvInputNumber
                v-if="col.dataType === 'number' && !col.useMultiSelect"
                v-model="filterModel.value"
                type="text"
                class="p-column-filter"
                placeholder="Search"
              />
              <PvMultiSelect
                v-if="col.useMultiSelect"
                v-model="filterModel.value"
                :options="_get(refOptions, col.field)"
                placeholder="Any"
                :show-toggle-all="false"
                class="p-column-filter"
              />
              <PvDatePicker
                v-if="col.dataType === 'date' && !col.useMultiSelect"
                v-model="filterModel.value"
                date-format="mm/dd/yy"
                placeholder="mm/dd/yyyy"
              />
              <div v-if="col.dataType === 'boolean'" class="flex flex-row gap-2">
                <PvSelect v-model="filterModel.value" :options="['True', 'False']" style="margin-bottom: 0.5rem" />
              </div>
              <div v-if="col.dataType === 'score'">
                <PvSelect
                  v-model="filterModel.value"
                  option-label="label"
                  option-group-label="label"
                  option-group-children="items"
                  :options="taskFilterOptions"
                  data-cy="score-filter-dropdown"
                  style="margin-bottom: 0.5rem; width: 17vh; height: 4vh"
                >
                  <template #option="{ option }">
                    <div class="flex align-items-center p-0">
                      <!-- Assert type for indexing -->
                      <div v-if="typedSupportLevelColors[option as SupportLevelColorKeys]" class="flex gap-2 p-0">
                        <div class="small-circle tooltip" :style="`background-color: ${typedSupportLevelColors[option as SupportLevelColorKeys]};`" />
                        <span class="tooltiptext">{{ option }}</span>
                      </div>
                      <!-- Assert type for indexing -->
                      <div v-else-if="typedProgressTags[option as ProgressTagKeys]">
                        <PvTag
                          :severity="typedProgressTags[option as ProgressTagKeys]?.severity"
                          :value="typedProgressTags[option as ProgressTagKeys]?.value"
                          :icon="typedProgressTags[option as ProgressTagKeys]?.icon"
                          class="p-0.5 m-0 font-bold"
                        />
                      </div>
                      <div v-else>
                        <span class="tooltiptext">{{ option }}</span>
                      </div>
                    </div>
                  </template>
                  <template #value="{ value }">
                     <!-- Assert type for indexing -->
                    <div v-if="typedSupportLevelColors[value as SupportLevelColorKeys]" class="flex gap-2">
                      <div class="small-circle tooltip" :style="`background-color: ${typedSupportLevelColors[value as SupportLevelColorKeys]};`" />
                      <span class="tooltiptext">{{ value }}</span>
                    </div>
                     <!-- Assert type for indexing -->
                    <div v-else-if="typedProgressTags[value as ProgressTagKeys]">
                      <PvTag
                        :severity="typedProgressTags[value as ProgressTagKeys]?.severity"
                        :value="typedProgressTags[value as ProgressTagKeys]?.value"
                        :icon="typedProgressTags[value as ProgressTagKeys]?.icon"
                        class="p-0.5 m-0 font-bold"
                      />
                    </div>
                    <div v-else>
                      <span class="tooltiptext">{{ value }}</span>
                    </div>
                  </template>
                </PvSelect>
              </div>
              <div v-if="col.dataType === 'progress'">
                <PvSelect
                  v-model="filterModel.value"
                  :options="['Assigned', 'Started', 'Completed', 'Optional']"
                  style="margin-bottom: 0.5rem"
                  data-cy="progress-filter-dropdown"
                >
                  <template #option="{ option }">
                     <!-- Assert type for indexing -->
                    <div v-if="typedProgressTags[option as ProgressTagKeys]" class="flex align-items-center">
                      <PvTag
                        :severity="typedProgressTags[option as ProgressTagKeys]?.severity"
                        :value="typedProgressTags[option as ProgressTagKeys]?.value"
                        :icon="typedProgressTags[option as ProgressTagKeys]?.icon"
                        class="progress-tag"
                        rounded
                      />
                    </div>
                  </template>
                  <template #value="{ value }">
                    <!-- Assert type for indexing -->
                    <PvTag
                      v-if="typedProgressTags[value as ProgressTagKeys]"
                      :severity="typedProgressTags[value as ProgressTagKeys]?.severity"
                      :value="typedProgressTags[value as ProgressTagKeys]?.value"
                      :icon="typedProgressTags[value as ProgressTagKeys]?.icon"
                      class="progress-tag"
                      rounded
                    />
                  </template>
                </PvSelect>
              </div>
            </template>
            <template #filterclear="{ filterCallback }">
              <div class="flex flex-row-reverse">
                <PvButton
                  type="button"
                  text
                  icon="pi pi-times"
                  class="pl-5 pr-5 bg-primary text-white border-round border-none hover:bg-red-900"
                  severity="primary"
                  @click="filterCallback()"
                  >Clear</PvButton
                >
              </div>
            </template>
            <template #filterapply="{ filterCallback }">
              <PvButton
                type="button"
                icon="pi pi-times"
                class="pl-5 pr-5 bg-primary text-white border-round border-none hover:bg-red-900"
                severity="primary"
                @click="filterCallback()"
                >Apply
              </PvButton>
            </template>
          </PvColumn>
          <template #empty>
            <div class="flex flex-column align-items-center align-text-left my-8">
              <div class="text-lg font-bold my-2">No results found</div>
              <div class="font-light">The filters applied have no matching results .</div>
              <PvButton
                text
                class="my-2 bg-primary p-2 border-none border-round text-white hover:bg-red-900"
                @click="resetFilters"
                >Reset Filters</PvButton
              >
            </div>
          </template>
        </PvDataTable>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Ref, ComputedRef } from 'vue';
import { useToast } from 'primevue/usetoast';
import type { ToastServiceMethods } from 'primevue/toastservice';
import PvButton from 'primevue/button';
import PvDatePicker from 'primevue/datepicker';
import PvChip from 'primevue/chip';
import PvColumn from 'primevue/column';
import PvDataTable from 'primevue/datatable';
import type { DataTableFilterMeta, DataTableFilterMetaData, DataTableSortMeta } from 'primevue/datatable';
import PvFloatLabel from 'primevue/floatlabel';
import PvSelect from 'primevue/select';
import PvInputNumber from 'primevue/inputnumber';
import PvInputText from 'primevue/inputtext';
import PvMultiSelect from 'primevue/multiselect';
import PvTag from 'primevue/tag';
import { FilterMatchMode, FilterOperator } from '@primevue/core/api';
import _get from 'lodash/get';
import _map from 'lodash/map';
import _forEach from 'lodash/forEach';
import _find from 'lodash/find';
import _toUpper from 'lodash/toUpper';
import _startCase from 'lodash/startCase';
import _uniq from 'lodash/uniq';
import { supportLevelColors, progressTags } from '@/helpers/reports';
// @ts-ignore - TS struggles with inferring types from Vue SFC imports here
import SkeletonTable from '@/components/SkeletonTable.vue';
// @ts-ignore - TS struggles with inferring types from Vue SFC imports here
import TableScoreTag from '@/components/reports/TableScoreTag.vue';

// --- Interfaces & Types ---

// Type for supportLevelColors (assuming keys are strings)
// Add specific keys if they are known and fixed
type SupportLevelColorKeys = 'Green' | 'Yellow' | 'Pink' | string; // Example keys
const typedSupportLevelColors: Record<SupportLevelColorKeys, string> = supportLevelColors;

// Type for progressTags (assuming keys are strings)
// Add specific keys if they are known and fixed
interface ProgressTagData {
    value: string;
    icon: string;
    severity: string; // Or specific severity strings like 'info', 'success' etc.
}
type ProgressTagKeys = 'Optional' | 'Completed' | 'Started' | 'Assigned' | string; // Example keys
const typedProgressTags: Record<ProgressTagKeys, ProgressTagData> = progressTags;

// Represents a single row of data in the table
// Use a generic Record or define specific properties if known
interface TableRowData {
  id?: string | number; // Assuming an ID exists for selection
  [key: string]: any; // Allow any other properties
}

// Define the structure for a column definition
interface ColumnDefinition {
  field: string;
  header?: string;
  dataType?: 'text' | 'number' | 'date' | 'boolean' | 'score' | 'progress' | 'array' | string; // Extend string for flexibility
  sort?: boolean;
  allowMultipleFilters?: boolean;
  useMultiSelect?: boolean;
  pinned?: boolean;
  style?: string | Record<string, string>;
  filterField?: string;
  tagOutlined?: boolean;
  tagColor?: string; // Used with tagOutlined
  chip?: boolean; // Used with dataType array
  link?: boolean;
  routeName?: string;
  routeParams?: Record<string, any>; // Define more specifically if possible
  routeTooltip?: string;
  routeIcon?: string;
  button?: boolean;
  buttonLabel?: string;
  buttonTooltip?: string;
  buttonIcon?: string;
  eventName?: string;
  severityField?: string; // Used with progress dataType
  iconField?: string; // Used with progress dataType
  emptyTag?: boolean; // Used in TableScoreTag
}

// Type for task filter options structure
interface TaskFilterItem {
    label: string;
    value: string;
}

interface TaskFilterGroup {
    label: string;
    code: string;
    items: string[]; // Or TaskFilterItem[] if values differ from labels
}

// Type for computedFilters return value
interface ComputedFiltersResult {
    computedOptions: Record<string, any[]>; // Options for MultiSelect filters
    computedFilters: DataTableFilterMeta;
}

interface Props {
  columns: ColumnDefinition[];
  data: TableRowData[];
  allowExport?: boolean;
  exportFilename?: string;
  pageLimit?: number;
  totalRecords?: number;
  loading?: boolean;
  lazy?: boolean; // Currently unused, consider removing if not needed
  lazyPreSorting?: DataTableSortMeta[];
  isInsideListOrgs?: boolean; // Currently unused, consider removing if not needed
  groupheaders?: boolean; // Currently unused, consider removing if not needed
  allowFiltering?: boolean;
  allowColumnSelection?: boolean;
}

interface Emits {
    (e: 'export-all'): void;
    (e: 'selection', selectedData: TableRowData[]): void;
    (e: 'reset-filters'): void; // Seems unused currently
    (e: 'export-selected', selectedData: TableRowData[]): void;
    (e: 'export-org-users', data: any): void; // Define type for event data if known
    (e: string, data: any): void; // Generic emit for button events
}

// --- Props, Emits, Refs ---

const props = withDefaults(defineProps<Props>(), {
  allowExport: true,
  exportFilename: 'datatable-export',
  pageLimit: 25, // Changed default to 25 based on options
  totalRecords: 0,
  loading: false,
  lazy: false,
  lazyPreSorting: () => [],
  isInsideListOrgs: false,
  groupheaders: false,
  allowFiltering: true,
  allowColumnSelection: true,
});

const emit = defineEmits<Emits>();

const showControls: Ref<boolean> = ref(false);
const dataTable: Ref<InstanceType<typeof PvDataTable> | null> = ref(null);
const inputColumns: Ref<ColumnDefinition[]> = ref(props.columns);
const selectedColumns: Ref<ColumnDefinition[]> = ref([...props.columns]); // Use spread to create a copy
const frozenColumns: Ref<ColumnDefinition[]> = ref(inputColumns.value.filter((col) => col.pinned));
const currentSort: Ref<DataTableSortMeta[]> = ref(props.lazyPreSorting); // Initialize with prop
const selectedRows: Ref<TableRowData[]> = ref([]);
const selectAll: Ref<boolean> = ref(false);
const compressedRows: Ref<boolean> = ref(false); // This ref seems unused?
const toast: ToastServiceMethods = useToast();

// --- Computed Properties ---

// Filters visible columns based on user selection
const computedColumns: ComputedRef<ColumnDefinition[]> = computed(() => {
    // Ensure selectedColumns is always an array
    const currentSelected = Array.isArray(selectedColumns.value) ? selectedColumns.value : [];
    // Map based on selected headers, finding the full definition from inputColumns
    return currentSelected
        .map(selectedCol => inputColumns.value.find(inputCol => inputCol.header === selectedCol.header))
        .filter((col): col is ColumnDefinition => !!col); // Filter out undefined results
});

// Task filter options for the score column dropdown
const taskFilterOptions: Ref<TaskFilterGroup[]> = ref([
  {
    label: 'Support Categories',
    code: 'SupportCategories',
    items: ['Green', 'Yellow', 'Pink'], // Assuming these are the values
  },
  {
    label: 'Progress Status',
    code: 'ProgressStatus',
    items: ['Completed', 'Started', 'Assigned'],
  },
  {
    label: 'Other Filters',
    code: 'Other',
    items: ['Optional', 'Assessed', 'Unreliable'],
  },
]);

// Mapping from dataType to PrimeVue FilterMatchMode
const dataTypesToFilterMatchMode: Record<string, string> = {
  NUMERIC: FilterMatchMode.EQUALS,
  NUMBER: FilterMatchMode.EQUALS,
  TEXT: FilterMatchMode.CONTAINS,
  STRING: FilterMatchMode.CONTAINS,
  DATE: FilterMatchMode.DATE_IS,
  BOOLEAN: FilterMatchMode.EQUALS,
  SCORE: FilterMatchMode.CONTAINS,
  PROGRESS: FilterMatchMode.CONTAINS,
};

// Generates the filter configuration object for PrimeVue DataTable
const computedFiltersResult: ComputedRef<ComputedFiltersResult> = computed(() => {
  let filters: DataTableFilterMeta = {};
  let options: Record<string, any[]> = {};

  computedColumns.value.forEach((column) => {
    if (!column.dataType || !props.allowFiltering) return; // Skip if no dataType or filtering disabled

    const fieldOrFilterField = column.filterField ?? column.field;
    const dataTypeUpper = _toUpper(column.dataType);
    let matchMode = dataTypesToFilterMatchMode[dataTypeUpper] ?? FilterMatchMode.CONTAINS;
    let value: any = null;

    if (column.useMultiSelect) {
      matchMode = FilterMatchMode.IN;
      options[column.field] = getUniqueOptions(column);
      value = null; // MultiSelect handles its own value array
    } else if (column.dataType === 'boolean'){
        // Primevue boolean filter often expects true/false not strings 'True'/'False'
        matchMode = FilterMatchMode.EQUALS; 
        value = null; // Let the select component handle 'True'/'False' mapping if needed
    }

    filters[fieldOrFilterField] = {
      operator: FilterOperator.AND,
      constraints: [{ value, matchMode }],
    };
  });

  return { computedOptions: options, computedFilters: filters };
});

// Refs to hold the generated filters and options
const refOptions: Ref<Record<string, any[]>> = ref(computedFiltersResult.value.computedOptions);
const refFilters: Ref<DataTableFilterMeta> = ref(computedFiltersResult.value.computedFilters);

// Watch for changes in computed filters/options (e.g., when columns change)
watch(computedFiltersResult, (newVal) => {
    refOptions.value = newVal.computedOptions;
    refFilters.value = newVal.computedFilters;
});

// --- Functions ---

function toggleControls(): void {
  showControls.value = !showControls.value;
}

function toolTipByHeader(header: string | undefined): string {
  if (!header) return '';
  const headerToTooltipMap: Record<string, string> = {
    Word: 'Assesses decoding skills at the word level. \n\n  Percentile ranges from 0-99 \n Raw Score ranges from 100-900',
    Letter:
      'Assesses decoding skills at the word level. \n\n Percentile ranges from 0-99 \n Raw Score ranges from 0-90',
    Phoneme:
      'Assesses phonological awareness: sound matching and elision. \n\n Percentile ranges from 0-99 \n Raw Score ranges from 0-57',
    Sentence:
      'Assesses reading fluency at the sentence level. \n\n Percentile ranges from 0-99 \n Raw Score ranges from 0-130 ',
    Palabra:
      'Assesses decoding skills at the word level in Spanish. This test is still in the research phase. \n\n  Percentile ranges from 0-99 \n Raw Score ranges from 100-900',
  };
  return headerToTooltipMap[header] || '';
}

// Gets unique values for a column's MultiSelect filter
function getUniqueOptions(column: ColumnDefinition): any[] {
  const field = column.field;
  // Use Set for efficient unique value collection
  const uniqueValues = new Set<any>(); 
  props.data.forEach((entry) => {
      const value = _get(entry, field);
      if (value !== undefined && value !== null) { // Exclude null/undefined
        if (Array.isArray(value)) {
            value.forEach(item => uniqueValues.add(item));
        } else {
            uniqueValues.add(value);
        }
      }
  });
  // Convert Set back to array and sort if needed
  return Array.from(uniqueValues).sort(); 
}

// Formats a date value
function getFormattedDate(date: string | Date | undefined | null): string {
    if (!date) return '';
    let dateObj: Date;
    try {
        dateObj = date instanceof Date ? date : new Date(date);
        // Check if date is valid
        if (isNaN(dateObj.getTime())) return ''; 
        return dateObj.toLocaleDateString('en-us', { 
            // weekday: 'long', // Keep it shorter for tables?
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    } catch (error) {
        console.warn("Error formatting date:", date, error);
        return '';
    }
}

// Updates the visible columns
function onColumnToggle(selected: ColumnDefinition[]): void {
  selectedColumns.value = selected;
}

// Updates the frozen columns
function onFreezeToggle(selected: ColumnDefinition[]): void {
  frozenColumns.value = selected;
  // Update the pinned status in the main selectedColumns ref
  const frozenFields = new Set(selected.map(col => col.field));
  selectedColumns.value = selectedColumns.value.map((col) => ({
      ...col,
      pinned: frozenFields.has(col.field),
  }));
}

// Handles the select all checkbox change
function onSelectAll(event: { checked: boolean }): void {
  selectAll.value = event.checked;
  if (selectAll.value) {
    selectedRows.value = [...props.data]; // Create a copy
    toast.add({
      severity: 'info',
      summary: 'Rows selected',
      detail: `You selected ${selectedRows.value.length} rows on this page. To export all ${props.totalRecords} records, use "Export Whole Table".`,
      life: 5000,
    });
  } else {
    selectedRows.value = [];
  }
  emit('selection', selectedRows.value);
}

// Handles individual row selection changes
function onSelectionChange(): void {
  // When individual rows are selected/deselected, selectAll should be false
  selectAll.value = false; 
  emit('selection', selectedRows.value);
}

// Resets table filters
function resetFilters(): void {
  refFilters.value = computedFiltersResult.value.computedFilters;
  // Optionally clear sort state as well?
  // currentSort.value = []; 
  // if (dataTable.value) {
  //   dataTable.value.resetPage(); 
  //   dataTable.value.resetScroll();
  // }
}

// Triggers the CSV export
function exportCSV(exportSelected: boolean): void {
  if (exportSelected) {
    if (selectedRows.value.length > 0) {
        emit('export-selected', selectedRows.value);
    } else {
        toast.add({ severity: 'warn', summary: 'No Rows Selected', detail: 'Please select rows to export.', life: 3000 });
    }
  } else {
    emit('export-all');
  }
}

// Watch for external changes to columns prop (less common, but good practice)
watch(() => props.columns, (newColumns) => {
    inputColumns.value = newColumns;
    // Reset selections if the base columns change significantly?
    // This depends on desired behavior.
    selectedColumns.value = [...newColumns]; 
    frozenColumns.value = newColumns.filter(col => col.pinned);
}, { deep: true });

// Watch for external changes to data prop
watch(() => props.data, () => {
    // Reset selection and selectAll status when data changes
    selectedRows.value = [];
    selectAll.value = false;
    // Maybe reset filters/page? Depends on use case.
}, { deep: true });

</script>

<style>
.options-container {
  .button-container {
    position: relative;
    min-height: 34px;
  }
  
  .options-toggle {
    position: absolute; 
    top: 10px;
    background: transparent;
    border: 1px solid transparent;
    padding: 0;
    margin: 0;
    font: inherit;
    cursor: pointer;
  }
}

.small-circle {
  border-color: white;
  display: inline-block;
  border-radius: 50%;
  border-width: 5px;
  height: 15px;
  width: 15px;
  vertical-align: middle;
  margin-right: 5px;
  margin-left: 5px;
  margin-top: 3px;
  margin-bottom: 3px;
}

.circle {
  border-color: white;
  display: inline-block;
  border-radius: 50%;
  border-width: 5px;
  height: 25px;
  width: 25px;
  vertical-align: middle;
  margin-right: 10px;
  margin-left: 10px;
  margin-top: 5px;
  margin-bottom: 5px;
}

.p-component {
  position: relative;
}

button.p-button.p-component.softer {
  background: #f3adad;
  color: black;
}

button.p-button.p-component.p-button-outlined.p-button-sm.p-button-outlined.p-button-sm,
button.p-button.p-component.p-button-sm.p-button-sm {
  background-color: var(--primary-color);
  color: white;
  border: none;
  padding: 0.5rem;
  margin: 0.5rem;
  border-radius: 0.35rem;
}

button.p-column-filter-menu-button.p-link,
g {
  color: white;
  padding: 5px;
  margin-left: 10px;
}

.p-datatable .p-datatable-tbody > tr > td {
  text-align: left;
  border: 1px solid var(--surface-c);
  border-width: 0 0 1px 0;
  margin-top: 5px;
  margin-bottom: 5px;
  padding: 0.6rem 1rem !important;
}

.p-datatable-popover-filter {
  display: none!important;
}

.export-wrapper {
  max-height: 4rem;
}

.view-label {
  background-color: white;
  font-size: smaller;
  color: var(--surface-500);
}

.view-label2 {
  position: absolute;
  top: -15px;
  left: 5px;
  background-color: white;
  z-index: 1;
  font-size: smaller;
  color: var(--surface-500);
  width: 110px;
}

button.p-column-filter-menu-button.p-link:hover {
  background: var(--surface-500);
}

.compressed .p-datatable .p-datatable-tbody > tr > td {
  text-align: left;
  border: 1px solid var(--surface-c);
  border-width: 0 0 3px 0;
  padding: 0.6rem 1rem !important;
}

.filter-content {
  width: 12rem;
}

.filter-button-override .p-column-filter-menu-button:not(.p-column-filter-menu-button-active) {
  display: none;
}

.p-column-filter-matchmode-dropdown {
  /* Our current filtering queries do not support options other than equals
     for strings. To reduce confusion for end users, remove the dropdown
     offering different matchmodes */
  display: none;
}

.p-datatable-emptyMessage {
  width: auto; /* or set it to a specific width */
  margin: 0 auto; /* Center the message horizontally */
}

.scrollable-container::-webkit-scrollbar {
  width: 10px;
}

.scrollable-container::-webkit-scrollbar-thumb,
.scrollable-container::-webkit-scrollbar-track {
  background-color: var(--primary-color);
}

.scrollable-container {
  scrollbar-color: var(--primary-color) white;
}

/* Add standardized styling for progress tags */
.progress-tag {
  min-width: 7rem !important;
  display: inline-block !important;
  text-align: center !important;
  font-weight: bold !important;
}

/* Add spacing between icon and text in tags */
.progress-tag .p-tag-icon {
  margin-right: 0.5rem !important;
}
</style>
