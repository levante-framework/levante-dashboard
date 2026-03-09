# i18n Key Usage Report

## How To Interpret

- **Used keys**: static literal translation calls that resolve to known keys.
- **Unused keys**: keys in `en-US-componentTranslations.json` not found via static or inferred dynamic call scanning.
- **Unresolved translation calls**: literal translation calls that do not map to a known key (possible typo, missing key, or different namespace).
- **Dynamic translation callsites**: non-literal translation calls (template strings/expressions). The report attempts wildcard inference (e.g., `gameTabs.*Name`) but this remains heuristic.

- Total keys scanned: 136
- Used keys (static literal): 67
- Used keys (dynamic inferred): 59
- Used keys (adjusted total): 107
- Unused keys (adjusted): 29
- Unresolved translation calls: 5
- Dynamic translation callsites (static unresolved): 8

## Unresolved Translation Calls

- `authSignIn.atLeastOneUppercase`
- `permissions.loading`
- `profile.settings.language`
- `profile.settings.languageDescription`
- `profile.settings.settings`

## Dynamic Translation Callsites

_These calls use non-literal expressions and cannot be fully resolved without runtime tracing or deeper AST/data-flow analysis._

- `src/components/ConsentModal.vue` -> ``consentModal.${_lowerCase(props.consentType)}UpdatedStatus``
- `src/components/GameTabs.vue` -> ``gameTabs.surveyName${_capitalize(props.userData.userType)}Part1``
- `src/components/GameTabs.vue` -> ``gameTabs.${normalizedTaskId}Name``
- `src/components/GameTabs.vue` -> ``gameTabs.${normalizedTaskId}``
- `src/components/GameTabs.vue` -> ``gameTabs.surveyDescription${_capitalize(props.userData.userType)}Part1``
- `src/components/GameTabs.vue` -> ``gameTabs.${normalizedTaskId}Description``
- `src/helpers/index.ts` -> `-| |o|v`
- `src/pages/HomeParticipant.vue` -> ``participantSidebar.status${capitalize(getAssignmentStatus(selectedAssignment))}``

## Inferred Dynamic Pattern Matches

- `src/components/ConsentModal.vue` -> ``consentModal.${_lowerCase(props.consentType)}UpdatedStatus``
  - inferred pattern: `auth.consent.*UpdatedStatus`
  - matched keys: 1
  - sample: `auth.consent.consentUpdatedStatus`
- `src/components/GameTabs.vue` -> ``gameTabs.surveyName${_capitalize(props.userData.userType)}Part1``
  - inferred pattern: `components.game-tabs.surveyName*Part1`
  - matched keys: 2
  - sample: `components.game-tabs.surveyNameParentPart1`, `components.game-tabs.surveyNameTeacherPart1`
- `src/components/GameTabs.vue` -> ``gameTabs.${normalizedTaskId}Name``
  - inferred pattern: `components.game-tabs.*Name`
  - matched keys: 12
  - sample: `components.game-tabs.egmaMathName`, `components.game-tabs.heartsAndFlowersName`, `components.game-tabs.introName`, `components.game-tabs.matrixReasoningName`, `components.game-tabs.mefsName`, `components.game-tabs.memoryGameName`, `components.game-tabs.mentalRotationName`, `components.game-tabs.roarInferenceName`, `components.game-tabs.sameDifferentSelectionName`, `components.game-tabs.theoryOfMindName`, `components.game-tabs.trogName`, `components.game-tabs.vocabName`
- `src/components/GameTabs.vue` -> ``gameTabs.${normalizedTaskId}``
  - inferred pattern: `components.game-tabs.*`
  - matched keys: 51
  - sample: `components.game-tabs.clickToStart`, `components.game-tabs.egmaMathDescription`, `components.game-tabs.egmaMathName`, `components.game-tabs.heartsAndFlowersDescription`, `components.game-tabs.heartsAndFlowersName`, `components.game-tabs.introDescription`, `components.game-tabs.introName`, `components.game-tabs.matrixReasoningDescription`, `components.game-tabs.matrixReasoningName`, `components.game-tabs.mefsDescription`, `components.game-tabs.mefsName`, `components.game-tabs.memoryGameDescription`
- `src/components/GameTabs.vue` -> ``gameTabs.surveyDescription${_capitalize(props.userData.userType)}Part1``
  - inferred pattern: `components.game-tabs.surveyDescription*Part1`
  - matched keys: 2
  - sample: `components.game-tabs.surveyDescriptionParentPart1`, `components.game-tabs.surveyDescriptionTeacherPart1`
