import { defineStore, type StoreDefinition } from 'pinia';
import { csvFileToJson, standardDeviation } from '@/helpers';

// --- Interfaces ---

interface Name {
  first: string | undefined;
  middle: string | undefined;
  last: string | undefined;
}

interface Identifier {
  pid: string;
  'name.first'?: string;
  'name.middle'?: string;
  'name.last'?: string;
  [key: string]: any; // Allow other identifier fields
}

interface AppScore {
  taskId: string;
  pid: string;
  runId: string;
  thetaEstimate?: number;
  grade?: any; // Input to parseGrade
  dob?: string | Date; // Input to computeAges
  timeStarted?: string | Date; // Input to computeAges
  blockId?: string;
  attempted?: number;
  correct?: number;
  incorrect?: number;
  [key: string]: any; // Allow other score fields
}

interface CommonRunInfo {
  parsedGrade: string;
  roarScore: number;
  normedPercentile: number;
  supportLevel: string;
}

// MergedRun combines fields from AppScore and Identifier, plus the calculated name
interface MergedRun extends AppScore, Identifier {
  name: Name; // Added by standardizeNames
}

interface SubScore {
  runInfoOrig: MergedRun;
  runInfoCommon?: CommonRunInfo;
  // runInfoTask?: any; // Potential future field
}

interface AgeStats {
  ageMin: number;
  ageMax: number;
  ageMean: string; // Result of toFixed(1)
}

interface GradeStats {
  gradeMin: string;
  gradeMax: string;
  hasFirstOrK: boolean;
}

interface SupportStats {
  High: number | string; // Can be initial string or calculated number
  Medium: number | string;
  Low: number | string;
}

interface RoarScoreStats {
  roarScoreMin: number;
  roarScoreMax: number;
  roarScoreMean: number;
  roarScoreStandardDev: string; // Result of toFixed(0)
}

// --- Utility Functions ---

const standardizeTaskId = (taskId: string): string => {
  return taskId.replace(/^roar-/, '');
};

const standardizeNames = (run: Identifier): Name => {
  return {
    first: run['name.first'],
    middle: run['name.middle'],
    last: run['name.last'],
  };
};

const getRunInfoCommon = (mergedRun: MergedRun): CommonRunInfo | undefined => {
  let normedPercentile: number;
  let parsedGrade = parseGrade(mergedRun.grade);

  switch (mergedRun.taskId) {
    case 'swr':
      // TODO: Replace fake lookup
      normedPercentile = woodcockJohnsonLookup(mergedRun.thetaEstimate ?? 0);
      return {
        parsedGrade: parsedGrade,
        roarScore: thetaToRoarScore(mergedRun.thetaEstimate ?? 0),
        normedPercentile: normedPercentile,
        supportLevel: percentileToSupportClassification('swr', normedPercentile, parsedGrade),
      };

    case 'pa':
      normedPercentile = 0; // Placeholder
      return {
        parsedGrade: parsedGrade,
        roarScore: 0, // Placeholder
        normedPercentile: normedPercentile,
        supportLevel: percentileToSupportClassification('pa', normedPercentile, parsedGrade),
      };

    case 'sre':
    case 'vocab':
    default:
      console.log('TODO: add', mergedRun.taskId, ' to getRunInfoCommon()');
      return undefined;
  }
};

// ... (commented out processSWRRun and getRunInfoTask)

export function thetaToRoarScore(thetaEstimate: number): number {
  return Math.round(100 * (thetaEstimate + 5));
}

function differenceInMonths(date1: Date, date2: Date): number {
  const monthDiff = date1.getMonth() - date2.getMonth();
  const yearDiff = date1.getYear() - date2.getYear();
  return monthDiff + yearDiff * 12;
}

