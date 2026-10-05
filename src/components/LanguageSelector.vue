<template>
  <PvSelect
    v-model="$i18n.locale"
    class="w-full"
    :options="languageDropdownOptions"
    option-label="name"
    option-value="value"
    :placeholder="$t('authSignIn.selectLanguage')"
    :highlight-on-select="true"
    size="small"
    @change="onChangeLanguage"
  >
    <template #option="slotProps">
      <div class="flex gap-2 w-full">
        <span :class="`text-sm fi fi-${slotProps.option.flag}`" />

        <PvTag
          v-if="slotProps.option.testing"
          severity="warn"
          value="Testing"
          class="text-xs font-semibold uppercase"
        />

        <span class="text-sm">{{ slotProps.option.name }}</span>
      </div>
    </template>

    <template #value="slotProps">
      <div v-if="selectedLanguage(slotProps.value)" class="flex align-items-center gap-2">
        <span :class="`text-sm fi fi-${selectedLanguage(slotProps.value)?.flag}`" />
        <span class="text-sm">{{ selectedLanguage(slotProps.value)?.name }}</span>
      </div>

      <span v-else>{{ slotProps.placeholder }}</span>
    </template>
  </PvSelect>
</template>

<script setup lang="ts">
import PvSelect from 'primevue/select';
import PvTag from 'primevue/tag';
import { computed } from 'vue';
import { isLevante } from '@/constants';
import { getParsedLocale } from '@/helpers/survey';
import { useSurveyStore } from '@/store/survey';
import { findBestMatchingLocale, getTranslations, type LanguageOption, languageOptions } from '@/translations/i18n';
import 'flag-icons/css/flag-icons.min.css';

interface LanguageChangeEvent {
  value: string;
}

const surveyStore = useSurveyStore();

const languageDropdownOptions = computed(() => {
  return Object.entries(languageOptions).map(([key, options]: [string, LanguageOption]) => {
    const [language, region] = key.split('-');

    return {
      // flag-icons uses ISO 3166-1 alpha-2 country codes. Use the locale's region when present
      // (e.g. en-US -> us); for language-only keys we fall back to the language code, which only
      // renders a flag when it coincides with a country code (e.g. de, nl). Other language-only
      // keys (e.g. en) won't match a flag and will render blank.
      flag: (region ?? language)?.toLowerCase(),
      name: options.languageMenu,
      testing: options.testing,
      value: key,
    };
  });
});

const selectedLanguage = (value: string) => {
  const matchedLocale = findBestMatchingLocale(value);
  return languageDropdownOptions.value.find((option) => option.value === matchedLocale);
};

async function onChangeLanguage(event: LanguageChangeEvent): Promise<void> {
  sessionStorage.setItem(`${isLevante ? 'levante' : 'roar'}PlatformLocale`, event.value);

  await getTranslations(event.value);

  if (isLevante && surveyStore.survey) {
    (surveyStore.survey as any).locale = getParsedLocale(event.value);
  }
}
</script>
