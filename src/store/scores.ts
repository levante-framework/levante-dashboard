import { defineStore } from 'pinia';
import { csvFileToJson, standardDeviation } from '@/helpers';
import { Timestamp } from 'firebase/firestore'; // Assuming Timestamp might be needed based on context

// --- Interfaces for Data Structures ---

interface Run {
  taskId: string;
  thetaEstimate?: number;
  grade?: string | number;
  pid?: string; // Assuming pid exists for matching
  runId?: string; // Assuming runId exists
  blockId?: string; // For subscores
  dob?: string | Date; // Date of birth
  timeStarted?: string; // Timestamp string
  attempted?: number;
  correct?: number;
  incorrect?: number;
  [key: string]: any; // Allow other properties
}

interface Identifier {
  pid: string;
  'name.first'?: string;
  'name.middle'?: string;
  'name.last'?: string;
  [key: string]: any; // Allow other properties
}

interface MergedRun extends Run {
  name?: NameInfo;
}

interface NameInfo {
  first?: string;
  middle?: string;
  last?: string;
}

interface CommonRunInfo {
  parsedGrade: string;
  roarScore: number;
  normedPercentile: number;
  supportLevel: string;
}

interface AgeInfo {
  ageMonths: number;
  ageYears: number;
}

interface SubScoreItem {
  runInfoOrig: MergedRun; // Use MergedRun which includes potential name info
  runInfoCommon?: CommonRunInfo | undefined;
  // runInfoTask?: any; // Add specific task info type if available
  [key: string]: any; // Allow other properties, potentially from the original run object
}

// Define more specific types for scores/summaries if possible
type ScoreObject = any; // Replace 'any' with a more detailed interface for score objects
type GradeStats = any; // Replace 'any' with a more detailed interface
type ScoreSummary = Record<string, number> | null; // Example type

// --- Helper Functions with Types ---

const standardizeTaskId = (taskId: string): string => {
  return taskId.replace(/^roar-/, '');
};

const standardizeNames = (identifier: Identifier): NameInfo => {
  return {
    first: identifier['name.first'],
    middle: identifier['name.middle'],
    last: identifier['name.last'],
  };
};

const getRunInfoCommon = (mergedRun: MergedRun): CommonRunInfo | undefined => {
  let normedPercentile: number;
  let parsedGrade = parseGrade(mergedRun.grade);

  switch (mergedRun.taskId) {
    case 'swr':
      normedPercentile = woodcockJohnsonLookup(mergedRun.thetaEstimate ?? 0);
      return {
        parsedGrade: parsedGrade,
        roarScore: thetaToRoarScore(mergedRun.thetaEstimate ?? 0),
        normedPercentile: normedPercentile,
        supportLevel: percentileToSupportClassification('swr', normedPercentile, mergedRun.grade),
      };
    case 'pa':
      normedPercentile = 0;
      return {
        parsedGrade: parsedGrade,
        roarScore: 0,
        normedPercentile: normedPercentile,
        supportLevel: percentileToSupportClassification('pa', normedPercentile, mergedRun.grade),
      };
    case 'sre':
    case 'vocab':
    default:
      console.log('TODO: add', mergedRun.taskId, ' to getRunInfoCommon()');
      return undefined;
  }
};

export function thetaToRoarScore(thetaEstimate: number): number {
  return Math.round(100 * (thetaEstimate + 5));
}

function differenceInMonths(date1: Date, date2: Date): number {
  const monthDiff = date1.getMonth() - date2.getMonth();
  const yearDiff = date1.getFullYear() - date2.getFullYear();
  return monthDiff + yearDiff * 12;
}

export function computeAges(dob: string | Date | undefined | null, timeStarted: string | undefined | null): AgeInfo | null {
  if (!dob || !timeStarted) return null;
  let timeStartedDateStr = String(timeStarted).substring(0, 10);
  let dateOfBirth = new Date(dob);
  let dateOfRun = new Date(timeStartedDateStr);

  if (isNaN(dateOfBirth.getTime()) || isNaN(dateOfRun.getTime())) {
    console.warn('Invalid date provided to computeAges', { dob, timeStarted });
    return null;
  }

  let ageMonths = differenceInMonths(dateOfRun, dateOfBirth);
  let ageYears = parseFloat((ageMonths / 12).toFixed(1));

  return { ageMonths, ageYears };
}

