<template>
  <div class="card flex justify-center w-full">
    <PvSelect
      v-model="$i18n.locale"
      class="w-full md:w-56 bg-white"
      :options="languageDropdownOptions"
      option-label="name"
      option-value="value"
      :placeholder="$t('authSignIn.selectLanguage')"
      :highlight-on-select="true"
      @change="onLanguageChange"
    >
      <template #header>
        <small class="m-2 font-bold uppercase text-gray-400">
          {{ $t('authSignIn.selectLanguage') }}
        </small>
      </template>
    </PvSelect>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import PvSelect from 'primevue/select';
import { languageDropdownOptions } from '@/translations/exports';

const { locale } = useI18n();

const onLanguageChange = (event: any) => {
  locale.value = event.value;
};
</script>

<style scoped></style>
