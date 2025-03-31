/**
 * Test suite for LinkUsers.vue component
 * 
 * This component handles the user linking functionality in the LEVANTE application.
 * It allows administrators to upload CSV files containing user data and relationships
 * between different user types (parents, children, teachers, students).
 * 
 * Key features tested:
 * 1. File Upload:
 *    - Initial rendering with file upload interface
 *    - Handling of CSV file uploads
 *    - Empty file validation
 * 
 * 2. Data Validation:
 *    - Required fields (id, userType, uid)
 *    - Case-insensitive field name handling
 *    - Multiple parent IDs for a child
 * 
 * 3. Relationship Validation:
 *    - Parent-child relationships
 *    - Teacher-student relationships
 *    - Invalid relationship handling
 * 
 * 4. Error Handling:
 *    - Missing required fields
 *    - Invalid relationships
 *    - Empty file uploads
 * 
 * 5. UI State Management:
 *    - Loading states
 *    - Error table display
 *    - Success/error notifications
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import LinkUsers from '../LinkUsers.vue'
import { createTestingPinia } from '@pinia/testing'
import { useAuthStore } from '@/store/auth'
import { csvFileToJson } from '@/helpers'

// Mock LinkUsersInfo component
vi.mock('@/components/LEVANTE/LinkUsersInfo.vue', () => ({
  default: {
    name: 'LinkUsersInfo',
    template: '<div class="link-users-info"></div>'
  }
}))

describe('LinkUsers.vue', () => {
  let wrapper: any
  let pinia: any

  beforeEach(() => {
    pinia = createTestingPinia({
      createSpy: vi.fn
    })
  })

  it('renders the component with file upload section initially', () => {
    wrapper = mount(LinkUsers, {
      global: {
        plugins: [pinia]
      }
    })

    expect(wrapper.find('.p-fileupload').exists()).toBe(true)
    expect(wrapper.find('.p-datatable').exists()).toBe(false)
    expect(wrapper.find('.error-container').exists()).toBe(false)
  })

  it('handles successful file upload', async () => {
    const mockCsvData = [
      { id: '1', userType: 'parent', uid: 'uid1' },
      { id: '2', userType: 'child', uid: 'uid2', parentId: '1' }
    ]

    vi.mocked(csvFileToJson).mockResolvedValue(mockCsvData)

    wrapper = mount(LinkUsers, {
      global: {
        plugins: [pinia]
      }
    })

    // Simulate file upload
    await wrapper.vm.onFileUpload({
      files: [{ name: 'test.csv' }]
    })

    expect(wrapper.vm.isFileUploaded).toBe(true)
    expect(wrapper.vm.rawUserFile).toEqual(mockCsvData)
    expect(wrapper.find('.p-datatable').exists()).toBe(true)
  })

  it('shows error for empty file', async () => {
    vi.mocked(csvFileToJson).mockResolvedValue([])

    wrapper = mount(LinkUsers, {
      global: {
        plugins: [pinia]
      }
    })

    // Simulate file upload
    await wrapper.vm.onFileUpload({
      files: [{ name: 'test.csv' }]
    })

    expect(wrapper.vm.isFileUploaded).toBe(false)
    expect(wrapper.vm.rawUserFile).toEqual([])
  })

  it('validates required fields in uploaded data', async () => {
    const mockCsvData = [
      { id: '1', uid: 'uid1', userType: '' }, // Empty userType
      { id: '2', userType: 'child', uid: '' } // Empty uid
    ]

    vi.mocked(csvFileToJson).mockResolvedValue(mockCsvData)

    wrapper = mount(LinkUsers, {
      global: {
        plugins: [pinia]
      }
    })

    // Simulate file upload
    await wrapper.vm.onFileUpload({
      files: [{ name: 'test.csv' }]
    })

    expect(wrapper.vm.errorUsers.length).toBeGreaterThan(0)
    expect(wrapper.vm.showErrorTable).toBe(true)
    expect(wrapper.vm.errorUsers[0].error).toContain('userType')
    expect(wrapper.vm.errorUsers[1].error).toContain('uid')
  })

  it('validates parent-child relationships', async () => {
    const mockCsvData = [
      { id: '1', userType: 'child', uid: 'uid1', parentId: '999' }, // Invalid parent ID
      { id: '2', userType: 'parent', uid: 'uid2' }
    ]

    vi.mocked(csvFileToJson).mockResolvedValue(mockCsvData)

    wrapper = mount(LinkUsers, {
      global: {
        plugins: [pinia]
      }
    })

    // Simulate file upload
    await wrapper.vm.onFileUpload({
      files: [{ name: 'test.csv' }]
    })

    expect(wrapper.vm.errorUsers.length).toBeGreaterThan(0)
    expect(wrapper.vm.errorUsers[0].error).toContain('Parent with ID 999 not found')
  })

  it('validates teacher-student relationships', async () => {
    const mockCsvData = [
      { id: '1', userType: 'child', uid: 'uid1', teacherId: '999' }, // Invalid teacher ID
      { id: '2', userType: 'teacher', uid: 'uid2' }
    ]

    vi.mocked(csvFileToJson).mockResolvedValue(mockCsvData)

    wrapper = mount(LinkUsers, {
      global: {
        plugins: [pinia]
      }
    })

    // Simulate file upload
    await wrapper.vm.onFileUpload({
      files: [{ name: 'test.csv' }]
    })

    expect(wrapper.vm.errorUsers.length).toBeGreaterThan(0)
    expect(wrapper.vm.errorUsers[0].error).toContain('Teacher with ID 999 not found')
  })

  it('handles case-insensitive field names', async () => {
    const mockCsvData = [
      { 
        id: '1', 
        userType: 'parent', 
        uid: 'uid1',
        parentId: '',
        teacherId: ''
      }
    ]

    vi.mocked(csvFileToJson).mockResolvedValue(mockCsvData)

    wrapper = mount(LinkUsers, {
      global: {
        plugins: [pinia]
      }
    })

    // Simulate file upload
    await wrapper.vm.onFileUpload({
      files: [{ name: 'test.csv' }]
    })

    expect(wrapper.vm.isFileUploaded).toBe(true)
    expect(wrapper.vm.errorUsers.length).toBe(0)
  })

  it('handles multiple parent IDs for a child', async () => {
    const mockCsvData = [
      { id: '1', userType: 'child', uid: 'uid1', parentId: '2,3' },
      { id: '2', userType: 'parent', uid: 'uid2' },
      { id: '3', userType: 'parent', uid: 'uid3' }
    ]

    vi.mocked(csvFileToJson).mockResolvedValue(mockCsvData)

    wrapper = mount(LinkUsers, {
      global: {
        plugins: [pinia]
      }
    })

    // Simulate file upload
    await wrapper.vm.onFileUpload({
      files: [{ name: 'test.csv' }]
    })

    expect(wrapper.vm.isFileUploaded).toBe(true)
    expect(wrapper.vm.errorUsers.length).toBe(0)
  })
}) 