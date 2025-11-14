export const LEVANTE_TASK_IDS = [
  'intro',
  'heartsAndFlowers',
  'egmaMath',
  'matrixReasoning',
  'memoryGame',
  'mentalRotation',
  'sameDifferentSelection',
  'theoryOfMind',
  'trog',
  'survey',
  'mefs',
  'roarInference',
  'vocab',
] as const;

export const ROAR_TASK_IDS = ['pa', 'swr', 'sre'] as const;

const orderedUniqueTasks = Array.from(new Set([...LEVANTE_TASK_IDS, ...ROAR_TASK_IDS]));

export const CORE_PROGRESS_TASK_IDS = orderedUniqueTasks;

export type CoreProgressTaskId = (typeof CORE_PROGRESS_TASK_IDS)[number];