export function parseGrade(grade: string | number | undefined | null): string {
    if (grade === null || grade === undefined || grade === '') return 'NA';

    const gradeNum = Number(grade);

    if (!isNaN(gradeNum)) { // It's a number or a string representing a number
        if (gradeNum < 0) return 'pk';
        if (gradeNum === 0) return 'k';
        if (gradeNum >= 1 && gradeNum <= 12) return gradeNum.toString();
        return 'adult';
    } else { // It's a string that's not a plain number
        const gradeStr = String(grade).toLowerCase().trim();
        if (gradeStr === 'k' || gradeStr === 'kindergarten') return 'k';
        if (gradeStr === 'tk' || gradeStr.includes('trans')) return 'tk';
        if (gradeStr === 'pk' || gradeStr.includes('pre')) return 'pk';
        if (gradeStr === 'jk') return 'jk'; // Junior Kindergarten?
        if (gradeStr === 'adult') return 'adult';

        // Attempt to parse grades like "1st", "2nd"
        const numPart = parseInt(gradeStr);
        if (!isNaN(numPart) && numPart >= 1 && numPart <= 12) {
            return numPart.toString();
        }

        console.warn(grade, 'not recognized as a grade');
        return 'NA'; // Default to NA if unrecognizable
    }
}


export function thetaToSupportSWR(percentile: number, grade: string | number | undefined | null): string {
  let support: string;
  const parsedGrade = parseGrade(grade);

  if (parsedGrade === 'k' || parsedGrade === '1') {
    support = percentile < 50 ? 'Limited' : 'Average or Above Average';
  } else {
    support =
      percentile < 25 ? 'Extra Support Needed' : percentile < 50 ? 'Some Support Needed' : 'Average or Above Average';
  }
  return support;
}

export function woodcockJohnsonLookup(thetaEstimate: number): number {
  console.log('WARNING: fake woodcockJohnsonLookup still in use');
  return Math.round((100 * (thetaEstimate + 4)) / 8);
}

export function percentileToSupportClassification(
  taskId: string,
  percentile: number,
  grade: string | number | undefined | null = 1
): string {
  let support: string = '';
  const parsedGrade = parseGrade(grade);

  switch (taskId) {
    case 'pa':
      if (gradeComparator(parsedGrade, '4') <= 0) { // K through 4
        support = percentile < 25 ? 'Extra Support Needed' : percentile < 50 ? 'Some Support Needed' : 'Average or Above Average';
      } else { // 5th grade and up
        support = percentile < 15 ? 'Extra Support Needed' : percentile < 30 ? 'Some Support Needed' : 'Average or Above Average';
      }
      break;
    case 'swr':
      if (parsedGrade === 'k' || parsedGrade === '1') {
        support = percentile < 50 ? 'Limited' : 'Average or Above Average';
      } else {
        support = percentile < 25 ? 'Extra Support Needed' : percentile < 50 ? 'Some Support Needed' : 'Average or Above Average';
      }
      break;
    case 'sre':
    case 'vocab':
      console.log('TODO add sre and vocab cases to percentileToSupportClassification() ');
      break;
    default:
      console.log(taskId, 'missing from switch statement');
  }
  return support;
}

export function countItems(): number {
  return 0; // TODO temp
}

const gradeComparator = (a: string, b: string): number => {
  const order = ['pk', 'jk', 'tk', 'k', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'adult', 'NA'];
  if (a === b) return 0;
  let indexA = order.indexOf(a);
  let indexB = order.indexOf(b);
  if (indexA === -1) indexA = order.length;
  if (indexB === -1) indexB = order.length;
  return indexA - indexB;
};