- `src/components/GameTabs.vue` -> ``gameTabs.${normalizedTaskId}Description``
  - inferred pattern: `components.game-tabs.*Description`
  - matched keys: 15
  - sample: `components.game-tabs.egmaMathDescription`, `components.game-tabs.heartsAndFlowersDescription`, `components.game-tabs.introDescription`, `components.game-tabs.matrixReasoningDescription`, `components.game-tabs.mefsDescription`, `components.game-tabs.memoryGameDescription`, `components.game-tabs.mentalRotationDescription`, `components.game-tabs.paDescription`, `components.game-tabs.roarInferenceDescription`, `components.game-tabs.sameDifferentSelectionDescription`, `components.game-tabs.sreDescription`, `components.game-tabs.swrDescription`
- `src/pages/HomeParticipant.vue` -> ``participantSidebar.status${capitalize(getAssignmentStatus(selectedAssignment))}``
  - inferred pattern: `components.participant-sidebar.status*`
  - matched keys: 7
  - sample: `components.participant-sidebar.statusClose`, `components.participant-sidebar.statusClosed`, `components.participant-sidebar.statusCurrent`, `components.participant-sidebar.statusOpen`, `components.participant-sidebar.statusOpened`, `components.participant-sidebar.statusPast`, `components.participant-sidebar.statusUpcoming`

## Unused Keys (Adjusted)

- `auth.consent.title`
- `auth.signin.atLeastOneNumber`
- `auth.signin.atLeastOneUpperCase`
- `auth.signin.pageTitle`
- `components.navbar.greeting`
- `components.sentry-form.buttonLabel`
- `components.sentry-form.cancelButtonLabel`
- `components.sentry-form.emailPlaceholder`
- `components.sentry-form.formTitle`
- `components.sentry-form.messageLabel`
- `components.sentry-form.messagePlaceholder`
- `components.sentry-form.namePlaceholder`
- `components.sentry-form.submitButtonLabel`
- `components.tasks.loading`
- `components.tasks.preparing`
- `pages.home-participant.assignments`
- `pages.home-participant.consentUpdatedStatus`
- `pages.home-participant.current`
- `pages.home-participant.loadingAssignments`
- `pages.home-participant.noCurrentAssignmentsFound`
- `pages.home-participant.noPastAssignmentsFound`
- `pages.home-participant.noUpcomingAssignmentsFound`
- `pages.home-participant.past`
- `pages.home-participant.selectAssignment`
- `pages.home-participant.showOptionalAssignments`
- `pages.home-participant.upcoming`
- `pages.home-selector.loading`
- `pages.signin.adminPrompt`
- `pages.signin.loginWith`

## Used Keys (with one usage file)

