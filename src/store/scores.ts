import { defineStore } from 'pinia';
import { csvFileToJson, standardDeviation } from '@/helpers';

interface Name {
  first: string;
  middle: string;
  last: string;
}

interface RunInfoCommon {
  parsedGrade: string;
  roarScore: number;
  normedPercentile: number;
  supportLevel: string;
}

interface RunInfoOrig {
  taskId: string;
  runId: string;
  pid: string;
  grade: string;
  dob: string;
  timeStarted: string;
  thetaEstimate: number;
  blockId: string;
  attempted: number;
  correct: number;
  incorrect: number;
  name?: Name;
  [key: string]: any; // Add index signature for dynamic property access
}

interface SubScore {
  runInfoOrig: RunInfoOrig;
  runInfoCommon?: RunInfoCommon;
}

interface Stats {
  High: number;
  Medium: number;
  Low: number;
}

interface AutomaticityStats {
  High: number;
  Low: number;
}

interface ScoreState {
  appScores: any[];
  identifiers: any[];
  sections: any[];
  selectedStudentId: string | null;
  scores: any[];
  subScores: SubScore[];
  ageStats: {
    ageMin: number;
    ageMax: number;
    ageMean: string;
  } | null;
  gradeStats: {
    gradeMin: string;
    gradeMax: string;
    hasFirstOrK: boolean;
  } | null;
  roarScoreStats: {
    roarScoreMin: number;
    roarScoreMax: number;
    roarScoreMean: number;
    roarScoreStandardDev: string;
  };
  supportStats: Stats;
  swrAutomaticityStats: AutomaticityStats;
}

const standardizeTaskId = (taskId: string): string => {
  return taskId.replace(/^roar-/, '');
};

const standardizeNames = (run: any): Name => {
  return {
    first: run['name.first'],
    middle: run['name.middle'],
    last: run['name.last'],
  };
};

