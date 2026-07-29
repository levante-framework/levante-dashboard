import type { OfflineRosterEntry, OfflineRosterFile, OfflineSiteConfig } from './types';

const LOCAL_ROSTER_KEY = 'levante-offline-local-roster';
const SELECTED_USER_KEY = 'levante-offline-selected-user';

export async function loadSiteConfig(baseUrl = '/offline-pack'): Promise<OfflineSiteConfig> {
  const response = await fetch(`${baseUrl}/site-config.json`);
  if (!response.ok) {
    throw new Error(`Failed to load site-config.json (${response.status})`);
  }
  return response.json();
}

export async function loadPackRoster(baseUrl = '/offline-pack'): Promise<OfflineRosterEntry[]> {
  const response = await fetch(`${baseUrl}/roster.json`);
  if (!response.ok) {
    throw new Error(`Failed to load roster.json (${response.status})`);
  }
  const data = (await response.json()) as OfflineRosterFile;
  return (data.users || []).map((user) => ({
    ...user,
    source: user.source || 'pack',
  }));
}

export function loadLocalRoster(): OfflineRosterEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_ROSTER_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OfflineRosterEntry[];
  } catch {
    return [];
  }
}

export function saveLocalRoster(users: OfflineRosterEntry[]) {
  localStorage.setItem(LOCAL_ROSTER_KEY, JSON.stringify(users.filter((u) => u.source === 'local')));
}

export async function loadMergedRoster(baseUrl = '/offline-pack'): Promise<OfflineRosterEntry[]> {
  const packUsers = await loadPackRoster(baseUrl);
  const localUsers = loadLocalRoster();
  const byId = new Map<string, OfflineRosterEntry>();
  for (const user of [...packUsers, ...localUsers]) {
    byId.set(user.localUserId, user);
  }
  return Array.from(byId.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function addLocalUser(input: {
  displayName: string;
  birthMonth?: string;
  birthYear?: string;
  assessmentPid?: string;
}): OfflineRosterEntry {
  const entry: OfflineRosterEntry = {
    localUserId: `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    displayName: input.displayName.trim(),
    birthMonth: input.birthMonth,
    birthYear: input.birthYear,
    assessmentPid: input.assessmentPid || undefined,
    source: 'local',
  };
  const next = [...loadLocalRoster(), entry];
  saveLocalRoster(next);
  return entry;
}

export function setSelectedUser(user: OfflineRosterEntry) {
  sessionStorage.setItem(SELECTED_USER_KEY, JSON.stringify(user));
}

export function getSelectedUser(): OfflineRosterEntry | null {
  try {
    const raw = sessionStorage.getItem(SELECTED_USER_KEY);
    return raw ? (JSON.parse(raw) as OfflineRosterEntry) : null;
  } catch {
    return null;
  }
}
