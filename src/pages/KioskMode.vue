<template>
  <main class="min-h-screen bg-surface-50 px-4 py-10">
    <div class="mx-auto flex w-full max-w-2xl flex-column gap-6">
      <div class="text-center">
        <PvImage src="/LEVANTE/Levante_Logo.png" alt="LEVANTE Logo" width="180" />
        <h1 class="mt-4 text-2xl font-semibold text-gray-900">Kiosk Sign In</h1>
        <p class="mt-2 text-sm text-gray-600" v-if="siteInfo">
          Site: {{ siteInfo.name }}
        </p>
        <p class="mt-2 text-sm text-gray-600" v-else>
          Site: {{ configuredSiteLabel }}
        </p>
      </div>

      <PvCard>
        <template #content>
          <div v-if="isSubmitting" class="flex flex-column align-items-center gap-3 py-6">
            <LevanteSpinner />
            <p class="m-0 text-sm text-gray-600">Setting up this session...</p>
          </div>

          <form v-else class="flex flex-column gap-4" @submit.prevent="handleSubmit">
            <div v-if="configError" class="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {{ configError }}
            </div>

            <div v-if="errorMessage" class="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {{ errorMessage }}
            </div>

            <div class="flex flex-column gap-2">
              <label class="text-sm font-medium text-gray-700" for="kiosk-nickname">Nickname</label>
              <PvInputText
                id="kiosk-nickname"
                v-model.trim="nickname"
                placeholder="Enter a nickname"
                autocomplete="off"
              />
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div class="flex flex-column gap-2">
                <label class="text-sm font-medium text-gray-700" for="kiosk-month">Birth month</label>
                <PvDropdown
                  id="kiosk-month"
                  v-model="birthMonth"
                  :options="monthOptions"
                  option-label="label"
                  option-value="value"
                  placeholder="Month"
                />
              </div>
              <div class="flex flex-column gap-2">
                <label class="text-sm font-medium text-gray-700" for="kiosk-year">Birth year</label>
                <PvInputNumber
                  id="kiosk-year"
                  v-model="birthYear"
                  :use-grouping="false"
                  placeholder="YYYY"
                />
              </div>
            </div>

            <div class="flex flex-column gap-2 text-sm text-gray-600">
              <p class="m-0">Cohort: {{ groupInfo?.name ?? configuredGroupLabel }}</p>
            </div>

            <PvButton
              type="submit"
              label="Start Session"
              class="w-full"
              :disabled="!isFormValid || Boolean(configError)"
            />
          </form>
        </template>
      </PvCard>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import PvButton from 'primevue/button';
import PvCard from 'primevue/card';
import PvDropdown from 'primevue/dropdown';
import PvImage from 'primevue/image';
import PvInputNumber from 'primevue/inputnumber';
import PvInputText from 'primevue/inputtext';
import LevanteSpinner from '@/components/LevanteSpinner.vue';
import { useAuthStore } from '@/store/auth';
import { usersRepository } from '@/firebase/repositories/UsersRepository';
import { fetchDocById } from '@/helpers/query/utils';
import { fetchOrgByName } from '@/helpers/query/orgs';
import { normalizeToLowercase } from '@/helpers';
import {
  KIOSK_GROUP_ID,
  KIOSK_GROUP_NAME,
  KIOSK_SITE_ID,
  KIOSK_SITE_NAME,
} from '@/constants/kiosk';
import { APP_ROUTES } from '@/constants/routes';

interface KioskOrgInfo {
  id: string;
  name: string;
}

interface CreatedUserCredentials {
  email?: string;
  password?: string;
  uid?: string;
}

interface OrgDoc {
  id?: string;
  name?: string;
  parentOrgId?: string;
}

const authStore = useAuthStore();
const { spinner } = storeToRefs(authStore);
const router = useRouter();

const nickname = ref('');
const birthMonth = ref<number | null>(null);
const birthYear = ref<number | null>(null);
const errorMessage = ref('');
const isSubmitting = ref(false);
const siteInfo = ref<KioskOrgInfo | null>(null);
const groupInfo = ref<KioskOrgInfo | null>(null);

const monthOptions = Array.from({ length: 12 }, (_, index) => {
  const month = index + 1;
  return { label: month.toString().padStart(2, '0'), value: month };
});

const configuredSiteLabel = computed(() => KIOSK_SITE_NAME || KIOSK_SITE_ID || 'Not configured');
const configuredGroupLabel = computed(() => KIOSK_GROUP_NAME || KIOSK_GROUP_ID || 'Not configured');

const configError = computed(() => {
  if (!KIOSK_SITE_ID && !KIOSK_SITE_NAME) {
    return 'Missing kiosk site configuration.';
  }
  if (!KIOSK_GROUP_ID && !KIOSK_GROUP_NAME) {
    return 'Missing kiosk cohort configuration.';
  }
  return '';
});

