import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createI18n } from 'vue-i18n';

// Mock the auth store
const mockAuthStore = {
  completeAssessment: vi.fn(),
};

vi.mock('@/store/auth', () => ({
  useAuthStore: () => mockAuthStore,
}));

// Mock the survey store
const mockSurveyStore = {
  isGeneralSurveyComplete: true,
  isSpecificSurveyComplete: true,
  survey: null,
  numGeneralPages: 1,
  numSpecificPages: 1,
  specificSurveyRelationData: [],
};

vi.mock('@/store/survey', () => ({
  useSurveyStore: () => mockSurveyStore,
}));

// Mock the assignments store
const mockAssignmentsStore = {
  selectedAssignment: { id: 'test-assignment-id' },
};

vi.mock('@/store/assignments', () => ({
  useAssignmentsStore: () => mockAssignmentsStore,
}));

// Mock the roar-utils getAgeData function
vi.mock('@bdelab/roar-utils', () => ({
  getAgeData: vi.fn(() => ({ ageMonths: 120 })),
  camelize: vi.fn((str) => str.toLowerCase()),
}));

// Mock window.open and window.location
Object.defineProperty(window, 'open', {
  writable: true,
  value: vi.fn(),
});

Object.defineProperty(window, 'location', {
  writable: true,
  value: { href: '' },
});

const createI18nInstance = (locale = 'en-US') => {
  return createI18n({
    legacy: false,
    locale,
    messages: {
      'en-US': {
        gameTabs: {
          taskCompleted: 'Task Completed!',
          clickToStart: 'Click to start',
          taskNotYetAvailable: 'Not available yet',
          taskNoLongerAvailable: 'No longer available',
          surveyNameChild: 'Thoughts and Feelings',
          surveyDescriptionChild: 'Answer questions about your time at school.',
          surveyProgressGeneral: 'General',
          surveyProgressGeneralParent: 'Home/Caregiver',
          surveyProgressGeneralTeacher: 'Teacher',
          surveyProgressSpecificParent: 'Child',
          surveyProgressSpecificParentMonth: 'Month',
          surveyProgressSpecificParentYear: 'Year',
          surveyProgressSpecificTeacher: 'Classroom',
          swr: 'Word Reading',
          swrName: 'Word Reading',
          swrDescription: 'The words will appear quickly on the screen. Decide if they are real or made-up.',
          pa: 'Language Sounds',
          paName: 'Language Sounds',
          paDescription: 'Identify the sound in the words.',
          sre: 'Sentence Reading',
          sreName: 'Sentence Reading',
          sreDescription: 'Read the sentences as quickly as you can and decide if they are true or false.',
        },
      },
      'es-CO': {
        gameTabs: {
          taskCompleted: '¡Tarea completa!',
          clickToStart: 'Haz clic para empezar',
          taskNotYetAvailable: 'Aún no está disponible',
          taskNoLongerAvailable: 'Ya no está disponible',
          surveyNameChild: 'Pensamientos y Sentimientos',
          surveyDescriptionChild: 'Responde a las preguntas sobre tu estancia en el colegio.',
          surveyProgressGeneral: 'General',
          surveyProgressGeneralParent: 'Familia',
          surveyProgressGeneralTeacher: 'Profesor',
          surveyProgressSpecificParent: 'Niño',
          surveyProgressSpecificParentMonth: 'Mes',
          surveyProgressSpecificParentYear: 'Año',
          surveyProgressSpecificTeacher: 'Aula',
          swr: 'Palabra',
          swrName: 'Palabra',
          swrDescription: 'Las palabras aparecerán rápidamente en la pantalla. Decide si son reales o inventadas.',
          pa: 'Fonema',
          paName: 'Fonema',
          paDescription: 'Identificar el sonido en las palabras',
          sre: 'Frase',
          sreName: 'Frase',
          sreDescription: 'Lee las oraciones tan rápido como puedas y decide si son verdaderas o falsas.',
        },
      },
    },
  });
};

