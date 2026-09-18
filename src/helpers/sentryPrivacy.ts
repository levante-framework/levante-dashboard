const SENSITIVE_KEYS = new Set(['userParams', 'gameParams', 'data', 'email', 'birthMonth', 'birthYear', 'age', 'uid']);

export function omitSensitiveSentryFields<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => omitSensitiveSentryFields(item)) as T;
  }
  if (!value || typeof value !== 'object') return value;

  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key)) continue;
    result[key] = omitSensitiveSentryFields(nested);
  }
  return result as T;
}

export function usernameFromIdentity(input: { username?: string | null; email?: string | null }): string | null {
  const raw = (input.username ?? input.email ?? '').trim();
  if (!raw) return null;
  const local = raw.includes('@') ? raw.slice(0, raw.indexOf('@')) : raw;
  return local || null;
}

export function sentryUserFromUsername(username: string) {
  return { username };
}
