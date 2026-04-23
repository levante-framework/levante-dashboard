import { normalizeToLowercase } from '@/helpers';

function extractOrgIds(orgs: unknown): string[] {
  if (!Array.isArray(orgs)) return [];

  const ids = orgs
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (typeof item === 'object' && item !== null && 'id' in item && typeof (item as { id?: unknown }).id === 'string') {
        return ((item as { id: string }).id || '').trim();
      }
      return '';
    })
    .filter((id) => id.length > 0);

  return [...new Set(ids)];
}

export function buildRetryAdministrationArgs(admin: Record<string, unknown>, siteId: string | undefined) {
  const dateOpened = admin.dateOpened ?? admin.dateOpen;
  const dateClosed = admin.dateClosed ?? admin.dateClose;
  const minOrgs = (admin.minimalOrgs ?? admin.assignedOrgs ?? {}) as Record<string, unknown>;
  const districts = minOrgs.districts ?? admin.districts ?? [];
  const schools = minOrgs.schools ?? admin.schools ?? [];
  const classes = minOrgs.classes ?? admin.classes ?? [];
  const groups = minOrgs.groups ?? admin.groups ?? [];

  const dateClose = dateClosed ? new Date(dateClosed as string | Date) : new Date();
  dateClose.setHours(23, 59, 59, 999);

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
