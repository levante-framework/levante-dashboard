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
      <div v-if="slotProps.value" class="flex align-items-center gap-2">
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
import { getTranslations, type LanguageOption, languageOptions } from '@/translations/i18n';
import 'flag-icons/css/flag-icons.min.css';

interface LanguageChangeEvent {
  value: string;
}

const surveyStore = useSurveyStore();

const languageDropdownOptions = computed(() => {
  return Object.entries(languageOptions).map(([key, options]: [string, LanguageOption]) => {
    const [language, region] = key.split('-');

    return {
      flag: (region ?? language)?.toLowerCase(),
      name: options.languageMenu,
      testing: options.testing,
      value: key,
    };
  });
});

const selectedLanguage = (value: string) => {
  return languageDropdownOptions.value.find((option) => option.value === value);
};

async function onChangeLanguage(event: LanguageChangeEvent): Promise<void> {
  sessionStorage.setItem(`${isLevante ? 'levante' : 'roar'}PlatformLocale`, event.value);

  await getTranslations(event.value);

  if (isLevante && surveyStore.survey) {
    (surveyStore.survey as any).locale = getParsedLocale(event.value);
  }
}
</script>
