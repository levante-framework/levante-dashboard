<template>
  <div id="games">
    <div class="game-grid" role="list">
      <div
        v-for="game in displayGames"
        :key="game.gameCardId"
        class="game-tile"
        :class="{
          '--available': isTaskAvailable(game),
          '--completed': isTaskComplete(game),
          '--locked': !isTaskAvailable(game) && !isTaskComplete(game),
          '--described': !game.surveyPart && describedGameCardId === game.gameCardId,
          '--survey-part': Boolean(game.surveyPart),
        }"
        role="listitem"
      >
        <button
          class="game-tile__info"
          type="button"
          :aria-label="getTaskDescription(game)"
          :aria-expanded="game.surveyPart ? descriptionModal?.gameCardId === game.gameCardId : describedGameCardId === game.gameCardId"
          @click="onInfoClick(game)"
        >
          <i class="pi pi-info"></i>
        </button>

        <i v-if="isTaskComplete(game)" class="game-tile__complete pi pi-check"></i>

        <router-link
          v-if="isTaskAvailable(game)"
          class="game-tile__square"
          :to="{ path: getRoutePath(game) }"
          :aria-label="`${$t('gameTabs.clickToStart')}: ${getTaskName(game)}`"
          @click="onGameCardClick($event, game)"
        >
          <img v-if="game.taskData.image" :src="game.taskData.image" :alt="getTaskImageAlt(game)" />
          <img v-else src="https://reading.stanford.edu/wp-content/uploads/2021/10/PA-1024x512.png" :alt="getTaskImageAlt(game)" />
        </router-link>

        <div v-else class="game-tile__square --disabled">
          <img v-if="game.taskData.image" :src="game.taskData.image" :alt="getTaskImageAlt(game)" />
          <img v-else src="https://reading.stanford.edu/wp-content/uploads/2021/10/PA-1024x512.png" :alt="getTaskImageAlt(game)" />
        </div>

        <span v-if="isTaskAvailable(game) && !game.surveyPart" class="game-tile__play game-tile__play--active" aria-hidden="true">
          <i class="pi pi-play"></i>
        </span>
        <span v-else-if="!isTaskComplete(game) && !game.surveyPart" class="game-tile__play game-tile__play--locked" aria-hidden="true">
          <i class="pi pi-lock"></i>
        </span>

        <p v-if="!game.surveyPart" class="game-tile__description">
          {{ getTaskDescription(game) }}
        </p>

        <div
          v-else
          class="game-tile__progress-wheel"
          :style="{ '--survey-progress': `${getSurveyPartProgressValue(game) * 3.6}deg` }"
          :aria-label="`${getTaskName(game)}: ${getSurveyPartProgressValue(game)}%`"
        >
          <span class="game-tile__progress-wheel-value">{{ getSurveyPartProgressValue(game) }}%</span>
        </div>

        <h3 class="game-tile__name">
          {{ getTaskName(game) }}
        </h3>
      </div>
    </div>

    <PvDialog
      v-model:visible="isDescriptionModalOpen"
      modal
      :header="descriptionModal?.title"
      :style="{ width: 'min(90vw, 32rem)' }"
      :draggable="false"
    >
      <p class="game-tile__modal-description">{{ descriptionModal?.description }}</p>
    </PvDialog>
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import _find from 'lodash/find';
// @ts-expect-error - @bdelab/roar-utils has no type declarations
import { getAgeData } from '@bdelab/roar-utils';
import { useRouter } from 'vue-router';
import { useQueryClient } from '@tanstack/vue-query';
import useSurveyResponsesQuery from '@/composables/queries/useSurveyResponsesQuery';
import { SURVEY_RESPONSES_QUERY_KEY } from '@/constants/queryKeys';
import PvDialog from 'primevue/dialog';
import { useAuthStore } from '@/store/auth';
import { useSurveyStore } from '@/store/survey';
import { useAssignmentsStore } from '@/store/assignments';
import { ASSIGNMENT_STATUSES } from '@/constants';
import { getAssignmentStatus } from '@/helpers/assignments';
import { LEVANTE_TASK_IDS, ROAR_TASK_IDS } from '@/constants/coreTasks';
import { logger } from '@/logger';
import type { AdministrationType } from '@levante-framework/levante-zod';
import type { DisplayGame, Game, SurveyResponseDoc } from '@/types/surveyGameCards';
import {
  expandGamesForDisplay,
  getSurveyPartProgress,
  isSurveyPartComplete,
  isSurveyPartLocked,
} from '@/helpers/surveyGameCards';

