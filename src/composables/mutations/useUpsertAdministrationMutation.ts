import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { UseMutationReturnType } from "@tanstack/vue-query";
import { useAuthStore } from "@/store/auth";
import { ADMINISTRATION_UPSERT_MUTATION_KEY } from "@/constants/mutationKeys";
import {
  ADMINISTRATIONS_QUERY_KEY,
  ADMINISTRATIONS_LIST_QUERY_KEY,
  ADMINISTRATION_ASSIGNMENTS_QUERY_KEY,
} from "@/constants/queryKeys";

interface AdministrationData {
  [key: string]: any;
}

/**
 * Upsert Administration mutation.
 *
 * TanStack mutation to update or insert an administration and automatically invalidate the corresponding queries.
 *
 * @returns The mutation object returned by `useMutation`.
 */
const useUpsertAdministrationMutation = (): UseMutationReturnType<
  void,
  Error,
  AdministrationData,
  unknown
> => {
  const authStore = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ADMINISTRATION_UPSERT_MUTATION_KEY,
    mutationFn: async (data: AdministrationData): Promise<void> => {
      console.log('useUpsertAdministrationMutation: Starting mutation with data:', data);
      
      if (!authStore.roarfirekit) {
        throw new Error('Firekit not initialized');
      }
      
      const firekit = authStore.roarfirekit as any;
      
      try {
        // Transform the data to match the expected Firestore structure
        const administrationDoc = {
          name: data.name || data.publicName,
          publicName: data.publicName,
          dates: {
            start: data.dateOpen,
            end: data.dateClose,
            created: new Date().toISOString(),
          },
          assessments: data.assessments || [],
          assignedOrgs: {
            districts: data.orgs?.districts || [],
            schools: data.orgs?.schools || [],
            classes: data.orgs?.classes || [],
            groups: data.orgs?.groups || [],
            families: data.orgs?.families || [],
          },
          testData: data.isTestData || false,
          sequential: data.sequential || false,
          legal: data.legal || {
            consent: null,
            assent: null,
            amount: "",
            expectedTime: ""
          },
          stats: {
            total: {
              assignment: {
                started: 0,
                completed: 0,
                assigned: 0,
              },
            },
          },
        };

        // Add task-specific stats for each assessment
        if (data.assessments && Array.isArray(data.assessments)) {
          data.assessments.forEach((assessment: any) => {
            if (assessment.taskId) {
              (administrationDoc.stats.total as any)[assessment.taskId] = {
                assigned: 0,
              };
            }
          });
        }

        console.log('useUpsertAdministrationMutation: Transformed administration doc:', administrationDoc);

        // Debug: Log all available properties to understand the structure
        console.log('useUpsertAdministrationMutation: Firekit object:', firekit);
        console.log('useUpsertAdministrationMutation: Firekit properties:', Object.keys(firekit));
        console.log('useUpsertAdministrationMutation: Project object:', firekit.project);
        console.log('useUpsertAdministrationMutation: Project properties:', firekit.project ? Object.keys(firekit.project) : 'No project');
        
        // Try different ways to access Firestore
        let firestoreInstance = null;
        
        if (firekit.project && firekit.project.firestore) {
          console.log('useUpsertAdministrationMutation: Found firestore at project.firestore');
          firestoreInstance = firekit.project.firestore;
        } else if (firekit.project && firekit.project.db) {
          console.log('useUpsertAdministrationMutation: Found firestore at project.db');
          firestoreInstance = firekit.project.db;
        } else if (firekit.firestore) {
          console.log('useUpsertAdministrationMutation: Found firestore at firekit.firestore');
          firestoreInstance = firekit.firestore;
        } else if (firekit.db) {
          console.log('useUpsertAdministrationMutation: Found firestore at firekit.db');
          firestoreInstance = firekit.db;
        } else {
          console.error('useUpsertAdministrationMutation: No firestore instance found');
          console.error('useUpsertAdministrationMutation: Available firekit properties:', Object.keys(firekit));
          console.error('useUpsertAdministrationMutation: Project properties:', firekit.project ? Object.keys(firekit.project) : 'No project');
          throw new Error('No Firestore instance available');
        }

        console.log('useUpsertAdministrationMutation: Using Firestore instance:', firestoreInstance);
        console.log('useUpsertAdministrationMutation: Firestore instance type:', typeof firestoreInstance);
        console.log('useUpsertAdministrationMutation: Firestore instance constructor:', firestoreInstance.constructor.name);
        console.log('useUpsertAdministrationMutation: Firestore instance methods:', Object.getOwnPropertyNames(firestoreInstance));
        console.log('useUpsertAdministrationMutation: Firestore instance prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(firestoreInstance)));
        
        // Try different ways to access collections
        let collection = null;
        let docRef = null;
        
        if (typeof firestoreInstance.collection === 'function') {
          console.log('useUpsertAdministrationMutation: Using collection() method');
          collection = firestoreInstance.collection('administrations');
          docRef = data.id ? collection.doc(data.id) : collection.doc();
        } else if (typeof firestoreInstance.doc === 'function') {
          console.log('useUpsertAdministrationMutation: Using doc() method directly');
          const docPath = data.id ? `administrations/${data.id}` : `administrations/${Date.now()}`;
          docRef = firestoreInstance.doc(docPath);
        } else {
          console.error('useUpsertAdministrationMutation: No collection or doc method found');
          console.error('useUpsertAdministrationMutation: Available methods:', Object.getOwnPropertyNames(firestoreInstance));
          throw new Error('No collection or doc method available on Firestore instance');
        }
        
        console.log('useUpsertAdministrationMutation: Document reference:', docRef);
        await docRef.set(administrationDoc);
        console.log('useUpsertAdministrationMutation: Administration created successfully with ID:', docRef.id);

      } catch (error) {
        console.error('useUpsertAdministrationMutation: Error creating administration:', error);
        throw error;
      }
    },
    onSuccess: (): void => {
      // Invalidate the queries to refetch the administration data.
      // @NOTE: Usually we would apply a more granular invalidation strategy including updating the specific
      // adminitration record in the cache. However, unfortunately, given the nature of the data model and the data that
      // is updated in the application, we would have to manually map the updated data, which could cause issues when
      // the data model changes. Therefore, we invalidate the entire query to ensure the data is up-to-date.
      queryClient.invalidateQueries({ queryKey: [ADMINISTRATIONS_QUERY_KEY] });
      queryClient.invalidateQueries({
        queryKey: [ADMINISTRATIONS_LIST_QUERY_KEY],
      });
      queryClient.invalidateQueries({
        queryKey: [ADMINISTRATION_ASSIGNMENTS_QUERY_KEY],
      });
    },
  });
};

export default useUpsertAdministrationMutation;
