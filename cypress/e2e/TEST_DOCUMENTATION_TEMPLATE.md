# E2E Test Documentation Template

Use this template to document your E2E tests. Copy the comment block below into the top of your test file (after imports if needed).

## Template Comment Block

```typescript
/**
 * @fileoverview [Test Name]: [Brief Description]
 *
 * @description
 * [Detailed description of what this test verifies, including any business logic
 * or user workflows being tested.]
 *
 * @test-id [test-id-from-e2eCatalog]
 * @category [bugs|tasks]
 * @github-issue [issue-number-if-applicable]
 *
 * @setup
 * [Describe any setup requirements:
 * - Does the test auto-bootstrap data?
 * - Does it require specific users/sites to exist?
 * - Does it seed its own data?
 * - Any manual setup steps needed?]
 *
 * @required-env-vars
 * List all environment variables this test needs:
 * - E2E_SITE_NAME (default: [value])
 * - E2E_TEST_EMAIL (required/optional)
 * - E2E_TEST_PASSWORD (required/optional)
 * - [Any other custom env vars]
 *
 * @test-cases
 * List each test case/scenario:
 * 1. [Test case 1 description]
 * 2. [Test case 2 description]
 * 3. [etc.]
 *
 * @expected-behavior
 * [Describe what should happen when the test runs successfully:
 * - What UI elements should be visible?
 * - What routes should be accessible?
 * - What data should be created/modified?
 * - Any side effects?]
 *
 * @related-docs
 * - [Link to relevant documentation]
 * - [Link to related issues/specs]
 * - [Link to implementation files]
 *
 * @modification-notes
 * [Instructions for modifying this test:
 * - How to add new test cases
 * - How to change expected behavior
 * - How to update selectors/assertions
 * - Common pitfalls to avoid]
 */
```

## Example: Bug Test

```typescript
/**
 * @fileoverview GH#737: Prohibit Identical Class Names Within Site
 *
 * @description
 * Verifies that the system prevents creating classes with duplicate names
 * within the same site, ensuring data integrity and preventing user confusion.
 *
 * @test-id gh-0737-open
 * @category bugs
 * @github-issue 737
 *
 * @setup
 * - Requires a site with at least one existing class
 * - Test will create a class with a duplicate name to trigger validation
 *
 * @required-env-vars
 * - E2E_SITE_NAME (default: ai-tests)
 * - E2E_TEST_EMAIL (required - site admin or admin)
 * - E2E_TEST_PASSWORD (required)
 *
 * @test-cases
 * 1. Attempt to create a class with a name that already exists in the site
 * 2. Verify error message is displayed
 * 3. Verify class is not created
 *
 * @expected-behavior
 * - Error message: "A class with this name already exists in this site"
 * - Form submission is blocked
 * - No new class document is created in Firestore
 *
 * @related-docs
 * - GitHub Issue #737
 * - src/components/modals/AddGroupModal.vue - Class creation UI
 * - src/composables/mutations/useUpsertOrgMutation.ts - Backend mutation
 *
 * @modification-notes
 * To modify this test:
 * 1. Update the class name used in the test if validation logic changes
 * 2. Update error message assertion if error text changes
 * 3. Add additional test cases for edge cases (case sensitivity, whitespace, etc.)
 */
```

## Example: Task Test

```typescript
/**
 * @fileoverview Monitor Completion: Assignment Progress Tracking
 *
 * @description
 * Tests the assignment completion monitoring workflow, verifying that researchers
 * can view progress reports for assignments and see participant completion status.
 *
 * @test-id task-monitor-completion
 * @category tasks
 *
 * @setup
 * This test self-seeds data if none exists:
 * - Creates a cohort if none found
 * - Creates an assignment for the cohort
 * - Waits for assignment processing to complete
 * - Navigates to the progress report
 *
 * @required-env-vars
 * - E2E_SITE_NAME (default: ai-tests)
 * - E2E_TEST_EMAIL (required - admin or site_admin)
 * - E2E_TEST_PASSWORD (required)
 *
 * @test-cases
 * 1. Navigate to assignment progress report
 * 2. Verify progress report page loads
 * 3. Verify data table is visible (may be empty if no participants completed)
 *
 * @expected-behavior
 * - Progress report page loads successfully
 * - Data table component is rendered
 * - Page shows assignment and organization context
 *
 * @related-docs
 * - src/pages/administration/ProgressReport.vue - Progress report UI
 * - src/composables/queries/useProgressReportQuery.ts - Data fetching
 *
 * @modification-notes
 * To modify this test:
 * 1. Update cohort/assignment creation logic if seeding changes
 * 2. Adjust selectors if UI structure changes
 * 3. Add assertions for specific data if needed
 * 4. Consider adding test cases for different org types (school, class, etc.)
 */
```

## Best Practices

1. **Keep it up to date**: Update the documentation when you modify the test
2. **Be specific**: Include exact values, selectors, and error messages
3. **Document dependencies**: List all required setup and env vars
4. **Explain the "why"**: Help future developers understand the business logic
5. **Include modification notes**: Make it easy for others to extend the test