export function computeAges(dob: string | Date, timeStarted: string | Date): { ageMonths: number; ageYears: number } {
  let timeStartedDateStr = typeof timeStarted === 'string' ? timeStarted.substring(0, 10) : timeStarted.toISOString().substring(0, 10);
  let dateOfBirth = new Date(dob);
  let dateOfRun = new Date(timeStartedDateStr);

  let ageMonths = differenceInMonths(dateOfRun, dateOfBirth);
  let ageYears = parseFloat((ageMonths / 12).toFixed(1));

  return { ageMonths, ageYears };
}

// Return type is string, representing the parsed grade category
export function parseGrade(grade: any): string {
  if (grade === null || grade === undefined || grade === '') {
    return 'NA';
  } else if (isNaN(grade)) {
    const gradeStr = String(grade).toLowerCase();
    if (gradeStr === 'k') return 'k';
    if (gradeStr.startsWith('tk')) return 'tk';
    if (gradeStr.includes('trans')) return 'tk';
    if (gradeStr.includes('p')) return 'pk';
    if (gradeStr.includes('j')) return 'jk';
    if (gradeStr.startsWith('kin')) return 'k';
    if (gradeStr === 'adult') return 'adult';
    const parsedInt = parseInt(gradeStr);
    if (!isNaN(parsedInt)) {
      return parsedInt.toString();
    }
    console.warn(grade, 'not recognized as a grade');
    return String(grade); // Return original string if not recognized
  } else {
    const gradeNum = Number(grade);
    if (gradeNum < 0) return 'pk';
    if (gradeNum === 0) return 'k';
    if (gradeNum >= 1 && gradeNum <= 12) return gradeNum.toString();
    return 'adult';
  }
}

// grade is string based on parseGrade output
export function thetaToSupportSWR(percentile: number, grade: string): string {
  let support: string;
  if (grade === 'k' || grade === '1') {
    support = percentile < 50 ? 'Limited' : 'Average or Above Average';
  } else {
    support =
      percentile < 25 ? 'Extra Support Needed' : percentile < 50 ? 'Some Support Needed' : 'Average or Above Average';
  }
  return support;
}

export function woodcockJohnsonLookup(thetaEstimate: number): number {
  console.log('WARNING: fake woodcockJohnsonLookup still in use');
  // Ensure result is within 0-100 range if it represents percentile
  return Math.max(0, Math.min(100, Math.round((100 * (thetaEstimate + 4)) / 8)));
}

// grade is string based on parseGrade output
export function percentileToSupportClassification(taskId: string, percentile: number, grade: string = '1'): string {
  let support = '';
  const numericGrade = parseInt(grade); // Attempt to parse grade for comparison

  switch (taskId) {
    case 'pa':
      if (grade === 'k' || (!isNaN(numericGrade) && numericGrade >= 1 && numericGrade <= 4)) {
        support =
          percentile < 25 ? 'Extra Support Needed' : percentile < 50 ? 'Some Support Needed' : 'Average or Above Average';
      } else {
        // Assuming grades 5+ or non-numeric fall here
        support =
          percentile < 15 ? 'Extra Support Needed' : percentile < 30 ? 'Some Support Needed' : 'Average or Above Average';
      }
      break;

    case 'swr':
      if (grade === 'k' || grade === '1') {
        support = percentile < 50 ? 'Limited' : 'Average or Above Average';
      } else {
        support =
          percentile < 25 ? 'Extra Support Needed' : percentile < 50 ? 'Some Support Needed' : 'Average or Above Average';
      }
      break;

    case 'sre':
    case 'vocab':
      console.log('TODO add sre and vocab cases to percentileToSupportClassification()');
      support = 'Not Available'; // Provide a default
      break;

    default:
      console.log(taskId, 'missing from switch statement');
      support = 'Not Available'; // Provide a default
  }
  return support;
}

export function countItems(): number { // dataArray: any[], searchValue: any): number {
  // Currently returns 0, keep signature simple until logic added
  return 0;
}

const gradeComparator = (a: string, b: string): number => {
  const order = ['pk', 'jk', 'tk', 'k', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'adult'];
  if (a === b) return 0;

  let indexA = order.indexOf(a);
  let indexB = order.indexOf(b);

  // Handle cases where grade might not be in the order array (e.g., 'NA')
  if (indexA === -1) indexA = order.length; // Treat unknown as highest
  if (indexB === -1) indexB = order.length;

  return indexA - indexB;
};

