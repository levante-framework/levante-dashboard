<template>
  <PvDialog
    :draggable="false"
    :visible="visible"
    modal
    style="width: 100%; max-width: 36rem"
    @update:visible="onVisibleChange"
  >
    <template #header>
      <div class="flex flex-column gap-1">
        <h2 class="m-0 font-bold">{{ isEdit ? 'Edit task' : 'Create task' }}</h2>
        <p class="m-0 text-gray-500 text-sm">
          {{
            isEdit
              ? 'Update task metadata. Document id stays the same.'
              : 'Document id is derived from the name (e.g. Matrix Reasoning → matrix-reasoning).'
          }}
        </p>
      </div>
    </template>

    <form class="flex flex-column gap-4 mt-2" @submit.prevent="handleSubmit">
      <div class="flex flex-column gap-1">
        <label for="task-name" class="text-sm font-medium text-gray-600">Name <span class="text-red-500">*</span></label>
        <PvInputText id="task-name" v-model="form.name" class="w-full" autocomplete="off" />
      </div>

      <div v-if="isEdit" class="flex flex-column gap-1">
        <label class="text-sm font-medium text-gray-600">Task ID</label>
        <code class="text-sm surface-100 border-round border-1 border-200 p-2">{{ form.id }}</code>
      </div>
      <div v-else class="flex flex-column gap-1">
        <label class="text-sm font-medium text-gray-600">Derived ID</label>
        <code class="text-sm surface-100 border-round border-1 border-200 p-2">{{ derivedId || '—' }}</code>
        <small v-if="form.name && !derivedId" class="p-error">Name must yield a non-empty id.</small>
      </div>

      <div class="flex flex-column gap-1">
        <label for="task-description" class="text-sm font-medium text-gray-600"
          >Description <span class="text-red-500">*</span></label
        >
        <PvTextarea id="task-description" v-model="form.description" class="w-full" rows="3" auto-resize />
      </div>

      <div class="flex flex-column gap-1">
        <label for="task-image" class="text-sm font-medium text-gray-600"
          >Image URL <span class="text-red-500">*</span></label
        >
        <PvInputText id="task-image" v-model="form.image" class="w-full" autocomplete="off" />
      </div>

      <div class="flex align-items-center gap-2">
        <PvCheckbox v-model="form.archived" input-id="task-archived" :binary="true" />
        <label for="task-archived" class="text-sm">Archived</label>
      </div>

      <small v-if="errorMessage" class="p-error">{{ errorMessage }}</small>

      <div class="flex justify-content-end gap-2 mt-2">
        <PvButton type="button" label="Cancel" severity="secondary" text :disabled="isPending" @click="close" />
        <PvButton type="submit" :label="isEdit ? 'Save' : 'Create'" :loading="isPending" />
      </div>
    </form>
  </PvDialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import PvButton from 'primevue/button';
import PvCheckbox from 'primevue/checkbox';
import PvDialog from 'primevue/dialog';
import PvInputText from 'primevue/inputtext';
import PvTextarea from 'primevue/textarea';
import { useToast } from 'primevue/usetoast';
import useUpsertTaskMutation from '@/composables/mutations/useUpsertTaskMutation';
import { getCallableErrorMessage, semanticIdFromName } from '@/helpers/taskCatalog';
import type { SerializedTask } from '@/types/taskCatalog';

interface Props {
  visible: boolean;
  task?: SerializedTask | null;
}

const props = withDefaults(defineProps<Props>(), {
  task: null,
});

const emit = defineEmits<{
  'update:visible': [value: boolean];
}>();

const toast = useToast();
const { mutateAsync, isPending } = useUpsertTaskMutation();
const errorMessage = ref('');

const form = reactive({
  id: undefined as string | undefined,
  name: '',
  description: '',
  image: '',
  archived: false,
});

const isEdit = computed(() => Boolean(form.id));
const derivedId = computed(() => semanticIdFromName(form.name));

watch(
  () => [props.visible, props.task] as const,
  ([visible, task]) => {
    if (!visible) return;
    errorMessage.value = '';
    if (task) {
      form.id = task.id;
      form.name = task.name ?? '';
      form.description = task.description ?? '';
      form.image = task.image ?? '';
      form.archived = task.archived === true;
      return;
    }
    form.id = undefined;
    form.name = '';
    form.description = '';
    form.image = '';
    form.archived = false;
  },
  { immediate: true },
);

function onVisibleChange(value: boolean): void {
  emit('update:visible', value);
}

function close(): void {
  emit('update:visible', false);
}

async function handleSubmit(): Promise<void> {
  errorMessage.value = '';
  const name = form.name.trim();
  const description = form.description.trim();
  const image = form.image.trim();

  if (!name || !description || !image) {
    errorMessage.value = 'Name, description, and image URL are required.';
    return;
  }

  if (!isEdit.value && !derivedId.value) {
    errorMessage.value = 'Name must yield a non-empty id.';
    return;
  }

  try {
    await mutateAsync({
      ...(form.id ? { id: form.id } : {}),
      name,
      description,
      image,
      archived: form.archived,
    });
    toast.add({
      severity: 'success',
      summary: isEdit.value ? 'Task updated' : 'Task created',
      detail: isEdit.value ? form.id : derivedId.value,
      life: 3000,
    });
    close();
  } catch (error) {
    errorMessage.value = getCallableErrorMessage(error, 'Unable to save task.');
  }
}
</script>
