# Data Contract Change Checklist

Use this checklist for any PR that can change data written/read by downstream systems (`levante-firebase-functions`, Redivis, `levante-pilots`).

## 1) Scope and impact

- Confirm whether this PR changes any of:
  - Firestore paths, document IDs, key scopes, cardinality
  - field names, field types, required/optional status
  - locale-dependent values that become persisted/exported
- Document impacted entities (`surveyResponses`, `assignments`, `runs`, `trials`) and impacted downstream tables/scripts.

## 2) Contract validation evidence

- Run upstream checks and attach output:
  - `npm run contract:check` (in `levante-firebase-functions`)
  - `npx vitest run "__tests__/save-survey-results.contract.test.ts"` (in `levante-firebase-functions`)
- Run downstream fixture validation and attach output:
  - `Rscript schema_tools/pipeline-contract/validate_fixture_contracts.R` (in `levante-platform`)
  - `Rscript schema_tools/pipeline-contract/validate_stage02_contracts.R` (in `levante-platform`)
  - `Rscript schema_tools/pipeline-contract/validate_stage03_contracts.R` (in `levante-platform`)
  - `Rscript schema_tools/pipeline-contract/validate_stage03_explore_contracts.R` (in `levante-platform`)
  - `Rscript schema_tools/pipeline-contract/validate_stage04_papers_contracts.R` (in `levante-platform`)

## 3) Cardinality and key safety

- Confirm key uniqueness/cardinality assumptions remain valid:
  - `users/{uid}/surveyResponses/{administrationId}` remains one doc per user+administration
  - no new collisions introduced in IDs or composite keys
- If key behavior changed, include migration/backfill strategy before merge.

## 4) Rollout and compatibility

- Describe backward compatibility behavior for old/new data during rollout.
- If validation is temporarily in warn-mode, define date/PR where it becomes blocking.

## 5) PR evidence links

- Link to CI run for `Pipeline Contract Compatibility`.
- Link to any migration PR/runbook if applicable.
