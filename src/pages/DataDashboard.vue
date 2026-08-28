<template>
  <main class="container main">
    <section class="main-body">
      <div class="flex align-items-start gap-3 flex-wrap mb-5">
        <div class="flex flex-column flex-1">
          <div class="flex align-items-center gap-2 flex-wrap">
            <i class="pi pi-chart-bar text-gray-400" style="font-size: 1.6rem" />
            <h2 class="admin-page-header m-0">Data Dashboard</h2>
          </div>
          <span
            v-if="currentSiteName && !needsSiteSelection"
            class="flex align-items-center gap-1 m-0 mt-1 text-lg text-gray-500"
          >
            <i class="pi pi-building"></i>{{ currentSiteName }}
          </span>
          <div class="text-md text-gray-500 mt-1">Completed task counts from Redivis for the selected site.</div>
        </div>
        <PvButton
          icon="pi pi-refresh"
          label="Refresh"
          :disabled="needsSiteSelection || isFetching"
          :loading="isFetching"
          @click="refetch()"
        />
      </div>

      <div v-if="needsSiteSelection" class="info">
        <i class="pi pi-exclamation-circle" />
        <div class="font-medium">Select a specific site to view Redivis data.</div>
      </div>

      <template v-else>
        <div v-if="isLoading" class="flex justify-content-center align-items-center h-20rem">
          <LevanteSpinner />
        </div>

        <div v-else-if="isError" class="info info--error">
          <i class="pi pi-times-circle" />
          <div>
            <div class="font-medium">Failed to load Redivis data</div>
            <div class="text-sm text-gray-600 mt-1">{{ errorMessage }}</div>
          </div>
        </div>

        <template v-else-if="data">
          <div class="flex flex-wrap gap-3 mb-4 text-sm text-gray-600">
            <span
              >Dataset: <strong class="text-color">{{ data.datasetName }}</strong></span
            >
            <span
              >Tasks: <strong class="text-color">{{ data.rowCount }}</strong></span
            >
            <span
              >Total completions:
              <strong class="text-color">{{ totalCompletions }}</strong></span
            >
          </div>

          <div class="chart-panel mb-5">
            <PvChart type="bar" :data="chartData" :options="chartOptions" class="h-20rem" />
          </div>

          <RoarDataTable
            :columns="tableColumns"
            :data="tableRows"
            sortable
            :loading="isFetching"
            :allow-export="true"
            :allow-filtering="false"
          />
        </template>
      </template>
    </section>
  </main>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import PvButton from 'primevue/button';
import PvChart from 'primevue/chart';
import { computed } from 'vue';
import LevanteSpinner from '@/components/LevanteSpinner.vue';
import RoarDataTable from '@/components/RoarDataTable.vue';
import { useQueryRedivisScoresQuery } from '@/composables/queries/useQueryRedivisScoresQuery';
import { useAuthStore } from '@/store/auth';

const authStore = useAuthStore();
const { currentSite, currentSiteName } = storeToRefs(authStore);

const needsSiteSelection = computed(() => !currentSite.value || currentSite.value === 'any');

const { data, isLoading, isFetching, isError, error, refetch } = useQueryRedivisScoresQuery(currentSite);

const errorMessage = computed(() => {
  if (!error.value) return 'Unknown error';
  const firebaseError = error.value as { message?: string };
  return firebaseError.message ?? 'Unknown error';
});

const tableRows = computed(() => {
  const rows = data.value?.rows ?? [];
  return [...rows]
    .map((row) => {
      const raw = row as Record<string, unknown>;
      return {
        taskId: String(raw.taskId ?? raw.task_id ?? ''),
        completedCount: Number(raw.completedCount ?? raw.completed_count ?? raw.completedcount) || 0,
      };
    })
    .sort((a, b) => b.completedCount - a.completedCount);
});

const totalCompletions = computed(() => tableRows.value.reduce((sum, row) => sum + row.completedCount, 0));

const tableColumns = [
  { field: 'taskId', header: 'Task', dataType: 'text', sort: true },
  { field: 'completedCount', header: 'Completed', dataType: 'number', sort: true },
];

const chartData = computed(() => {
  const documentStyle = getComputedStyle(document.documentElement);
  return {
    labels: tableRows.value.map((row) => row.taskId),
    datasets: [
      {
        label: 'Completed',
        data: tableRows.value.map((row) => row.completedCount),
        backgroundColor: documentStyle.getPropertyValue('--primary-color') || '#3b82f6',
      },
    ],
  };
});

const chartOptions = {
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        precision: 0,
      },
    },
  },
};
</script>

<style scoped>
.info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-radius: 0.5rem;
  background-color: var(--surface-100, #f4f4f5);
  border: 1px solid var(--surface-200, #e4e4e7);
}

.info--error {
  background-color: #fef2f2;
  border-color: #fecaca;
}

.chart-panel {
  padding: 1rem;
  border: 1px solid #e5e5e5;
  border-radius: 0.5rem;
  background-color: #fcfcfc;
}
</style>
