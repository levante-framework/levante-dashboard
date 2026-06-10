<template>
  <div class="sidebar-container flex flex-column">
    <div class="sidebar-progress">
      <PvChart type="doughnut" :data="chartData" :options="chartOptions" />
      <div>
        <p class="sidebar-progress-totals">{{ completedGames }}/{{ totalGames }}</p>
        <p>{{ $t('participantSidebar.tasksCompleted') }}</p>
      </div>
    </div>
    <ul v-if="!_isEmpty(studentInfo)" class="sidebar-info">
      <li class="sidebar-title">
        <strong>{{ $t('participantSidebar.studentInfo') }}</strong>
      </li>
      <li>
        {{ $t('participantSidebar.grade') }}:
        <span class="sidebar-info-item">{{ studentInfo.grade }}</span>
      </li>
    </ul>
  </div>

  <div class="mobile-participant-sidebar">
    <div class="mobile-participant-sidebar__header">
      <div class="mobile-participant-sidebar__value">{{ completedGames }}/{{ totalGames }}</div>
      <p class="mobile-participant-sidebar__label">{{ $t('participantSidebar.tasksCompleted') }}</p>
    </div>

    <div class="mobile-participant-sidebar__progress-trail">
      <div class="mobile-participant-sidebar__progress-bar" :style="{ width: `${mobileProgressBarValue}%` }"></div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue';
import _isEmpty from 'lodash/isEmpty';
import PvChart from 'primevue/chart';

interface Props {
  totalGames: number;
  completedGames: number;
  studentInfo?: {
    grade?: string | number;
    [key: string]: any;
  };
}

interface ChartData {
  labels: string[];
  datasets: Array<{
    data: number[];
    backgroundColor: string[];
  }>;
}

const props = withDefaults(defineProps<Props>(), {
  totalGames: 0,
  completedGames: 0,
  studentInfo: () => ({}),
});

const chartData = computed((): ChartData => {
  const completed = props.completedGames;
  const incomplete = props.totalGames - props.completedGames;
  return setChartData(completed, incomplete);
});

const chartOptions = ref({
  cutout: '60%',
  showToolTips: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      enabled: false,
    },
  },
});

const mobileProgressBarValue = computed(() => Math.ceil((100 / props.totalGames) * props.completedGames));

const setChartData = (completed: number, incomplete: number): ChartData => {
  const docStyle = getComputedStyle(document.documentElement);

  return {
    labels: ['Finished', 'Unfinished'],
    datasets: [
      {
        data: [completed, incomplete],
        backgroundColor: [docStyle.getPropertyValue('--bright-green'), docStyle.getPropertyValue('--surface-d')],
        // hoverBackgroundColor: ['green', docStyle.getPropertyValue('--surface-d')]
      },
    ],
  };
};
</script>
<style scoped lang="scss">
.sidebar-container {
  margin-bottom: auto;
  width: 200px;
  border: 1px solid var(--surface-d);
  border-radius: 5px;
  height: auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media screen and (max-width: 1100px) {
  .sidebar-container {
    width: 150px;
  }
}

@media screen and (max-width: 820px) {
  .sidebar-container {
    display: none !important;
  }
}

.sidebar-progress {
  // text-align: center;
  padding-bottom: 0.5rem;
  width: 100%;

  p {
    margin-block: 0;
    text-align: center;
  }

  .p-chart {
    padding: 1.25rem;
    pointer-events: none;
    /* don't allow pointer events on chart */
    margin-bottom: 0.5rem;
  }

  .sidebar-progress-totals {
    font-size: 1.25rem;
  }
}

.sidebar-info {
  border-top: solid 1px var(--surface-d);
  padding: 1rem;
  margin-top: 1rem;
  list-style: none;
  margin-bottom: 0;
  line-height: 1.5;
  width: 100%;

  .sidebar-title {
    border-bottom: 1px solid var(--surface-d);
    padding-bottom: 0.5rem;
    margin-bottom: 1rem;
  }
}

.mobile-participant-sidebar {
  display: none;
  width: 100%;
  height: auto;
  margin: 0 0 0.5rem;
  padding: 0 0.25rem;

  @media screen and (max-width: 820px) {
    display: block;
  }
}

.mobile-participant-sidebar__header {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 0.5rem;
}

.mobile-participant-sidebar__label,
.mobile-participant-sidebar__value {
  display: block;
  margin: 0;
  font-weight: 500;
  color: var(--text-color);
}

.mobile-participant-sidebar__label {
  font-weight: 600;
}

.mobile-participant-sidebar__progress-trail {
  display: block;
  width: 100%;
  height: 8px;
  margin: 0.5rem 0 0;
  position: relative;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
}

.mobile-participant-sidebar__progress-bar {
  display: block;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  background-color: var(--bright-green);
  border-radius: 10px;
}
</style>
