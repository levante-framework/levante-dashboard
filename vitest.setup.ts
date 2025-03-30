import { vi } from 'vitest'

// Mock PrimeVue API globally
vi.mock('primevue/api', () => ({
  FilterMatchMode: {
    STARTS_WITH: 'startsWith',
    CONTAINS: 'contains',
    EQUALS: 'equals',
    IN: 'in',
    LESS_THAN: 'lt',
    LESS_THAN_OR_EQUAL_TO: 'lte',
    GREATER_THAN: 'gt',
    GREATER_THAN_OR_EQUAL_TO: 'gte',
    BETWEEN: 'between',
    DATE_IS: 'dateIs',
    DATE_IS_NOT: 'dateIsNot',
    DATE_BEFORE: 'dateBefore',
    DATE_AFTER: 'dateAfter',
    CUSTOM: 'custom',
    IS: 'is'
  },
  FilterOperator: {
    AND: 'and',
    OR: 'or'
  },
  FilterService: {
    filter: vi.fn()
  }
}))

// Mock other PrimeVue components globally
vi.mock('primevue/button', () => ({
  default: {
    name: 'PvButton',
    props: ['label', 'icon', 'disabled', 'onClick'],
    template: '<button :disabled="disabled" @click="onClick"><i :class="icon"></i>{{ label }}</button>'
  }
}))

vi.mock('primevue/datatable', () => ({
  default: {
    name: 'PvDataTable',
    props: ['value', 'showGridlines', 'rowHover', 'resizableColumns', 'paginator', 'rows'],
    template: '<div class="p-datatable"></div>'
  }
}))

vi.mock('primevue/column', () => ({
  default: {
    name: 'PvColumn',
    props: ['field'],
    template: '<div class="p-column"></div>'
  }
}))

vi.mock('primevue/fileupload', () => ({
  default: {
    name: 'PvFileUpload',
    props: ['name', 'customUpload', 'accept', 'auto', 'showUploadButton', 'showCancelButton', 'onUploader'],
    template: '<div class="p-fileupload"></div>'
  }
}))

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: vi.fn()
  })
}))

// Mock store modules
vi.mock('@/store/auth', () => ({
  useAuthStore: vi.fn(() => ({
    userData: {
      userType: 'admin'
    }
  }))
}))

vi.mock('@/store/scores', () => ({
  useScoreStore: vi.fn(() => ({
    tableRoarScores: [],
    selectedStudents: [],
    selectedRuns: []
  }))
}))

// Mock helper functions
vi.mock('@/helpers', () => ({
  csvFileToJson: vi.fn(),
  flattenObj: vi.fn()
})) 