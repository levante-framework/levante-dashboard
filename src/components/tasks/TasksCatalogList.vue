<template>
  <div class="flex flex-column gap-4 p-4">
    <div class="flex flex-wrap align-items-start justify-content-between gap-3">
      <div class="flex flex-column gap-1">
        <h2 class="text-xl font-bold m-0">Tasks</h2>
        <p class="text-md text-gray-500 m-0">Browse and manage the non-archived task catalog.</p>
      </div>
      <PvButton label="Create task" icon="pi pi-plus" @click="openCreate" />
    </div>

    <div v-if="isFetching" class="flex align-items-center gap-2 text-gray-500">
      <i class="pi pi-spin pi-spinner" />
      <span>Loading tasks...</span>
    </div>

    <div
      v-else-if="isError"
      class="flex align-items-center gap-2 p-3 surface-100 border-round border-1 border-red-500"
    >
      <i class="pi pi-exclamation-triangle text-red-600" />
      <span class="text-red-800">Unable to load tasks. Please try again.</span>
    </div>

    <div
      v-else-if="!tasks?.length"
      class="flex align-items-center gap-2 p-3 surface-100 border-round border-1 border-200"
    >
      <i class="pi pi-info-circle text-gray-500" />
      <span>No tasks found.</span>
    </div>

    <div v-else class="flex flex-column gap-3">
      <article
        v-for="task in sortedTasks"
        :key="task.id"
        class="surface-50 border-1 border-200 border-round p-4 flex flex-column md:flex-row gap-3"
      >
        <div v-if="task.image" class="flex-shrink-0">
          <img :src="task.image" :alt="task.name" class="task-thumb border-round" />
        </div>
        <div class="flex flex-column gap-2 flex-grow-1">
          <div class="flex flex-wrap align-items-start justify-content-between gap-2">
            <div>
              <div class="font-semibold text-lg">{{ task.name || task.id }}</div>
              <div class="text-sm text-gray-500">Task ID: {{ task.id }}</div>
            </div>
            <PvButton label="Edit" icon="pi pi-pencil" severity="secondary" text size="small" @click="openEdit(task)" />
          </div>
          <p v-if="task.description" class="m-0 text-gray-700">{{ task.description }}</p>
          <div class="flex flex-wrap gap-4 text-sm text-gray-500">
            <span>Created: {{ formatTimestamp(task.createdAt) }}</span>
            <span>Updated: {{ formatTimestamp(task.updatedAt) }}</span>
          </div>
        </div>
      </article>
    </div>

    <TaskUpsertDialog v-model:visible="dialogVisible" :task="editingTask" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import PvButton from 'primevue/button';
import TaskUpsertDialog from '@/components/tasks/TaskUpsertDialog.vue';
import useTasksCatalogQuery from '@/composables/queries/useTasksCatalogQuery';
import type { SerializedTask } from '@/types/taskCatalog';

const { data: tasks, isFetching, isError } = useTasksCatalogQuery();

const dialogVisible = ref(false);
const editingTask = ref<SerializedTask | null>(null);

const sortedTasks = computed(() => {
  if (!tasks.value) return [];
  return [...tasks.value].sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
});

function openCreate(): void {
  editingTask.value = null;
  dialogVisible.value = true;
}

function openEdit(task: SerializedTask): void {
  editingTask.value = task;
  dialogVisible.value = true;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '—';
  return date.toLocaleString();
}
</script>

<style scoped>
.task-thumb {
  width: 4.5rem;
  height: 4.5rem;
  object-fit: cover;
  background: #f3f4f6;
}
</style>
