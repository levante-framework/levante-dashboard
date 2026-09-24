import { describe, expect, it } from 'vitest';
import {
  extractObjectLiteralKeys,
  extractTaskLauncherParamNames,
  toLaunchedParamNameSet,
} from '@/helpers/extractTaskLauncherParams';

const SERVE_SOURCE = `
async function startWebApp() {
  const firekit = null;
  const gameParams = {
    taskName,
    skipInstructions,
    corpus,
    language: language ?? i18next.language,
    numberOfTrials,
    // trailing comment
    semThreshold,
  };
  const userParams = {
    pid,
  };
  const task = new TaskLauncher(firekit, gameParams, userParams);
  task.run();
}
`;

describe('extractTaskLauncherParamNames', () => {
  it('extracts shorthand and explicit keys from both param objects', () => {
    expect(extractTaskLauncherParamNames(SERVE_SOURCE)).toEqual({
      gameParams: ['taskName', 'skipInstructions', 'corpus', 'language', 'numberOfTrials', 'semThreshold'],
      userParams: ['pid'],
    });
  });

  it('returns empty lists when the declarations are missing', () => {
    expect(extractTaskLauncherParamNames('const other = { foo };')).toEqual({ gameParams: [], userParams: [] });
  });
});

describe('extractObjectLiteralKeys', () => {
  it('ignores commas nested in values', () => {
    const source = `const gameParams = { corpus, options: { a: 1, b: 2 }, blocks: [1, 2, 3], age: parseInt(raw, 10) };`;
    expect(extractObjectLiteralKeys(source, 'gameParams')).toEqual(['corpus', 'options', 'blocks', 'age']);
  });

  it('ignores commas and braces inside strings', () => {
    const source = `const gameParams = { corpus: 'a, b', label: "{ nope }" };`;
    expect(extractObjectLiteralKeys(source, 'gameParams')).toEqual(['corpus', 'label']);
  });

  it('reads quoted keys and skips spreads', () => {
    const source = `const gameParams = { ...defaults, 'max-time': maxTime, debug };`;
    expect(extractObjectLiteralKeys(source, 'gameParams')).toEqual(['max-time', 'debug']);
  });

  it('strips line and block comments', () => {
    const source = `const gameParams = {
      // leading note
      corpus,
      /* block */ debug,
    };`;
    expect(extractObjectLiteralKeys(source, 'gameParams')).toEqual(['corpus', 'debug']);
  });
});

describe('toLaunchedParamNameSet', () => {
  it('unions game and user param names', () => {
    expect([...toLaunchedParamNameSet({ gameParams: ['corpus', 'pid'], userParams: ['pid'] })]).toEqual([
      'corpus',
      'pid',
    ]);
  });
});
