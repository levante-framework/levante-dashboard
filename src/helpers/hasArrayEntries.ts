import { toValue, MaybeRefOrGetter } from 'vue';

/**
 * Test if an array has entries that are valid non-empty strings.
 *
 * @param {MaybeRefOrGetter<any[]>} arrayRefOrGetter – The array (or ref/getter) to check for entries.
 * @returns {boolean} Whether the array contains at least one non-empty string.
 */
export const hasArrayEntries = (arrayRefOrGetter: MaybeRefOrGetter<any[]>): boolean => {
  const value = toValue(arrayRefOrGetter);
  // Check if it's an array and if it contains at least one element that is a non-empty string
  return Array.isArray(value) && value.some(item => typeof item === 'string' && item.length > 0);
};
