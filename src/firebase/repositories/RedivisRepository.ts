import { Repository } from '@/firebase/Repository';

export interface QueryRedivisScoresParams {
  siteId: string;
}

export interface RedivisCompletedTaskRow {
  taskId: string;
  completedCount: number;
}

export interface QueryRedivisScoresResponse {
  siteId: string;
  datasetName: string;
  rowCount: number;
  rows: RedivisCompletedTaskRow[];
}

const QUERY_REDIVIS_SCORES_TIMEOUT_MS = 120_000;

class RedivisRepository extends Repository {
  constructor() {
    super();
  }

  async queryScores(params: QueryRedivisScoresParams): Promise<QueryRedivisScoresResponse> {
    return this.callWithTimeout<QueryRedivisScoresParams, QueryRedivisScoresResponse>(
      'queryRedivisScores',
      params,
      QUERY_REDIVIS_SCORES_TIMEOUT_MS,
    );
  }
}

export const redivisRepository = new RedivisRepository();
