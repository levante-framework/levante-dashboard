<template>
  <div>
    <div v-if="!initialized || isLoading || isFetching">
      <LevanteSpinner fullscreen />
    </div>
    <div v-else-if="!hasAssignments">
      <div class="col-full text-center py-8">
        <h1>{{ $t('homeParticipant.noAssignments') }}</h1>
        <p class="text-center">
          {{ $t('homeParticipant.contactAdministrator') }}
        </p>
        <PvButton
          :label="$t('navBar.signOut')"
          class="no-underline bg-primary border-none border-round p-2 text-white hover:bg-red-900"
          icon="pi pi-sign-out"
          @click="signOut"
        />
      </div>
    </div>

    <div v-else>
      <PvFloatLabel>
        <h2 v-if="userAssignments?.length == 1" class="dropdown-container">
          {{ userAssignments.at(0).publicName || userAssignments.at(0).name }}
        </h2>
      </PvFloatLabel>
      <div class="ml-5 mt-5">
        <PvFloatLabel>
          <div v-if="userAssignments?.length > 0" class="flex flex-row align-items-start w-full mt-4">
            <div class="assignment-select-container">
              <div class="flex w-full">
                <PvSelect
                  v-model="selectedAdmin"
                  :options="sortedUserAdministrations ?? []"
                  :option-label="
                    userAssignments.every((administration) => administration.publicName) ? 'publicName' : 'name'
                  "
                  input-id="dd-assignment"
                  data-cy="dropdown-select-administration"
                  @change="toggleShowOptionalAssessments"
                />
                <label for="dd-assignment" class="p-0 m-0">{{ $t('homeParticipant.selectAssignment') }}</label>
              </div>
            </div>
          </div>
        </PvFloatLabel>
        <div
          v-if="optionalAssessments.length !== 0"
          class="switch-container flex flex-row align-items-center justify-content-end mr-6 gap-2"
        >
          <PvToggleSwitch
            v-model="showOptionalAssessments"
            input-id="switch-optional"
            data-cy="switch-show-optional-assessments"
          />
          <label for="switch-optional" class="mr-2 text-gray-500">{{
            $t('homeParticipant.showOptionalAssignments')
          }}</label>
        </div>
      </div>
      <div class="tabs-container">
        <ParticipantSidebar :total-games="totalGames" :completed-games="completeGames" :student-info="childInfo" />
        <Transition name="fade" mode="out-in">
          <GameTabs
            v-if="showOptionalAssessments && userData"
            :games="optionalAssessments"
            :sequential="isSequential"
            :user-data="userData"
          />
          <GameTabs
            v-else-if="requiredAssessments && userData"
            :games="requiredAssessments"
            :sequential="isSequential"
            :user-data="userData"
          />
        </Transition>
      </div>
    </div>
  </div>
  <ConsentModal
    v-if="showConsent"
    :consent-text="confirmText"
    :consent-type="consentType"
    :on-confirm="updateConsent"
  />
</template>

<script setup>
import { onMounted, ref, watch, computed, toRaw } from 'vue';
import _filter from 'lodash/filter';
import _get from 'lodash/get';
import _find from 'lodash/find';
import _without from 'lodash/without';
import _isEmpty from 'lodash/isEmpty';
import { storeToRefs } from 'pinia';
import PvButton from 'primevue/button';
import PvSelect from 'primevue/select';
import PvToggleSwitch from 'primevue/toggleswitch';
import PvFloatLabel from 'primevue/floatlabel';
import { useAuthStore } from '@/store/auth';
import { useGameStore } from '@/store/game';
import useUserDataQuery from '@/composables/queries/useUserDataQuery';
import useUserAssignmentsQuery from '@/composables/queries/useUserAssignmentsQuery';
import useTasksQuery from '@/composables/queries/useTasksQuery';
import useSurveyResponsesQuery from '@/composables/useSurveyResponses/useSurveyResponses';
import useUpdateConsentMutation from '@/composables/mutations/useUpdateConsentMutation';
import useSignOutMutation from '@/composables/mutations/useSignOutMutation';
import useDistrictsQuery from '@/composables/queries/useDistrictsQuery';
import ConsentModal from '@/components/ConsentModal.vue';
import GameTabs from '@/components/GameTabs.vue';
import ParticipantSidebar from '@/components/ParticipantSidebar.vue';
import { useI18n } from 'vue-i18n';
import axios from 'axios';
import { LEVANTE_BUCKET_URL } from '@/constants/bucket';
import { Model, settings } from 'survey-core';
import { Converter } from 'showdown';
import { fetchAudioLinks } from '@/helpers/survey';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useQueryClient, useQuery } from '@tanstack/vue-query';
import { initializeSurvey, setupSurveyEventHandlers } from '@/helpers/surveyInitialization';
import { useSurveyStore } from '@/store/survey';
import { fetchDocsById } from '@/helpers/query/utils';
import LevanteSpinner from '@/components/LevanteSpinner.vue';
import { logger } from '@/logger';

