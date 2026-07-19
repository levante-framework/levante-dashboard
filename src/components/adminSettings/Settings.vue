<template>
  <h1>{{ t('profile.settings.settings') }}</h1>
  <PvCard class="bg-gray-100">
    <template #title>{{ t('profile.settings.language') }}</template>
    <template #subtitle>{{ t('profile.settings.languageDescription') }}</template>
    <template #content>
      <LanguageSelector />
    </template>
  </PvCard>
</template>

<script setup>
import PvCard from 'primevue/card';
import { useI18n } from 'vue-i18n';
import LanguageSelector from '../LanguageSelector.vue';

const { t } = useI18n();
</script>
