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
        <PvTag
          v-if="slotProps.option.testing"
          severity="warn"
          value="Testing"
          class="text-xs font-semibold uppercase"
        />
        <div class="text-sm">{{ slotProps.option.name }}</div>
      </div>
    </template>
  </PvSelect>
</template>

<script setup lang="ts">
import { isLevante } from '@/helpers';
import { getParsedLocale } from '@/helpers/survey';
import { setupStudentAudio } from '@/helpers/surveyInitialization';
import { useSurveyStore } from '@/store/survey';
import { getTranslations, LanguageOption, languageOptions } from '@/translations/i18n';
import PvSelect from 'primevue/select';
import PvTag from 'primevue/tag';
import { computed } from 'vue';

interface LanguageChangeEvent {
  value: string;
}

const surveyStore = useSurveyStore();

const languageDropdownOptions = computed(() => {
  return Object.entries(languageOptions).map(([key, options]: [string, LanguageOption]) => {
    return {
      name: options.languageMenu,
      testing: options.testing,
      value: key,
    };
  });
});

async function onChangeLanguage(event: LanguageChangeEvent): Promise<void> {
  sessionStorage.setItem(`${isLevante ? 'levante' : 'roar'}PlatformLocale`, event.value);

  await getTranslations(event.value);

  if (isLevante && surveyStore.survey) {
    (surveyStore.survey as any).locale = getParsedLocale(event.value);
    await setupStudentAudio(surveyStore.survey as any, event.value, surveyStore.audioLinkMap, surveyStore);
  }
}
</script>