const isFormValid = computed(() => {
  return nickname.value.trim().length > 0 && Boolean(birthMonth.value) && Boolean(birthYear.value);
});

function extractCreatedUser(result: unknown): CreatedUserCredentials | null {
  if (!result || typeof result !== 'object') {
    return null;
  }
  const payload = (result as { data?: unknown }).data ?? result;
  if (Array.isArray(payload)) {
    return (payload[0] as CreatedUserCredentials) ?? null;
  }
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown[] }).data)) {
    return ((payload as { data?: unknown[] }).data?.[0] as CreatedUserCredentials) ?? null;
  }
  return null;
}

async function resolveSiteInfo(): Promise<KioskOrgInfo> {
  if (siteInfo.value) {
    return siteInfo.value;
  }

  if (KIOSK_SITE_ID) {
    const siteDoc = (await fetchDocById('districts', KIOSK_SITE_ID, ['name'])) as OrgDoc;
    if (!siteDoc?.id) {
      throw new Error('Unable to load kiosk site.');
    }
    const resolved = { id: siteDoc.id, name: siteDoc.name ?? KIOSK_SITE_NAME ?? siteDoc.id };
    siteInfo.value = resolved;
    return resolved;
  }

  const normalizedName = normalizeToLowercase(KIOSK_SITE_NAME);
  const [siteDoc] = (await fetchOrgByName('districts', normalizedName, ref(undefined), ref(undefined))) as OrgDoc[];
  if (!siteDoc?.id) {
    throw new Error('Unable to load kiosk site.');
  }
  const resolved = { id: siteDoc.id, name: siteDoc.name ?? KIOSK_SITE_NAME ?? siteDoc.id };
  siteInfo.value = resolved;
  return resolved;
}

async function resolveGroupInfo(site: KioskOrgInfo): Promise<KioskOrgInfo> {
  if (groupInfo.value) {
    return groupInfo.value;
  }

  if (KIOSK_GROUP_ID) {
    const groupDoc = (await fetchDocById('groups', KIOSK_GROUP_ID, ['name', 'parentOrgId'])) as OrgDoc;
    if (!groupDoc?.id) {
      throw new Error('Unable to load kiosk cohort.');
    }
    if (groupDoc.parentOrgId && groupDoc.parentOrgId !== site.id) {
      throw new Error('Kiosk cohort does not belong to the configured site.');
    }
    const resolved = { id: groupDoc.id, name: groupDoc.name ?? KIOSK_GROUP_NAME ?? groupDoc.id };
    groupInfo.value = resolved;
    return resolved;
  }

  const normalizedName = normalizeToLowercase(KIOSK_GROUP_NAME);
  const [groupDoc] = (await fetchOrgByName('groups', normalizedName, ref({ id: site.id }), ref(undefined))) as OrgDoc[];
  if (!groupDoc?.id) {
    throw new Error('Unable to load kiosk cohort.');
  }
  const resolved = { id: groupDoc.id, name: groupDoc.name ?? KIOSK_GROUP_NAME ?? groupDoc.id };
  groupInfo.value = resolved;
  return resolved;
}

async function handleSubmit(): Promise<void> {
  if (configError.value) {
    errorMessage.value = configError.value;
    return;
  }
  if (!isFormValid.value) {
    errorMessage.value = 'Please enter a nickname and birth month/year.';
    return;
  }

  errorMessage.value = '';
  isSubmitting.value = true;
  spinner.value = true;

  try {
    const site = await resolveSiteInfo();
    const group = await resolveGroupInfo(site);
    const userPayload = {
      id: nickname.value.trim(),
      userType: 'child',
      month: birthMonth.value,
      year: birthYear.value,
      orgIds: {
        districts: [site.id],
        groups: [group.id],
      },
    };

    const createResult = await usersRepository.createUsers({ users: [userPayload], siteId: site.id });
    const createdUser = extractCreatedUser(createResult);
    if (!createdUser?.email || !createdUser?.password) {
      throw new Error('Unable to create the participant account.');
    }

    await authStore.logInWithEmailAndPassword({
      email: createdUser.email,
      password: createdUser.password,
    });

    const uid = authStore.getUserId();
    if (!uid) {
      throw new Error('Unable to sign in to the kiosk session.');
    }

    const [userClaims, userData] = await Promise.all([
      fetchDocById('userClaims', uid),
      fetchDocById('users', uid),
    ]);

    authStore.setUserClaims(userClaims as unknown as Parameters<typeof authStore.setUserClaims>[0]);
    authStore.setUserData(userData as unknown as Parameters<typeof authStore.setUserData>[0]);
    authStore.setCurrentSite(site.id, site.name);

    await router.replace({ path: APP_ROUTES.HOME });
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to start kiosk session.';
  } finally {
    spinner.value = false;
    isSubmitting.value = false;
  }
}
</script>