interface SelectedAssignment extends AdministrationType {
  id: string;
}

interface SurveyInstance {
  data: Record<string, unknown>;
  currentPageNo: number;
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

interface DescriptionModalState {
  gameCardId: string;
  title: string;
  description: string;
}

const props = withDefaults(defineProps<Props>(), {
  sequential: true,
});

const authStore = useAuthStore();
const surveyStore = useSurveyStore();
const assignmentsStore = useAssignmentsStore();
const { selectedAssignment } = storeToRefs(assignmentsStore);
const activeAssignment = computed(
  (): SelectedAssignment | null => selectedAssignment.value as SelectedAssignment | null,
);
const queryClient = useQueryClient();
const { data: surveyResponsesData } = useSurveyResponsesQuery();
const router = useRouter();
const describedGameCardId = ref<string | null>(null);
const descriptionModal = ref<DescriptionModalState | null>(null);

const { t, locale } = useI18n();

const isDescriptionModalOpen = computed({
  get: () => descriptionModal.value !== null,
  set: (visible: boolean) => {
    if (!visible) descriptionModal.value = null;
  },
});

const toCamelCase = (taskId: string): string => taskId.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
const normalizedLevanteTaskIds = new Set(LEVANTE_TASK_IDS.map((taskId) => toCamelCase(taskId)));
const normalizedRoarTaskIds = new Set(ROAR_TASK_IDS.map((taskId) => toCamelCase(taskId)));

const isLevanteTask = (taskId: string): boolean => normalizedLevanteTaskIds.has(toCamelCase(taskId));
const isRoarTask = (taskId: string): boolean => normalizedRoarTaskIds.has(toCamelCase(taskId));

const relationIds = computed((): (string | number)[] => {
  if (props.userData.userType === 'teacher') return props.userData.classes?.current ?? [];
  return props.userData.childIds ?? [];
});

const surveyResponseDoc = computed((): SurveyResponseDoc | null => {
  const responses =
    surveyResponsesData.value ??
    queryClient.getQueryData<SurveyResponseDoc[]>([SURVEY_RESPONSES_QUERY_KEY]);

  if (!responses) return null;

  const assignmentId = activeAssignment.value?.id;
  if (!assignmentId) return null;

  return responses.find((doc: SurveyResponseDoc) => doc?.administrationId === assignmentId) ?? null;
});

const displayGames = computed((): DisplayGame[] =>
  expandGamesForDisplay(
    props.games,
    props.userData.userType,
    surveyStore.specificSurveyRelationData,
    relationIds.value,
  ),
);

const getSurveyPartName = (game: DisplayGame): string => {
  const part = game.surveyPart;
  if (!part) return game.taskData.name;

  if (part.type === 'general') {
    if (props.userData.userType === 'teacher') return t('gameTabs.surveyNameTeacherPart1');
    return `Survey - ${t('gameTabs.surveyProgressGeneral')}`;
  }

  if (props.userData.userType === 'teacher') {
    const relation = surveyStore.specificSurveyRelationData[part.index] as Record<string, unknown> | undefined;
    const classroomName = relation?.name as string | undefined;
    return classroomName
      ? `${t('gameTabs.surveyNameTeacherPart2')}: ${classroomName}`
      : t('gameTabs.surveyNameTeacherPart2');
  }

  const relation = surveyStore.specificSurveyRelationData[part.index] as Record<string, unknown> | undefined;
  const childNumber = part.index + 1;
  if (relation?.birthMonth || relation?.birthYear) {
    return `Survey - ${t('gameTabs.surveyProgressSpecificParent')} ${childNumber} (${relation.birthMonth ?? ''}/${
      relation.birthYear ?? ''
    })`;
  }

  return `Survey - ${t('gameTabs.surveyProgressSpecificParent')} ${childNumber}`;
};

const getSurveyPartDescription = (game: DisplayGame): string => {
  const part = game.surveyPart;
  if (!part) return game.taskData.description;

  if (props.userData.userType === 'teacher') {
    return part.type === 'general'
      ? t('gameTabs.surveyDescriptionTeacherPart1')
      : t('gameTabs.surveyDescriptionTeacherPart2');
  }

  return part.type === 'general'
    ? t('gameTabs.surveyDescriptionParentPart2')
    : t('gameTabs.surveyDescriptionParentPart1');
};

const getTaskName = (game: DisplayGame): string => {
  if (game.surveyPart) return getSurveyPartName(game);

  const taskIdLowercased = game.taskId.toLowerCase();
  const normalizedTaskId = toCamelCase(taskIdLowercased);

  if (taskIdLowercased.includes('survey')) {
    return t('gameTabs.surveyNameChild');
  }

  if (isLevanteTask(taskIdLowercased)) return t(`gameTabs.${normalizedTaskId}Name`);
  if (isRoarTask(taskIdLowercased)) return t(`gameTabs.${normalizedTaskId}`);

  return game.taskData.name;
};

const getTaskImageAlt = (game: DisplayGame): string => `${getTaskName(game)} thumbnail`;

const getTaskDescription = (game: DisplayGame): string => {
  if (game.surveyPart) return getSurveyPartDescription(game);

  const taskIdLowercased = game.taskId.toLowerCase();
  const normalizedTaskId = toCamelCase(taskIdLowercased);

  if (taskIdLowercased.includes('survey')) {
    return t('gameTabs.surveyDescriptionChild');
  }

  if (isLevanteTask(taskIdLowercased) || isRoarTask(taskIdLowercased)) {
    return t(`gameTabs.${normalizedTaskId}Description`);
  }

  return game.taskData.description;
};

const getRoutePath = (game: DisplayGame): string => {
  const { taskId, taskData } = game;
  if (taskData?.variantURL || taskData?.taskURL) return '/';

  const camelizedTaskId = toCamelCase(taskId.toLowerCase());

  if (camelizedTaskId === 'teacherSurvey' || camelizedTaskId === 'caregiverSurvey' || camelizedTaskId === 'survey') {
    return '/survey';
  }

  if (normalizedLevanteTaskIds.has(camelizedTaskId)) return '/game/core-tasks/' + taskId;

  logger.capture(`Task ${camelizedTaskId} is not a core task`, { taskId });
  return '/game/' + taskId;
};

const getSurveyPartProgressValue = (game: DisplayGame): number => {
  if (!game.surveyPart) return 0;

  return getSurveyPartProgress(
    game.surveyPart,
    props.userData.id,
    surveyStore,
    surveyResponseDoc.value,
    relationIds.value,
  );
};

const currentGameCardId = computed((): string | undefined => {
  return _find(displayGames.value, (game) => !isTaskComplete(game))?.gameCardId;
});

const isCurrentAssignment = computed((): boolean => {
  const assignment = activeAssignment.value;
  if (!assignment) return false;
  return getAssignmentStatus(assignment) === ASSIGNMENT_STATUSES.CURRENT;
});

const getSurveyInstance = (): SurveyInstance | null => surveyStore.survey as SurveyInstance | null;

const isSurveyPartGameCardComplete = (game: DisplayGame): boolean => {
  if (!game.surveyPart) return false;
  return isSurveyPartComplete(game.surveyPart, surveyStore, surveyResponseDoc.value);
};

const isSurveyPartGameCardLocked = (game: DisplayGame): boolean => {
  if (!game.surveyPart) return false;
  return isSurveyPartLocked(game.surveyPart, surveyStore, surveyResponseDoc.value);
};

const isTaskComplete = (game: DisplayGame): boolean => {
  if (game.surveyPart) return isSurveyPartGameCardComplete(game);

  return Boolean(game.completedOn);
};

const isTaskAvailable = (game: DisplayGame): boolean => {
  if (!isCurrentAssignment.value || isTaskComplete(game)) return false;
  if (game.surveyPart && isSurveyPartGameCardLocked(game)) return false;
  if (!props.sequential) return true;
  return game.gameCardId === currentGameCardId.value;
};

const onInfoClick = (game: DisplayGame): void => {
  if (game.surveyPart) {
    descriptionModal.value = {
      gameCardId: game.gameCardId,
      title: getTaskName(game),
      description: getTaskDescription(game),
    };
    return;
  }

  describedGameCardId.value = describedGameCardId.value === game.gameCardId ? null : game.gameCardId;
};

const setSurveyResponses = (responses?: Record<string, { responseValue?: unknown } | unknown>): void => {
  const surveyInstance = getSurveyInstance();
  if (!surveyInstance || !responses) return;

  surveyInstance.data = Object.fromEntries(
    Object.entries(responses).map(([key, value]) => [
      key,
      (value as { responseValue?: unknown })?.responseValue ?? value,
    ]),
  );
};

const launchSurveyPart = (game: DisplayGame): void => {
  const part = game.surveyPart;
  if (!part || isSurveyPartGameCardComplete(game) || isSurveyPartGameCardLocked(game)) return;

  if (part.type === 'general') {
    surveyStore.setIsGeneralSurveyComplete(false);
    surveyStore.setSpecificSurveyRelationIndex(0);
    setSurveyResponses(surveyResponseDoc.value?.general?.responses);
  } else {
    surveyStore.setIsGeneralSurveyComplete(true);
    surveyStore.setSpecificSurveyRelationIndex(part.index);
    setSurveyResponses(surveyResponseDoc.value?.specific?.[part.index]?.responses);
  }

  const progress = getSurveyPartProgressValue(game);
  const surveyInstance = getSurveyInstance();
  if (surveyInstance) {
    surveyInstance.currentPageNo = progress > 0 && progress < 100 ? surveyResponseDoc.value?.pageNo || 0 : 0;
  }

  router.push({ path: '/survey' });
};

const onGameCardClick = async (event: MouseEvent, game: DisplayGame): Promise<void> => {
  if (game.taskData?.variantURL || game.taskData?.taskURL) {
    event.preventDefault();
    await routeExternalTask(game);
    return;
  }

  if (game.surveyPart) {
    event.preventDefault();
    launchSurveyPart(game);
  }
};

async function routeExternalTask(game: DisplayGame): Promise<void> {
  const assignment = activeAssignment.value;
  if (!assignment?.id) return;

  let url: string;

  if (game.taskData?.variantURL) {
    url = game.taskData.variantURL;
  } else if (game.taskData?.taskURL) {
    url = game.taskData.taskURL;
  } else {
    return;
  }

  if (game.taskData.name.toLowerCase() === 'mefs') {
    const ageInMonths = getAgeData(props.userData.birthMonth, props.userData.birthYear).ageMonths;
    url += `participantID=${props.userData.id}&participantAgeInMonths=${ageInMonths}&lng=${locale.value}`;
    window.open(url, '_blank')?.focus();
    await authStore.completeAssessment(assignment.id, game.taskId);
  } else {
    url += `&participant=${props.userData.assessmentPid}${
      props.userData.schools?.current?.length ? '&schoolId=' + props.userData.schools.current.join('"%2C"') : ''
    }${props.userData.classes?.current?.length ? '&classId=' + props.userData.classes.current.join('"%2C"') : ''}`;

    await authStore.completeAssessment(assignment.id, game.taskId);
    window.location.href = url;
  }
}
</script>

<style scoped lang="scss">
#games {
  width: 100%;
  min-width: 0;
}

