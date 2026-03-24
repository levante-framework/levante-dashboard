<template>
  <div class="flex align-items-center gap-2">
    <label for="site-selector" class="font-semibold">Site:</label>
    <PvSelect
      v-model="pendingSelectedSite"
      :options="siteOptions"
      :optionValue="(o) => o.value"
      :optionLabel="(o) => o.label"
      :filter="isUserSuperAdmin()"
      auto-filter-focus
      class="site-selector"
      data-cy="site-selector"
      filter-placeholder="Search"
      reset-filter-on-hide
      @change="handleSiteChange"
    >
      <template #value>
        <span>{{ currentSiteName || 'Select a site' }}</span>
      </template>
    </PvSelect>

    <PvConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { TOAST_DEFAULT_LIFE_DURATION, TOAST_SEVERITIES } from '@/constants/toasts';
import useFetchAllDistrictsQuery from '@/firestore/queries/districts/useFetchAllDistrictsQuery';
import { useAuthStore } from '@/store/auth';
import { useLevanteStore } from '@/store/levante';
import { storeToRefs } from 'pinia';
import PvConfirmDialog from 'primevue/confirmdialog';
import { DropdownChangeEvent } from 'primevue/dropdown';
import PvSelect from 'primevue/select';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

interface DropdownOption {
  label: string;
  value: string;
}

interface SiteOption {
  siteId: string;
  siteName: string;
}

const levanteStore = useLevanteStore();
const { shouldUserConfirm } = storeToRefs(levanteStore);
const { setHasUserConfirmed } = levanteStore;
const authStore = useAuthStore();
const { currentSite, currentSiteName, sites } = storeToRefs(authStore);
const { isUserSuperAdmin, setCurrentSite } = authStore;
const confirm = useConfirm();
const router = useRouter();
const toast = useToast();

const pendingSelectedSite = ref<string | null>(currentSite.value);

watch(currentSite, (value) => {
  pendingSelectedSite.value = value;
});

const { data: allDistrictsData, isLoading: isLoadingAllDistricts } = useFetchAllDistrictsQuery();

const siteOptions = computed<DropdownOption[]>(() => {
  if (isUserSuperAdmin()) {
    if (isLoadingAllDistricts.value || !allDistrictsData?.value) {
      if (currentSite.value && currentSiteName.value) {
        return [{ label: currentSiteName.value, value: currentSite.value }];
      }

      return [];
    }

    const formattedSites = allDistrictsData.value.map((district: { name: string; id: string }) => ({
      label: district?.name,
      value: district?.id,
    }));

    return [{ label: 'All Sites', value: 'any' }, ...formattedSites];
  }

  return sites.value.map((site: SiteOption) => ({
    label: site.siteName,
    value: site.siteId,
  }));
});

const handleSiteChange = (e: DropdownChangeEvent): void => {
  const newValue = e.value;

  const runSiteChange = () => {
    const selectedOption = siteOptions.value.find((option) => option.value === newValue);

    setCurrentSite(newValue, selectedOption?.label ?? null);
    pendingSelectedSite.value = newValue;

    toast.add({
      severity: TOAST_SEVERITIES.WARN,
      summary: 'Site has changed',
      detail: `You're now within site: ${selectedOption?.label}`,
      life: TOAST_DEFAULT_LIFE_DURATION,
    });

    if (router.currentRoute.value.name === 'ProgressReport') {
      router.push({ name: 'Home' });
    } else if (router.currentRoute.value.name === 'ListUsers') {
      router.push({ name: 'ListGroups' });
    }
  };

  if (!shouldUserConfirm.value) {
    runSiteChange();
    return;
  }

  confirm.require({
    header: 'Change site?',
    message: 'Changing sites will discard the current progress. Continue?',
    acceptLabel: 'Continue',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: {
      label: 'Cancel',
      severity: 'secondary',
      outlined: true,
    },
    accept: () => {
      runSiteChange();
      setHasUserConfirmed(true);
    },
    reject: () => {
      pendingSelectedSite.value = currentSite.value;
      setHasUserConfirmed(false);
    },
  });
};
</script>

<style lang="scss">
.site-selector {
  max-width: 300px;
}
</style>
