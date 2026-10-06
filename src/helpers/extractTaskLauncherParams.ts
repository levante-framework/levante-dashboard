export interface TaskLauncherParamNames {
  gameParams: string[];
  userParams: string[];
}

const IDENTIFIER_PATTERN = /^[A-Za-z_$][\w$]*$/;
const QUOTED_KEY_PATTERN = /^['"`](.+)['"`]$/;

function findObjectLiteralBody(source: string, variableName: string): string | null {
  const declaration = new RegExp(`\\b(?:const|let|var)\\s+${variableName}\\s*=\\s*\\{`).exec(source);
  if (!declaration) return null;

  const bodyStart = declaration.index + declaration[0].length;
  let depth = 1;
  let quote: string | null = null;

  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];

    if (quote) {
      if (character === '\\') index += 1;
      else if (character === quote) quote = null;
      continue;
    }

    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }

    if (character === '{' || character === '[' || character === '(') depth += 1;

    if (character === '}' || character === ']' || character === ')') {
      depth -= 1;
      if (depth === 0) return source.slice(bodyStart, index);
    }
  }

  return null;
}

function splitTopLevelEntries(body: string): string[] {
  const entries: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;

  for (let index = 0; index < body.length; index += 1) {
    const character = body[index];

    if (quote) {
      if (character === '\\') index += 1;
      else if (character === quote) quote = null;
      continue;
    }

    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }

    if (character === '{' || character === '[' || character === '(') depth += 1;
    else if (character === '}' || character === ']' || character === ')') depth -= 1;
    else if (character === ',' && depth === 0) {
      entries.push(body.slice(start, index));
      start = index + 1;
    }
  }

  entries.push(body.slice(start));
  return entries;
}

function stripComments(entry: string): string {
  return entry
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');
}

function readKey(entry: string): string | null {
  const cleaned = stripComments(entry).trim();
  if (!cleaned || cleaned.startsWith('...')) return null;

  const separator = cleaned.indexOf(':');
  const key = (separator === -1 ? cleaned : cleaned.slice(0, separator)).trim();

  if (IDENTIFIER_PATTERN.test(key)) return key;

  const quoted = QUOTED_KEY_PATTERN.exec(key);
  return quoted ? quoted[1] : null;
}

export function extractObjectLiteralKeys(source: string, variableName: string): string[] {
  const body = findObjectLiteralBody(source, variableName);
  if (body === null) return [];

  const keys = splitTopLevelEntries(body)
    .map(readKey)
    .filter((key): key is string => key !== null);

  return [...new Set(keys)];
}

export function extractTaskLauncherParamNames(source: string): TaskLauncherParamNames {
  return {
    gameParams: extractObjectLiteralKeys(source, 'gameParams'),
    userParams: extractObjectLiteralKeys(source, 'userParams'),
  };
}

export function toLaunchedParamNameSet(names: TaskLauncherParamNames): Set<string> {
  return new Set([...names.gameParams, ...names.userParams]);
}