- `auth.consent.acceptButton` -> `src/components/ConsentModal.vue`
- `auth.consent.assentTitle` -> `src/components/ConsentModal.vue`
- `auth.consent.consentTitle` -> `src/components/ConsentModal.vue`
- `auth.consent.header` -> `src/components/ConsentModal.vue`
- `auth.consent.rejectButton` -> `src/components/ConsentModal.vue`
- `auth.consent.toastHeader` -> `src/components/ConsentModal.vue`
- `auth.signin.atLeastOneLowercase` -> `src/components/auth/SignIn.vue`
- `auth.signin.atLeastOneNumeric` -> `src/components/auth/SignIn.vue`
- `auth.signin.buttonLabel` -> `src/components/auth/SignIn.vue`
- `auth.signin.continueWithGoogle` -> `src/pages/SignIn.vue`
- `auth.signin.emailId` -> `src/components/auth/SignIn.vue`
- `auth.signin.emailPlaceholder` -> `src/components/auth/SignIn.vue`
- `auth.signin.forgotPassword` -> `src/components/auth/SignIn.vue`
- `auth.signin.incorrectEmailOrPassword` -> `src/components/auth/SignIn.vue`
- `auth.signin.invalidEmailPlaceholder` -> `src/components/auth/SignIn.vue`
- `auth.signin.minimumCharacters` -> `src/components/auth/SignIn.vue`
- `auth.signin.passwordId` -> `src/components/auth/SignIn.vue`
- `auth.signin.passwordPlaceholder` -> `src/components/auth/SignIn.vue`
- `auth.signin.pickPassword` -> `src/components/auth/SignIn.vue`
- `auth.signin.selectLanguage` -> `src/components/LanguageSelector.vue`
- `auth.signin.selectLanguageLabel` -> `src/components/LanguageSelector.vue`
- `auth.signin.signInWithEmailLinkInstead` -> `src/components/auth/SignIn.vue`
- `auth.signin.signInWithEmailLinkPlaceHolder` -> `src/components/auth/SignIn.vue`
- `auth.signin.signInWithPasswordInstead` -> `src/components/auth/SignIn.vue`
- `auth.signin.suggestions` -> `src/components/auth/SignIn.vue`
- `components.game-tabs.clickToStart` -> `src/components/GameTabs.vue`
- `components.game-tabs.surveyDescriptionChild` -> `src/components/GameTabs.vue`
- `components.game-tabs.surveyNameChild` -> `src/components/GameTabs.vue`
- `components.game-tabs.surveyProgressGeneral` -> `src/components/GameTabs.vue`
- `components.game-tabs.surveyProgressGeneralParent` -> `src/components/GameTabs.vue`
- `components.game-tabs.surveyProgressGeneralTeacher` -> `src/components/GameTabs.vue`
- `components.game-tabs.surveyProgressSpecificParent` -> `src/components/GameTabs.vue`
- `components.game-tabs.surveyProgressSpecificParentMonth` -> `src/components/GameTabs.vue`
- `components.game-tabs.surveyProgressSpecificParentYear` -> `src/components/GameTabs.vue`
- `components.game-tabs.taskCompleted` -> `src/components/GameTabs.vue`
- `components.game-tabs.taskNoLongerAvailable` -> `src/components/GameTabs.vue`
- `components.game-tabs.taskNotYetAvailable` -> `src/components/GameTabs.vue`
- `components.navbar.signOut` -> `src/components/UserActions.vue`
- `components.participant-sidebar.assignments` -> `src/components/SideBar.vue`
- `components.participant-sidebar.grade` -> `src/components/ParticipantSidebar.vue`
- `components.participant-sidebar.noCurrentAssignments` -> `src/components/SideBar.vue`
- `components.participant-sidebar.noPastAssignments` -> `src/components/SideBar.vue`
- `components.participant-sidebar.noUpcomingAssignments` -> `src/components/SideBar.vue`
- `components.participant-sidebar.statusClose` -> `src/pages/HomeParticipant.vue`
- `components.participant-sidebar.statusClosed` -> `src/pages/HomeParticipant.vue`
- `components.participant-sidebar.statusCurrent` -> `src/components/SideBar.vue`
- `components.participant-sidebar.statusOpen` -> `src/pages/HomeParticipant.vue`
- `components.participant-sidebar.statusOpened` -> `src/pages/HomeParticipant.vue`
- `components.participant-sidebar.statusPast` -> `src/components/SideBar.vue`
- `components.participant-sidebar.statusUpcoming` -> `src/components/SideBar.vue`
- `components.participant-sidebar.studentInfo` -> `src/components/ParticipantSidebar.vue`
- `components.participant-sidebar.tasksCompleted` -> `src/components/ParticipantSidebar.vue`
- `pages.home-participant.contactAdministrator` -> `src/pages/HomeParticipant.vue`
- `pages.home-participant.noAssignments` -> `src/pages/HomeParticipant.vue`
- `pages.home-selector.inactivityLogout` -> `src/containers/SessionTimer/SessionTimer.vue`
- `pages.home-selector.inactivityLogoutAcceptLabel` -> `src/containers/SessionTimer/SessionTimer.vue`
- `pages.not-found.label` -> `src/pages/NotFound.vue`
- `pages.not-found.pageNotFound` -> `src/pages/NotFound.vue`
- `pages.not-found.sorry` -> `src/pages/NotFound.vue`
- `pages.signin.adminAction` -> `src/pages/SignIn.vue`
- `pages.signin.adminInfoPrompt` -> `src/pages/SignIn.vue`
- `pages.signin.havingTrouble` -> `src/pages/SignIn.vue`
- `pages.signin.login` -> `src/pages/SignIn.vue`
- `pages.signin.welcome` -> `src/pages/SignIn.vue`
- `surveys.user-survey.specificRelationDescriptionChildA` -> `src/pages/UserSurvey.vue`
- `surveys.user-survey.specificRelationDescriptionChildB` -> `src/pages/UserSurvey.vue`
- `surveys.user-survey.specificRelationDescriptionClass` -> `src/pages/UserSurvey.vue`

