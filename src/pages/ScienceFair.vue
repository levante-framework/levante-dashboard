<template>
  <main class="fair">
    <header class="hero">
      <img class="hero-mark" src="/levante_icon.svg" alt="" />
      <div>
        <p class="eyebrow">Walk-up event guide</p>
        <h1>Science fair / museum</h1>
        <p>
          Create the site, children, and assignment in this dashboard. Tablets then use the offline
          launcher to provision, assess, and sync. Checkboxes stay on this browser only.
        </p>
      </div>
    </header>

    <div class="callout callout-note">
      <i class="pi pi-info-circle" />
      <div class="callout-body">
        Pick a site first, then create a cohort and children. Creating a site usually needs a super
        admin. Creating a cohort needs a site admin (or higher).
      </div>
    </div>

    <ol class="steps">
      <li class="step" :class="{ 'step-done': done.site }">
        <div class="step-head">
          <span class="step-num">1</span>
          <div>
            <h2>Pick or create a site</h2>
            <p>
              Choose a site you are authorized for, or create a new one. The rest of this wizard
              uses that site.
            </p>
          </div>
          <label class="done">
            <input type="checkbox" :checked="done.site" @change="toggleDone('site', $event)" />
            Done
          </label>
        </div>
        <div class="site-pick">
          <label class="field">
            <span>Site</span>
            <PvSelect
              v-model="selectedSiteChoice"
              :options="siteSelectOptions"
              option-label="label"
              option-value="value"
              placeholder="Select a site"
              filter
              :disabled="siteSubmitting"
              class="site-select"
              @change="onSiteChoice"
            />
          </label>
          <div v-if="isCreatingSite" class="new-site">
            <label class="field">
              <span>New site name</span>
              <PvInputText v-model="newSiteName" :disabled="siteSubmitting" placeholder="Bay Area Science Fair" />
            </label>
            <PvButton
              :disabled="!newSiteName.trim() || siteSubmitting"
              :loading="siteSubmitting"
              label="Create site"
              @click="createNewSite"
            />
          </div>
          <p v-if="siteError" class="setup-error">{{ siteError }}</p>
        </div>
      </li>

      <li class="step" :class="{ 'step-done': done.users }">
        <div class="step-head">
          <span class="step-num">2</span>
          <div>
            <h2>Create a cohort and children</h2>
            <p>
              Name the event group, how many visitors you need, and the age span. We create the
              cohort and children for you.
            </p>
          </div>
          <label class="done">
            <input type="checkbox" :checked="done.users" @change="toggleDone('users', $event)" />
            Done
          </label>
        </div>
        <p v-if="!hasSite" class="setup-warn">Pick or create a site in step 1 first.</p>
        <div class="setup-grid">
          <label class="field">
            <span>Group / cohort name</span>
            <PvInputText v-model="form.groupName" :disabled="!hasSite || submitting" placeholder="Bay Area Science Fair" />
          </label>
          <label class="field">
            <span>How many children</span>
            <PvInputText v-model.number="form.count" type="number" :disabled="!hasSite || submitting" min="1" max="80" />
          </label>
          <label class="field">
            <span>Youngest age</span>
            <PvInputText v-model.number="form.minAge" type="number" :disabled="!hasSite || submitting" min="3" max="21" />
          </label>
          <label class="field">
            <span>Oldest age</span>
            <PvInputText v-model.number="form.maxAge" type="number" :disabled="!hasSite || submitting" min="3" max="21" />
          </label>
        </div>
        <p v-if="preview.length" class="setup-preview">
          {{ preview.length }} children in <strong>{{ form.groupName || 'this cohort' }}</strong>,
          ages {{ form.minAge }}–{{ form.maxAge }} (birth
          {{ preview[preview.length - 1]?.month }}/{{ preview[preview.length - 1]?.year }}
          to {{ preview[0]?.month }}/{{ preview[0]?.year }}).
        </p>
        <PvButton
          class="mb-3"
          :disabled="!canSubmit"
          :loading="submitting"
          label="Create group and children"
          @click="createCohortAndChildren"
        />
        <p v-if="setupError" class="setup-error">{{ setupError }}</p>
        <div v-if="created" class="created">
          <p>
            Created cohort <strong>{{ created.groupName }}</strong> with
            {{ created.users.length }} children. Next, create or reuse an assignment for this site
            (step 3).
          </p>
          <table>
            <thead>
              <tr>
                <th>Id</th>
                <th>Month</th>
                <th>Year</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in created.users" :key="user.id">
                <td class="mono">{{ user.id }}</td>
                <td>{{ user.month }}</td>
                <td>{{ user.year }}</td>
                <td class="mono">{{ user.email || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </li>

      <li class="step" :class="{ 'step-done': done.assignment }">
        <div class="step-head">
          <span class="step-num">3</span>
          <div>
            <h2>Choose or create an assignment</h2>
            <p>
              Reusing an existing assignment is allowed if this event’s site or cohort is on it —
              visitors then get those tasks. Use a new assignment if this walk-up data should stay
              out of a formal study. After you create one, you will come back here.
            </p>
          </div>
          <label class="done">
            <input type="checkbox" :checked="done.assignment" @change="toggleDone('assignment', $event)" />
            Done
          </label>
        </div>
        <p v-if="!hasSite" class="setup-warn">Pick or create a site in step 1 first.</p>
        <div v-else class="site-pick">
          <label class="field">
            <span>Existing assignment</span>
            <PvSelect
              v-model="selectedAssignmentId"
              :options="assignmentOptions"
              option-label="label"
              option-value="value"
              placeholder="Select an assignment"
              filter
              class="site-select"
              :disabled="!assignmentOptions.length"
            />
          </label>
          <p v-if="!assignmentOptions.length" class="setup-preview">
            No assignments on this site yet. Create one and include this site or cohort.
          </p>
          <div class="row-actions">
            <PvButton
              :disabled="!selectedAssignmentId"
              label="Use this assignment"
              @click="useExistingAssignment"
            />
            <RouterLink :to="{ name: 'CreateAssignment', query: { return: '/science-fair' } }">
              <PvButton label="Create new assignment" icon="pi pi-arrow-right" icon-pos="right" />
            </RouterLink>
          </div>
          <p v-if="chosenAssignmentName" class="setup-preview">
            Using <strong>{{ chosenAssignmentName }}</strong
            >. Include this site or the new cohort on that assignment if it is not already there.
          </p>
        </div>
      </li>

      <li class="step" :class="{ 'step-done': done.tablets }">
        <div class="step-head">
          <span class="step-num">4</span>
          <div>
            <h2>On-site Researcher: set up each tablet</h2>
            <p>
              This website cannot push a roster to a device. An On-site Researcher signs in on the
              offline launcher and downloads the assignment and cohort below. Science-fair tablets
              do not use a device PIN. Child mode keeps visitors on names and tasks.
            </p>
          </div>
          <label class="done">
            <input type="checkbox" :checked="done.tablets" @change="toggleDone('tablets', $event)" />
            Done
          </label>
        </div>
        <p v-if="!proctorReady" class="setup-warn">
          Finish steps 1–3 first. The tablet will ask for an assignment and a cohort by name.
        </p>
        <div class="callout callout-note">
          <i class="pi pi-info-circle" />
          <div class="callout-body">
            <p>
              <strong>Google or dashboard email</strong> — the same account you use here, e.g.
              <span class="mono">{{ proctorEmail || 'your researcher email' }}</span
              >. Most researchers tap <strong>Continue with Google</strong> on the tablet. Needed
              only while <em>online</em>: once to download the pack, and later to sync. Visitors
              never enter this. There is no device PIN on science-fair tablets.
            </p>
          </div>
        </div>
        <div class="proctor-card">
          <h3>What to tap on the tablet</h3>
          <dl>
            <div>
              <dt>Assignment</dt>
              <dd>{{ event.assignmentName || 'Finish step 3' }}</dd>
            </div>
            <div>
              <dt>Cohort</dt>
              <dd>{{ event.groupName || 'Finish step 2' }}</dd>
            </div>
            <div>
              <dt>Site</dt>
              <dd>{{ event.siteName || currentSiteName || 'Finish step 1' }}</dd>
            </div>
            <div>
              <dt>On-site Researcher sign-in</dt>
              <dd class="mono">{{ proctorEmail || 'the site admin you used here' }}</dd>
            </div>
          </dl>
          <PvButton
            :disabled="!proctorReady"
            label="Copy these names"
            icon="pi pi-copy"
            severity="secondary"
            @click="copyProctorNotes"
          />
          <p v-if="copied" class="setup-preview">Copied. You can paste this next to a tablet.</p>
        </div>
        <div class="proctor-card">
          <h3>Download this event onto each tablet</h3>
          <p v-if="!packLink" class="setup-warn">
            Finish steps 2–3 first. We need the cohort and assignment to build the pack link.
          </p>
          <template v-else>
            <p class="setup-preview">
              On any tablet with internet, open this link (Safari or Chrome is fine). Sign in with
              Google (or email / password) as
              <span class="mono">{{ proctorEmail || 'your researcher email' }}</span
              >, tap <strong>Download pack</strong> for
              <strong>{{ event.assignmentName }}</strong> /
              <strong>{{ event.groupName }}</strong
              >, wait until it finishes, then start child mode. The tablet does not need to be on
              the same Wi‑Fi as this computer.
            </p>
            <p class="mono pack-link">{{ packLink }}</p>
            <div class="row-actions">
              <a :href="packLink" target="_blank" rel="noopener">
                <PvButton label="Open pack link" icon="pi pi-external-link" icon-pos="right" />
              </a>
              <PvButton label="Copy pack link" icon="pi pi-copy" severity="secondary" @click="copyPackLink" />
            </div>
            <p v-if="copiedPack" class="setup-preview">Copied. Open it on the tablet’s browser.</p>
          </template>
        </div>
        <div class="proctor-card">
          <h3>How to run the kiosk</h3>
          <p class="setup-preview">
            One tablet holds the whole cohort
            <span v-if="created?.users.length || form.count">
              ({{ created?.users.length || form.count }} slots)</span
            >. You do not provision again between visitors. You do not sign in again. Network is not
            required to play.
          </p>
          <ol class="proctor-steps">
            <li>
              After the pack downloads, tap <strong>Start child mode</strong> so visitors only see
              names and tasks — not Provision or Sync.
            </li>
            <li>
              Each visitor taps <strong>one unused name</strong> (a slot, not a real name), then a
              task.
            </li>
            <li>
              When the task finishes, the roster comes back by itself. The next visitor taps a
              <strong>different</strong> name. Use the <span class="mono">n/m tasks done</span>
              counts to see which slots are still free.
            </li>
            <li>
              Stay in child mode all day. To leave it, tap <strong>On-site Researcher</strong> at
              the bottom and confirm <strong>Exit child mode</strong> — only to sync or change the
              pack.
            </li>
          </ol>
        </div>
        <p class="setup-preview">
          If that cohort is missing on the tablet, exit child mode, edit the assignment here to add
          the cohort (or the whole site), then provision again.
        </p>
        <div class="shot-row">
          <figure class="shot">
            <img src="/science-fair/launcher-provision.png" alt="Offline launcher provision screen" />
            <figcaption>Sign in with Google or your dashboard email, then download the pack.</figcaption>
          </figure>
          <figure class="shot">
            <img src="/science-fair/launcher-roster.png" alt="Offline launcher roster" />
            <figcaption>Child mode: tap a name, play a task, come back, next visitor taps another name.</figcaption>
          </figure>
        </div>
      </li>

      <li class="step" :class="{ 'step-done': done.retrieve }">
        <div class="step-head">
          <span class="step-num">5</span>
          <div>
            <h2>Retrieve results</h2>
            <p>
              Online again. On the tablet, leave child mode, open
              <span class="mono">#/sync</span>, and sign in with the same On-site Researcher
              <strong>Google account or email / password</strong>. Sync pending runs, then open
              {{ event.assignmentName || 'this assignment' }} on View Assignments.
            </p>
          </div>
          <label class="done">
            <input type="checkbox" :checked="done.retrieve" @change="toggleDone('retrieve', $event)" />
            Done
          </label>
        </div>
        <div class="shot-row">
          <figure class="shot">
            <img src="/science-fair/launcher-sync.png" alt="Offline launcher sync and export screen" />
            <figcaption>Leave child mode, then sign in with Google or email to sync.</figcaption>
          </figure>
          <figure class="shot">
            <img src="/science-fair/view-assignments.png" alt="View Assignments list in the dashboard" />
            <figcaption>Open the assignment to see completion after sync.</figcaption>
          </figure>
        </div>
        <RouterLink :to="{ name: 'ViewAssignments' }">
          <PvButton label="Open Assignments" icon="pi pi-arrow-right" icon-pos="right" />
        </RouterLink>
      </li>
    </ol>
  </main>
</template>

<script setup lang="ts">
import { CreateDistrictSchema, CreateGroupSchema, CreateUsersParamsSchema } from '@levante-framework/levante-zod';
import { useQueryClient } from '@tanstack/vue-query';
import { storeToRefs } from 'pinia';
import PvButton from 'primevue/button';
import PvInputText from 'primevue/inputtext';
import PvSelect from 'primevue/select';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import useUpsertOrgMutation from '@/composables/mutations/useUpsertOrgMutation';
import useAdministrationsListQuery from '@/composables/queries/useAdministrationsListQuery';
import { FIRESTORE_COLLECTIONS } from '@/constants/firebase';
import { SINGULAR_ORG_TYPES } from '@/constants/orgTypes';
import { DISTRICTS_QUERY_KEY, ORGS_TABLE_QUERY_KEY, SITE_OVERVIEW_QUERY_KEY } from '@/constants/queryKeys';
import useFetchAllDistrictsQuery from '@/firestore/queries/districts/useFetchAllDistrictsQuery';
import { normalizeToLowercase } from '@/helpers';
import { fetchOrgByName } from '@/helpers/query/orgs';
import { useAuthStore } from '@/store/auth';

const CREATE_NEW_SITE = '__create_new_site__';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { roarfirekit, currentSite, currentSiteName, sites } = storeToRefs(authStore);
const hasSite = computed(() => !!currentSite.value && currentSite.value !== 'any');
const { data: allDistrictsData } = useFetchAllDistrictsQuery();

type SiteOption = { label: string; value: string };

const extraSites = ref<SiteOption[]>([]);
const selectedAssignmentId = ref<string | null>(null);
const chosenAssignmentName = ref('');
const assignmentOrderBy = ref([{ field: { fieldPath: 'name' }, direction: 'ASCENDING' }]);
const assignmentDistrictId = computed(() => (hasSite.value ? String(currentSite.value) : ''));
const { data: siteAssignments } = useAdministrationsListQuery(assignmentDistrictId, assignmentOrderBy, false, {
  enabled: hasSite,
});
const assignmentOptions = computed(() =>
  (siteAssignments.value ?? []).map((item: { id?: string; name?: string; publicName?: string }) => ({
    label: item.publicName || item.name || item.id || '',
    value: item.id ?? '',
  })),
);

function useExistingAssignment() {
  const option = assignmentOptions.value.find((item) => item.value === selectedAssignmentId.value);
  if (!option) return;
  chosenAssignmentName.value = option.label;
  saveEvent({ assignmentId: option.value, assignmentName: option.label });
  setDone('assignment', true);
}
const selectedSiteChoice = ref<string | null>(
  currentSite.value && currentSite.value !== 'any' ? currentSite.value : null,
);
const newSiteName = ref('');
const siteSubmitting = ref(false);
const siteError = ref('');

const authorizedSites = computed<SiteOption[]>(() => {
  const extras = extraSites.value;
  const fromClaims = (sites.value ?? []).map((site: { siteId: string; siteName: string }) => ({
    label: site.siteName,
    value: site.siteId,
  }));
  const fromAll = (allDistrictsData.value ?? []).map((district: { name?: string; id?: string }) => ({
    label: district.name ?? district.id ?? '',
    value: district.id ?? '',
  }));
  const base = authStore.isUserSuperAdmin() ? fromAll : fromClaims;
  const merged = [...base];
  for (const extra of extras) {
    if (extra.value && !merged.some((site) => site.value === extra.value)) {
      merged.push(extra);
    }
  }
  return merged.filter((site) => site.value && site.value !== 'any').sort((a, b) => a.label.localeCompare(b.label));
});

const siteSelectOptions = computed(() => [
  ...authorizedSites.value,
  { label: 'Create New Site...', value: CREATE_NEW_SITE },
]);

const isCreatingSite = computed(() => selectedSiteChoice.value === CREATE_NEW_SITE);

watch(currentSite, (value) => {
  if (value && value !== 'any' && selectedSiteChoice.value !== CREATE_NEW_SITE) {
    selectedSiteChoice.value = value;
  }
});

function onSiteChoice() {
  siteError.value = '';
  const value = selectedSiteChoice.value;
  if (!value || value === CREATE_NEW_SITE) return;
  const option = authorizedSites.value.find((site) => site.value === value);
  const name = option?.label ?? currentSiteName.value;
  authStore.setCurrentSite(value, name);
  saveEvent({ siteId: value, siteName: name });
  setDone('site', true);
}

async function findSiteId(name: string) {
  const orgs = (await fetchOrgByName('districts', normalizeToLowercase(name))) as { id?: string }[];
  return orgs?.[0]?.id;
}

async function waitForSiteId(name: string) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const id = await findSiteId(name);
    if (id) return id;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error('Created the site but could not read it back. Refresh and pick it from the list.');
}

async function createNewSite() {
  siteError.value = '';
  const name = newSiteName.value.trim();
  const createdBy = authStore.getUserId();
  if (!name || !createdBy) {
    siteError.value = 'Enter a site name while signed in.';
    return;
  }

  siteSubmitting.value = true;
  try {
    const existingId = await findSiteId(name);
    const siteId = existingId ?? (await createDistrict(name, createdBy));
    extraSites.value = [...extraSites.value, { label: name, value: siteId }];
    selectedSiteChoice.value = siteId;
    authStore.setCurrentSite(siteId, name);
    saveEvent({ siteId, siteName: name });
    setDone('site', true);
    newSiteName.value = '';
    await queryClient.invalidateQueries({ queryKey: [DISTRICTS_QUERY_KEY] });
  } catch (error) {
    siteError.value = error instanceof Error ? error.message : 'Could not create the site.';
  } finally {
    siteSubmitting.value = false;
  }
}

async function createDistrict(name: string, createdBy: string) {
  const parsed = CreateDistrictSchema.safeParse({
    name,
    normalizedName: normalizeToLowercase(name),
    tags: [],
    subGroups: [],
    type: FIRESTORE_COLLECTIONS.DISTRICTS,
    createdBy,
  });
  if (!parsed.success) {
    throw new Error('The site name is not valid.');
  }
  await upsertOrg(parsed.data);
  return waitForSiteId(name);
}

const STORAGE_KEY = 'levante-science-fair-wizard-v2';
const EVENT_KEY = 'levante-science-fair-wizard-event-v1';

type EventContext = {
  siteId?: string;
  siteName?: string;
  groupName?: string;
  groupId?: string;
  assignmentId?: string;
  assignmentName?: string;
};

function loadEvent(): EventContext {
  try {
    const raw = localStorage.getItem(EVENT_KEY);
    return raw ? (JSON.parse(raw) as EventContext) : {};
  } catch {
    return {};
  }
}

const event = reactive<EventContext>(loadEvent());

function saveEvent(patch: EventContext) {
  Object.assign(event, patch);
  localStorage.setItem(EVENT_KEY, JSON.stringify(event));
}

const proctorEmail = computed(() => authStore.getUserEmail() || '');
const proctorReady = computed(
  () => !!(event.assignmentName && event.groupName && (event.siteName || currentSiteName.value)),
);
const copied = ref(false);
const copiedPack = ref(false);

const LAUNCHER_ORIGIN = 'https://hs-levante-admin-dev--offline-launcher-34g4znyg.web.app';

const packLink = computed(() => {
  if (!event.assignmentId || !event.groupId) return '';
  const query = new URLSearchParams({
    admin: event.assignmentId,
    orgType: 'cohort',
    orgId: event.groupId,
  });
  return `${LAUNCHER_ORIGIN}/?v=google#/provision?${query.toString()}`;
});

async function copyPackLink() {
  if (!packLink.value) return;
  await navigator.clipboard.writeText(packLink.value);
  copiedPack.value = true;
  window.setTimeout(() => {
    copiedPack.value = false;
  }, 2500);
}

watch(
  assignmentOptions,
  (options) => {
    if (event.assignmentId || !event.assignmentName) return;
    const match = options.find((item) => item.label === event.assignmentName);
    if (match?.value) saveEvent({ assignmentId: match.value });
  },
  { immediate: true },
);

async function copyProctorNotes() {
  const lines = [
    `Assignment: ${event.assignmentName}`,
    `Cohort: ${event.groupName}`,
    `Site: ${event.siteName || currentSiteName.value}`,
    `On-site Researcher sign-in: ${proctorEmail.value || 'site admin / research assistant'}`,
    '',
    'No device PIN. Sign in with Google (or email/password) online only — download the pack, then later sync.',
    packLink.value ? `Pack link (open on any tablet with internet): ${packLink.value}` : '',
    '',
    'On each tablet: open the pack link, sign in, tap Download pack, then Start child mode.',
    'Kiosk: each visitor taps one unused name, then a task. Task ends → roster. Next visitor taps a different name. Do not provision or sign in again.',
    'Leave child mode (On-site Researcher → Exit child mode) only to sync or change the pack.',
    'After the event (online): leave child mode → #/sync → sign in with Google or email → sync.',
  ];
  await navigator.clipboard.writeText(lines.join('\n'));
  copied.value = true;
  window.setTimeout(() => {
    copied.value = false;
  }, 2500);
}
const queryClient = useQueryClient();
const { mutateAsync: upsertOrg } = useUpsertOrgMutation();

type StepId = 'site' | 'users' | 'assignment' | 'tablets' | 'retrieve';
type CreatedUser = { id: string; month: number; year: number; email?: string };

const form = reactive({
  groupName: event.groupName ?? '',
  count: 12,
  minAge: 6,
  maxAge: 11,
});
if (event.assignmentName) chosenAssignmentName.value = event.assignmentName;
if (event.assignmentId) selectedAssignmentId.value = event.assignmentId;
const submitting = ref(false);
const setupError = ref('');
const created = ref<{ groupName: string; users: CreatedUser[] } | null>(null);

function birthdatesForAges(count: number, minAge: number, maxAge: number, now = new Date()) {
  const n = Math.max(1, Math.floor(count));
  const lo = Math.min(minAge, maxAge);
  const hi = Math.max(minAge, maxAge);
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const age = lo + t * (hi - lo);
    const born = new Date(now.getFullYear(), now.getMonth() - Math.round(age * 12), 1);
    return { month: born.getMonth() + 1, year: born.getFullYear() };
  });
}

function slugify(name: string) {
  return (
    normalizeToLowercase(name)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'event'
  );
}

const preview = computed(() => {
  const count = Number(form.count);
  const minAge = Number(form.minAge);
  const maxAge = Number(form.maxAge);
  if (!Number.isFinite(count) || count < 1 || count > 80) return [];
  if (!Number.isFinite(minAge) || !Number.isFinite(maxAge) || minAge < 3 || maxAge > 21) return [];
  return birthdatesForAges(count, minAge, maxAge);
});

const canSubmit = computed(
  () => hasSite.value && !submitting.value && form.groupName.trim().length > 0 && preview.value.length > 0,
);

async function findCohortId(name: string, siteId: string) {
  const orgs = (await fetchOrgByName('groups', normalizeToLowercase(name), siteId)) as { id?: string }[];
  return orgs?.[0]?.id;
}

async function waitForCohortId(name: string, siteId: string) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const id = await findCohortId(name, siteId);
    if (id) return id;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error('Created the group but could not read it back. Try creating the children again.');
}

async function createCohortAndChildren() {
  setupError.value = '';
  created.value = null;
  if (!canSubmit.value || !currentSite.value) return;

  const siteId = currentSite.value;
  const groupName = form.groupName.trim();
  const births = preview.value;
  const createdBy = authStore.getUserId();
  if (!createdBy) {
    setupError.value = 'Could not read your account. Sign in again.';
    return;
  }

  submitting.value = true;
  try {
    let cohortId = await findCohortId(groupName, siteId);

    if (!cohortId) {
      const parsed = CreateGroupSchema.safeParse({
        name: groupName,
        normalizedName: normalizeToLowercase(groupName),
        tags: [],
        parentOrgId: siteId,
        parentOrgType: SINGULAR_ORG_TYPES.DISTRICTS,
        type: FIRESTORE_COLLECTIONS.GROUPS,
        createdBy,
        siteId,
      });
      if (!parsed.success) {
        throw new Error('The group name is not valid.');
      }
      await upsertOrg(parsed.data);
      cohortId = await waitForCohortId(groupName, siteId);
    }

    const slug = slugify(groupName);
    const stamp = Date.now().toString(36).slice(-4);
    const users = births.map((birth, index) => ({
      userType: 'child' as const,
      id: `${slug}-${stamp}-${String(index + 1).padStart(2, '0')}`,
      orgIds: {
        sites: [siteId],
        schools: [],
        classes: [],
        cohorts: [cohortId],
      },
      month: birth.month,
      year: birth.year,
    }));

    const params = CreateUsersParamsSchema.safeParse({ siteId, users });
    if (!params.success) {
      throw new Error('Could not build the child list. Check the ages and count.');
    }

    const firekit = roarfirekit.value as { createUsers?: (payload: unknown) => Promise<any> } | null;
    if (!firekit?.createUsers) {
      throw new Error('The dashboard is still loading. Wait a moment and try again.');
    }

    const result = await firekit.createUsers(params.data);
    if (result?.code !== 'success') {
      const message =
        result?.code === 'app-error' && result?.data?.code === 'functions/already-exists'
          ? 'One or more of those children already exist. Try again to generate new ids.'
          : result?.data?.message || 'Creating children failed.';
      throw new Error(message);
    }

    const byId = new Map(users.map((user) => [user.id, user]));
    created.value = {
      groupName,
      users: (result.data?.users ?? users).map((row: { id?: string; email?: string }) => {
        const planned = byId.get(String(row.id ?? '')) ?? users.find((user) => user.id === row.id);
        return {
          id: String(row.id ?? planned?.id ?? ''),
          month: planned?.month ?? 0,
          year: planned?.year ?? 0,
          email: row.email,
        };
      }),
    };

    saveEvent({
      siteId,
      siteName: currentSiteName.value || event.siteName,
      groupName,
      groupId: cohortId,
    });
    setDone('site', true);
    setDone('users', true);
    await queryClient.invalidateQueries({ queryKey: [ORGS_TABLE_QUERY_KEY] });
    await queryClient.invalidateQueries({ queryKey: [SITE_OVERVIEW_QUERY_KEY, siteId] });
  } catch (error) {
    setupError.value = error instanceof Error ? error.message : 'Could not create the group and children.';
  } finally {
    submitting.value = false;
  }
}

