import { setupLocale, surveyLocalization } from 'survey-core';

export interface CustomLocaleConfig {
	localeCode: string;
	strings: Record<string, any>;
	nativeName?: string;
	englishName?: string;
	rtl?: boolean;
	fallbackLocale?: string;
}

export function registerSurveyLocale({
	localeCode,
	strings,
	nativeName = 'Custom Locale',
	englishName = 'Custom Locale',
	rtl = false,
	fallbackLocale = 'en',
}: CustomLocaleConfig): void {
	setupLocale({
		localeCode,
		strings,
		nativeName,
		englishName,
		rtl,
	});
	surveyLocalization.defaultLocale = fallbackLocale;
}