.game-grid {
  --game-tile-size: clamp(150px, 9vw, 200px);
  --game-tile-radius: 26px;

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
  top: 0;
  left: 0;
  z-index: 7;
  display: none;
  box-sizing: border-box;
  width: var(--game-tile-size);
  height: var(--game-tile-size);
  border: 2px solid #fcd7b8;
  border-radius: var(--game-tile-radius);
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
  border-radius: var(--game-tile-radius);
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
  border-radius: var(--game-tile-radius);
  object-fit: contain;
}

.game-tile__square > .pi {
  font-size: 2.5rem;
  color: var(--primary-color);
}

.game-tile.--available:hover .game-tile__square,
.game-tile.--available.--described .game-tile__square,
.game-tile.--available .game-tile__square:focus-visible {
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.16);
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

.game-tile__play--active,
.game-tile__play--locked {
  top: calc(var(--game-tile-size) - 3rem);
  right: 0.75rem;
  bottom: auto;
  width: clamp(2rem, 2vw, 2.375rem);
  height: clamp(2rem, 2vw, 2.375rem);
  box-sizing: border-box;
  pointer-events: none;
}

.game-tile__play--active {
  z-index: 5;
  display: none;
  border: 2px solid var(--primary-color);
  background: rgba(255, 255, 255, 0.55);
  color: var(--primary-color);
  font-size: clamp(0.75rem, 0.8vw, 0.9375rem);
}