// Return type is complex, using 'any' for simplicity, but it's derived from SubScore/MergedRun
const getRunScores = (subScoresForThisRun: SubScore[]): any => {
  if (!subScoresForThisRun || subScoresForThisRun.length === 0) {
      return undefined; // Handle empty input
  }
  // Ensure runInfoOrig exists before accessing taskId
  const firstRunInfo = subScoresForThisRun[0]?.runInfoOrig;
  if (!firstRunInfo) return undefined;

  const taskId = firstRunInfo.taskId;

  switch (taskId) {
    case 'pa': {
      const paSubScores = subScoresForThisRun
        .map((subScore) => subScore.runInfoOrig)
        .filter((runInfo) => runInfo && ['FSM', 'LSM', 'DEL'].includes(runInfo.blockId?.toUpperCase() ?? ''));

      if (paSubScores.length === 0) return undefined;

      const paScore: Partial<AppScore> & { blockId?: string } = { ...paSubScores[0] }; // Use Partial for accumulating scores
      paScore.blockId = 'total'; // Set blockId for the total score

      ['attempted', 'correct', 'incorrect'].forEach((scoreType: keyof Pick<AppScore, 'attempted' | 'correct' | 'incorrect'>) => {
        const total = paSubScores.reduce((a, b) => {
          // Ensure values are numbers before adding
          return a + (Number(b[scoreType]) || 0);
        }, 0);
        paScore[scoreType] = total;
      });
      // Return the structure consistent with how 'scores' getter might expect it (like a SubScore)
      return { runInfoOrig: paScore as MergedRun }; // Cast required, assuming this structure is intended
    }

    case 'swr':
      // Return the first subscore object, assuming SWR has only one main score entry per run
      return subScoresForThisRun[0];

    case 'sre': {
      // TODO: Confirm SRE blockId names and logic
      const sreSubScores = subScoresForThisRun
        .map(subScore => subScore.runInfoOrig)
        .filter(runInfo => runInfo && ['LAB', 'TOSREC'].includes(runInfo.blockId?.toUpperCase() ?? ''));

      if (sreSubScores.length === 0) return undefined;

      const sreScore: Partial<AppScore> & { blockId?: string } = { ...sreSubScores[0] };
      sreScore.blockId = 'total';

      ['attempted', 'correct', 'incorrect'].forEach((scoreType: keyof Pick<AppScore, 'attempted' | 'correct' | 'incorrect'>) => {
          const total = sreSubScores.reduce((a, b) => a + (Number(b[scoreType]) || 0), 0);
          sreScore[scoreType] = total;
      });
       return { runInfoOrig: sreScore as MergedRun };
    }

    case 'vocab':
      console.log('TODO add sre and vocab cases');
      return subScoresForThisRun[0]; // Placeholder, return first item

    default:
      console.log(taskId, 'missing from switch statement');
      return subScoresForThisRun[0]; // Placeholder, return first item
  }
};

// --- Pinia Store Definition ---

interface ScoresState {
  appScores: AppScore[];
  identifiers: Identifier[];
  sections: any[]; // Type more specifically if structure is known
  selectedStudentId: string | null;
}

// Define interfaces for Getters and Actions for clarity
interface ScoreGetters {
  taskId: string | undefined;
  reportType: string | null; // Currently always null
  scoresReady: boolean; // Depends on the 'scores' getter result
  subScores: SubScore[];
  scores: any[]; // Result type depends on getRunScores
  ageStats: AgeStats | null;
  gradeStats: GradeStats | null;
  swrStats: any; // Combined stats object
  supportStats: SupportStats;
  swrAutomaticityStats: { High: number | string; Low: number | string };
  roarScoreStats: RoarScoreStats | { // Handle case with no scores
      roarScoreMin: number | undefined;
      roarScoreMax: number | undefined;
      roarScoreMean: number | undefined;
      roarScoreStandardDev: string | undefined;
  };
}

