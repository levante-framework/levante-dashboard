<template>
  <div id="games">
    <div class="desktop-games">
      <PvTabs v-model:active-index="displayGameIndex" scrollable value="0">
        <PvTabList>
          <PvTab
            v-for="(game, index) in games"
            :key="game.taskId"
            :disabled="
              sequential &&
              ((index > 0 && !games[index - 1].completedOn) ||
                (allGamesComplete && currentGameId !== game.taskId && !game.completedOn))
            "
            :value="String(index)"
            :class="[
              'p3 mr-1 text-base hover:bg-black-alpha-10',
              { 'text-green-500': isTaskComplete(game.completedOn, game.taskId) },
            ]"
            style="border: solid 2px #00000014 !important; border-radius: 10px"
          >
            <i
              v-if="isTaskComplete(game.completedOn, game.taskId)"
              class="pi pi-check-circle mr-2"
              data-game-status="complete"
            />
            <i
              v-else-if="game.taskId == currentGameId || !sequential"
              class="pi pi-circle mr-2"
              data-game-status="current"
            />
            <i v-if="sequential" class="pi pi-lock mr-2" data-game-status="incomplete" />
            <span
              class="tabview-nav-link-label"
              :data-game-status="`${isTaskComplete(game.completedOn, game.taskId) ? 'complete' : 'incomplete'}`"
              >{{ getTaskName(game.taskId, game.taskData.name) }}</span
            >
          </PvTab>
        </PvTabList>
        <PvTabPanels style="width: 100%; margin-top: 0.5rem; padding: 0">
          <PvTabPanel
            v-for="(game, index) in games"
            :key="game.taskId"
            :disabled="
              sequential &&
              ((index > 0 && !games[index - 1].completedOn) ||
                (allGamesComplete && currentGameId !== game.taskId && !game.completedOn))
            "
            :value="String(index)"
            class="p-0"
          >
            <div class="roar-tabview-game flex flex-row align-items-center p-5 surface-100 w-full">
              <div class="roar-game-image">
                <div>
                  <img
                    v-if="game.taskData.image"
                    :src="game.taskData.image"
                    style="width: 100%; object-fit: contain; height: auto"
                  />
                  <img
                    v-else
                    src="https://reading.stanford.edu/wp-content/uploads/2021/10/PA-1024x512.png"
                    style="width: 100%; object-fit: contain; height: auto"
                  />
                </div>
              </div>

              <div class="roar-game-content flex flex-column">
                <div class="flex flex-column h-full">
                  <div class="roar-game-title font-bold">
                    {{ getTaskName(game.taskId, game.taskData.name) }}
                  </div>
                  <div class="roar-game-description">
                    <p>
                      {{ getTaskDescription(game.taskId, game.taskData.description) }}
                    </p>
                  </div>

                  <div v-if="game.taskId === 'teacher-survey' || game.taskId === 'caregiver-survey'" class="mt-4 mb-4">
                    <div class="flex align-items-center mb-2">
                      <span class="mr-2 w-4"
                        ><b>{{ $t('gameTabs.surveyProgressGeneral') }} </b> -
                        {{
                          props.userData.userType === 'teacher' || props.userData.userType === 'parent'
                            ? props.userData.userType === 'teacher'
                              ? $t('gameTabs.surveyProgressGeneralTeacher')
                              : $t('gameTabs.surveyProgressGeneralParent')
                            : ''
                        }}
                      </span>
                      <PvProgressBar :value="getGeneralSurveyProgress" :class="getGeneralSurveyProgressClass" />
                    </div>

                    <div v-if="props.userData.userType === 'parent'">
                      <div
                        v-for="(child, i) in props.userData?.childIds"
                        :key="child"
                        class="flex flex-wrap align-items-center mb-2"
                      >
                        <span class="mr-2 w-full sm:w-4 mb-1 sm:mb-0">
                          <b>{{ $t('gameTabs.surveyProgressSpecificParent') }} - </b>
                          {{ $t('gameTabs.surveyProgressSpecificParentMonth') }}:
                          {{ surveyStore.specificSurveyRelationData[i]?.birthMonth }}
                          <br class="sm:hidden" />
                          {{ $t('gameTabs.surveyProgressSpecificParentYear') }}:
                          {{ surveyStore.specificSurveyRelationData[i]?.birthYear }}
                        </span>
                        <PvProgressBar
                          :value="getSpecificSurveyProgress(i)"
                          :class="getSpecificSurveyProgressClass(i)"
                        />
                      </div>
                    </div>

                    <div v-if="props.userData.userType === 'teacher'">
                      <div
                        v-for="(classroom, i) in props.userData?.classes?.current"
                        :key="classroom"
                        class="flex flex-wrap align-items-center mb-2"
                      >
                        <span class="mr-2 w-full sm:w-4 mb-1 sm:mb-0">
                          <b>Classroom - </b>
                          {{ surveyStore.specificSurveyRelationData[i]?.name }}
                        </span>
                        <PvProgressBar
                          :value="getSpecificSurveyProgress(i)"
                          :class="getSpecificSurveyProgressClass(i)"
                        />
                      </div>
                    </div>
                  </div>

                  <div class="flex flex-column">
                    <div class="roar-game-meta">
                      <PvTag
                        v-for="(items, metaIndex) in game.taskData.meta"
                        :key="metaIndex"
                        :value="metaIndex + ': ' + items"
                      />
                    </div>

                    <div v-if="getAssignmentStatus(selectedAssignment) === ASSIGNMENT_STATUSES.CURRENT">
                      <button
                        v-if="isTaskComplete(game?.completedOn, game?.taskId)"
                        class="game-btn --completed"
                        disabled
                      >
                        <i class="pi pi-check-circle"></i>
                        <span>{{ $t('gameTabs.taskCompleted') }}</span>
                      </button>

                      <router-link
                        v-else
                        class="game-btn"
                        :to="{
                          path: getRoutePath(game.taskId, game.taskData?.variantURL, game.taskData?.taskURL),
                        }"
                        @click="routeExternalTask(game)"
                      >
                        <img src="@/assets/arrow-circle.svg" alt="arrow-circle" />
                        <span>{{ $t('gameTabs.clickToStart') }}</span>
                      </router-link>
                    </div>

                    <div v-if="getAssignmentStatus(selectedAssignment) === ASSIGNMENT_STATUSES.UPCOMING">
                      <div class="game-btn --disabled">
                        <i class="pi pi-hourglass"></i>
                        <span>{{ $t('gameTabs.taskNotYetAvailable') }}</span>
                      </div>
                    </div>

                    <div v-if="getAssignmentStatus(selectedAssignment) === ASSIGNMENT_STATUSES.PAST">
                      <div
                        v-if="isTaskComplete(game?.completedOn, game?.taskId)"
                        class="game-btn --disabled --completed"
                      >
                        <i class="pi pi-check-circle"></i>
                        <span>{{ $t('gameTabs.taskCompleted') }}</span>
                      </div>

                      <div v-else class="game-btn --disabled --incomplete">
                        <i class="pi pi-ban"></i>
                        <span>{{ $t('gameTabs.taskNoLongerAvailable') }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </PvTabPanel>
        </PvTabPanels>
      </PvTabs>
    </div>

    <div class="game-grid mobile-games" role="list">
      <div
        v-for="(game, index) in games"
        :key="game.taskId"
        class="game-tile"
        :class="{
          '--available': isTaskAvailable(game, index),
          '--completed': isTaskComplete(game.completedOn, game.taskId),
          '--locked': !isTaskAvailable(game, index) && !isTaskComplete(game.completedOn, game.taskId),
          '--described': describedTaskId === game.taskId,
        }"
        role="listitem"
      >
        <button
          class="game-tile__info"
          type="button"
          :aria-label="getTaskDescription(game.taskId, game.taskData.description)"
          :aria-expanded="describedTaskId === game.taskId"
          @click="toggleDescription(game.taskId)"
        >
          <i class="pi pi-info"></i>
        </button>

        <i v-if="isTaskComplete(game.completedOn, game.taskId)" class="game-tile__complete pi pi-check"></i>

        <router-link
          v-if="isTaskAvailable(game, index)"
          class="game-tile__square"
          :to="{ path: getRoutePath(game.taskId, game.taskData?.variantURL, game.taskData?.taskURL) }"
          :aria-label="`${$t('gameTabs.clickToStart')}: ${getTaskName(game.taskId, game.taskData.name)}`"
          @click="routeExternalTask(game)"
        >
          <img v-if="game.taskData.image" :src="game.taskData.image" alt="" />
          <img v-else src="https://reading.stanford.edu/wp-content/uploads/2021/10/PA-1024x512.png" alt="" />
          <span class="game-tile__play">
            <i class="pi pi-play"></i>
          </span>
        </router-link>

        <div v-else class="game-tile__square --disabled">
          <img v-if="game.taskData.image" :src="game.taskData.image" alt="" />
          <img v-else src="https://reading.stanford.edu/wp-content/uploads/2021/10/PA-1024x512.png" alt="" />
          <span class="game-tile__play">
            <i :class="['pi', isTaskComplete(game.completedOn, game.taskId) ? 'pi-check' : 'pi-lock']"></i>
          </span>
        </div>

        <p class="game-tile__description">
          {{ getTaskDescription(game.taskId, game.taskData.description) }}
        </p>

        <h3 class="game-tile__name">
          {{ getTaskName(game.taskId, game.taskData.name) }}
        </h3>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import _get from 'lodash/get';
