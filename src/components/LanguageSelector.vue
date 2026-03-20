<template>
  <div class="language-selector-wrapper">
    <div class="font-semibold text-color-secondary">{{ $t('authSignIn.selectLanguageLabel') }}:</div>

    <PvSelect
      v-model="$i18n.locale"
      class="w-full"
      :options="languageDropdownOptions"
      option-label="name"
      option-value="value"
      :placeholder="$t('authSignIn.selectLanguage')"
      :highlight-on-select="true"
      @change="onLanguageChange"
    >
      <template #option="slotProps">
        <div class="flex gap-2 w-full">
          <PvTag
            v-if="slotProps.option.testing"
            severity="warn"
            value="Testing"
            class="text-xs font-semibold uppercase"
          />
          <div>{{ slotProps.option.name }}</div>
        </div>
      </template>
    </PvSelect>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import PvSelect from 'primevue/select';
import { languageOptions, getTranslations, LanguageOption } from '@/translations/i18n';
import { isLevante } from '@/helpers';
import { useSurveyStore } from '@/store/survey';
import { setupStudentAudio } from '@/helpers/surveyInitialization';
import { getParsedLocale } from '@/helpers/survey';
import PvTag from 'primevue/tag';

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

async function onLanguageChange(event: LanguageChangeEvent): Promise<void> {
  sessionStorage.setItem(`${isLevante ? 'levante' : 'roar'}PlatformLocale`, event.value);

  await getTranslations(event.value);

  if (isLevante && surveyStore.survey) {
    console.log('setting survey locale');
    (surveyStore.survey as any).locale = getParsedLocale(event.value);
    await setupStudentAudio(surveyStore.survey as any, event.value, surveyStore.audioLinkMap, surveyStore);
  }
}
</script>

<style lang="scss">
.language-selector-wrapper {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.p-select-label {
  text-align: left;
}
</style>
