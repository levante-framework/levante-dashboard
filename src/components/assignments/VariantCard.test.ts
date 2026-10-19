import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PvButton from 'primevue/button';
import PvChip from 'primevue/chip';
import PvColumn from 'primevue/column';
import PrimeVue from 'primevue/config';
import PvDataTable from 'primevue/datatable';
import PvDialog from 'primevue/dialog';
import PvPopover from 'primevue/popover';
import PvTag from 'primevue/tag';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import VariantCard, { type VariantObject } from '@/components/assignments/VariantCard.vue';
import type { VariantLanguageMapping } from '@/helpers/languageDiscovery';

// Mock EditVariantDialog component
vi.mock('@/components/assignments/EditVariantDialog.vue', () => ({
  default: {
    name: 'EditVariantDialog',
    template: '<div data-testid="edit-variant-dialog"></div>',
  },
}));

vi.mock('@/store/auth', () => ({
  useAuthStore: vi.fn(() => ({
    isUserSuperAdmin: vi.fn(() => true),
  })),
}));

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({
    userRole: ref('super_admin'),
  }),
}));

// VariantCard exposes these via its `<script setup>` bindings but not `defineExpose`,
// so they aren't on the public instance type; narrow for test-only access.
interface VariantCardVm {
  displayParamList: (params: Record<string, unknown>) => Array<{ key: string; value: unknown }>;
  formattedAssignedConditions: string;
}

const mockLanguages: VariantLanguageMapping[] = [
  // Primary (full locales)
  {
    variantCode: 'en-US',
    displayName: 'English (United States)',
    flagCode: 'us',
    isLegacy: false,
    dashboardLocale: 'en-US',
  },
  {
    variantCode: 'es-CO',
    displayName: 'Spanish (Colombia)',
    flagCode: 'co',
    isLegacy: false,
    dashboardLocale: 'es-CO',
  },
  { variantCode: 'de', displayName: 'German', flagCode: 'de', isLegacy: false, dashboardLocale: 'de' },
  { variantCode: 'fr-CA', displayName: 'French (Canada)', flagCode: 'ca', isLegacy: false, dashboardLocale: 'fr-CA' },
  { variantCode: 'nl', displayName: 'Dutch', flagCode: 'nl', isLegacy: false, dashboardLocale: 'nl' },
  { variantCode: 'en-GH', displayName: 'English (Ghana)', flagCode: 'gh', isLegacy: false, dashboardLocale: 'en-GH' },
  {
    variantCode: 'de-CH',
    displayName: 'German (Switzerland)',
    flagCode: 'ch',
    isLegacy: false,
    dashboardLocale: 'de-CH',
  },
  {
    variantCode: 'es-AR',
    displayName: 'Spanish (Argentina)',
    flagCode: 'ar',
    isLegacy: false,
    dashboardLocale: 'es-AR',
  },
  // Legacy codes
  { variantCode: 'en', displayName: 'English (legacy)', flagCode: 'us', isLegacy: true, dashboardLocale: 'en-US' },
  { variantCode: 'es', displayName: 'Spanish (legacy)', flagCode: 'co', isLegacy: true, dashboardLocale: 'es-CO' },
];

const findLanguage = (variantCode: string): VariantLanguageMapping => {
  const language = mockLanguages.find((lang) => lang.variantCode === variantCode);
  if (!language) throw new Error(`Mock language not found: ${variantCode}`);
  return language;
};

const createMockVariant = (language: VariantLanguageMapping): VariantObject => ({
  id: `test-variant-${language.variantCode}`,
  variant: {
    name: `internal-${language.variantCode}`,
    displayName: `Test Variant ${language.displayName}`,
    params: {
      language: language.variantCode,
      cat: true,
      difficulty: 'medium',
    },
    conditions: {
      assigned: {
        conditions: [{ field: 'userType', op: 'EQUAL', value: 'student' }],
      },
    },
  },
  task: {
    name: 'Test Task',
    image: '/test-image.jpg',
  },
});

const mountOptions = {
  global: {
    components: {
      PvButton,
      PvChip,
      PvColumn,
      PvDataTable,
      PvDialog,
      PvPopover,
      PvTag,
    },
    plugins: [PrimeVue],
    directives: {
      tooltip: {
        mounted() {},
        updated() {},
      },
    },
    stubs: {
      EditVariantDialog: {
        template: '<div data-testid="edit-variant-dialog"></div>',
      },
    },
  },
  props: {
    updateVariant: vi.fn(),
    preExistingAssessmentInfo: [],
  },
};

