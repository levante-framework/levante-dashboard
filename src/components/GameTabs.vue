<template>
  <div id="games">
    <div class="game-cards">
      <div v-for="game in displayGames" :key="game.gameCardId">
        <router-link
          v-if="isTaskAvailable(game)"
          class="game-card game-card--available"
          :to="{ path: getRoutePath(game) }"
          @click="onGameCardClick($event, game)"
        >
          <div class="game-card__thumbnail" :style="{ backgroundImage: `url(${game.taskData.image})` }">
            <div class="game-card__btn game-card__btn--play">
              <i v-if="getSurveyPartProgressValue(game) <= 0" class="pi pi-play"></i>
              <i v-else class="pi pi-angle-double-right"></i>
            </div>
          </div>

          <div class="game-card__content">
            <p class="game-card__name">{{ getTaskName(game) }}</p>

            <div v-if="game.surveyPart" class="game-card__progress">
              <div class="game-card__progress-header">
                <small class="game-card__progress-label">Progress</small>
                <small class="game-card__progress-value">{{ getSurveyPartProgressValue(game) }}%</small>
              </div>

              <div class="game-card__progress-trail">
                <div class="game-card__progress-bar" :style="{ width: `${getSurveyPartProgressValue(game)}%` }"></div>
              </div>
            </div>

            <p v-else class="game-card__description">{{ getTaskDescription(game) }}</p>
          </div>
        </router-link>

        <div
          v-else
          class="game-card"
          :class="{
            'game-card--complete': isTaskComplete(game),
            'game-card--locked': !isTaskComplete(game) && !isTaskAvailable(game),
          }"
        >
          <div class="game-card__thumbnail" :style="{ backgroundImage: `url(${game.taskData.image})` }">
            <div v-if="isTaskComplete(game)" class="game-card__btn game-card__btn--complete">
              <i class="pi pi-check"></i>
            </div>

            <div v-else class="game-card__btn game-card__btn--locked">
              <i class="pi pi-lock"></i>
            </div>
          </div>

          <div class="game-card__content">
            <p class="game-card__name">{{ getTaskName(game) }}</p>

            <div v-if="game.surveyPart" class="game-card__progress">
              <div class="game-card__progress-header">
                <small class="game-card__progress-label">Progress</small>
                <small class="game-card__progress-value">{{ getSurveyPartProgressValue(game) }}%</small>
              </div>

              <div class="game-card__progress-trail">
                <div
                  class="game-card__progress-bar"
                  :class="{ 'game-card__progress-bar--complete': isTaskComplete(game) }"
                  :style="{ width: `${getSurveyPartProgressValue(game)}%` }"
                ></div>
              </div>
            </div>

            <p v-else class="game-card__description">{{ getTaskDescription(game) }}</p>
          </div>
        </div>
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
    surveyResponsesData.value ?? queryClient.getQueryData<SurveyResponseDoc[]>([SURVEY_RESPONSES_QUERY_KEY]);

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

.game-cards {
  display: flex;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 1.25rem;
  width: 100%;
  height: auto;
  margin: 0;
  padding: 0 0.25rem;
}

.game-card {
  display: flex;
  gap: 1rem;
  width: 300px;
  height: auto;
  margin: 0;
  padding: 0.75rem 1rem 0.75rem 0.75rem;
  border-radius: 0.75rem;
  text-decoration: none;
  color: var(--text-color);

  &.game-card--available {
    transition: box-shadow 0.2s ease-out;
    box-shadow:
      rgba(0, 0, 0, 0.07) 0px 1px 2px,
      rgba(0, 0, 0, 0.07) 0px 2px 4px,
      rgba(0, 0, 0, 0.07) 0px 4px 8px;

    &:hover {
      box-shadow:
        rgba(0, 0, 0, 0.07) 0px 1px 2px,
        rgba(0, 0, 0, 0.07) 0px 2px 4px,
        rgba(0, 0, 0, 0.07) 0px 4px 8px,
        rgba(0, 0, 0, 0.07) 0px 8px 16px,
        rgba(0, 0, 0, 0.07) 0px 16px 32px;
    }
  }

  &.game-card--complete {
    background-color: #def6e5;
  }

  &.game-card--locked {
    background-color: #e5e7eb;
    opacity: 0.33;
  }

  @media screen and (max-width: 768px) {
    width: 100%;
    max-width: 270px;
  }

  @media screen and (max-width: 480px) {
    max-width: 100%;
  }
}

.game-card__thumbnail {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 88px;
  height: 88px;
  background-repeat: no-repeat;
  background-position: center center;
  background-size: cover;
  border-radius: 0.5rem;
}

.game-card__btn {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 40px;
  height: 40px;
  margin: 0;
  padding: 0;
  background-color: rgba(#217af4, 0.8);
  border-radius: 9999px;
  box-shadow: 0 3px 5px rgba(black, 0.8);

  .pi {
    color: white;
  }

  &.game-card__btn--complete {
    background-color: rgba(var(--bright-green-rgb), 0.8);
  }

  &.game-card__btn--locked {
    background-color: rgba(white, 0.8);

    .pi {
      color: var(--text-color);
    }
  }
}

.game-card__content {
  display: flex;
  flex-direction: column;
  flex: 1;
  width: auto;
  height: auto;
  margin: 0;
  padding: 0.5rem 0;
}

.game-card__name {
  display: block;
  margin: 0;
  font-weight: 600;
}

.game-card__description {
  display: block;
  margin: 0.25rem 0 0;
  font-size: 12px;
}

.game-card__progress {
  display: block;
  width: 100%;
  height: auto;
  margin: auto 0 0;
}

.game-card__progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.game-card__progress-label,
.game-card__progress-value {
  display: block;
  margin: 0;
  font-weight: 500;
  font-size: 12px;
  color: var(--text-color-secondary);
  text-transform: uppercase;
}

.game-card__progress-trail {
  display: block;
  width: 100%;
  height: 6px;
  margin: 0.25rem 0 0;
  position: relative;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
}

.game-card__progress-bar {
  display: block;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  background-color: var(--bright-yellow);
  border-radius: 10px;

  &.game-card__progress-bar--complete {
    background-color: var(--bright-green);
  }
}
</style>
