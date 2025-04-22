import { ref, type Ref } from 'vue';
import { describe, it, expect, vi } from 'vitest';
import { nanoid } from 'nanoid';
import useOrgQuery from './useOrgQuery';
import { SINGULAR_ORG_TYPES } from '@/constants/orgTypes';

// --- Mocks ---
// Mock the actual query composables this factory function delegates to
vi.mock('@/composables/queries/useDistrictsQuery', () => ({
  default: vi.fn(() => 'useDistrictsQuery'), // Return string for easy assertion
}));
vi.mock('@/composables/queries/useSchoolsQuery', () => ({
  default: vi.fn(() => 'useSchoolsQuery'),
}));
vi.mock('@/composables/queries/useClassesQuery', () => ({
  default: vi.fn(() => 'useClassesQuery'),
}));
vi.mock('@/composables/queries/useGroupsQuery', () => ({
  default: vi.fn(() => 'useGroupsQuery'),
}));
vi.mock('@/composables/queries/useFamiliesQuery', () => ({
  default: vi.fn(() => 'useFamiliesQuery'),
}));

// --- Types ---
// Define OrgType based on SINGULAR_ORG_TYPES constant if possible,
// or use string if the constant's type isn't easily accessible/defined
type OrgType = keyof typeof SINGULAR_ORG_TYPES | string; // Allow any string for error case

// --- Tests ---
describe('useOrgQuery', () => {
  // No QueryClient needed as we are not testing vue-query integration here

  it('should return useDistrictsQuery for districts as org type', () => {
    const mockOrgType: OrgType = SINGULAR_ORG_TYPES.DISTRICTS;
    const mockOrgIds: Ref<string[]> = ref([nanoid(), nanoid()]);
    const result = useOrgQuery(mockOrgType, mockOrgIds);
    expect(result).toBe('useDistrictsQuery');
  });

  it('should return useSchoolsQuery for schools as org type', () => {
    const mockOrgType: OrgType = SINGULAR_ORG_TYPES.SCHOOLS;
    const mockOrgIds: Ref<string[]> = ref([nanoid(), nanoid()]);
    const result = useOrgQuery(mockOrgType, mockOrgIds);
    expect(result).toBe('useSchoolsQuery');
  });

  it('should return useClassesQuery for classes as org type', () => {
    const mockOrgType: OrgType = SINGULAR_ORG_TYPES.CLASSES;
    const mockOrgIds: Ref<string[]> = ref([nanoid(), nanoid()]);
    const result = useOrgQuery(mockOrgType, mockOrgIds);
    expect(result).toBe('useClassesQuery');
  });

  it('should return useGroupsQuery for groups as org type', () => {
    const mockOrgType: OrgType = SINGULAR_ORG_TYPES.GROUPS;
    const mockOrgIds: Ref<string[]> = ref([nanoid(), nanoid()]);
    const result = useOrgQuery(mockOrgType, mockOrgIds);
    expect(result).toBe('useGroupsQuery');
  });

  it('should return useFamiliesQuery for families as org type', () => {
    const mockOrgType: OrgType = SINGULAR_ORG_TYPES.FAMILIES;
    const mockOrgIds: Ref<string[]> = ref([nanoid(), nanoid()]);
    const result = useOrgQuery(mockOrgType, mockOrgIds);
    expect(result).toBe('useFamiliesQuery');
  });

  it('should throw an error for unsupported org type', () => {
    const mockOrgType: OrgType = 'UNSUPPORTED';
    const mockOrgIds: Ref<string[]> = ref([nanoid(), nanoid()]);
    // Assert that calling the function throws the expected error
    expect(() => useOrgQuery(mockOrgType, mockOrgIds)).toThrow('Unsupported org type: UNSUPPORTED');
  });
}); 