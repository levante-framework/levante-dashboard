import { ref, Ref, type MaybeRef, unref } from 'vue';

interface QueryOptions {
  enabled?: MaybeRef<boolean>;
  [key: string]: any;
}

/**
 * Represents a condition function that returns a boolean.
 * Can be a simple function or one returning a MaybeRef<boolean>.
 */
export type Condition = () => MaybeRef<boolean>;

interface QueryOverrides {
  isQueryEnabled: Ref<boolean>;
  options: QueryOptions;
}

/**
 * Computes query overrides based on conditions and existing query options
 * @param conditions - Array of boolean values or functions that return boolean values
 * @param queryOptions - Optional query options object
 * @returns Object containing isQueryEnabled ref and filtered options
 */
export const computeQueryOverrides = (
  conditions: Condition[],
  queryOptions?: QueryOptions
): QueryOverrides => {
  const isQueryEnabled = ref(
    conditions.every((condition) => {
      if (typeof condition === 'function') {
        return condition();
      }
      return condition;
    })
  );

  if (queryOptions?.enabled === false) {
    isQueryEnabled.value = false;
  }

  const { enabled, ...options } = queryOptions || {};

  return {
    isQueryEnabled,
    options,
  };
}; 