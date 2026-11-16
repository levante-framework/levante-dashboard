import {
  type GetOrgInformationStatusError,
  GetOrgInformationStatusErrorSchema,
  GetOrgInformationStatusParamsSchema,
  type GetOrgInformationStatusResult,
} from '@levante-framework/levante-zod';
import { type UseQueryReturnType, useQuery } from '@tanstack/vue-query';
import _chunk from 'lodash/chunk';
import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { ORG_TYPES } from '@/constants/orgTypes';
import { ORG_INFORMATION_STATUS_QUERY_KEY } from '@/constants/queryKeys';
import { type FirebaseFailure, toFirebaseFailure } from '@/firebase/failure';
import { surveyFormsRepository } from '@/firebase/repositories/SurveyFormsRepository';

const CALLABLE_ORG_TYPES = {
  [ORG_TYPES.DISTRICTS]: 'site',
  [ORG_TYPES.SCHOOLS]: 'school',
} as const;

// getOrgInformationStatus accepts at most 100 orgIds per call.
const MAX_ORG_IDS_PER_CALL = 100;

export type OrgInformationOrgType = keyof typeof CALLABLE_ORG_TYPES;

export const useGetOrgInformationStatusQuery = (
  orgType: MaybeRefOrGetter<OrgInformationOrgType>,
  orgIds: MaybeRefOrGetter<string[]>,
  enabled: MaybeRefOrGetter<boolean> = true,
): UseQueryReturnType<GetOrgInformationStatusResult, FirebaseFailure<GetOrgInformationStatusError>> => {
  return useQuery({
    queryKey: computed(() => [ORG_INFORMATION_STATUS_QUERY_KEY, toValue(orgType), toValue(orgIds)]),
    queryFn: async () => {
      try {
        const callableOrgType = CALLABLE_ORG_TYPES[toValue(orgType)];
        const responses = await Promise.all(
          _chunk(toValue(orgIds), MAX_ORG_IDS_PER_CALL).map((orgIdsChunk) =>
            surveyFormsRepository.getOrgInformationStatus(
              GetOrgInformationStatusParamsSchema.parse({ orgType: callableOrgType, orgIds: orgIdsChunk }),
            ),
          ),
        );
        return { orgType: callableOrgType, results: responses.flatMap((response) => response.results) };
      } catch (error) {
        throw toFirebaseFailure(error, GetOrgInformationStatusErrorSchema);
      }
    },
    enabled: () => !!toValue(orgType) && !!toValue(orgIds)?.length && toValue(enabled),
    meta: {
      errorMessage: 'Failed to get org information status',
      errorContext: {
        tags: { composable: 'useGetOrgInformationStatusQuery' },
        get orgType() {
          return toValue(orgType);
        },
        get orgIds() {
          return toValue(orgIds);
        },
      },
    },
  });
};