const showConsent = ref(false);
const consentVersion = ref('');
const confirmText = ref('');
const consentType = ref('');
const consentParams = ref({});
const { locale } = useI18n();
const router = useRouter();
const toast = useToast();
const queryClient = useQueryClient();
const surveyStore = useSurveyStore();

const { mutateAsync: updateConsentStatus } = useUpdateConsentMutation();
const { mutate: signOut } = useSignOutMutation();

let unsubscribe;
const initialized = ref(false);
const init = () => {
  if (unsubscribe) unsubscribe();
  initialized.value = true;
};

const authStore = useAuthStore();
const { roarfirekit, showOptionalAssessments, userData: currentUserData } = storeToRefs(authStore);

unsubscribe = authStore.$subscribe(async (mutation, state) => {
  if (state.roarfirekit.restConfig) init();
});

onMounted(async () => {
  if (roarfirekit.value.restConfig) init();
});

const gameStore = useGameStore();
const { selectedAdmin } = storeToRefs(gameStore);

const {
  data: districtsData,
  isLoading: isLoadingDistricts,
  isFetching: isFetchingDistricts,
} = useDistrictsQuery(currentUserData.value?.districts?.current, {
  enabled: initialized,
});

const {
  isLoading: isLoadingUserData,
  isFetching: isFetchingUserData,
  data: userData,
} = useUserDataQuery(null, {
  enabled: initialized,
});

const {
  isLoading: isLoadingAssignments,
  isFetching: isFetchingAssignments,
  data: userAssignments,
} = useUserAssignmentsQuery({
  enabled: initialized,
});

const sortedUserAdministrations = computed(() => {
  return [...(userAssignments.value ?? [])].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
});

const taskIds = computed(() => (selectedAdmin.value?.assessments ?? []).map((assessment) => assessment.taskId));
const tasksQueryEnabled = computed(() => !isLoadingAssignments.value && !_isEmpty(taskIds.value));

const {
  isLoading: isLoadingTasks,
  isFetching: isFetchingTasks,
  data: userTasks,
} = useTasksQuery(false, taskIds, {
  enabled: tasksQueryEnabled,
});

// Computed didn't react to selected admin changes, so using a ref instead.
let hasSurvey = ref(false);
watch(selectedAdmin, (newAdmin) => {
  hasSurvey.value = newAdmin?.assessments.some((task) => task.taskId === 'survey');
});

const { data: surveyResponsesData } = useSurveyResponsesQuery({
  enabled: hasSurvey && initialized,
});

const isLoading = computed(() => {
  return isLoadingUserData.value || isLoadingAssignments.value || isLoadingTasks.value || isLoadingDistricts.value;
});

const isFetching = computed(() => {
  return isFetchingUserData.value || isFetchingAssignments.value || isFetchingTasks.value || isFetchingDistricts.value;
});

const hasAssignments = computed(() => {
  if (isLoading.value || isFetching.value) return false;
  return assessments.value.length > 0;
});