import _find from 'lodash/find';
import _findIndex from 'lodash/findIndex';
import { getAgeData } from '@bdelab/roar-utils';
import PvTabPanel from 'primevue/tabpanel';
import PvTabs from 'primevue/tabs';
import PvTabList from 'primevue/tablist';
import PvTab from 'primevue/tab';
import PvTabPanels from 'primevue/tabpanels';
import PvTag from 'primevue/tag';
import { useAuthStore } from '@/store/auth';
import { useSurveyStore } from '@/store/survey';
import _capitalize from 'lodash/capitalize';
import { useQueryClient } from '@tanstack/vue-query';
import { LEVANTE_SURVEY_RESPONSES_KEY } from '@/constants/bucket';
import PvProgressBar from 'primevue/progressbar';
import { useAssignmentsStore } from '@/store/assignments';
import { ASSIGNMENT_STATUSES } from '@/constants';
import { getAssignmentStatus } from '@/helpers/assignments';
import { LEVANTE_TASK_IDS, ROAR_TASK_IDS } from '@/constants/coreTasks';
import { logger } from '@/logger';

interface TaskData {
  name: string;
  description: string;
  image?: string;
  tutorialVideo?: string;
  variantURL?: string;
  taskURL?: string;
  meta?: Record<string, any>;
}

