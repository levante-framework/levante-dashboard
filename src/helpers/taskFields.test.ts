import { describe, expect, it } from 'vitest';
import {
  buildUpsertTaskPayload,
  createEmptyDynamicField,
  createEmptyTaskData,
  getFieldTypePlaceholder,
  hasRequiredUserTypes,
  inferArrayItemType,
  isValidUserTypes,
  mapTaskToFormData,
  normalizeUserTypes,
  taskIdExists,
} from '@/helpers/taskFields';

describe('taskFields helpers', () => {
  it('creates empty task data with default values', () => {
    expect(createEmptyTaskData()).toEqual({
      taskName: '',
      taskId: '',
      taskURL: '',
      registered: true,
      userTypes: [],
      taskImage: '',
      taskDescription: '',
    });
  });

  it('builds upsert task payload for the server', () => {
    expect(
      buildUpsertTaskPayload({
        taskName: ' My Task ',
        taskId: ' task-1 ',
        taskDescription: ' A description ',
        taskImage: ' https://example.com/image.png ',
        taskURL: ' https://example.com/task ',
        userTypes: ['student', 'teacher', 'student'],
      }),
    ).toEqual({
      name: 'My Task',
      id: 'task-1',
      description: 'A description',
      image: 'https://example.com/image.png',
      taskUrl: 'https://example.com/task',
      userTypes: ['student', 'teacher'],
      registered: true,
    });
  });

  it('maps server task fields to form data', () => {
    expect(
      mapTaskToFormData({
        id: 'task-1',
        name: 'Server Task',
        description: 'Server description',
        image: 'image.png',
        taskUrl: 'https://example.com',
        userTypes: ['caregiver'],
      }),
    ).toEqual({
      taskName: 'Server Task',
      taskId: 'task-1',
      taskDescription: 'Server description',
      taskImage: 'image.png',
      taskURL: 'https://example.com',
      userTypes: ['caregiver'],
      registered: true,
    });
  });

  it('detects duplicate task ids', () => {
    expect(taskIdExists([{ id: 'task-1' }], 'task-1')).toBe(true);
    expect(taskIdExists([{ id: 'task-1' }], ' task-1 ')).toBe(true);
    expect(taskIdExists([{ id: 'task-1' }], 'task-2')).toBe(false);
  });

  it('requires at least one valid user type', () => {
    expect(hasRequiredUserTypes(['student'])).toBe(true);
    expect(hasRequiredUserTypes([])).toBe(false);
    expect(hasRequiredUserTypes(['invalid'])).toBe(false);
  });
  it('creates empty array dynamic fields with default item type', () => {
    expect(createEmptyDynamicField('array')).toEqual({
      name: '',
      type: 'array',
      itemType: 'string',
      value: [],
    });
  });

  it('infers array item types from existing values', () => {
    expect(inferArrayItemType(['a', 'b'])).toBe('string');
    expect(inferArrayItemType([1, 2])).toBe('number');
    expect(inferArrayItemType([true, false])).toBe('boolean');
    expect(inferArrayItemType([])).toBe('string');
  });

  it('returns array placeholder for array values', () => {
    expect(getFieldTypePlaceholder(['a'])).toBe('array');
    expect(getFieldTypePlaceholder('hello')).toBe('string');
  });

  it('normalizes user types and removes duplicates', () => {
    expect(normalizeUserTypes(['student', 'teacher', 'student', 'invalid'])).toEqual(['student', 'teacher']);
  });

  it('validates user types', () => {
    expect(isValidUserTypes(['caregiver', 'student'])).toBe(true);
    expect(isValidUserTypes(['caregiver', 'caregiver'])).toBe(false);
    expect(isValidUserTypes(['admin'])).toBe(false);
  });
});
