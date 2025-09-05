### Survey Customization (SurveyJS Themes & Styles)

This guide explains how to add and manage SurveyJS themes and styles in the LEVANTE Dashboard without changing any existing logic. It shows where to hook theme application in our flow, how to switch themes at runtime, and how to use custom theme JSON and CSS class mappings.

### Overview
- Surveys are rendered using SurveyJS `SurveyModel` and `SurveyComponent`.
- We create the `SurveyModel` in `HomeParticipant.vue`, then render it in `UserSurvey.vue`.
- Theme application is a one-liner: `surveyInstance.applyTheme(themeObject)` right after model creation.

### Current baseline in the app
- We use SurveyJS Default V2 CSS + a Levante-like theme and small CSS overrides.
- Theme source: `src/helpers/surveyTheme.ts` (export `levanteLikeTheme`).
- CSS overrides: `src/styles/survey-levante.css`.
- Applied when the model is created.

```470:479:src/pages/HomeParticipant.vue
function createSurveyInstance(surveyDataToStartAt) {
  settings.lazyRender = true;
  const surveyInstance = new Model(surveyDataToStartAt);

  // Apply Levante-like theme and SurveyJS Default V2 look
  surveyInstance.applyTheme(levanteLikeTheme);

  // surveyInstance.showNavigationButtons = 'none';
  surveyInstance.locale = getParsedLocale(locale.value);
  return surveyInstance;
}
```

### Base Styles Prerequisite
- The SurveyJS Default V2 stylesheet and our overrides are imported in the survey page.

```1:6:src/pages/UserSurvey.vue
<script setup>
import 'survey-core/survey-core.css';
import '@/styles/survey-levante.css';
import { SurveyComponent } from 'survey-vue3-ui';
```

### Apply a Predefined or Custom Theme
- Import any SurveyJS theme or your own JSON/TS theme and apply it to the model immediately after creation.

```ts
import { Model } from 'survey-core';
import { LayeredDarkPanelless } from 'survey-core/themes';

const survey = new Model(json);
survey.applyTheme(LayeredDarkPanelless);
```

Where to place this in our app: in `createSurveyInstance(...)` right after model creation (see excerpt above).

### Switch Between Themes at Runtime
To allow runtime switching (e.g., user setting or dark mode):
- Store the selected theme in Pinia (or a composable).
- When it changes, call:

```ts
import { ContrastLight } from 'survey-core/themes';
import { ContrastDark } from 'survey-core/themes';

// switch at runtime
surveyStore.survey?.applyTheme(isDark ? ContrastDark : ContrastLight);
```

This updates the UI without re-mounting `SurveyComponent`.

### Localization of UI chrome (Next, Previous, messages)
- Use SurveyJS localization dictionaries. We provide a helper to register an external dictionary in one call:
- Helper: `src/helpers/surveyLocale.ts` → `registerSurveyLocale({ localeCode, strings, fallbackLocale })`.

```ts
import { registerSurveyLocale } from '@/helpers/surveyLocale';
// customLocaleStrings = your external dictionary object (fetched or bundled)
registerSurveyLocale({
  localeCode: 'custom',
  strings: customLocaleStrings,
  fallbackLocale: 'en',
});

// When creating the model
surveyInstance.locale = 'custom';
```

### Localization of survey content (titles, descriptions, choices)
- Provide per-locale values directly in the survey JSON using object values keyed by locale code, with `default` as fallback.
- Or merge an external translation map into the survey JSON at runtime before instantiating the model, then set `surveyInstance.locale`.

### Apply Custom CSS Classes (optional)
- For fine-grained control, assign a CSS mapping to `surveyInstance.css`.

```ts
const myCss = {
  root: 'my-survey',
  navigation: { complete: 'my-complete-btn' },
};

surveyStore.survey!.css = myCss;
```

### Dark Mode
- Our app theme supports a dark mode selector via PrimeVue. You can:
  - Apply a dark SurveyJS theme when dark mode is active, or
  - Re-apply the corresponding light/dark theme when the mode toggles.

```ts
surveyStore.survey?.applyTheme(isDark ? DarkThemeObject : LightThemeObject);
```

### Files and Responsibilities
- `src/pages/HomeParticipant.vue`
  - Creates the `SurveyModel` (`createSurveyInstance(...)`) — best place to call `applyTheme(...)` and set `surveyInstance.locale`.
  - Initializes and wires events; theme application is independent of events/audio.
- `src/pages/UserSurvey.vue`
  - Imports SurveyJS base stylesheet and renders `<SurveyComponent :model="surveyStore.survey" />`.
- `src/helpers/surveyInitialization.ts`
  - Restores responses, handles audio for students, registers survey event handlers.
- `src/store/survey.js`
  - Holds the `SurveyModel` instance (`markRaw`), flags, and page counts; safe to call `applyTheme` on `surveyStore.survey` any time after creation.

### Survey JSON Source (for context)
- Survey JSON files are stored in the GCS assets bucket under `surveys/` and fetched at runtime.
  - Student: `child_survey.json`
  - Teacher: `teacher_survey_general.json`, `teacher_survey_classroom.json`
  - Parent: `parent_survey_family.json`, `parent_survey_child.json`

### Preview locally (how to test run the survey)
- Start the app:
  - With emulator: `npm run dev`
  - Without emulator: `npm run dev:db`
- Sign in as a participant (student/parent/teacher) with a current administration that includes the `survey` task.
- Open the administration; the Survey renders in the survey tab with the Levante-like theme.
- If you lack seed data, ask a teammate for a test account or request a temporary dev preview route to mount a sample survey JSON.

### Useful Links
- SurveyJS Themes (predefined): https://github.com/surveyjs/survey-library/tree/master/packages/survey-core/src/themes
- Theme Editor: https://surveyjs.io/create-survey → Themes tab → Export JSON
- Default CSS mapping reference: https://github.com/surveyjs/survey-library/blob/master/packages/survey-core/src/defaultCss/defaultV2Css.ts

### TL;DR
- Apply once after model creation: `surveyInstance.applyTheme(themeObject)`.
- Import `defaultV2.min.css` and our overrides in `UserSurvey.vue`.
- Load UI chrome translations via `registerSurveyLocale(...)`; put content translations in the survey JSON.
- Re-apply themes at runtime via `surveyStore.survey?.applyTheme(...)`.