interface Game {
  taskId: string;
  completedOn?: string | Date;
  taskData: TaskData;
}

interface UserData {
  id: string;
  userType: string;
  birthMonth?: number;
  birthYear?: number;
  assessmentPid?: string;
  childIds?: string[];
  classes?: {
    current: string[];
  };
  schools?: {
    current: string[];
  };
}

interface Props {
  games: Game[];
  sequential?: boolean;
  userData: UserData;
}

const props = withDefaults(defineProps<Props>(), {
  sequential: true,
});

const authStore = useAuthStore();
const surveyStore = useSurveyStore();
const assignmentsStore = useAssignmentsStore();
const { selectedAssignment } = storeToRefs(assignmentsStore);
const queryClient = useQueryClient();
const surveyData = queryClient.getQueryData(['surveyResponses', props.userData.id]);
const describedTaskId = ref<string | null>(null);

const getGeneralSurveyProgress = computed((): number => {
  if (surveyStore.isGeneralSurveyComplete) return 100;
  if (!surveyStore.survey) return 0;
  return Math.round(((surveyStore.survey.currentPageNo - 1) / (surveyStore.numGeneralPages - 1)) * 100);
});

const getGeneralSurveyProgressClass = computed((): string => {
  if (getGeneralSurveyProgress.value > 0 && getGeneralSurveyProgress.value < 100) {
    return 'p-progressbar--started';
  }
  if (getGeneralSurveyProgress.value === 100) {
    return 'p-progressbar--completed';
  }
  return 'p-progressbar--empty';
});

