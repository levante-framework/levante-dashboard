# LEVANTE Dashboard

levante-dashboard serves as the participant and administrator dashboard for LEVANTE (LEarning VAriability NeTwork Exchange) platform.

This project is a fork of ROAR, with additional support for the Levante environment.

## NPM Scripts for LEVANTE are listed in [package.json](./package.json)

```shell
npm install          # also installs the Biome pre-commit hook via husky
npm run check        # same check CI runs
npm run check:fix  # auto-fix format issues
```

Pre-commit runs `lint-staged` → `biome check --write` on staged files so format
mismatches are fixed before they hit CI.

## Legacy Data Flow Diagram from ROAR

See the legacy [ROAR/ROAD Data Flow Diagram here](https://miro.com/app/board/uXjVNY-_qDA=/?share_link_id=967374624080).

---

## Localization

Translations are served from a remote bucket (see `LEVANTE_TRANSLATIONS` in [`src/constants/bucket.ts`](./src/constants/bucket.ts)) and loaded at runtime by [`src/translations/i18n.ts`](./src/translations/i18n.ts). The dashboard does not bundle local translation files.

## Survey PDF generation

A helper is available to create PDFs from SurveyJS JSON:

- [`src/helpers/surveyPdfGenerator.ts`](./src/helpers/surveyPdfGenerator.ts)

See usage notes and examples in [`README_SURVEY_PDF.md`](./README_SURVEY_PDF.md) (if present), or integrate the helper by importing it and passing the Survey JSON you wish to export. The helper avoids UI changes and can be called from admin-only flows or scripts.