.game-tile__play--locked {
  z-index: 5;
  border: 2px solid var(--surface-500);
  background: rgba(255, 255, 255, 0.55);
  color: var(--surface-600);
  font-size: clamp(0.75rem, 0.8vw, 0.9375rem);
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
  border-radius: var(--game-tile-radius);
  background: rgba(255, 255, 255, 0.72);
  color: var(--text-color);
  font-size: clamp(0.875rem, 0.85vw, 1.0625rem);
  line-height: 1.2;
  text-align: center;
  pointer-events: none;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 5;
  line-clamp: 5;
  align-content: center;
}

.game-tile__progress-wheel {
  --wheel-size: clamp(4.5rem, 4.8vw, 5.5rem);

  position: absolute;
  inset: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--game-tile-size);
  height: var(--game-tile-size);
  border-radius: var(--game-tile-radius);
  background: rgba(255, 255, 255, 0.94);
  pointer-events: none;
}

.game-tile__progress-wheel::before {
  position: absolute;
  width: var(--wheel-size);
  height: var(--wheel-size);
  border-radius: 999px;
  background: conic-gradient(from -90deg, var(--bright-green) var(--survey-progress), var(--surface-300) 0);
  content: '';
}

.game-tile__progress-wheel::after {
  position: absolute;
  width: calc(var(--wheel-size) - 10px);
  height: calc(var(--wheel-size) - 10px);
  border-radius: 999px;
  background: var(--surface-0);
  content: '';
}