beforeEach(() => {
  setActivePinia(createPinia());
});

describe('VariantCard.vue', () => {
  describe('Rendering', () => {
    it('renders the task name, variant display name (not the internal name), and action buttons', async () => {
      const mockVariant = createMockVariant(findLanguage('en-US'));

      const wrapper = mount(VariantCard, {
        ...mountOptions,
        props: {
          ...mountOptions.props,
          variant: mockVariant,
          hasControls: false,
        },
      });

      await nextTick();

      expect(wrapper.exists()).toBe(true);

      const taskNameElement = wrapper.findAll('.font-bold').find((el) => el.text().includes(mockVariant.task.name));
      expect(taskNameElement).toBeTruthy();

      const text = wrapper.text();
      expect(text).toContain('Variant name:');
      expect(text).toContain(mockVariant.variant.displayName);
      expect(text).not.toContain(mockVariant.variant.name);

      expect(wrapper.find('[data-cy="selected-variant"]').exists()).toBe(true);
      expect(wrapper.find('i.pi-info-circle').exists()).toBe(true);

      wrapper.unmount();
    });

    it('emits select with the variant when the select button is clicked', async () => {
      const mockVariant = createMockVariant(findLanguage('en-US'));

      const wrapper = mount(VariantCard, {
        ...mountOptions,
        props: {
          ...mountOptions.props,
          variant: mockVariant,
          hasControls: false,
        },
      });

      await nextTick();
      await wrapper.find('[data-cy="selected-variant"]').trigger('click');

      expect(wrapper.emitted().select).toBeTruthy();
      expect(wrapper.emitted().select?.[0]).toEqual([mockVariant]);

      wrapper.unmount();
    });
  });

  describe('Variant Card with Controls', () => {
    it('should render variant card with management controls for English (US)', async () => {
      const englishLanguage = findLanguage('en-US');
      const mockVariant = createMockVariant(englishLanguage);

      const wrapper = mount(VariantCard, {
        ...mountOptions,
        props: {
          ...mountOptions.props,
          variant: mockVariant,
          hasControls: true,
        },
      });

      await nextTick();

      // Test control buttons are present
      const removeButton = wrapper.find('i.pi-times');
      const moveUpButton = wrapper.find('i.pi-sort-up');
      const moveDownButton = wrapper.find('i.pi-sort-down');

      expect(removeButton.exists()).toBe(true);
      expect(moveUpButton.exists()).toBe(true);
      expect(moveDownButton.exists()).toBe(true);

      // Test control button functionality - test the buttons directly
      const allButtons = wrapper.findAllComponents(PvButton);

      // Find the remove button (has pi-times icon)
      const removeBtn = allButtons.find((btn) => btn.find('i.pi-times').exists());
      expect(removeBtn).toBeTruthy();

      // Test that clicking the remove button emits the correct event
      if (removeBtn) {
        await removeBtn.trigger('click');
        expect(wrapper.emitted().remove).toBeTruthy();
        expect(wrapper.emitted().remove?.[0]).toEqual([mockVariant]);
      }

      // Find the move up button (has pi-sort-up icon)
      const moveUpBtn = allButtons.find((btn) => btn.find('i.pi-sort-up').exists());
      expect(moveUpBtn).toBeTruthy();

      if (moveUpBtn) {
        await moveUpBtn.trigger('click');
        expect(wrapper.emitted().moveUp).toBeTruthy();
        expect(wrapper.emitted().moveUp?.[0]).toEqual([mockVariant]);
      }

      // Find the move down button (has pi-sort-down icon)
      const moveDownBtn = allButtons.find((btn) => btn.find('i.pi-sort-down').exists());
      expect(moveDownBtn).toBeTruthy();

      if (moveDownBtn) {
        await moveDownBtn.trigger('click');
        expect(wrapper.emitted().moveDown).toBeTruthy();
        expect(wrapper.emitted().moveDown?.[0]).toEqual([mockVariant]);
      }

      wrapper.unmount();
    });
  });

  describe('Variant Parameters Display', () => {
    it('should correctly display all variant parameters in the data table', async () => {
      const testLanguage = findLanguage('en-US'); // Use first language for testing
      const mockVariant = createMockVariant(testLanguage);

      // Add more parameters for comprehensive testing
      mockVariant.variant.params = {
        ...mockVariant.variant.params,
        numberOfTrials: 10,
        timeLimit: 60,
        feedback: true,
        adaptiveAssessment: false,
      };

      const wrapper = mount(VariantCard, {
        ...mountOptions,
        props: {
          ...mountOptions.props,
          variant: mockVariant,
          hasControls: false,
        },
      });

      await nextTick();

      // Check that displayParamList correctly formats parameters
      const paramList = (wrapper.vm as unknown as VariantCardVm).displayParamList(mockVariant.variant.params);

      expect(paramList).toHaveLength(Object.keys(mockVariant.variant.params).length);
      expect(paramList).toEqual(
        expect.arrayContaining([
          { key: 'language', value: testLanguage.variantCode },
          { key: 'cat', value: true },
          { key: 'difficulty', value: 'medium' },
          { key: 'numberOfTrials', value: 10 },
          { key: 'timeLimit', value: 60 },
          { key: 'feedback', value: true },
          { key: 'adaptiveAssessment', value: false },
        ]),
      );

      wrapper.unmount();
    });
  });

  describe('Conditional Rendering', () => {
    // Mount with the given assigned conditions and return the computed, human-readable label.
    const formatAssignedConditions = (conditions: Array<{ field: string; op: string; value: unknown }>): string => {
      const mockVariant = createMockVariant(findLanguage('en-US'));
      mockVariant.variant.conditions = { assigned: { conditions } };

      const wrapper = mount(VariantCard, {
        ...mountOptions,
        props: { ...mountOptions.props, variant: mockVariant, hasControls: true },
      });

      const formatted = (wrapper.vm as unknown as VariantCardVm).formattedAssignedConditions;
      wrapper.unmount();
      return formatted;
    };

    it.each([
      [{ field: 'userType', op: 'EQUAL', value: 'student' }, 'Children'],
      [{ field: 'userType', op: 'NOT_EQUAL', value: 'student' }, 'Not Children'],
      [{ field: 'userType', op: 'EQUAL', value: 'parent' }, 'Caregivers'],
      [{ field: 'userType', op: 'NOT_EQUAL', value: 'parent' }, 'Not Caregivers'],
      [{ field: 'userType', op: 'EQUAL', value: 'teacher' }, 'Teachers'],
      [{ field: 'userType', op: 'NOT_EQUAL', value: 'teacher' }, 'Not Teachers'],
    ])('formats the %o userType condition as "%s"', (condition, expected) => {
      expect(formatAssignedConditions([condition])).toBe(expected);
    });

    it('excludes age conditions from the formatted label', () => {
      expect(
        formatAssignedConditions([
          { field: 'age', op: 'GREATER_THAN', value: '5' },
          { field: 'userType', op: 'EQUAL', value: 'student' },
        ]),
      ).toBe('Children');
    });

    it('joins multiple userType conditions with a comma', () => {
      expect(
        formatAssignedConditions([
          { field: 'userType', op: 'EQUAL', value: 'student' },
          { field: 'userType', op: 'EQUAL', value: 'teacher' },
        ]),
      ).toBe('Children, Teachers');
    });

    it('should handle variants without conditions gracefully', async () => {
      const testLanguage = findLanguage('de');
      const mockVariant = createMockVariant(testLanguage);
      delete mockVariant.variant.conditions;

      const wrapper = mount(VariantCard, {
        ...mountOptions,
        props: {
          ...mountOptions.props,
          variant: mockVariant,
          hasControls: false,
        },
      });

      await nextTick();

      expect(wrapper.exists()).toBe(true);
      expect((wrapper.vm as unknown as VariantCardVm).formattedAssignedConditions).toBe('');

      wrapper.unmount();
    });

    it('falls back to formatted internal name when displayName is missing', async () => {
      const wrapper = mount(VariantCard, {
        ...mountOptions,
        props: {
          ...mountOptions.props,
          variant: {
            id: 'legacy-variant',
            variant: {
              name: 'legacy-internal-name',
              params: { language: 'en-US' },
            },
            task: {
              name: 'Test Task',
              image: '/test-image.jpg',
            },
          },
          hasControls: false,
        },
      });

      await nextTick();

      expect(wrapper.text()).toContain('Variant name:');
      expect(wrapper.text()).toContain('legacy-internal-name');

      wrapper.unmount();
    });
  });
});
