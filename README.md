# LEVANTE Dashboard

levante-dashboard serves as the participant and administrator dashboard for LEVANTE (LEarning VAriability NeTwork Exchange) platform.

This project is a fork of ROAR, with additional support for the Levante environment.

## NPM Scripts for LEVANTE are listed in [package.json](./package.json)

## Legacy Data Flow Diagram from ROAR

See the legacy [ROAR/ROAD Data Flow Diagram here](https://miro.com/app/board/uXjVNY-_qDA=/?share_link_id=967374624080).

---

## Localization and Crowdin integration

The dashboard’s translations are managed via multilingual CSVs synced with Crowdin (project `levantetranslations`). Locally, CSVs are transformed at build-time into per-locale JSON files that the app consumes.

Structure:
- Crowdin config: [`src/translations/crowdin/crowdin.yml`](./src/translations/crowdin/crowdin.yml)
- Consolidated CSV sources: [`src/translations/consolidated/`](./src/translations/consolidated/) and [`./components`](./src/translations/consolidated/components/)
- Build tools: [`src/translations/tools/`](./src/translations/tools/)
  - [`csv-to-json.js`](./src/translations/tools/csv-to-json.js): CSV → per-locale JSON (runs during dev/build)

Key scripts (see [`package.json`](./package.json)):
- Crowdin upload/download: 
`npm run i18n:crowdin:upload`, 
`npm run i18n:crowdin:download`


Deploying translations to GCS (dev bucket):
- Upload current `src/translations` (excluding tools, README_CROWDIN.md, and .ts files) to `gs://levante-assets-dev/translations/dashboard`:
  - `npm run i18n:upload:dev`
- One-shot download from Crowdin, rebuild JSON, then upload to dev bucket:
  - `npm run i18n:download-upload:dev`

Notes:

