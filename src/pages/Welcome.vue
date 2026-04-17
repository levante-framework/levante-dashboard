<template>
  <div class="text-color">
    <div class="w-full px-5 my-5">
      <div class="text-2xl">Welcome,</div>
      <div class="font-bold text-3xl">{{ userName }}</div>
    </div>

    <div class="w-full px-5 mb-5">
      <div class="info">
        <i class="pi pi-exclamation-circle" />
        <div class="mr-auto">
          <div>
            First things first, let's read the quick documentation to get a better overview of the Levante Platform.
          </div>
          <div class="font-semibold">
            Always remember: create a group, add some users to it, and finally create an assignment.
          </div>
        </div>
        <div class="docs-button-wrapper">
          <DocsButton href="https://researcher.levante-network.org/dashboard/add-users" label="Documentation" />
        </div>
      </div>
    </div>

    <div v-if="!isSiteSelected" class="w-full px-5 mb-5 -mt-4">
      <div class="info info--site-not-selected">
        <i class="pi pi-exclamation-circle" />
        <div class="mr-auto">
          <div class="font-medium">Select a site to see stats</div>
        </div>
      </div>
    </div>

    <div class="w-full px-5 mb-5">
      <div class="flex align-items-center gap-4">
        <div class="font-medium text-2xl">Users</div>
        <div class="divider" />
        <div class="flex align-items-center gap-1 font-medium">
          <small>Total:</small>
          <small class="text-color-secondary">{{ isSiteSelected ? numOfUsers || '-' : '-' }}</small>
        </div>
      </div>

      <div class="flex gap-2 mt-3">
        <div v-for="[key, value] in Object.entries(users)" :key="key" class="user-type">
          <div>{{ value.label }}</div>
          <PvBadge :value="isSiteSelected ? value.numOf || '-' : '-'" class="badge" />
        </div>
      </div>
    </div>

    <div class="w-full px-5 mb-5">
      <div class="flex align-items-center gap-4">
        <div class="font-medium text-2xl">Assignments</div>
        <div class="divider" />
        <div class="flex align-items-center gap-1 font-medium">
          <small>Total:</small>
          <small class="text-color-secondary">{{ isSiteSelected ? numOfAssignments || '-' : '-' }}</small>
        </div>
      </div>

      <div class="flex gap-4 mt-3">
        <div v-for="[key, value] in Object.entries(assignments)" :key="key" class="assignment-card">
          <div class="flex justify-content-between">
            <div>
              <div class="text-2xl">{{ isSiteSelected ? value.numOf || '-' : '-' }}</div>
              <div class="text-color-secondary">{{ `${value.label} Assignments` }}</div>
            </div>

            <div :class="`assignment-icon-wrapper assignment-icon-wrapper--${key}`">
              <i v-if="key === 'open'" class="pi pi-play" />
              <i v-if="key === 'upcoming'" class="pi pi-clock" />
              <i v-if="key === 'past'" class="pi pi-briefcase" />
            </div>
          </div>

          <div v-if="value.numOf" class="assignment-card-footer">
            <a href="#" class="inline-flex align-items-center gap-2 font-semibold text-sm text-color no-underline">
              <span>View all</span>
              <i class="pi pi-arrow-right text-xs" />
            </a>
          </div>
        </div>
      </div>
    </div>

    <div class="w-full px-5 mb-5">
      <div class="flex align-items-center gap-4">
        <div class="font-medium text-2xl">Groups</div>
        <div class="divider" />
        <div class="flex align-items-center gap-1 font-medium">
          <small>Total:</small>
          <small class="text-color-secondary">{{ isSiteSelected ? numOfGroups || '-' : '-' }}</small>
        </div>
      </div>

      <div class="flex align-items-start gap-4 w-full h-auto mt-3">
        <div class="group-card">
          <div class="group-card-header">
            <div class="flex align-items-center gap-2">
              <div class="font-semibold">Schools</div>
              <PvBadge :value="isSiteSelected ? Object.keys(schools).length || '-' : '-'" class="badge" />
            </div>

            <div v-if="isSiteSelected">
              <a href="#" class="inline-flex align-items-center gap-2 font-semibold text-sm text-color no-underline">
                <span v-if="Object.keys(schools).length">View all</span>
                <span v-else>Create</span>
                <i v-if="Object.keys(schools).length" class="pi pi-arrow-right text-xs" />
                <i v-else class="pi pi-plus text-xs" />
              </a>
            </div>
          </div>

          <div v-if="isSiteSelected">
            <PvAccordion v-if="Object.entries(schools).length" multiple>
              <PvAccordionPanel v-for="[key, value] in Object.entries(schools)" :key="key" :value="key">
                <PvAccordionHeader>
                  <div class="flex align-items-center gap-2">
                    <div class="flex flex-column font-normal">
                      {{ value?.name }}
                    </div>
                    <PvBadge :value="isSiteSelected ? getSumOfUsers(Object.values(value?.users)) : '-'" class="badge" />
                  </div>
                </PvAccordionHeader>
                <PvAccordionContent>
                  <div class="flex flex-column gap-2">
                    <div
                      v-for="user in value?.users"
                      :key="user?.label"
                      class="flex justify-content-between align-items-center gap-3 w-full"
                    >
                      <span class="text-sm">{{ user?.label }}</span>
                      <div class="divider" />
                      <PvBadge :value="isSiteSelected ? user.numOf : '-'" class="badge" />
                    </div>
                  </div>
                </PvAccordionContent>
              </PvAccordionPanel>
            </PvAccordion>
            <div v-else>
              <div class="p-3 text-sm text-color-secondary">There are no schools yet</div>
            </div>
          </div>
          <div v-else>
            <div class="p-3 text-sm text-color-secondary">Select a site to see stats</div>
          </div>
        </div>

        <div class="group-card">
          <div class="group-card-header">
            <div class="flex align-items-center gap-2">
              <div class="font-semibold">Classes</div>
              <PvBadge :value="isSiteSelected ? Object.keys(classes).length || '-' : '-'" class="badge" />
            </div>

            <div v-if="isSiteSelected">
              <a href="#" class="inline-flex align-items-center gap-2 font-semibold text-sm text-color no-underline">
                <span v-if="Object.keys(classes).length">View all</span>
                <span v-else>Create</span>
                <i v-if="Object.keys(classes).length" class="pi pi-arrow-right text-xs" />
                <i v-else class="pi pi-plus text-xs" />
              </a>
            </div>
          </div>

          <div v-if="isSiteSelected">
            <PvAccordion v-if="Object.entries(classes).length" multiple>
              <PvAccordionPanel v-for="[key, value] in Object.entries(classes)" :key="key" :value="key">
                <PvAccordionHeader>
                  <div class="flex align-items-center gap-2">
                    <div class="flex flex-column font-normal">
                      <span v-if="value?.parentName?.length" class="font-semibold text-xs">{{
                        value?.parentName
                      }}</span>
                      {{ value?.name }}
                    </div>
                    <PvBadge :value="isSiteSelected ? getSumOfUsers(Object.values(value?.users)) : '-'" class="badge" />
                  </div>
                </PvAccordionHeader>
                <PvAccordionContent>
                  <div class="flex flex-column gap-2">
                    <div
                      v-for="user in value?.users"
                      :key="user?.label"
                      class="flex justify-content-between align-items-center gap-3 w-full"
                    >
                      <span class="text-sm">{{ user?.label }}</span>
                      <div class="divider" />
                      <PvBadge :value="isSiteSelected ? user.numOf : '-'" class="badge" />
                    </div>
                  </div>
                </PvAccordionContent>
              </PvAccordionPanel>
            </PvAccordion>
            <div v-else>
              <div class="p-3 text-sm text-color-secondary">There are no classes yet</div>
            </div>
          </div>
          <div v-else>
            <div class="p-3 text-sm text-color-secondary">Select a site to see stats</div>
          </div>
        </div>

        <div class="group-card">
          <div class="group-card-header">
            <div class="flex align-items-center gap-2">
              <div class="font-semibold">Cohorts</div>
              <PvBadge :value="isSiteSelected ? Object.keys(cohorts).length || '-' : '-'" class="badge" />
            </div>

            <div v-if="isSiteSelected">
              <a href="#" class="inline-flex align-items-center gap-2 font-semibold text-sm text-color no-underline">
                <span v-if="Object.keys(cohorts).length">View all</span>
                <span v-else>Create</span>
                <i v-if="Object.keys(cohorts).length" class="pi pi-arrow-right text-xs" />
                <i v-else class="pi pi-plus text-xs" />
              </a>
            </div>
          </div>

          <div v-if="isSiteSelected">
            <PvAccordion v-if="Object.entries(cohorts).length" multiple>
              <PvAccordionPanel v-for="[key, value] in Object.entries(cohorts)" :key="key" :value="key">
                <PvAccordionHeader>
                  <div class="flex align-items-center gap-2">
                    <div class="flex flex-column font-normal">
                      {{ value?.name }}
                    </div>
                    <PvBadge :value="isSiteSelected ? getSumOfUsers(Object.values(value?.users)) : '-'" class="badge" />
                  </div>
                </PvAccordionHeader>
                <PvAccordionContent>
                  <div class="flex flex-column gap-2">
                    <div
                      v-for="user in value?.users"
                      :key="user?.label"
                      class="flex justify-content-between align-items-center gap-3 w-full"
                    >
                      <span class="text-sm">{{ user?.label }}</span>
                      <div class="divider" />
                      <PvBadge :value="isSiteSelected ? user.numOf : '-'" class="badge" />
                    </div>
                  </div>
                </PvAccordionContent>
              </PvAccordionPanel>
            </PvAccordion>
            <div v-else>
              <div class="p-3 text-sm text-color-secondary">There are no cohorts yet</div>
            </div>
          </div>
          <div v-else>
            <div class="p-3 text-sm text-color-secondary">Select a site to see stats</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DocsButton from '@/components/DocsButton.vue';
import { useAuthStore } from '@/store/auth';
import { storeToRefs } from 'pinia';
import PvAccordion from 'primevue/accordion';
import PvAccordionContent from 'primevue/accordioncontent';
import PvAccordionHeader from 'primevue/accordionheader';
import PvAccordionPanel from 'primevue/accordionpanel';
import PvBadge from 'primevue/badge';
import { computed, ref } from 'vue';

const authStore = useAuthStore();
const { currentSite, userData } = storeToRefs(authStore);

const emptyContent = ref(false); // @TODO: Remove this

const userName = computed(() => {
  const first = userData.value?.name?.first;
  const middle = userData.value?.name?.middle;
  const last = userData.value?.name?.last;
  return userData.value?.displayName || `${first} ${middle} ${last}`;
});

const isSiteSelected = computed(() => currentSite.value !== 'any');

const users = computed(() => ({
  teachers: { label: 'Teachers', numOf: emptyContent.value ? 0 : 6 },
  caregivers: { label: 'Caregivers', numOf: emptyContent.value ? 0 : 2 },
  children: { label: 'Children', numOf: emptyContent.value ? 0 : 6 },
}));

const numOfUsers = computed(() =>
  emptyContent.value ? 0 : Object.values(users.value).reduce((total: number, user: any) => total + user.numOf, 0),
);

const assignments = computed(() => ({
  open: { label: 'Open', numOf: emptyContent.value ? 0 : 3 },
  upcoming: { label: 'Upcoming', numOf: emptyContent.value ? 0 : 5 },
  past: { label: 'Past', numOf: emptyContent.value ? 0 : 12 },
}));

const numOfAssignments = computed(() =>
  emptyContent.value ? 0 : Object.values(assignments.value).reduce((total, assignment) => total + assignment.numOf, 0),
);

const schools = computed(() =>
  emptyContent.value
    ? []
    : [
        {
          name: 'School Name',
          users: {
            teachers: { label: 'Teachers', numOf: 10 },
            caregivers: { label: 'Caregivers', numOf: 10 },
            children: { label: 'Children', numOf: 10 },
          },
        },
        {
          name: 'Larger School Name',
          users: {
            teachers: { label: 'Teachers', numOf: 10 },
            caregivers: { label: 'Caregivers', numOf: 10 },
            children: { label: 'Children', numOf: 10 },
          },
        },
      ],
);

const classes = computed(() =>
  emptyContent.value
    ? []
    : [
        {
          name: 'Class Name',
          parentName: 'School Name',
          users: {
            teachers: { label: 'Teachers', numOf: 10 },
            caregivers: { label: 'Caregivers', numOf: 10 },
            children: { label: 'Children', numOf: 10 },
          },
        },
        {
          name: 'Larger Class Name',
          parentName: 'Larger School Name',
          users: {
            teachers: { label: 'Teachers', numOf: 10 },
            caregivers: { label: 'Caregivers', numOf: 10 },
            children: { label: 'Children', numOf: 10 },
          },
        },
      ],
);

const cohorts = computed(() =>
  emptyContent.value
    ? []
    : [
        {
          name: 'Cohort Name',
          users: {
            teachers: { label: 'Teachers', numOf: 10 },
            caregivers: { label: 'Caregivers', numOf: 10 },
            children: { label: 'Children', numOf: 10 },
          },
        },
        {
          name: 'Larger Cohort Name',
          users: {
            teachers: { label: 'Teachers', numOf: 10 },
            caregivers: { label: 'Caregivers', numOf: 10 },
            children: { label: 'Children', numOf: 10 },
          },
        },
      ],
);

const numOfGroups = computed(() => {
  const numOfSchools = Object.keys(schools.value).length;
  const numOfClasses = Object.keys(classes.value).length;
  const numOfCohorts = Object.keys(cohorts.value).length;
  return numOfSchools + numOfClasses + numOfCohorts;
});

const getSumOfUsers = (users: Array<any> = []): number => users.reduce((total, user) => total + user.numOf, 0);
</script>

<style scoped lang="scss">
.info {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 0;
  padding: 1rem;
  background: var(--gray-100);
  border-radius: 12px;
  color: var(--gray-500);

  &.info--site-not-selected {
    background: rgba(var(--bright-yellow-rgb), 0.1);
    color: var(--bright-yellow);
  }
}

.docs-button-wrapper {
  border: 4px solid var(--docs-btn-hover);
  border-radius: 10px;
}

.divider {
  display: block;
  flex: 1;
  height: 1px;
  background: var(--gray-200);
}

.user-type {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--gray-200);
  border-radius: 0.5rem;
}

.badge {
  color: var(--bright-red);
  background: rgba(var(--bright-red-rgb), 0.1);
}

.assignment-card {
  display: block;
  width: 100%;
  max-width: 320px;
  height: auto;
  margin: 0;
  padding: 1rem;
  border: 1px solid var(--gray-200);
  border-radius: 0.5rem;
}

.assignment-icon-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 100%;

  .pi {
    font-size: 20px;
  }

  &.assignment-icon-wrapper--open {
    background: rgba(var(--bright-green-rgb), 0.1);
    color: var(--bright-green);
  }

  &.assignment-icon-wrapper--upcoming {
    background: rgba(var(--bright-yellow-rgb), 0.1);
    color: var(--bright-yellow);
  }

  &.assignment-icon-wrapper--past {
    background: rgba(var(--bright-red-rgb), 0.1);
    color: var(--bright-red);
  }
}

.assignment-card-footer {
  display: flex;
  justify-content: flex-end;
  margin: 0.75rem 0 0;
  padding: 0.75rem 0 0;
  border-top: 1px solid var(--gray-200);
}

.group-card {
  display: block;
  width: 100%;
  height: auto;
  margin: 0;
  padding: 0;
  border: 1px solid var(--gray-200);
  border-radius: 0.5rem;
  overflow: hidden;
}

.group-card-header {
  display: flex;
  justify-content: space-between;
  width: 100%;
  height: auto;
  margin: 0;
  padding: 1.125rem;
  border-bottom: 3px solid var(--primary-color);
}
</style>