const getSpecificSurveyProgress = computed(() => (loopIndex: number): number => {
  if (surveyStore.isSpecificSurveyComplete) return 100;

  const localStorageKey = `${LEVANTE_SURVEY_RESPONSES_KEY}-${props.userData.id}`;
  const localStorageData = JSON.parse(localStorage.getItem(localStorageKey) || '{}');

  if (localStorageData && surveyStore.specificSurveyRelationData[loopIndex]) {
    const specificIdFromServer = surveyStore.specificSurveyRelationData[loopIndex].id;

    if (specificIdFromServer === localStorageData.specificId) {
      if (localStorageData.isComplete) return 100;

      const currentPage = localStorageData.pageNo || 0;
      const totalPages = surveyStore.numSpecificPages || 1;

      return Math.round((currentPage / totalPages) * 100);
    }
  }

  if (!surveyData || !Array.isArray(surveyData)) return 0;

  const currentSurvey = (surveyData as any[]).find((doc) => doc.administrationId === selectedAssignment.value.id);
  if (!currentSurvey || !currentSurvey.specific || !currentSurvey.specific[loopIndex]) return 0;

  const specificSurvey = currentSurvey.specific[loopIndex];
  if (specificSurvey.isComplete) return 100;

  const currentPage = currentSurvey.pageNo || 0;
  const totalPages = surveyStore.numSpecificPages || 1;

  return Math.round((currentPage / totalPages) * 100);
});

const getSpecificSurveyProgressClass = computed(() => (loopIndex: number): string => {
  const value = getSpecificSurveyProgress.value(loopIndex);
  if (value > 0 && value < 100) {
    return 'p-progressbar--started';
  }
  if (value === 100) {
    return 'p-progressbar--completed';
  }
  return 'p-progressbar--empty';
});

const { t, locale } = useI18n();

const toCamelCase = (taskId: string): string => taskId.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
const normalizedLevanteTaskIds = new Set(LEVANTE_TASK_IDS.map((taskId) => toCamelCase(taskId)));
const normalizedRoarTaskIds = new Set(ROAR_TASK_IDS.map((taskId) => toCamelCase(taskId)));

const isLevanteTask = (taskId: string): boolean => normalizedLevanteTaskIds.has(toCamelCase(taskId));
const isRoarTask = (taskId: string): boolean => normalizedRoarTaskIds.has(toCamelCase(taskId));

const getTaskName = (taskId: string, taskName: string): string => {
  // Translate Levante task names. The task name is not the same as the taskId.
  const taskIdLowercased = taskId.toLowerCase();
  const normalizedTaskId = toCamelCase(taskIdLowercased);

  if (taskIdLowercased.includes('survey')) {
    if (props.userData.userType === 'teacher' || props.userData.userType === 'parent') {
      return t(`gameTabs.surveyName${_capitalize(props.userData.userType)}Part1`);
    } else {
      // child
      return t('gameTabs.surveyNameChild');
    }
  }

  if (isLevanteTask(taskIdLowercased)) {
    return t(`gameTabs.${normalizedTaskId}Name`);
  }

  if (isRoarTask(taskIdLowercased)) {
    return t(`gameTabs.${normalizedTaskId}`);
  }

  return taskName;
};

