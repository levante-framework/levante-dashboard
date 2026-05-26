<template>
  <div id="games">
    <div class="game-grid" role="list">
      <div
        v-for="game in games"
        :key="game.taskId"
        class="game-tile"
        :class="{
          '--available': isTaskAvailable(game),
          '--completed': isTaskComplete(game.completedOn, game.taskId),
          '--locked': !isTaskAvailable(game) && !isTaskComplete(game.completedOn, game.taskId),
          '--described': describedTaskId === game.taskId,
          '--multipart-survey': isMultiPartSurvey(game.taskId),
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
          v-if="isTaskAvailable(game)"
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

        <p v-if="!isMultiPartSurvey(game.taskId)" class="game-tile__description">
          {{ getTaskDescription(game.taskId, game.taskData.description) }}
        </p>

        <div
          v-else
          class="game-tile__survey-overlay"
          role="group"
          :aria-label="getTaskName(game.taskId, game.taskData.name)"
        >
          <button
            v-for="part in getSurveyParts()"
            :key="part.key"
            class="survey-part"
            type="button"
            :disabled="!isTaskAvailable(game) || part.isComplete || part.isLocked"
            @click="launchSurveyPart(part)"
          >
            <span
              class="survey-part__progress"
              :style="{ '--survey-progress': `${part.progress * 3.6}deg` }"
              :aria-label="`${part.label}: ${part.progress}%`"
            >
              <span class="survey-part__progress-value">{{ part.progress }}%</span>
            </span>
            <span class="survey-part__label">{{ part.label }}</span>
          </button>
        </div>

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
import { getAgeData } from '@bdelab/roar-utils';
import { useAuthStore } from '@/store/auth';
import { useSurveyStore } from '@/store/survey';
import _capitalize from 'lodash/capitalize';
import { useAssignmentsStore } from '@/store/assignments';
import { ASSIGNMENT_STATUSES } from '@/constants';
import { getAssignmentStatus } from '@/helpers/assignments';
import { useRouter } from 'vue-router';
import { useQueryClient } from '@tanstack/vue-query';
import { LEVANTE_SURVEY_RESPONSES_KEY } from '@/constants/bucket';
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

interface SurveyPart {
  key: string;
  label: string;
  type: 'general' | 'specific';
  index: number;
  progress: number;
  isComplete: boolean;
  isLocked: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  sequential: true,
});

const authStore = useAuthStore();
const surveyStore = useSurveyStore();
const assignmentsStore = useAssignmentsStore();
const { selectedAssignment } = storeToRefs(assignmentsStore);
const queryClient = useQueryClient();
const router = useRouter();
const describedTaskId = ref<string | null>(null);

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

const isCurrentAssignment = computed(
  (): boolean => getAssignmentStatus(selectedAssignment.value) === ASSIGNMENT_STATUSES.CURRENT,
);

const surveyResponseDoc = computed(() => {
  const surveyResponsesData = queryClient.getQueryData(['surveyResponses', props.userData.id]);

  if (!Array.isArray(surveyResponsesData)) return null;

  return surveyResponsesData.find((doc) => doc?.administrationId === selectedAssignment.value?.id) ?? null;
});

const isTaskAvailable = (game: Game): boolean => {
  if (!isCurrentAssignment.value || isTaskComplete(game.completedOn, game.taskId)) return false;
  if (!props.sequential) return true;
  return game.taskId === currentGameId.value;
};

const toggleDescription = (taskId: string): void => {
  describedTaskId.value = describedTaskId.value === taskId ? null : taskId;
};

const isMultiPartSurvey = (taskId: string): boolean => {
  return (
    taskId.toLowerCase().includes('survey') &&
    (props.userData.userType === 'teacher' || props.userData.userType === 'parent')
  );
};

const getStoredSurveyProgress = (specificId = 0): number | null => {
  const localStorageData = JSON.parse(
    window.localStorage.getItem(`${LEVANTE_SURVEY_RESPONSES_KEY}-${props.userData.id}`) || '{}',
  );

  if (!localStorageData || localStorageData.specificId !== specificId) return null;
  if (localStorageData.isComplete) return 100;

  const totalPages = localStorageData.isGeneral ? surveyStore.numGeneralPages : surveyStore.numSpecificPages;
  if (!totalPages) return 0;

  return Math.min(99, Math.round(((localStorageData.pageNo || 0) / totalPages) * 100));
};

const getGeneralSurveyProgress = (): number => {
  if (surveyStore.isGeneralSurveyComplete || surveyResponseDoc.value?.general?.isComplete) return 100;

  const localProgress = getStoredSurveyProgress(0);
  if (localProgress !== null) return localProgress;

  if (!surveyStore.survey || !surveyStore.numGeneralPages) return 0;

  return Math.min(99, Math.round(((surveyStore.survey.currentPageNo || 0) / surveyStore.numGeneralPages) * 100));
};