interface ScoreActions {
  mergeSectionsWithIdentifiers(csvFile: File): Promise<void>;
}

// Use StoreDefinition for typing the store
type ScoreStoreDefinition = StoreDefinition<
  'scoreStore',
  ScoresState,
  ScoreGetters, // Getters type
  ScoreActions  // Actions type
>;

// Note: The direct invocation `()` at the end makes this return the store instance directly,
// not the definition function. The type needs to reflect this if used elsewhere,
// but for the definition itself, StoreDefinition is correct.
export const useScoreStore = () => {
  return defineStore<'scoreStore', ScoresState, ScoreGetters, ScoreActions>({
    id: 'scoreStore',
    state: (): ScoresState => {
      return {
        appScores: [],
        identifiers: [],
        sections: [],
        selectedStudentId: null,
      };
    },
    getters: {
      // This getter depends on the state directly
      taskId(state: ScoresState): string | undefined {
        const taskIds = [...new Set(state.appScores.map((row) => row?.taskId))];
        return taskIds.length === 1 ? standardizeTaskId(taskIds[0]) : undefined;
      },

      reportType(): string | null {
        // Logic depends on task mix, returning null for now
        return null;
      },

      // This getter implicitly depends on the 'scores' getter result
      // Pinia allows this, but typing can be tricky. Assuming check based on raw scores.
      scoresReady(): boolean {
        return this.scores.length > 0;
      },

      // This getter transforms state data
      subScores(state: ScoresState): SubScore[] {
        if (state.identifiers.length === 0) {
          return state.appScores.map((run) => ({
            runInfoOrig: {
              ...run,
              taskId: standardizeTaskId(run.taskId),
              name: { first: undefined, middle: undefined, last: undefined } // Provide default name structure
            } as MergedRun,
          }));
        } else {
          return state.appScores.map((run): SubScore => {
            const matchingIdentifier = state.identifiers.find((participant) => participant.pid === run.pid);
            const taskId = standardizeTaskId(run.taskId);
            const baseRunInfo = { ...run, taskId };

            if (!matchingIdentifier) {
              return {
                runInfoOrig: { ...baseRunInfo, name: { first: undefined, middle: undefined, last: undefined } } as MergedRun
              };
            } else {
              const names = standardizeNames(matchingIdentifier);
              const mergedRun: MergedRun = {
                ...baseRunInfo,
                ...matchingIdentifier,
                name: names,
              };
              return {
                runInfoOrig: mergedRun,
                runInfoCommon: getRunInfoCommon(mergedRun),
              };
            }
          });
        }
      },

      // This getter depends on the 'subScores' getter
      scores(): any[] { // Return type based on getRunScores
        const uniqueRunIds = [...new Set(this.subScores.map((subScore) => subScore.runInfoOrig?.runId).filter(Boolean))];
        return uniqueRunIds.map((runId) => {
          const subScoresForThisRun = this.subScores.filter((subScore) => subScore.runInfoOrig?.runId === runId);
          return getRunScores(subScoresForThisRun);
        }).filter(Boolean); // Filter out undefined results from getRunScores
      },

      // These getters depend on the 'scores' getter
      ageStats(): AgeStats | null {
        const ages = this.scores
            .map((score) => score?.runInfoOrig?.dob && score?.runInfoOrig?.timeStarted ? computeAges(score.runInfoOrig.dob, score.runInfoOrig.timeStarted) : null)
            .filter((age): age is { ageMonths: number; ageYears: number } => age !== null);

        if (ages.length === 0) return null;

        const ageYears = ages.map((age) => age.ageYears);
        const sum = ageYears.reduce((a, b) => a + b, 0);
        return {
          ageMin: Math.min(...ageYears),
          ageMax: Math.max(...ageYears),
          ageMean: (sum / ages.length).toFixed(1),
        };
      },

      gradeStats(): GradeStats | null {
        const parsedGrades = this.scores.map((score) => parseGrade(score?.runInfoOrig?.grade)).filter(g => g !== 'NA');
        if (parsedGrades.length === 0) return null;

        const hasFirstOrK = parsedGrades.some(g => ['k', 'pk', 'tk', 'jk', '1'].includes(g));

        return {
          gradeMin: parsedGrades.reduce((prev, curr) => (gradeComparator(curr, prev) < 0 ? curr : prev), parsedGrades[0]),
          gradeMax: parsedGrades.reduce((prev, curr) => (gradeComparator(curr, prev) > 0 ? curr : prev), parsedGrades[0]),
          hasFirstOrK: hasFirstOrK,
        };
      },

      swrStats(): any {
          // Check if roarScoreStats exists before spreading
          const roarStats = this.roarScoreStats;
          const ageStats = this.ageStats;
          const gradeStats = this.gradeStats;
          const supportStats = this.supportStats;
          const swrAutoStats = this.swrAutomaticityStats;

        return {
          numStudents: this.scores.length,
          ...(ageStats ?? {}), // Use nullish coalescing for safety
          ...(gradeStats ?? {}),
          ...(roarStats ?? {}),
          support: { ...(supportStats ?? {}) },
          automaticity: { ...(swrAutoStats ?? {}) },
        };
      },

      supportStats(): SupportStats {
        let stats: SupportStats = { High: '', Medium: '', Low: '' };
        // Depends on identifiers being loaded AND merged runs having common info
        if (this.subScores.some(s => !s.runInfoOrig?.pid || !s.runInfoCommon)) {
            return stats;
        }
        const supportArray = this.subScores.map(sub => sub.runInfoCommon?.supportLevel).filter(Boolean);
        if (supportArray.length === 0) return stats;

        stats.High = supportArray.filter((x) => x === 'Average or Above Average').length;
        stats.Medium = supportArray.filter((x) => x === 'Some Support Needed').length;
        stats.Low = supportArray.filter((x) => x === 'Extra Support Needed').length;
        return stats;
      },

      swrAutomaticityStats(): { High: number | string; Low: number | string } {
          let stats = { High: '', Low: '' };
           // Depends on identifiers being loaded AND merged runs having common info
           if (this.subScores.some(s => !s.runInfoOrig?.pid || !s.runInfoCommon)) {
              return stats;
          }
          const supportArray = this.subScores.map(sub => sub.runInfoCommon?.supportLevel).filter(Boolean);
          if (supportArray.length === 0) return stats;

          stats.High = supportArray.filter((x) => x === 'Average or Above Average').length;
          stats.Low = supportArray.filter((x) => x === 'Limited').length;
          return stats;
      },

      roarScoreStats(): RoarScoreStats | { roarScoreMin: undefined; roarScoreMax: undefined; roarScoreMean: undefined; roarScoreStandardDev: undefined } {
          const roarScoresArray = this.scores
            .map(score => score?.runInfoCommon?.roarScore)
            .filter((score): score is number => typeof score === 'number'); // Ensure they are numbers

          if (roarScoresArray.length === 0) {
              return { roarScoreMin: undefined, roarScoreMax: undefined, roarScoreMean: undefined, roarScoreStandardDev: undefined };
          }

        return {
          roarScoreMin: Math.min(...roarScoresArray),
          roarScoreMax: Math.max(...roarScoresArray),
          roarScoreMean: Math.round(roarScoresArray.reduce((a, b) => a + b, 0) / roarScoresArray.length),
          roarScoreStandardDev: standardDeviation(roarScoresArray).toFixed(0),
        };
      },
    },
    actions: {
      async mergeSectionsWithIdentifiers(csvFile: File): Promise<void> {
        try {
            const sectionsData = await csvFileToJson(csvFile);
            console.log(sectionsData);
            // TODO: Define type for sectionsData if possible
            this.sections = sectionsData;
            // Further merging logic might be needed here
        } catch (error) {
            console.error("Error processing CSV file:", error);
            // Handle error appropriately (e.g., show toast notification)
        }
      },
    },
  })();
};
