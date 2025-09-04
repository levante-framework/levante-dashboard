### Survey Customization (SurveyJS Themes & Styles)

This guide explains how to add and manage SurveyJS themes and styles in the LEVANTE Dashboard without changing any existing logic. It shows where to hook theme application in our flow, how to switch themes at runtime, and how to use custom theme JSON and CSS class mappings.

### Overview
- Surveys are rendered using SurveyJS `SurveyModel` and `SurveyComponent`.
- We create the `SurveyModel` in `HomeParticipant.vue`, then render it in `UserSurvey.vue`.
- Theme application is a one-liner: `surveyInstance.applyTheme(themeObject)` right after model creation.

### Where the Survey Model Is Created
- The ideal hook to apply or re-apply a theme is immediately after we instantiate the model.

```469:475:src/pages/HomeParticipant.vue
function createSurveyInstance(surveyDataToStartAt) {
  settings.lazyRender = true;
  const surveyInstance = new Model(surveyDataToStartAt);
  // surveyInstance.showNavigationButtons = 'none';
  surveyInstance.locale = getParsedLocale(locale.value);
  return surveyInstance;
}
```

- After `const surveyInstance = new Model(...)`, you can call `surveyInstance.applyTheme(...)`.

### Base Styles Prerequisite
- The SurveyJS core stylesheet is already imported in the survey page.

```1:3:src/pages/UserSurvey.vue
<script setup>
import 'survey-core/survey-core.css';
import { SurveyComponent } from 'survey-vue3-ui';
```

No changes needed to use themes.

### Apply a Predefined Theme
- Import any SurveyJS theme from `survey-core/themes` and apply it to the model.
- Example (Layered Dark Panelless):

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

### Use a Custom Theme (Theme Editor)
- Open the SurveyJS Theme Editor (available inside Survey Creator), configure your theme, and export JSON.
- Save it locally (e.g., `src/helpers/survey-theme.json`) or as a TS module.
- Apply it exactly like a predefined theme:

```ts
import customTheme from '@/helpers/survey-theme.json';

surveyStore.survey?.applyTheme(customTheme);
```

Custom themes support options like `cssVariables`, `themeName`, `colorPalette` (e.g., `dark`), and `isPanelless`.

### Apply Custom CSS Classes
- For fine-grained control, assign a CSS mapping to `surveyInstance.css`.
- The mapping shape follows SurveyJS `defaultCss` (see `defaultCss.ts` in SurveyJS).

```ts
const myCss = {
  root: 'my-survey',
  navigation: { complete: 'my-complete-btn' },
  // ... add classes for pages, panels, questions, errors, etc.
};

surveyStore.survey!.css = myCss;
```

Use this to inject Tailwind/utility classes for specific elements.

### Dark Mode
- Our app theme already supports a dark mode selector via PrimeVue. You can:
  - Apply a dark SurveyJS theme when dark mode is active, or
  - Re-apply the corresponding light/dark theme when the mode toggles.

```ts
surveyStore.survey?.applyTheme(isDark ? DarkThemeObject : LightThemeObject);
```

### Files and Responsibilities
- `src/pages/HomeParticipant.vue`
  - Creates the `SurveyModel` (`createSurveyInstance(...)`) — best place to call `applyTheme(...)`.
  - Initializes and wires events; theme application does not interfere with events or audio.
- `src/pages/UserSurvey.vue`
  - Imports the SurveyJS base stylesheet and renders `<SurveyComponent :model="surveyStore.survey" />`.
- `src/helpers/surveyInitialization.ts`
  - Restores responses, handles audio for students, registers survey event handlers. Theme application is independent of these concerns.
- `src/store/survey.js`
  - Holds the `SurveyModel` instance (`markRaw`), flags, and page counts; safe to call `applyTheme` on `surveyStore.survey` at any time after creation.

### Survey JSON Source (for context)
- Survey JSON files are stored in the GCS assets bucket under `surveys/` and fetched at runtime [[levante-assets-dev]].
  - Student: `child_survey.json`
  - Teacher: `teacher_survey_general.json`, `teacher_survey_classroom.json`
  - Parent: `parent_survey_family.json`, `parent_survey_child.json`

### Useful Links
- SurveyJS Themes (predefined): [survey-core/themes on GitHub](https://github.com/surveyjs/survey-library/tree/master/packages/survey-core/src/themes)
- Theme Editor: [SurveyJS Theme Editor (via Survey Creator)](https://surveyjs.io/create-survey) → Themes tab → Export JSON
- Default CSS mapping reference: [defaultCss.ts](https://github.com/surveyjs/survey-library/blob/master/packages/survey-core/src/defaultCss/defaultV2Css.ts)

### TL;DR
- Apply once after model creation: `surveyInstance.applyTheme(themeObject)`.
- Store and re-apply themes at runtime via `surveyStore.survey?.applyTheme(...)`.
- Use Theme Editor JSON for custom themes; assign `surveyInstance.css` for class-level overrides.