const getSpecificSurveyProgress = (index: number, specificId: string | number): number => {
  const specificResponse = surveyResponseDoc.value?.specific?.[index];
  if (specificResponse?.isComplete) return 100;

  const localProgress = getStoredSurveyProgress(Number(specificId));
  if (localProgress !== null) return localProgress;

  if (!specificResponse || !surveyStore.numSpecificPages) return 0;

  return Math.min(99, Math.round(((surveyResponseDoc.value?.pageNo || 0) / surveyStore.numSpecificPages) * 100));
};

const getSpecificSurveyLabel = (relation: Record<string, unknown> | undefined, index: number): string => {
  if (props.userData.userType === 'teacher') {
    return (relation?.name as string) || `${t('gameTabs.surveyProgressSpecificTeacher')} ${index + 1}`;
  }

  const childLabel = t('gameTabs.surveyProgressSpecificParent');
  if (relation?.birthMonth || relation?.birthYear) {
    return `${childLabel} ${relation.birthMonth ?? ''}/${relation.birthYear ?? ''}`.trim();
  }

  return `${childLabel} ${index + 1}`;
};

const getSurveyParts = (): SurveyPart[] => {
  const generalComplete = surveyStore.isGeneralSurveyComplete || surveyResponseDoc.value?.general?.isComplete;

  const parts: SurveyPart[] = [
    {
      key: 'general',
      label:
        props.userData.userType === 'teacher'
          ? t('gameTabs.surveyProgressGeneralTeacher')
          : t('gameTabs.surveyProgressGeneralParent'),
      type: 'general',
      index: 0,
      progress: getGeneralSurveyProgress(),
      isComplete: Boolean(generalComplete),
      isLocked: false,
    },
  ];

  const relationIds =
    props.userData.userType === 'teacher' ? props.userData.classes?.current ?? [] : props.userData.childIds ?? [];

  surveyStore.specificSurveyRelationData.forEach((relation: Record<string, unknown>, index: number) => {
    const specificId = relation?.id ?? relationIds[index] ?? index;
    const progress = getSpecificSurveyProgress(index, specificId as string | number);

    parts.push({
      key: `specific-${specificId}`,
      label: getSpecificSurveyLabel(relation, index),
      type: 'specific',
      index,
      progress,
      isComplete: progress === 100,
      isLocked: !parts[0].isComplete,
    });
  });

  return parts;
};

const setSurveyResponses = (responses?: Record<string, { responseValue?: unknown } | unknown>): void => {
  if (!surveyStore.survey || !responses) return;

  surveyStore.survey.data = Object.fromEntries(
    Object.entries(responses).map(([key, value]) => [
      key,
      (value as { responseValue?: unknown })?.responseValue ?? value,
    ]),
  );
};

const launchSurveyPart = (part: SurveyPart): void => {
  if (part.isComplete || part.isLocked) return;

  if (part.type === 'general') {
    surveyStore.setIsGeneralSurveyComplete(false);
    surveyStore.setSpecificSurveyRelationIndex(0);
    setSurveyResponses(surveyResponseDoc.value?.general?.responses);
  } else {
    surveyStore.setIsGeneralSurveyComplete(true);
    surveyStore.setSpecificSurveyRelationIndex(part.index);
    setSurveyResponses(surveyResponseDoc.value?.specific?.[part.index]?.responses);
  }

  if (surveyStore.survey) {
    surveyStore.survey.currentPageNo =
      part.progress > 0 && part.progress < 100 ? surveyResponseDoc.value?.pageNo || 0 : 0;
  }

  router.push({ path: '/survey' });
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

.game-grid {
  --game-tile-size: clamp(150px, 9vw, 200px);

  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--game-tile-size)), var(--game-tile-size)));
  justify-content: start;
  justify-items: center;
  gap: 2.5rem clamp(1rem, 2.5vw, 3rem);
  width: 100%;
  max-width: 100%;
  overflow-x: clip;
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

.game-tile::after {
  position: absolute;
  top: -1px;
  left: -1px;
  z-index: 7;
  display: none;
  width: calc(var(--game-tile-size) + 2px);
  height: calc(var(--game-tile-size) + 2px);
  border: 3px solid var(--primary-color);
  border-radius: 18px;
  pointer-events: none;
  content: '';
}

.game-tile.--available:hover::after,
.game-tile.--available.--described::after {
  display: block;
}

.game-tile__square {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--game-tile-size);
  height: var(--game-tile-size);
  overflow: visible;
  border: 0;
  border-radius: 18px;
  background: var(--surface-100);
  color: inherit;
  text-decoration: none;
  transition:
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.game-tile__square img {
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 18px;
  object-fit: contain;
}

.game-tile__square > .pi {
  font-size: 2.5rem;
  color: var(--primary-color);
}

.game-tile.--available .game-tile__square:hover,
.game-tile.--available .game-tile__square:focus-visible {
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
  top: 0.625rem;
  left: 0.625rem;
  width: clamp(1.25rem, 1.35vw, 1.5rem);
  height: clamp(1.25rem, 1.35vw, 1.5rem);
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
  font-size: clamp(0.5625rem, 0.65vw, 0.75rem);
}

