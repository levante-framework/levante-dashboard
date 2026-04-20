<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import ProgressReport from '@/pages/ProgressReport.vue';
import ProgressReportFeature from '@/pages/ProgressReportFeature.vue';

const route = useRoute();

const useFeatureProgressReport = computed(() => route.query.feature === 'progress-report');

defineProps({
  administrationId: {
    type: String,
    required: true,
  },
  orgType: {
    type: String,
    required: true,
  },
  orgId: {
    type: String,
    required: true,
  },
});
</script>

<template>
  <ProgressReportFeature
    v-if="useFeatureProgressReport"
    :administration-id="administrationId"
    :org-type="orgType"
    :org-id="orgId"
  />
  <ProgressReport v-else :administration-id="administrationId" :org-type="orgType" :org-id="orgId" />
</template>
