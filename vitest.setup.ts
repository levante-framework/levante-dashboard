import { config } from '@vue/test-utils';
import { vi } from 'vitest';
// @ts-expect-error - Linter struggles with resolving .ts file via alias here, but build/tests work
import { languageOptions } from '@/translations/i18n';

const locale = 'en';
// ... existing code ...