.game-tile__complete {
  top: 0.625rem;
  right: 0.625rem;
  width: clamp(1.75rem, 1.8vw, 2.125rem);
  height: clamp(1.75rem, 1.8vw, 2.125rem);
  background: var(--bright-green);
  color: white;
  font-size: clamp(0.9375rem, 1vw, 1.125rem);
}

.game-tile__play {
  z-index: 5;
  top: calc(var(--game-tile-size) - 3rem);
  right: 0.75rem;
  bottom: auto;
  width: clamp(2rem, 2vw, 2.375rem);
  height: clamp(2rem, 2vw, 2.375rem);
  background: var(--primary-color);
  color: var(--primary-color-text);
  font-size: clamp(0.75rem, 0.8vw, 0.9375rem);
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
  z-index: 3;
  display: none;
  width: var(--game-tile-size);
  height: var(--game-tile-size);
  margin: 0;
  padding: clamp(1.75rem, 2vw, 2.25rem) clamp(0.625rem, 1vw, 1rem) 0.75rem;
  overflow: hidden;
  border: 0;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--text-color);
  font-size: clamp(0.875rem, 0.85vw, 1.0625rem);
  line-height: 1.2;
  text-align: center;
  pointer-events: none;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 5;
  align-content: center;
}

.game-tile.--described .game-tile__info,
.game-tile:hover .game-tile__info,
.game-tile.--described .game-tile__complete,
.game-tile:hover .game-tile__complete,
.game-tile.--described .game-tile__play,
.game-tile:hover .game-tile__play {
  z-index: 6;
}

.game-tile.--multipart-survey.--described .game-tile__info,
.game-tile.--multipart-survey:hover .game-tile__info {
  z-index: 9;
}

.game-tile.--described .game-tile__description {
  display: -webkit-box;
}

.game-tile__survey-overlay {
  position: absolute;
  inset: 0 auto auto 0;
  z-index: 8;
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 0.375rem;
  width: var(--game-tile-size);
  height: var(--game-tile-size);
  margin: 0;
  padding: clamp(1.5rem, 1.75vw, 1.875rem) 0.5rem 0.625rem;
  overflow-x: hidden;
  overflow-y: auto;
  border: 0;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.94);
  pointer-events: auto;
}

.game-tile.--described .game-tile__survey-overlay {
  display: flex;
}

.survey-part {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  min-width: 0;
  padding: 0.25rem 0.375rem;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-color);
  cursor: pointer;
  text-align: left;
  transition: background-color 0.15s ease;
}

.survey-part:hover:not(:disabled) {
  background: var(--surface-100);
}

.survey-part:disabled {
  cursor: not-allowed;
}

.survey-part__progress {
  --ring-size: clamp(1.75rem, 1.8vw, 2rem);

  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: var(--ring-size);
  height: var(--ring-size);
  border-radius: 999px;
  background: conic-gradient(var(--primary-color) var(--survey-progress), var(--surface-200) 0);
}

.survey-part__progress::before {
  position: absolute;
  width: calc(var(--ring-size) - 6px);
  height: calc(var(--ring-size) - 6px);
  border-radius: 999px;
  background: var(--surface-0);
  content: '';
}

.survey-part__progress-value {
  position: relative;
  z-index: 1;
  color: var(--text-color);
  font-size: clamp(0.5625rem, 0.55vw, 0.6875rem);
  font-weight: 600;
  line-height: 1;
}

.survey-part__label {
  overflow: hidden;
  color: var(--text-color);
  font-size: clamp(0.6875rem, 0.7vw, 0.8125rem);
  font-weight: 500;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.survey-part:disabled .survey-part__label {
  color: var(--text-color-secondary);
}

@media (hover: hover) {
  .game-tile:hover .game-tile__description {
    display: -webkit-box;
  }

  .game-tile.--multipart-survey.--available:hover .game-tile__survey-overlay {
    display: flex;
  }
}

.game-tile__name {
  width: 100%;
  margin: 1rem 0 0;
  color: var(--text-color);
  font-size: clamp(1rem, 1vw, 1.25rem);
  font-weight: 500;
  line-height: 1.35;
  text-align: center;
}

.game-tile.--locked .game-tile__name {
  color: var(--text-color-secondary);
}

@media screen and (max-width: 820px) {
  .game-grid {
    --game-tile-size: 128px;

    grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--game-tile-size)), var(--game-tile-size)));
    gap: 2rem 2rem;
    padding-bottom: 2rem;
  }

  .game-tile__description {
    padding: 1.625rem 0.5rem 0.5rem;
    font-size: 0.875rem;
    line-height: 1.15;
    -webkit-line-clamp: 5;
  }

  .game-tile__survey-overlay {
    padding: 1.5rem 0.375rem 0.5rem;
    gap: 0.25rem;
  }
}

@media screen and (max-width: 340px) {
  .game-grid {
    --game-tile-size: min(112px, 100%);
  }
}
</style>
