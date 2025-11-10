# Survey Locale Override Patch

## Overview

Surveys are now fetched with locale-aware fallbacks so we can serve different JSON definitions to specific regions (e.g. a Colombia-specific caregiver survey) without breaking existing assignments.

## Key Changes

- Added `fetchSurveyDefinition()` in `src/helpers/survey.ts`
  - Tries `${baseName}.${locale}.json`, then `${baseName}.${language}.json`, and finally `${baseName}.json`
  - Continues to throw on non-404 errors so we preserve existing error handling

- Updated `HomeParticipant.vue` survey query
  - Uses `fetchSurveyDefinition()` for student/teacher/parent survey loads
  - Existing audio loading still uses the same locale fallback logic

- No API changes required; only the storage bucket contents need the locale-specific JSON files.
  - Example bucket layout:
    - `surveys/parent_survey_family.json` (default)
    - `surveys/parent_survey_family.es-co.json` (Colombia override)

## Rollout Notes

- Upload regional survey variants before deploying so the fallback order already has the new files
- Existing assignments keep pointing to the same survey `taskId`; they automatically use the appropriate JSON at runtime
- If a locale override is missing, users fall back to the default survey data