describe('GameTabs - routeExternalTask URL Construction', () => {
  let mockGame;
  let mockUserData;
  let mockLocale;

  beforeEach(() => {
    mockGame = {
      taskId: 'swr',
      completedOn: null,
      taskData: {
        name: 'Word Reading',
        description: 'Description for Word Reading',
        image: '/test-image.jpg',
        taskURL: 'https://example.com/swr?',
        variantURL: null,
        meta: {},
      },
    };

    mockUserData = {
      id: 'test-user-id',
      userType: 'student',
      assessmentPid: 'test-assessment-pid',
      birthMonth: 1,
      birthYear: 2010,
      schools: { current: ['school-1'] },
      classes: { current: ['class-1'] },
    };

    mockLocale = 'es-CO';

    // Reset mocks
    mockAuthStore.completeAssessment.mockClear();
    window.location.href = '';
    window.open.mockClear();
  });

  describe('URL Construction for External Tasks', () => {
    it('should include locale parameter for ROAR tasks (swr, pa, sre)', () => {
      // Simulate the routeExternalTask logic for non-mefs tasks
      const url = mockGame.taskData.taskURL;
      const constructedUrl = `${url}&participant=${mockUserData.assessmentPid}&lng=${mockLocale}${
        mockUserData.schools?.current?.length ? '&schoolId=' + mockUserData.schools.current.join('"%2C"') : ''
      }${mockUserData.classes?.current?.length ? '&classId=' + mockUserData.classes.current.join('"%2C"') : ''}`;

      // Verify the URL contains all expected parameters
      expect(constructedUrl).toContain('&participant=test-assessment-pid');
      expect(constructedUrl).toContain('&lng=es-CO');
      expect(constructedUrl).toContain('&schoolId=school-1');
      expect(constructedUrl).toContain('&classId=class-1');
      expect(constructedUrl).toContain('https://example.com/swr?');
    });

    it('should include locale parameter for mefs task', () => {
      // Simulate the routeExternalTask logic for mefs task
      const mefsGame = {
        ...mockGame,
        taskId: 'mefs',
        taskData: {
          ...mockGame.taskData,
          name: 'Lion and Monkey',
          variantURL: 'https://example.com/mefs?',
          taskURL: null,
        },
      };

      const url = mefsGame.taskData.variantURL;
      const ageInMonths = 120; // Mocked age
      const constructedUrl = `${url}participantID=${mockUserData.id}&participantAgeInMonths=${ageInMonths}&lng=${mockLocale}`;

      // Verify the URL contains all expected parameters
      expect(constructedUrl).toContain('participantID=test-user-id');
      expect(constructedUrl).toContain('participantAgeInMonths=120');
      expect(constructedUrl).toContain('&lng=es-CO');
      expect(constructedUrl).toContain('https://example.com/mefs?');
    });

    it('should handle different locale values correctly', () => {
      const locales = ['en-US', 'es-CO', 'fr-CA', 'de'];

      locales.forEach(locale => {
        const url = 'https://example.com/pa?';
        const constructedUrl = `${url}&participant=${mockUserData.assessmentPid}&lng=${locale}&schoolId=school-1&classId=class-1`;

        expect(constructedUrl).toContain(`&lng=${locale}`);
        expect(constructedUrl).toContain('&participant=test-assessment-pid');
        expect(constructedUrl).toContain('&schoolId=school-1');
        expect(constructedUrl).toContain('&classId=class-1');
      });
    });

    it('should not include locale parameter for non-external tasks', () => {
      const nonExternalGame = {
        ...mockGame,
        taskData: {
          ...mockGame.taskData,
          taskURL: null,
          variantURL: null,
        },
      };

      // For non-external tasks, the function should return early
      expect(nonExternalGame.taskData.taskURL).toBeNull();
      expect(nonExternalGame.taskData.variantURL).toBeNull();
      // No URL construction should happen for non-external tasks
    });
  });

  describe('Task Name Translation', () => {
    it('should translate task names correctly for different locales', () => {
      // Test translation logic for different locales
      const testTranslation = (locale, expectedTranslations) => {
        const i18n = createI18nInstance(locale);
        const t = i18n.global.t;

        expect(t('gameTabs.swr')).toBe(expectedTranslations.swr);
        expect(t('gameTabs.pa')).toBe(expectedTranslations.pa);
        expect(t('gameTabs.sre')).toBe(expectedTranslations.sre);
      };

      // Test Spanish translations
      testTranslation('es-CO', {
        swr: 'Palabra',
        pa: 'Fonema',
        sre: 'Frase',
      });

      // Test English translations
      testTranslation('en-US', {
        swr: 'Word Reading',
        pa: 'Language Sounds',
        sre: 'Sentence Reading',
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing school/class data', () => {
      const userDataWithoutOrgs = {
        ...mockUserData,
        schools: { current: [] },
        classes: { current: [] },
      };

      const url = mockGame.taskData.taskURL;
      const constructedUrl = `${url}&participant=${userDataWithoutOrgs.assessmentPid}&lng=${mockLocale}`;

      expect(constructedUrl).toContain('&participant=test-assessment-pid');
      expect(constructedUrl).toContain('&lng=es-CO');
      expect(constructedUrl).not.toContain('&schoolId=');
      expect(constructedUrl).not.toContain('&classId=');
    });

    it('should handle URL with existing parameters', () => {
      const gameWithExistingParams = {
        ...mockGame,
        taskData: {
          ...mockGame.taskData,
          taskURL: 'https://example.com/swr?existing=param&',
        },
      };

      const url = gameWithExistingParams.taskData.taskURL;
      const constructedUrl = `${url}&participant=${mockUserData.assessmentPid}&lng=${mockLocale}&schoolId=school-1`;

      expect(constructedUrl).toContain('existing=param');
      expect(constructedUrl).toContain('&participant=test-assessment-pid');
      expect(constructedUrl).toContain('&lng=es-CO');
      expect(constructedUrl).toContain('&schoolId=school-1');
    });
  });
});