const getTaskDescription = (taskId: string, taskDescription: string): string => {
  // Translate Levante task descriptions if not in English
  const taskIdLowercased = taskId.toLowerCase();
  const normalizedTaskId = toCamelCase(taskIdLowercased);

  if (taskIdLowercased.includes('survey')) {
    if (props.userData.userType === 'teacher' || props.userData.userType === 'parent') {
      return t(`gameTabs.surveyDescription${_capitalize(props.userData.userType)}Part1`);
    } else {
      // child
      return t('gameTabs.surveyDescriptionChild');
    }
  }

  if (isLevanteTask(taskIdLowercased) || isRoarTask(taskIdLowercased)) {
    return t(`gameTabs.${normalizedTaskId}Description`);
  }

  return taskDescription;
};

const getRoutePath = (taskId: string, variantURL?: string, taskURL?: string): string => {
  // do not navigate if the task is external
  if (variantURL || taskURL) return '/';

  const camelizedTaskId = toCamelCase(taskId.toLowerCase());

  if (camelizedTaskId === 'teacherSurvey' || camelizedTaskId === 'caregiverSurvey' || camelizedTaskId === 'survey') {
    return '/survey';
  } else if (normalizedLevanteTaskIds.has(camelizedTaskId)) {
    return '/game/core-tasks/' + taskId;
  } else {
    logger.capture(`Task ${camelizedTaskId} is not a core task`, { taskId });
    return '/game/' + taskId;
  }
};

const currentGameId = computed((): string | undefined => {
  return _get(
    _find(props.games, (game) => {
      return game.completedOn === undefined;
    }),
    'taskId',
  );
});

const gameIndex = computed((): number =>
  _findIndex(props.games, (game) => {
    return game.taskId === currentGameId.value;
  }),
);

const displayGameIndex = computed((): number => (gameIndex.value === -1 ? 0 : gameIndex.value));

const allGamesComplete = computed((): boolean => gameIndex.value === -1);

const isCurrentAssignment = computed((): boolean => getAssignmentStatus(selectedAssignment.value) === ASSIGNMENT_STATUSES.CURRENT);

const isTaskAvailable = (game: Game, index: number): boolean => {
  if (!isCurrentAssignment.value || isTaskComplete(game.completedOn, game.taskId)) return false;
  if (!props.sequential) return true;
  return game.taskId === currentGameId.value && (!allGamesComplete.value || index === 0);
};

const toggleDescription = (taskId: string): void => {
  describedTaskId.value = describedTaskId.value === taskId ? null : taskId;
};

async function routeExternalTask(game: Game): Promise<void> {
  let url: string;

  if (game.taskData?.variantURL) {
    url = game.taskData.variantURL;
  } else if (game.taskData?.taskURL) {
    url = game.taskData.taskURL;
  } else {
    // Not an external task
    return;
  }

  if (game.taskData.name.toLowerCase() === 'mefs') {
    const ageInMonths = getAgeData(props.userData.birthMonth, props.userData.birthYear).ageMonths;
    url += `participantID=${props.userData.id}&participantAgeInMonths=${ageInMonths}&lng=${locale.value}`;
    window.open(url, '_blank')?.focus();
    await (authStore as any).completeAssessment(selectedAssignment.value.id, game.taskId);
  } else {
    url += `&participant=${props.userData.assessmentPid}${
      props.userData.schools?.current?.length ? '&schoolId=' + props.userData.schools.current.join('"%2C"') : ''
    }${props.userData.classes?.current?.length ? '&classId=' + props.userData.classes.current.join('"%2C"') : ''}`;

    await (authStore as any).completeAssessment(selectedAssignment.value.id, game.taskId);
    window.location.href = url;
  }
}