const getRunScores = (subScoresForThisRun: SubScoreItem[]): ScoreObject | null => {
    const taskId = subScoresForThisRun[0]?.runInfoOrig?.taskId;
    if (!taskId || subScoresForThisRun.length === 0) return null; // Return null for invalid input

    // Base object should contain identifiers present in all subscores (assuming they match)
    const baseRunInfo = { ...(subScoresForThisRun[0].runInfoOrig ?? {}) };

    switch (taskId) {
        case 'pa': {
            const paSubScores = subScoresForThisRun
                .map(subScore => subScore.runInfoOrig)
                .filter(runInfo => ['FSM', 'LSM', 'DEL'].includes(runInfo.blockId?.toUpperCase() ?? ''));

            if (!paSubScores.length) return { ...baseRunInfo, blockId: 'total' };

            const paScore: Partial<Run> & { blockId: string } = { ...baseRunInfo, blockId: 'total' };

            ['attempted', 'correct', 'incorrect'].forEach((scoreType: keyof Run) => {
                const total = paSubScores.reduce((sum, runInfo) => {
                    const value = Number(runInfo[scoreType] ?? 0);
                    return sum + (isNaN(value) ? 0 : value);
                }, 0);
                (paScore as any)[scoreType] = total;
            });
            return paScore;
        }
        case 'swr':
             // SWR seems to return the full SubScoreItem, not just runInfoOrig
             // Ensure the structure matches what's expected downstream
            return subScoresForThisRun[0] ?? null; // Return the first item or null

        case 'sre': {
            const sreSubScores = subScoresForThisRun
                 .filter(subScore => ['LAB', 'TOSREC'].includes(subScore.runInfoOrig?.blockId?.toUpperCase() ?? ''));

            if (!sreSubScores.length) return { ...baseRunInfo, blockId: 'total' };

            const sreScore: Partial<Run> & { blockId: string } = { ...baseRunInfo, blockId: 'total' };

            ['attempted', 'correct', 'incorrect'].forEach((scoreType: keyof Run) => {
                const total = sreSubScores.reduce((sum, subScore) => {
                     const value = Number(subScore.runInfoOrig?.[scoreType] ?? 0);
                     return sum + (isNaN(value) ? 0 : value);
                 }, 0);
                (sreScore as any)[scoreType] = total;
            });
            return sreScore;
        }
        case 'vocab':
            console.log('TODO add vocab case to getRunScores');
            return { ...baseRunInfo, blockId: 'total' }; // Return base info
        default:
            console.log(taskId, 'missing from getRunScores switch statement');
            return { ...baseRunInfo, blockId: 'total' }; // Return base info
    }
};


// --- Pinia Store Definition ---

interface ScoreState {
  appScores: Run[];
  identifiers: Identifier[];
  sections: any[]; // Replace 'any' if section structure is known
  selectedStudentId: string | null;
}

interface ScoreGetters {
  taskId(state: ScoreState): string | undefined;
  reportType(state: ScoreState): string | null;
  scoresReady(state: ScoreState): boolean;
  subScores(state: ScoreState): SubScoreItem[];
  scores(state: ScoreState): ScoreObject[];
  ageStats(state: ScoreState): AgeInfo | null;
  gradeStats(state: ScoreState): GradeStats | null;
  scoreSummary(state: ScoreState): ScoreSummary;
  selectedStudentScores(state: ScoreState): ScoreObject | undefined;
  selectedStudentSubScores(state: ScoreState): SubScoreItem[] | undefined;
  [key: string]: any; // Allow index signature for getter access casting
}

interface ScoreActions {
  uploadAppScores(file: File): Promise<void>;
  uploadIdentifiers(file: File): Promise<void>;
  uploadSections(file: File): Promise<void>;
  selectStudent(studentId: string | null): void;
}

export const useScoreStore = defineStore<
  'scoreStore',
  ScoreState,
  ScoreGetters,
  ScoreActions