function loadDone(): Record<StepId, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Record<StepId, boolean>>) : {};
    return {
      site: !!parsed.site,
      users: !!parsed.users,
      assignment: !!parsed.assignment,
      tablets: !!parsed.tablets,
      retrieve: !!parsed.retrieve,
    };
  } catch {
    return { site: false, users: false, assignment: false, tablets: false, retrieve: false };
  }
}

const done = reactive(loadDone());

function setDone(step: StepId, value: boolean) {
  done[step] = value;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(done));
}

function toggleDone(step: StepId, event: Event) {
  setDone(step, (event.target as HTMLInputElement).checked);
}

onMounted(async () => {
  if (hasSite.value && currentSiteName.value) {
    saveEvent({ siteId: String(currentSite.value), siteName: currentSiteName.value });
  }
  if (!event.groupId && event.groupName && hasSite.value) {
    const id = await findCohortId(event.groupName, String(currentSite.value));
    if (id) saveEvent({ groupId: id });
  }
  if (route.query.created === '1') {
    const createdName = typeof route.query.assignment === 'string' ? route.query.assignment.trim() : '';
    setDone('assignment', true);
    if (createdName) {
      chosenAssignmentName.value = createdName;
      saveEvent({ assignmentName: createdName });
    } else if (!event.assignmentName) {
      chosenAssignmentName.value = 'the assignment you just created';
    }
    router.replace({ path: '/science-fair' });
  }
});
</script>

