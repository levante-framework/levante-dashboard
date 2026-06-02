<template>
  <div class="flex align-items-center gap-3 mb-3">
    <PvFileUpload
      :choose-label="!uploadedFile ? 'Choose CSV File' : 'Choose Another CSV File'"
      :show-cancel-button="false"
      :show-upload-button="false"
      :disabled="disabled"
      auto
      accept=".csv"
      custom-upload
      mode="basic"
      @uploader="emit('upload', $event)"
    />
    <span v-if="!!uploadedFile" class="text-gray-500">File: {{ uploadedFile.name }}</span>
    <span v-else class="text-gray-500">
      {{ disabled ? disabledMessage : 'No file chosen' }}
    </span>
  </div>
</template>

<script setup lang="ts">
import type { FileUploadUploaderEvent } from 'primevue/fileupload';
import PvFileUpload from 'primevue/fileupload';

defineProps<{
  disabled: boolean;
  disabledMessage: string;
  uploadedFile: File | null;
}>();

const emit = defineEmits<{
  upload: [event: FileUploadUploaderEvent];
}>();
</script>