>({
  id: 'scoreStore',
  state: (): ScoreState => ({
    appScores: [],
    identifiers: [],
    sections: [],
    selectedStudentId: null,
  }),
  getters: {
    taskId(state) {
      const taskIds = [...new Set(state.appScores.map(row => row?.taskId).filter(Boolean))];
      return taskIds.length > 0 ? taskIds[0] : undefined;
    },
    reportType(/* state */) {
      return null; // Placeholder
    },
    scoresReady(state) {
      return state.appScores.length > 0;
    },
    subScores(state): SubScoreItem[] {
      if (state.identifiers.length === 0) {
        return state.appScores.map((run: Run) => ({
          runInfoOrig: { ...run, taskId: standardizeTaskId(run.taskId) },
        }));
      } else {
        return state.appScores.map((run: Run) => {
          const matchingIdentifier = state.identifiers.find(participant => participant.pid === run.pid);
          const taskId = standardizeTaskId(run.taskId);
          if (!matchingIdentifier) {
            return { runInfoOrig: { ...run, taskId } };
          } else {
            const names = standardizeNames(matchingIdentifier);
            const mergedRun: MergedRun = { ...run, ...matchingIdentifier, name: names, taskId };
            const subScore: SubScoreItem = {
              runInfoOrig: mergedRun,
              runInfoCommon: getRunInfoCommon(mergedRun),
            };
            return subScore;
          }
        });
      }
    },
    scores(this: any, state): ScoreObject[] { // Use 'this: any' for accessing other getters
      const subScoresData = this.subScores as SubScoreItem[];
      if (!subScoresData) return [];
      const uniqueRunIds = [...new Set(subScoresData.map(subScore => subScore.runInfoOrig?.runId).filter(Boolean))];

      return uniqueRunIds
        .map(runId => {
          const subScoresForThisRun = subScoresData.filter(subScore => subScore.runInfoOrig?.runId === runId);
          return getRunScores(subScoresForThisRun);
        })
        .filter((score): score is ScoreObject => score !== null); // Type guard
    },
    ageStats(this: any, state): AgeInfo | null {
      const scoresData = this.scores as ScoreObject[];
      if (!scoresData || scoresData.length === 0) return null;

      const ages = scoresData
        .map(score => computeAges(score?.runInfoOrig?.dob, score?.runInfoOrig?.timeStarted))
        .filter((age): age is AgeInfo => age !== null && age.ageYears > 0);

      if (ages.length === 0) return null;
      const ageYears = ages.map(age => age.ageYears);
      return {
        ageMonths: 0, // Placeholder
        ageYears: parseFloat((ageYears.reduce((a, b) => a + b, 0) / ages.length).toFixed(1)),
      };
    },
    gradeStats(this: any, state): GradeStats | null {
        const scoresData = this.scores as ScoreObject[];
        if (!scoresData || scoresData.length === 0) return null;

        const grades = scoresData.map(score => parseGrade(score?.runInfoOrig?.grade));
        const validGrades = grades.filter(g => g !== 'NA');
        if (validGrades.length === 0) return null;

        const sortedGrades = [...validGrades].sort(gradeComparator); // Use spread for immutable sort
        const gradeCounts = sortedGrades.reduce((acc: Record<string, number>, grade) => {
            acc[grade] = (acc[grade] || 0) + 1;
            return acc;
        }, {});

        return {
            min: sortedGrades[0],
            max: sortedGrades[sortedGrades.length - 1],
            mean: 'N/A', // Mean grade isn't typically useful
            counts: gradeCounts,
            unique: Object.keys(gradeCounts).sort(gradeComparator), // Sort unique grades
        };
    },
    scoreSummary(this: any, state): ScoreSummary {
        const scoresData = this.scores as ScoreObject[];
        if (!scoresData || scoresData.length === 0) return null;

        // Ensure runInfoCommon exists before accessing supportLevel
        const supportLevels = scoresData.map(score => score?.runInfoCommon?.supportLevel).filter(Boolean);

        const summary = supportLevels.reduce((acc: Record<string, number>, level) => {
            acc[level] = (acc[level] || 0) + 1;
            return acc;
        }, {});
        return summary;
    },

    selectedStudentScores(this: any, state): ScoreObject | undefined {
        if (!state.selectedStudentId) return undefined;
        const scoresData = this.scores as ScoreObject[];
        // Assuming runInfoOrig contains pid
        return scoresData.find(score => score?.runInfoOrig?.pid === state.selectedStudentId);
    },
    selectedStudentSubScores(this: any, state): SubScoreItem[] | undefined {
        if (!state.selectedStudentId) return undefined;
        const subScoresData = this.subScores as SubScoreItem[];
         // Assuming runInfoOrig contains pid
        return subScoresData.filter(subScore => subScore?.runInfoOrig?.pid === state.selectedStudentId);
    },

  },
  actions: {
    async uploadAppScores(file: File): Promise<void> {
      try {
        const jsonData = await csvFileToJson(file) as Run[];
        this.appScores = jsonData;
        console.log('App scores uploaded and processed.');
      } catch (error) {
        console.error('Error processing app scores file:', error);
      }
    },
    async uploadIdentifiers(file: File): Promise<void> {
      try {
        const jsonData = await csvFileToJson(file) as Identifier[];
        this.identifiers = jsonData;
        console.log('Identifiers uploaded and processed.');
      } catch (error) {
        console.error('Error processing identifiers file:', error);
      }
    },
    async uploadSections(file: File): Promise<void> {
      try {
        const jsonData = await csvFileToJson(file) as any[];
        this.sections = jsonData;
        console.log('Sections uploaded and processed.');
      } catch (error) {
        console.error('Error processing sections file:', error);
      }
    },
    selectStudent(studentId: string | null): void {
      this.selectedStudentId = studentId;
    },
  },
});