const getRunInfoCommon = (mergedRun: RunInfoOrig): RunInfoCommon => {
  let normedPercentile: number;
  let parsedGrade = parseGrade(mergedRun.grade);

  switch (mergedRun.taskId) {
    case 'swr':
      normedPercentile = woodcockJohnsonLookup(mergedRun.thetaEstimate);
      return {
        parsedGrade,
        roarScore: thetaToRoarScore(mergedRun.thetaEstimate),
        normedPercentile,
        supportLevel: percentileToSupportClassification('swr', normedPercentile, mergedRun.grade),
      };

    case 'pa':
      normedPercentile = 0;
      return {
        parsedGrade,
        roarScore: 0,
        normedPercentile,
        supportLevel: percentileToSupportClassification('pa', normedPercentile, mergedRun.grade),
      };

    case 'sre':
    case 'vocab':
    default:
      console.log('TODO: add', mergedRun.taskId, ' to getRunInfoCommon()');
      return {
        parsedGrade,
        roarScore: 0,
        normedPercentile: 0,
        supportLevel: '',
      };
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

export function computeAges(dob: string, timeStarted: string): { ageMonths: number; ageYears: number } {
  let timeStartedDate = timeStarted.substring(0, 10);
  let dateOfBirth = new Date(dob);
  let dateOfRun = new Date(timeStartedDate);

  let ageMonths = differenceInMonths(dateOfRun, dateOfBirth);
  let ageYears = parseFloat((ageMonths / 12).toFixed(1));

  return { ageMonths, ageYears };
}

export function parseGrade(grade: string | number | null | undefined): string {
  if (!grade) {
    return 'NA';
  } else if (typeof grade === 'number') {
    if (grade < 0) {
      return 'pk';
    } else if (grade === 0) {
      return 'k';
    } else if (grade >= 1 && grade <= 12) {
      return grade.toString();
    } else {
      return 'adult';
    }
  } else {
    const gradeStr = grade.toString().toLowerCase();
    if (gradeStr === 'k') {
      return 'k';
    } else if (gradeStr.startsWith('tk')) {
      return 'tk';
    } else if (gradeStr.includes('trans')) {
      return 'tk';
    } else if (gradeStr.includes('p')) {
      return 'pk';
    } else if (gradeStr.includes('j')) {
      return 'jk';
    } else if (gradeStr.startsWith('kin')) {
      return 'k';
    } else if (gradeStr === 'adult') {
      return 'adult';
    } else if (!isNaN(parseInt(gradeStr))) {
      return parseInt(gradeStr).toString();
    } else {
      console.warn(grade, 'not recognized as a grade');
      return gradeStr;
    }
  }
}

export function woodcockJohnsonLookup(thetaEstimate: number): number {
  console.log('WARNING: fake woodcockJohnsonLookup still in use');
  return Math.round((100 * (thetaEstimate + 4)) / 8);
}

export function percentileToSupportClassification(taskId: string, percentile: number, grade: string | number = 1): string {
  let support = '';

  switch (taskId) {
    case 'pa':
      if (grade === 'K' || Number(grade) <= 4) {
        support =
          percentile < 25
            ? 'Extra Support Needed'
            : percentile < 50
            ? 'Some Support Needed'
            : 'Average or Above Average';
      } else {
        support =
          percentile < 15
            ? 'Extra Support Needed'
            : percentile < 30
            ? 'Some Support Needed'
            : 'Average or Above Average';
      }
      break;

    case 'swr':
      if (grade === 'K' || grade === '1') {
        support = percentile < 50 ? 'Limited' : 'Average or Above Average';
      } else {
        support =
          percentile < 25
            ? 'Extra Support Needed'
            : percentile < 50
            ? 'Some Support Needed'
            : 'Average or Above Average';
      }
      break;

    case 'sre':
    case 'vocab':
      console.log('TODO add sre and vocab cases to percentileToSupportClassification()');
      break;

    default:
      console.log(taskId, 'missing from switch statement');
  }

  return support;
}

const gradeComparator = (a: string, b: string): number => {
  const order = ['pk', 'jk', 'tk', 'k', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'adult'];

  if (a === b) {
    return 0;
  }

  let indexA = order.length;
  let indexB = order.length;

  if (order.includes(a)) {
    indexA = order.indexOf(a);
  }

  if (order.includes(b)) {
    indexB = order.indexOf(b);
  }

  if (indexA === indexB) {
    return a > b ? 1 : -1;
  } else if (indexA > indexB) {
    return 1;
  } else {
    return -1;
  }
};

const getRunScores = (subScoresForThisRun: SubScore[]): any => {
  const taskId = [...new Set(subScoresForThisRun.map((subScore) => subScore.runInfoOrig.taskId))][0];
  switch (taskId) {
    case 'pa': {
      const paSubScores = subScoresForThisRun
        .map((subScore) => subScore.runInfoOrig)
        .filter((subScore) => ['FSM', 'LSM', 'DEL'].includes(subScore.blockId.toUpperCase()));
      const paScore = { ...paSubScores[0] };
      ['attempted', 'correct', 'incorrect'].forEach((scoreType) => {
        const total = paSubScores.reduce((a, b) => a + b[scoreType], 0);
        paScore[scoreType] = total;
      });
      return {
        ...paScore,
        blockId: 'total',
      };
    }

    case 'swr':
      return subScoresForThisRun[0];

    case 'sre': {
      const sreSubScores = subScoresForThisRun.filter((subScore) =>
        ['LAB', 'TOSREC'].includes(subScore.runInfoOrig.blockId.toUpperCase()),
      );
      const sreScore = sreSubScores[0];
      sreScore.runInfoOrig.blockId = 'total';
      ['attempted', 'correct', 'incorrect'].forEach((scoreType) => {
        sreScore.runInfoOrig[scoreType] = sreSubScores.reduce(
          (acc, curr) => acc + curr.runInfoOrig[scoreType],
          0
        );
      });
      return sreScore;
    }

    case 'vocab':
      console.log('TODO add sre and vocab cases');
      break;

    default:
      console.log(taskId, 'missing from switch statement');
  }
  return null;
};

export const useScoreStore = () => {
  return defineStore({
    id: 'scoreStore',
    state: (): ScoreState => {
      return {
        appScores: [],
        identifiers: [],
        sections: [],
        selectedStudentId: null,
        scores: [],
        subScores: [],
        ageStats: null,
        gradeStats: null,
        roarScoreStats: {
          roarScoreMin: 0,
          roarScoreMax: 0,
          roarScoreMean: 0,
          roarScoreStandardDev: '0',
        },
        supportStats: {
          High: 0,
          Medium: 0,
          Low: 0,
        },
        swrAutomaticityStats: {
          High: 0,
          Low: 0,
        },
      };
    },
    getters: {
      taskId: (state) => {
        return [...new Set(state.appScores.map((row) => row?.taskId))][0];
      },

      reportType: () => {
        return null;
      },

      scoresReady: (state) => state.scores.length > 0,
      subScores: (state) => {
        if (state.identifiers.length === 0) {
          return state.appScores.map((run) => {
            const taskId = standardizeTaskId(run.taskId);
            return {
              runInfoOrig: {
                ...run,
                taskId,
              },
            };
          });
        } else {
          return state.appScores.map((run) => {
            const matchingIdentifier = state.identifiers.filter((participant) => participant.pid === run.pid);
            const taskId = standardizeTaskId(run.taskId);
            if (matchingIdentifier.length === 0) {
              return {
                runInfoOrig: {
                  ...run,
                  taskId,
                },
              };
            } else {
              const names = standardizeNames(matchingIdentifier[0]);
              const mergedRun = {
                ...run,
                ...matchingIdentifier[0],
                name: names,
                taskId,
              };
              return {
                runInfoOrig: mergedRun,
                runInfoCommon: getRunInfoCommon(mergedRun),
              };
            }
          });
        }
      },
      scores: (state) => {
        const uniqueRunIds = [...new Set(state.subScores.map((subScore) => subScore.runInfoOrig.runId))];
        return uniqueRunIds.map((runId) => {
          const subScoresForThisRun = state.subScores.filter((subScore) => subScore.runInfoOrig.runId === runId);
          return {
            ...getRunScores(subScoresForThisRun),
          };
        });
      },

      ageStats: (state) => {
        const ages = state.scores.map((score) => computeAges(score.runInfoOrig.dob, score.runInfoOrig.timeStarted));
        if (ages.length === 0) {
          return null;
        }

        const ageYears = ages.map((age) => age.ageYears);
        return {
          ageMin: Math.min(...ageYears),
          ageMax: Math.max(...ageYears),
          ageMean: (ageYears.reduce((a, b) => a + b) / ages.length).toFixed(1),
        };
      },

      gradeStats: (state) => {
        const parsedGrades = state.scores.map((score) => parseGrade(score.runInfoOrig.grade));
        const hasFirstOrK =
          parsedGrades.includes('k') ||
          parsedGrades.includes('pk') ||
          parsedGrades.includes('tk') ||
          parsedGrades.includes('jk') ||
          parsedGrades.includes('1');

        if (parsedGrades.length === 0) {
          return null;
        }
        return {
          gradeMin: parsedGrades.reduce(function (prev, curr) {
            return gradeComparator(curr, prev) === 1 ? prev : curr;
          }),
          gradeMax: parsedGrades.reduce(function (prev, curr) {
            return gradeComparator(curr, prev) === 1 ? curr : prev;
          }),
          hasFirstOrK,
        };
      },

      swrStats: (state) => {
        return {
          numStudents: state.scores.length,
          ...state.ageStats,
          ...state.gradeStats,
          ...state.roarScoreStats,
          support: { ...state.supportStats },
          automaticity: { ...state.swrAutomaticityStats },
        };
      },

      supportStats: (state) => {
        let stats: Stats = {
          High: 0,
          Medium: 0,
          Low: 0,
        };
        if (state.identifiers.length === 0) {
          return stats;
        }
        const supportArray = state.scores.map((run) => run.runInfoCommon?.supportLevel);
        if (supportArray.length === 0) {
          return stats;
        }

        stats.High = supportArray.filter((x) => x === 'Average or Above Average').length;
        stats.Medium = supportArray.filter((x) => x === 'Some Support Needed').length;
        stats.Low = supportArray.filter((x) => x === 'Extra Support Needed').length;

        return stats;
      },

      swrAutomaticityStats: (state) => {
        let stats: AutomaticityStats = {
          High: 0,
          Low: 0,
        };
        if (state.identifiers.length === 0) {
          return stats;
        }
        const supportArray = state.scores.map((run) => run.runInfoCommon?.supportLevel);
        if (supportArray.length === 0) {
          return stats;
        }

        stats.High = supportArray.filter((x) => x === 'Average or Above Average').length;
        stats.Low = supportArray.filter((x) => x === 'Limited').length;

        return stats;
      },

      roarScoreStats: (state) => {
        const roarScoresArray = state.scores.map((score) => thetaToRoarScore(score.runInfoOrig.thetaEstimate));
        return {
          roarScoreMin: Math.min(...roarScoresArray),
          roarScoreMax: Math.max(...roarScoresArray),
          roarScoreMean: Math.round(roarScoresArray.reduce((a, b) => a + b, 0) / roarScoresArray.length),
          roarScoreStandardDev: standardDeviation(roarScoresArray).toFixed(0),
        };
      },
    },

    actions: {
      async mergeSectionsWithIdentifiers(csvFile: File) {
        const sectionsData = await csvFileToJson(csvFile);
        console.log(sectionsData);
        this.sections = sectionsData;
      },
    },
  })();
}; 