const isTaskComplete = (gameCompletedTime: string | Date | undefined, taskId: string): boolean => {
  if (taskId === 'teacher-survey' || taskId === 'caregiver-survey') {
    if (props.userData.userType === 'teacher' || props.userData.userType === 'parent') {
      if (!surveyStore.isGeneralSurveyComplete) {
        return false;
      } else if (surveyStore.specificSurveyRelationData.length > 0 && !surveyStore.isSpecificSurveyComplete) {
        return false;
      } else {
        return true;
      }
    } else {
      // child
      return surveyStore.isGeneralSurveyComplete;
    }
  }

  return gameCompletedTime ? true : false;
};
</script>

<style scoped lang="scss">
#games {
  width: 100%;
  min-width: 0;
}

.desktop-games {
  display: block;
}

.game-grid.mobile-games {
  display: none;
}

.game-tab-container {
  width: 80vw;
  min-width: 800px;
  max-width: 1200px;
}

.pointer {
  cursor: pointer;
}

.video-player-wrapper {
  width: 100%;
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.roar-tabview-game {
  display: flex;
  flex-direction: row;
  gap: 2rem;
  width: 100%;
  border-radius: 10px;
}

.roar-game-image {
  display: flex;
  justify-content: center;
  width: 100%;
  max-width: 200px;
}

.roar-game-content {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.roar-game-description {
  margin-bottom: 0.5rem;
}

.roar-game-footer {
  margin-top: auto;
  width: 100%;
  text-align: center;
}

.game-btn {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  margin: 0;
  padding: 1rem;
  background: white;
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.1);
  border-radius: 0.5rem;
  font-weight: 700;
  font-size: 1.125rem;
  color: inherit;
  text-decoration: none;
  user-select: none;
  min-width: 300px;
  box-sizing: border-box;
  transition: box-shadow 0.2s ease-in-out;
  border: none;
  cursor: pointer;
  font: inherit;
  appearance: none;

  &[disabled] {
    cursor: not-allowed;
  }

  .pi {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 24px;
    height: 24px;
    margin: 0;
    padding: 0;
    border-radius: 100%;
    background: transparent;
    font-weight: 900;
    font-size: 12px;
    color: white;
  }

  &:hover {
    box-shadow: 3px 3px 7px rgba(0, 0, 0, 0.2);
  }

  &.--disabled {
    cursor: not-allowed;
    box-shadow: none;
    border: 2px solid rgba(var(--bright-yellow-rgb), 0.3);
    background: rgba(var(--bright-yellow-rgb), 0.2);

    .pi {
      background: var(--bright-yellow);
    }

    &:hover {
      background: rgba(var(--bright-yellow-rgb), 0.2);
    }
  }

  &.--completed {
    box-shadow: none;
    border: 2px solid rgba(var(--bright-green-rgb), 0.2);
    background: rgba(var(--bright-green-rgb), 0.1);

    .pi {
      background: var(--bright-green);
    }

    &:hover {
      background: rgba(var(--bright-green-rgb), 0.1);
    }
  }

  &.--incomplete {
    cursor: not-allowed;
    box-shadow: none;
    border: 2px solid rgba(var(--bright-red-rgb), 0.2);
    background: rgba(var(--bright-red-rgb), 0.1);

    .pi {
      background: var(--bright-red);
    }

    &:hover {
      background: rgba(var(--bright-red-rgb), 0.1);
    }
  }
}

.p-progressbar {
  flex-grow: 1;
  width: 100%;

  &.p-progressbar--started :deep(.p-progressbar-value) {
    background-color: var(--yellow-400);
  }

  &.p-progressbar--completed :deep(.p-progressbar-value) {
    background-color: var(--green-500);
  }
}

.game-grid {
  --game-tile-size: 128px;

  display: grid;
  grid-template-columns: repeat(5, var(--game-tile-size));
  justify-content: center;
  justify-items: center;
  gap: 2.25rem clamp(1.25rem, 3vw, 3.5rem);
  width: 100%;
}

.game-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  width: var(--game-tile-size);
  min-width: 0;
}