.game-tile__progress-wheel-value {
  position: relative;
  z-index: 1;
  color: var(--text-color);
  font-size: clamp(0.875rem, 0.85vw, 1rem);
  font-weight: 600;
  line-height: 1;
}

.game-tile.--described .game-tile__info,
.game-tile:hover .game-tile__info,
.game-tile.--described .game-tile__complete,
.game-tile:hover .game-tile__complete {
  z-index: 6;
}

.game-tile.--available:hover .game-tile__play--active,
.game-tile.--available.--described .game-tile__play--active {
  display: inline-flex;
  z-index: 8;
}

.game-tile.--described .game-tile__description {
  display: -webkit-box;
}

@media (hover: hover) {
  .game-tile:hover .game-tile__description {
    display: -webkit-box;
  }
}

.game-tile.--survey-part .game-tile__progress-wheel {
  display: none;
  background: rgba(255, 255, 255, 0.88);
}

.game-tile.--survey-part.--locked .game-tile__progress-wheel {
  opacity: 0.72;
}

@media (hover: hover) {
  .game-tile.--survey-part:hover .game-tile__progress-wheel {
    display: flex;
  }
}

@media (hover: none) {
  .game-tile.--survey-part .game-tile__progress-wheel {
    display: flex;
    background: rgba(255, 255, 255, 0.55);
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

.game-tile__modal-description {
  margin: 0;
  color: var(--text-color);
  font-size: 1rem;
  line-height: 1.5;
  white-space: pre-wrap;
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
    line-clamp: 5;
  }
}

@media screen and (max-width: 340px) {
  .game-grid {
    --game-tile-size: min(112px, 100%);
  }
}
</style>
