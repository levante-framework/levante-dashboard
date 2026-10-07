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

export function identitySiteName(roles: Array<{ siteName?: string | null } | null | undefined>): string | null {
  const names = roles.map((role) => (role?.siteName ?? '').trim()).filter(Boolean);
  if (names.length === 0) return null;
  names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  return names[0];
}

export function usernameFromIdentity(input: {
  username?: string | null;
  email?: string | null;
  siteName?: string | null;
}): string | null {
  const raw = (input.username ?? input.email ?? '').trim();
  if (!raw) return null;
  const local = raw.includes('@') ? raw.slice(0, raw.indexOf('@')) : raw;
  if (!local) return null;
  const site = (input.siteName ?? '').trim();
  return site ? `${local}@${site}` : local;
}

export function sentryUserFromUsername(username: string) {
  return { username };
}
