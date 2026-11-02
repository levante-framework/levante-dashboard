/**
 * Dropdown codes are library names ∩ Zod ISO 639-1. Do not edit the name
 * library. To hide a library language, delete its code from levante-zod
 * `iso6391-alpha2.json`; the filter below drops it (same as `bh`).
 *
 * To add a code the library does not name: put it in that JSON first (server
 * accepts it), then append `{ value, label }` above Other. This loop will not
 * pick it up until the library has an English name.
 *
 * TODO(survey overhaul): derive which langs/*.json files to register from the
 * locales in languageoptions.json, then resolve labels from the active UI
 * locale with an English fallback.
 */
import isoLanguages from '@cospired/i18n-iso-languages';
import en from '@cospired/i18n-iso-languages/langs/en.json';
import { Iso6391Alpha2Schema, LANGUAGE_OTHER } from '@levante-framework/levante-zod';

isoLanguages.registerLocale(en);

export const languageSelectionOptions = [
  ...Object.entries(isoLanguages.getNames('en'))
    .filter(([code]) => Iso6391Alpha2Schema.safeParse(code).success)
    .map(([value, label]) => ({ value, label }))
    .sort((left, right) => left.label.localeCompare(right.label, 'en')),
  { value: LANGUAGE_OTHER, label: 'Other (Describe)' },
];
