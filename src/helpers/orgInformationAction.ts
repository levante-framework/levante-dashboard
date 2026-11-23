export type OrgInformationProgress = 'not-started' | 'incomplete' | 'complete';

export interface OrgInformationAction {
  name: 'information';
  icon: string;
  tooltip: string;
  status?: 'success' | 'error';
  pulse?: boolean;
  callback: (() => void) | null;
}

/**
 * The Actions-column icon for one site or school.
 * A missing or failed status returns nothing, so the row does not show a wrong checkmark.
 */
export function orgInformationAction(
  progress: OrgInformationProgress | undefined,
  orgKind: 'site' | 'school',
  openForm: () => void,
  openView: () => void,
): OrgInformationAction | null {
  if (progress === 'complete') {
    return {
      name: 'information',
      icon: 'pi pi-eye',
      status: 'success',
      tooltip: `Information for this ${orgKind} is complete`,
      callback: openView,
    };
  }

  if (progress === 'not-started' || progress === 'incomplete') {
    const label = orgKind === 'site' ? 'Site' : 'School';
    return {
      name: 'information',
      icon: 'pi pi-info-circle',
      status: 'error',
      pulse: true,
      tooltip: `${label} information is missing`,
      callback: openForm,
    };
  }

  return null;
}

export function orgInformationLoadingAction(): OrgInformationAction {
  return {
    name: 'information',
    icon: 'pi pi-spinner pi-spin',
    tooltip: 'Loading information status',
    callback: null,
  };
}