<style scoped>
.fair {
  max-width: 880px;
  margin: 0 auto;
  padding: 1.5rem 1.25rem 4rem;
}

.hero {
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
  padding: 1.75rem 1.75rem 1.5rem;
  margin-bottom: 1.25rem;
  border-radius: 16px;
  background: linear-gradient(135deg, #da3d16 0%, #8f240c 100%);
  color: #fff;
}

.hero-mark {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  filter: brightness(0) invert(1);
}

.eyebrow {
  margin: 0 0 0.25rem;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.85;
}

.hero h1 {
  margin: 0 0 0.5rem;
  font-size: 2rem;
  line-height: 1.15;
}

.hero p {
  margin: 0;
  max-width: 40rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.92);
}

.callout {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  padding: 1rem 1.15rem;
  margin-bottom: 1rem;
  border-radius: 12px;
  background: #fff7ed;
  border: 1px solid #fdba74;
}

.callout-note {
  background: var(--gray-100);
  border-color: var(--gray-200);
}

.callout i {
  margin-top: 0.15rem;
  color: var(--primary-color);
}

.callout-body {
  flex: 1;
  color: var(--gray-700);
  line-height: 1.5;
}

.callout-body p {
  margin: 0 0 0.65rem;
}

.callout-body p:last-child {
  margin-bottom: 0;
}