.game-tile__square {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--game-tile-size);
  height: var(--game-tile-size);
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: 16px;
  background: var(--surface-100);
  color: inherit;
  text-decoration: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.game-tile__square img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.game-tile__square > .pi {
  font-size: 2.5rem;
  color: var(--primary-color);
}

.game-tile.--available .game-tile__square:hover,
.game-tile.--available .game-tile__square:focus-visible {
  border-color: var(--primary-color);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.16);
  transform: translateY(-1px);
}

.game-tile__square.--disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.game-tile__info,
.game-tile__complete,
.game-tile__play {
  position: absolute;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
}

.game-tile__info {
  top: 0.5rem;
  left: 0.5rem;
  width: 1.25rem;
  height: 1.25rem;
  padding: 0.25rem;
  border: 1px solid var(--surface-600);
  background: var(--surface-0);
  box-sizing: border-box;
  color: var(--surface-600);
  cursor: pointer;
  font-size: 0.375rem;
  line-height: 1;
}

.game-tile__info .pi {
  font-size: 0.5625rem;
}

.game-tile__complete {
  top: 0.5rem;
  right: 0.5rem;
  width: 1.75rem;
  height: 1.75rem;
  background: var(--bright-green);
  color: white;
  font-size: 0.9375rem;
}

.game-tile__play {
  right: 0.5rem;
  bottom: 0.5rem;
  width: 2rem;
  height: 2rem;
  background: var(--primary-color);
  color: var(--primary-color-text);
  font-size: 0.75rem;
}

.game-tile.--completed .game-tile__play {
  background: var(--bright-green);
}

.game-tile.--locked .game-tile__play {
  background: var(--surface-500);
}

.game-tile__description {
  position: absolute;
  inset: 0 auto auto 0;
  z-index: 2;
  display: none;
  width: var(--game-tile-size);
  height: var(--game-tile-size);
  margin: 0;
  padding: 1.75rem 0.625rem 0.5rem;
  overflow: hidden;
  border: 2px solid var(--primary-color);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--text-color);
  font-size: 0.875rem;
  line-height: 1.2;
  text-align: center;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 5;
  align-content: center;
}

.game-tile.--described .game-tile__description {
  display: -webkit-box;
}

@media (hover: hover) {
  .game-tile:hover .game-tile__description {
    display: -webkit-box;
  }
}

.game-tile__name {
  width: 100%;
  margin: 0.875rem 0 0;
  color: var(--text-color);
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.35;
  text-align: center;
}

.game-tile.--locked .game-tile__name {
  color: var(--text-color-secondary);
}

@media screen and (max-width: 1280px) {
  .game-grid {
    grid-template-columns: repeat(4, var(--game-tile-size));
  }
}

@media screen and (max-width: 1080px) {
  .game-grid {
    grid-template-columns: repeat(3, var(--game-tile-size));
  }
}

@media screen and (max-width: 820px) {
  .desktop-games {
    display: none;
  }

  .game-grid.mobile-games {
    display: grid;
  }

  .game-grid {
    grid-template-columns: repeat(2, var(--game-tile-size));
    justify-content: start;
    gap: 2rem 2rem;
    padding-bottom: 2rem;
  }

  .game-tile__description {
    padding: 1.625rem 0.5rem 0.5rem;
    font-size: 0.875rem;
    line-height: 1.15;
    -webkit-line-clamp: 5;
  }
}

@media screen and (min-width: 480px) and (max-width: 820px) {
  .game-grid {
    grid-template-columns: repeat(3, var(--game-tile-size));
  }
}

@media screen and (min-width: 640px) and (max-width: 820px) {
  .game-grid {
    grid-template-columns: repeat(4, var(--game-tile-size));
  }
}

@media screen and (min-width: 760px) and (max-width: 820px) {
  .game-grid {
    grid-template-columns: repeat(5, var(--game-tile-size));
  }
}

@media screen and (max-width: 340px) {
  .game-grid {
    --game-tile-size: 112px;
  }
}
</style>
