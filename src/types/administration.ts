export interface Assessment {
  taskId: string;
  variantId?: string;
  variantName?: string;
  params: Record<string, unknown>;
}

export interface Administration {
  id: string;
  name: string;
  publicName?: string;
  stats?: Record<string, unknown>;
  dates: {
    start: string;
    end: string;
    created: string;
  };
  assignedOrgs: Record<string, unknown>;
  assessments: Assessment[];
} 