.subhead {
  margin: 0.25rem 0 0.5rem;
  font-size: 1rem;
}

.steps {
  list-style: none;
  margin: 0;
  padding: 0;
}

.step {
  background: #fff;
  border: 1px solid var(--surface-border, #e5e7eb);
  border-radius: 16px;
  padding: 1.35rem 1.5rem 1.5rem;
  margin-bottom: 1.15rem;
}

.step-done {
  box-shadow: inset 3px 0 0 var(--primary-color);
}

.step-head {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.9rem;
  align-items: start;
  margin-bottom: 1rem;
}

.step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  background: var(--primary-color);
  color: #fff;
  font-weight: 700;
}

.step h2 {
  margin: 0 0 0.4rem;
  font-size: 1.25rem;
}

.step-head p {
  margin: 0;
  color: var(--text-color-secondary);
  line-height: 1.5;
}

.done {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
  color: var(--gray-600);
  white-space: nowrap;
}

.shot {
  margin: 0 0 1rem;
  background: var(--surface-ground, #fafafa);
  border: 1px solid var(--surface-border, #e5e7eb);
  border-radius: 12px;
  overflow: hidden;
}

.shot img {
  display: block;
  width: 100%;
}

.shot figcaption {
  padding: 0.65rem 0.9rem 0.8rem;
  font-size: 0.85rem;
  color: var(--gray-500);
}

.shot-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem;
}

.proctor-card {
  background: var(--surface-ground, #fafafa);
  border: 1px solid var(--surface-border, #e5e7eb);
  border-radius: 12px;
  padding: 1rem 1.1rem 1.1rem;
  margin-bottom: 1rem;
}

.proctor-card h3 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
}

.proctor-card dl {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem 1.25rem;
  margin: 0 0 1rem;
}

.proctor-card dt {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--gray-500);
}

.proctor-card dd {
  margin: 0.2rem 0 0;
  font-weight: 600;
}

.pack-link {
  word-break: break-all;
  background: #fff;
  border: 1px solid var(--surface-border, #e5e7eb);
  border-radius: 8px;
  padding: 0.65rem 0.75rem;
}

.proctor-steps {
  margin: 0 0 1rem;
  padding-left: 1.25rem;
}

.proctor-steps li {
  margin-bottom: 0.55rem;
  line-height: 1.45;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.9em;
}

.setup {
  background: #fff;
  border: 1px solid var(--surface-border, #e5e7eb);
  border-radius: 16px;
  padding: 1.35rem 1.5rem 1.5rem;
  margin-bottom: 1.25rem;
}

.setup h2 {
  margin: 0 0 0.4rem;
  font-size: 1.25rem;
}

.setup > p {
  margin: 0 0 1rem;
  color: var(--text-color-secondary);
  line-height: 1.5;
}

.setup-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: var(--gray-600);
}

.site-pick {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  max-width: 28rem;
  margin-bottom: 0.5rem;
}

.site-select {
  width: 100%;
}

.new-site,
.row-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.new-site {
  flex-direction: column;
  align-items: stretch;
}

.setup-preview {
  margin: 0 0 1rem !important;
}

.setup-warn,
.setup-error {
  color: var(--primary-color);
}

.created {
  margin-top: 1.25rem;
}

.created table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.created th,
.created td {
  text-align: left;
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid var(--gray-200);
}

@media (max-width: 720px) {
  .hero,
  .step-head,
  .shot-row,
  .callout {
    display: flex;
    flex-direction: column;
  }

  .shot-row,
  .setup-grid,
  .proctor-card dl {
    display: flex;
    flex-direction: column;
  }
}
</style>