async function checkConsent() {
  showConsent.value = false;

  const legal = selectedAdmin.value?.legal;
  if (!legal) return;

  // Check if the user has already consented to the Levante consent form
  const consentStatus = userData.value?.legal?.consent;
  if (consentStatus) {
    return;
  }

  try {
    const consentDoc = await authStore.getLegalDoc(`${locale.value}Consent`);

    if (!consentDoc) return;

    consentType.value = toRaw(legal).consent[0].type;
    confirmText.value = consentDoc.text;
    consentVersion.value = consentDoc.version;
    showConsent.value = true;
  } catch {
    console.log('Error getting consent doc');
  }
}

async function updateConsent() {
  consentParams.value = {
    amount: selectedAdmin.value?.legal.amount,
    expectedTime: selectedAdmin.value?.legal.expectedTime,
    dateSigned: new Date(),
  };

  await updateConsentStatus({
    consentType,
    consentVersion,
    consentParams,
  });
}

const toggleShowOptionalAssessments = async () => {
  await checkConsent();
  showOptionalAssessments.value = null;
};

const userType = computed(() => {
  return toRaw(userData.value)?.userType?.toLowerCase();
});

// Watch for when districts data changes
watch(
  districtsData,
  (newDistrictsData) => {
    if (newDistrictsData) {
      const rawDistrictsData = toRaw(newDistrictsData)?.[0];
      if (rawDistrictsData?.name) {
        logger.setAdditionalProperties({
          siteId: rawDistrictsData?.id,
          siteName: rawDistrictsData?.name,
        });
      }
    }
  },
  { immediate: true },
);

// Assessments to populate the game tabs.
// Generated based on the current selected administration Id
const assessments = computed(() => {
  if (!isFetching.value && selectedAdmin.value && (userTasks.value ?? []).length > 0) {
    const fetchedAssessments = _without(
      selectedAdmin.value.assessments.map((assessment) => {
        // Get the matching assessment from userAssignments
        const matchingAssignment = _find(userAssignments.value, {
          id: selectedAdmin.value.id,
        });
        const matchingAssessments = matchingAssignment?.assessments ?? [];
        const matchingAssessment = _find(matchingAssessments, {
          taskId: assessment.taskId,
        });

        // If no matching assessments were found, then this assessment is not assigned to the user.
        // It is in the administration but the user does not meet the conditional requirements for assignment.
        // Return undefined, which will be filtered out using lodash _without above.
        if (!matchingAssessment) return undefined;
        const optionalAssessment = _find(matchingAssessments, {
          taskId: assessment.taskId,
          optional: true,
        });
        const combinedAssessment = {
          ...matchingAssessment,
          ...optionalAssessment,
          ...assessment,
          taskData: {
            ..._find(userTasks.value ?? [], { id: assessment.taskId }),
            variantURL: assessment?.params?.variantURL,
          },
        };
        return combinedAssessment;
      }),
      undefined,
    );

    // Mark the survey as complete as if it was a task
    if (userType.value === 'student') {
      if (surveyStore.isGeneralSurveyComplete) {
        fetchedAssessments.forEach((assessment) => {
          if (assessment.taskId === 'survey') {
            assessment.completedOn = new Date();
          }
        });
      }
    } else if (userType.value === 'teacher' || userType.value === 'parent') {
      if (surveyStore.isGeneralSurveyComplete && surveyStore.isSpecificSurveyComplete) {
        fetchedAssessments.forEach((assessment) => {
          if (assessment.taskId === 'survey') {
            assessment.completedOn = new Date();
          }
        });
      }
    }

    return fetchedAssessments;
  }
  return [];
});

const requiredAssessments = computed(() => {
  return _filter(assessments.value, (assessment) => !assessment.optional);
});

const optionalAssessments = computed(() => {
  return _filter(assessments.value, (assessment) => assessment.optional);
});

// Grab the sequential key from the current administration's data object
const isSequential = computed(() => {
  return (
    _get(
      _find(userAssignments.value, (administration) => {
        return administration.id === selectedAdmin.value.id;
      }),
      'sequential',
    ) ?? true
  );
});

