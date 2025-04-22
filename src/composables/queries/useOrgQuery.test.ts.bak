import { ref, type Ref } from 'vue';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nanoid } from 'nanoid';
import useOrgQuery from './useOrgQuery';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';
import { type UseQueryReturnType } from '@tanstack/vue-query';

// --- Mocks ---
// Mock the actual query composables this factory function delegates to
const mockUseDistrictsQuery = vi.fn(() => ({ mockResult: 'useDistrictsQuery' } as unknown as UseQueryReturnType<any, Error>));
const mockUseSchoolsQuery = vi.fn(() => ({ mockResult: 'useSchoolsQuery' } as unknown as UseQueryReturnType<any, Error>));
const mockUseClassesQuery = vi.fn(() => ({ mockResult: 'useClassesQuery' } as unknown as UseQueryReturnType<any, Error>));
const mockUseGroupsQuery = vi.fn(() => ({ mockResult: 'useGroupsQuery' } as unknown as UseQueryReturnType<any, Error>));
const mockUseFamiliesQuery = vi.fn(() => ({ mockResult: 'useFamiliesQuery' } as unknown as UseQueryReturnType<any, Error>));

// No need to mock vue-query here, just the delegates
vi.mock('@/composables/queries/useDistrictsQuery', () => ({ default: mockUseDistrictsQuery }));
vi.mock('@/composables/queries/useSchoolsQuery', () => ({ default: mockUseSchoolsQuery }));
vi.mock('@/composables/queries/useClassesQuery', () => ({ default: mockUseClassesQuery }));
vi.mock('@/composables/queries/useGroupsQuery', () => ({ default: mockUseGroupsQuery }));
vi.mock('@/composables/queries/useFamiliesQuery', () => ({ default: mockUseFamiliesQuery }));

// --- Types ---
// Adjusted type based on composable implementation
type OrgTypeKey = typeof FIRESTORE_COLLECTIONS[keyof Pick<
    typeof FIRESTORE_COLLECTIONS, 
    'DISTRICTS' | 'SCHOOLS' | 'CLASSES' | 'GROUPS' | 'FAMILIES'
>];

// --- Tests ---
describe('useOrgQuery', () => {

  beforeEach(() => {
      vi.clearAllMocks(); // Clear mocks before each test
  });

  it('should call useDistrictsQuery for districts org type', () => {
    const mockOrgType: OrgTypeKey = FIRESTORE_COLLECTIONS.DISTRICTS;
    const mockOrgIds: Ref<string[]> = ref([nanoid(), nanoid()]);
    const result = useOrgQuery(mockOrgType, mockOrgIds);
    expect(mockUseDistrictsQuery).toHaveBeenCalled();
    // Assert based on the structure returned by the mock
    expect((result as any).mockResult).toBe('useDistrictsQuery');
  });

  it('should call useSchoolsQuery for schools org type', () => {
    const mockOrgType: OrgTypeKey = FIRESTORE_COLLECTIONS.SCHOOLS;
    const mockOrgIds: Ref<string[]> = ref([nanoid(), nanoid()]);
    const result = useOrgQuery(mockOrgType, mockOrgIds);
    expect(mockUseSchoolsQuery).toHaveBeenCalled();
    expect((result as any).mockResult).toBe('useSchoolsQuery');
  });

  it('should call useClassesQuery for classes org type', () => {
    const mockOrgType: OrgTypeKey = FIRESTORE_COLLECTIONS.CLASSES;
    const mockOrgIds: Ref<string[]> = ref([nanoid(), nanoid()]);
    const result = useOrgQuery(mockOrgType, mockOrgIds);
    expect(mockUseClassesQuery).toHaveBeenCalled();
    expect((result as any).mockResult).toBe('useClassesQuery');
  });

  it('should call useGroupsQuery for groups org type', () => {
    const mockOrgType: OrgTypeKey = FIRESTORE_COLLECTIONS.GROUPS;
    const mockOrgIds: Ref<string[]> = ref([nanoid(), nanoid()]);
    const result = useOrgQuery(mockOrgType, mockOrgIds);
    expect(mockUseGroupsQuery).toHaveBeenCalled();
    expect((result as any).mockResult).toBe('useGroupsQuery');
  });

  it('should call useFamiliesQuery for families org type', () => {
    const mockOrgType: OrgTypeKey = FIRESTORE_COLLECTIONS.FAMILIES;
    const mockOrgIds: Ref<string[]> = ref([nanoid(), nanoid()]);
    const result = useOrgQuery(mockOrgType, mockOrgIds);
    expect(mockUseFamiliesQuery).toHaveBeenCalled();
    expect((result as any).mockResult).toBe('useFamiliesQuery');
  });

  it('should throw an error for unsupported org type', () => {
    const mockOrgType = 'UNSUPPORTED' as any; 
    const mockOrgIds: Ref<string[]> = ref([nanoid(), nanoid()]);
    expect(() => useOrgQuery(mockOrgType, mockOrgIds)).toThrow('Unsupported org type: UNSUPPORTED');
  });
}); 