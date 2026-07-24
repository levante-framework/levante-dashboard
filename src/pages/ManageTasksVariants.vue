<template>
  <main class="container main">
    <PvToast />
    <section class="main-body">
      <div class="flex flex-column mb-5">
        <div class="flex align-items-center flex-wrap gap-3 mb-2">
          <i class="pi pi-pencil text-gray-400 rounded" style="font-size: 1.6rem" />
          <div class="admin-page-header">Manage Tasks</div>
        </div>
        <div class="text-md text-gray-500 ml-6">
          View and manage tasks, variant history, and parameter specs (super admin).
        </div>
      </div>
      <div class="flex flex-column mb-5">
        <PvTabs value="tasks">
          <PvTabList>
            <PvTab value="tasks">Tasks</PvTab>
            <PvTab value="variants">Variants</PvTab>
            <PvTab value="param-specs">Param Specs</PvTab>
          </PvTabList>
          <PvTabPanels>
            <PvTabPanel value="tasks">
              <TasksCatalogList />
            </PvTabPanel>
            <PvTabPanel value="variants">
              <VariantsTimeline />
            </PvTabPanel>
            <PvTabPanel value="param-specs">
              <VariantParamSpecsList />
            </PvTabPanel>
          </PvTabPanels>
        </PvTabs>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import PvTab from 'primevue/tab';
import PvTabList from 'primevue/tablist';
import PvTabPanel from 'primevue/tabpanel';
import PvTabPanels from 'primevue/tabpanels';
import PvTabs from 'primevue/tabs';
import PvToast from 'primevue/toast';
import TasksCatalogList from '@/components/tasks/TasksCatalogList.vue';
import VariantParamSpecsList from '@/components/tasks/VariantParamSpecsList.vue';
import VariantsTimeline from '@/components/tasks/VariantsTimeline.vue';
</script>
