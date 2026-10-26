export interface Condition {
  field: string;
  op: string;
  value: string | number;
}

export interface ConditionGroup {
  op?: string;
  conditions: Condition[];
}

// CONSTRAINT: The condition model is a single flat group with one `op`, so it
// cannot express compound logic like `(userType=student OR userType=parent) AND age>5`.
// Today every variant has only one validUserType, so this limitation is latent — but
// once variants can have multiple valid user types combined with other fields (e.g. age),
// this model breaks down and needs to be rethought entirely (e.g. nested condition groups).
export interface ConditionsStructure {
  assigned?: ConditionGroup;
  optional?: boolean | ConditionGroup;
}