// Total games completed from the current list of assessments
let totalGames = computed(() => {
  return requiredAssessments.value.length ?? 0;
});

// Total games included in the current assessment
let completeGames = computed(() => {
  return _filter(requiredAssessments.value, (task) => task.completedOn).length ?? 0;
});

// Set up studentInfo for sidebar
const studentInfo = computed(() => {
  return {};
});

watch(
  [userData, selectedAdmin, userAssignments],
  async ([newUserData, isSelectedAdminChanged]) => {
    // If the assignments are still loading, abort.
    if (isLoadingAssignments.value || isFetchingAssignments.value || !userAssignments.value?.length) return;

    // If the selected admin changed, ensure consent was given before proceeding.
    if (!_isEmpty(newUserData) && isSelectedAdminChanged) {
      await checkConsent();
    }

    const selectedAdminId = selectedAdmin.value?.id;
    const allAdminIds = userAssignments.value?.map((administration) => administration.id) ?? [];

    // Verify that we have a selected administration and it is in the list of all assigned administrations.
    if (selectedAdminId && allAdminIds.includes(selectedAdminId)) {
      // Ensure that the selected administration is a fresh instance of the administration. Whilst this seems redundant,
      // this is apparently relevant in the case that the game store does not flush properly.
      selectedAdmin.value = sortedUserAdministrations.value.find(
        (administration) => administration.id === selectedAdminId,
      );

      return;
    }

    // Otherwise, choose the first sorted administration if there is no selected administration.
    selectedAdmin.value = sortedUserAdministrations.value[0];
  },
  { immediate: true },
);

const { data: surveyData } = useQuery({
  queryKey: ['surveys'],
  queryFn: async () => {
    const userType = userData.value.userType;

    if (userType === 'student') {
      const resSurvey = await axios.get(`${LEVANTE_BUCKET_URL}/child_survey.json`);
      const resAudio = await fetchAudioLinks('child-survey');
      surveyStore.setAudioLinkMap(resAudio);
      return {
        general: resSurvey.data,
      };
    } else if (userType === 'teacher') {
      const resGeneral = await axios.get(`${LEVANTE_BUCKET_URL}/teacher_survey_general.json`);
      const resClassroom = await axios.get(`${LEVANTE_BUCKET_URL}/teacher_survey_classroom.json`);
      return {
        general: resGeneral.data,
        specific: resClassroom.data,
      };
    } else {
      // parent
      const resFamily = await axios.get(`${LEVANTE_BUCKET_URL}/parent_survey_family.json`);
      const resChild = await axios.get(`${LEVANTE_BUCKET_URL}/parent_survey_child.json`);
      return {
        general: resFamily.data,
        specific: resChild.data,
      };
    }
  },
  enabled: userData?.value?.userType !== 'admin' && initialized && hasSurvey,
  staleTime: 24 * 60 * 60 * 1000, // 24 hours
});

const surveyDependenciesLoaded = computed(() => {
  return surveyData.value && userData.value && selectedAdmin.value && surveyResponsesData.value;
});

const specificSurveyData = computed(() => {
  if (!surveyData.value) return null;
  return userType.value === 'student' ? null : surveyData.value.specific;
});

function createSurveyInstance(surveyDataToStartAt) {
  settings.lazyRender = true;
  const surveyInstance = new Model(surveyDataToStartAt);
  // surveyInstance.showNavigationButtons = 'none';
  surveyInstance.locale = locale.value;
  return surveyInstance;
}

function setupMarkdownConverter(surveyInstance) {
  const converter = new Converter();
  surveyInstance.onTextMarkdown.add((survey, options) => {
    let str = converter.makeHtml(options.text);
    str = str.substring(3, str.length - 4);
    options.html = str;
  });
}

