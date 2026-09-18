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
        <h2 class="m-0 font-bold">{{ isEdit ? 'Edit param spec' : 'Create param spec' }}</h2>
        <p class="m-0 text-gray-500 text-sm">
          {{
            isEdit
              ? 'Update this parameter catalog entry. Document id stays the same.'
              : 'Document id equals the param name (e.g. maxTime).'
          }}
        </p>
      </div>
    </template>

    <form class="flex flex-column gap-4 mt-2" @submit.prevent="handleSubmit">
      <div class="flex flex-column gap-1">
        <label for="spec-name" class="text-sm font-medium text-gray-600">Name <span class="text-red-500">*</span></label>
        <PvInputText
          id="spec-name"
          v-model="form.name"
          class="w-full"
          autocomplete="off"
          :disabled="isEdit"
          placeholder="e.g. maxTime"
        />
        <small v-if="!isEdit" class="text-gray-500">This becomes the document id.</small>
      </div>

      <div v-if="isEdit" class="flex flex-column gap-1">
        <label class="text-sm font-medium text-gray-600">Spec ID</label>
        <code class="text-sm surface-100 border-round border-1 border-200 p-2">{{ form.id }}</code>
      </div>

      <div class="flex flex-column gap-1">
        <label for="spec-type" class="text-sm font-medium text-gray-600">Type <span class="text-red-500">*</span></label>
        <PvSelect
          id="spec-type"
          v-model="form.type"
          :options="typeOptions"
          class="w-full"
          placeholder="Select type"
        />
      </div>

      <div class="flex flex-column gap-1">
        <label for="spec-description" class="text-sm font-medium text-gray-600"
          >Description <span class="text-red-500">*</span></label
        >
        <PvTextarea id="spec-description" v-model="form.description" class="w-full" rows="3" auto-resize />
      </div>

      <div class="flex align-items-center gap-2">
        <PvCheckbox v-model="form.archived" input-id="spec-archived" :binary="true" />
        <label for="spec-archived" class="text-sm">Archived</label>
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
import PvButton from 'primevue/button';
import PvCheckbox from 'primevue/checkbox';
import PvDialog from 'primevue/dialog';
import PvInputText from 'primevue/inputtext';
import PvSelect from 'primevue/select';
import PvTextarea from 'primevue/textarea';
import { useToast } from 'primevue/usetoast';
import { computed, reactive, ref, watch } from 'vue';
import useUpsertVariantParamSpecMutation from '@/composables/mutations/useUpsertVariantParamSpecMutation';
import { getCallableErrorMessage } from '@/helpers/taskCatalog';
import type { SerializedVariantParamSpec } from '@/types/taskCatalog';

interface Props {
  visible: boolean;
  spec?: SerializedVariantParamSpec | null;
}

const props = withDefaults(defineProps<Props>(), {
  spec: null,
});

const emit = defineEmits<{
  'update:visible': [value: boolean];
}>();

const toast = useToast();
const { mutateAsync, isPending } = useUpsertVariantParamSpecMutation();
const errorMessage = ref('');

const typeOptions = ['boolean', 'number', 'string', 'unknown'] as const;

const form = reactive({
  id: undefined as string | undefined,
  name: '',
  description: '',
  type: 'string' as 'boolean' | 'number' | 'string' | 'unknown',
  archived: false,
});

const isEdit = computed(() => Boolean(form.id));

watch(
  () => [props.visible, props.spec] as const,
  ([visible, spec]) => {
    if (!visible) return;
    errorMessage.value = '';
    if (spec) {
      form.id = spec.id;
      form.name = spec.name ?? '';
      form.description = spec.description ?? '';
      form.type = spec.type ?? 'string';
      form.archived = spec.archived === true;
      return;
    }
    form.id = undefined;
    form.name = '';
    form.description = '';
    form.type = 'string';
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

  if (!name || !description || !form.type) {
    errorMessage.value = 'Name, type, and description are required.';
    return;
  }

  try {
    await mutateAsync({
      ...(form.id ? { id: form.id } : {}),
      name,
      description,
      type: form.type,
      archived: form.archived,
    });
    toast.add({
      severity: 'success',
      summary: isEdit.value ? 'Param spec updated' : 'Param spec created',
      detail: form.id ?? name,
      life: 3000,
    });
    close();
  } catch (error) {
    errorMessage.value = getCallableErrorMessage(error, 'Unable to save param spec.');
  }
}
</script>
