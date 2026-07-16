import { normalizeToLowercase } from '@/helpers';

function extractOrgIds(orgs: unknown): string[] {
  if (!Array.isArray(orgs)) return [];
  return orgs.map((item) => (typeof item === 'object' && item !== null && 'id' in item ? (item as { id: string }).id : String(item)));
}

export function startOfLocalDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfLocalDay(date: Date | string): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Date pickers yield local midnight; for "today" that is always before now, so open immediately. */
export function normalizeAdministrationDateOpen(
  dateStarted: Date | string,
  now: Date = new Date(),
): Date {
  const open = new Date(dateStarted);
  const startOfToday = startOfLocalDay(now);
  const startOfSelected = startOfLocalDay(open);

  if (startOfSelected.getTime() === startOfToday.getTime()) {
    if (open.getTime() <= startOfToday.getTime()) return now;
    return open;
  }

  return startOfSelected;
}

export function buildRetryAdministrationArgs(admin: Record<string, unknown>, siteId: string | undefined) {
  const dateOpened = admin.dateOpened ?? admin.dateOpen;
  const dateClosed = admin.dateClosed ?? admin.dateClose;
  const minOrgs = (admin.minimalOrgs ?? admin.assignedOrgs ?? {}) as Record<string, unknown>;
  const districts = minOrgs.districts ?? admin.districts ?? [];
  const schools = minOrgs.schools ?? admin.schools ?? [];
  const classes = minOrgs.classes ?? admin.classes ?? [];
  const groups = minOrgs.groups ?? admin.groups ?? [];

  const dateClose = dateClosed ? endOfLocalDay(dateClosed as string | Date) : endOfLocalDay(new Date());

  const legal = (admin.legal ?? {}) as Record<string, unknown>;

  return {
    administrationId: admin.id,
    name: admin.name,
    publicName: admin.publicName ?? admin.name,
    normalizedName: normalizeToLowercase(String(admin.name ?? '')),
    assessments: Array.isArray(admin.assessments) ? admin.assessments : [],
    dateOpen: dateOpened,
    dateClose,
    sequential: admin.sequential ?? true,
    orgs: {
      districts: extractOrgIds(districts),
      schools: extractOrgIds(schools),
      classes: extractOrgIds(classes),
      groups: extractOrgIds(groups),
    },
    isTestData: admin.testData ?? false,
    legal: {
      consent: legal.consent ?? null,
      assent: legal.assent ?? null,
      amount: legal.amount ?? '',
      expectedTime: legal.expectedTime ?? '',
    },
    creatorName: admin.creatorName ?? '',
    siteId,
  };
}