watch(
  surveyDependenciesLoaded,
  async (isLoaded) => {
    const isAssessment = selectedAdmin.value?.assessments.some((task) => task.taskId === 'survey');
    if (!isLoaded || !isAssessment || surveyStore.survey) return;

    const surveyResponseDoc = (surveyResponsesData.value || []).find(
      (doc) => doc?.administrationId === selectedAdmin.value.id,
    );

    if (surveyResponseDoc) {
      if (userType.value === 'student') {
        const isComplete = surveyResponseDoc.general.isComplete;
        surveyStore.setIsGeneralSurveyComplete(isComplete);
        if (isComplete) return;
      } else {
        surveyStore.setIsGeneralSurveyComplete(surveyResponseDoc.general.isComplete);

        const numOfSpecificSurveys =
          userType.value === 'parent' ? userData.value?.childIds?.length : userData.value?.classes?.current?.length;

        if (surveyResponseDoc.specific && surveyResponseDoc.specific.length > 0) {
          if (
            surveyResponseDoc.specific.length === numOfSpecificSurveys &&
            surveyResponseDoc.specific.every((relation) => relation.isComplete)
          ) {
            surveyStore.setIsSpecificSurveyComplete(true);
          } else {
            const incompleteIndex = surveyResponseDoc.specific.findIndex((relation) => !relation.isComplete);
            if (incompleteIndex > -1) {
              surveyStore.setSpecificSurveyRelationIndex(incompleteIndex);
            } else {
              surveyStore.setSpecificSurveyRelationIndex(surveyResponseDoc.specific.length);
            }
          }
        }
      }
    }

    // Fetch child docs for parent or class docs for teacher
    if (userType.value === 'parent' || userType.value === 'teacher') {
      try {
        let fetchConfig = [];
        // Only fetch docs if the user has children or classes. It's possible the user has no children or classes linked yet.
        if (userType.value === 'parent' && userData.value.childIds) {
          fetchConfig = userData.value.childIds.map((childId) => ({
            collection: 'users',
            docId: childId,
            select: ['birthMonth', 'birthYear'],
          }));
        } else if (userType.value === 'teacher' && userData.value.classes?.current) {
          fetchConfig = userData.value.classes.current.map((classId) => ({
            collection: 'classes',
            docId: classId,
            select: ['name'],
          }));
        }

        if (fetchConfig.length > 0) {
          const res = await fetchDocsById(fetchConfig);
          surveyStore.setSpecificSurveyRelationData(res);
        }
      } catch (error) {
        console.error('Error fetching relation data:', error);
      }
    }

    if (userType.value === 'student' && surveyStore.isGeneralSurveyComplete) {
      return;
    } else if (userType.value === 'teacher' || userType.value === 'parent') {
      if (surveyStore.isGeneralSurveyComplete && surveyStore.isSpecificSurveyComplete) {
        return;
      }
    }

    const surveyDataToStartAt =
      userType.value === 'student' || !surveyStore.isGeneralSurveyComplete
        ? surveyData.value.general
        : surveyData.value.specific;

    const surveyInstance = createSurveyInstance(surveyDataToStartAt);
    setupMarkdownConverter(surveyInstance);

    await initializeSurvey({
      surveyInstance,
      userType: userType.value,
      specificSurveyData: specificSurveyData.value,
      userData: userData.value,
      surveyStore,
      locale: locale.value,
      audioLinkMap: surveyStore.audioLinkMap,
      generalSurveyData: surveyData.value.general,
    });

    setupSurveyEventHandlers({
      surveyInstance,
      userType: userType.value,
      roarfirekit: roarfirekit.value,
      uid: userData.value.id,
      selectedAdminId: selectedAdmin.value.id,
      surveyStore,
      router,
      toast,
      queryClient,
      userData: userData.value,
      gameStore,
    });

    surveyStore.setSurvey(surveyInstance);
  },
  { immediate: true },
);
</script>
<style scoped>
.tabs-container {
  display: flex;
  flex-direction: row;
  max-width: 100vw;
  padding: 2rem;
  gap: 2rem;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.dropdown-container {
  margin-top: 2rem;
  margin-left: 2rem;
}

.assignment-select-container {
  min-width: 100%;
}

.switch-container {
  min-width: 24%;
}

@media screen and (max-width: 1100px) {
  .tabs-container {
    flex-direction: row;
  }
}
</style>
