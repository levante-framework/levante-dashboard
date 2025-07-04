<template>
  <header id="site-header" class="navbar-container">
    <nav class="flex flex-row align-items-center justify-content-between w-full">
      <div id="navBarRightEnd" class="flex flex-row align-items-center justify-content-start w-full gap-1">
        <div class="flex align-items-center justify-content-center w-full">
          <PvMenubar :model="computedItems" class="w-full">
            <template #start>
              <router-link :to="{ path: APP_ROUTES.HOME }">
                <div class="navbar-logo mx-3 levante-logo">
                  <PvImage src="/LEVANTE/Levante_Logo.png" width="200" alt="LEVANTE Logo" />
                </div>
              </router-link>
            </template>

            <template #buttonicon>
              <PvButton
                icon="pi pi-bars"
                class="bg-primary text-white p-2 mr-2 border-none border-round hover:bg-red-900"
                @click="toggleMenu"
              />
            </template>

            <template #item="{ item, props, hasSubmenu, root }">
              <a class="flex items-center" v-bind="props.action">
                <i v-if="item.icon" :class="['mr-2', item.icon]"></i>
                <span>{{ item.label }}</span>
                <Badge
                  v-if="item.badge"
                  :class="[item.badgeClass, { 'ml-auto': !root, 'ml-2': root }]"
                  :value="item.badge"
                />
                <i v-if="hasSubmenu" :class="['pi ml-auto', { 'pi-angle-down': root, 'pi-angle-right': !root }]"></i>
              </a>
            </template>

            <template #end>
              <UserActions :isBasicView="computedIsBasicView" />
            </template>
          </PvMenubar>
        </div>
      </div>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import PvButton from 'primevue/button';
import PvImage from 'primevue/image';
import PvMenubar from 'primevue/menubar';
import { useAuthStore } from '@/store/auth';
import { getNavbarActions } from '@/router/navbarActions';
import useUserClaimsQuery from '@/composables/queries/useUserClaimsQuery';
import { APP_ROUTES } from '@/constants/routes';
import Badge from 'primevue/badge';
import UserActions from './UserActions.vue';
import useUserType from '@/composables/useUserType';

interface NavbarAction {
  category: string;
  title: string;
  icon: string;
  buttonLink: string;
}

interface MenuItem {
  label: string;
  icon?: string;
  command?: () => void;
  items?: MenuItem[];
  badge?: string;
  badgeClass?: string;
}

const router = useRouter();
const authStore = useAuthStore();
const { roarfirekit } = storeToRefs(authStore);

const initialized = ref<boolean>(false);
const menu = ref();
const screenWidth = ref<number>(window.innerWidth);
let unsubscribe: (() => void) | undefined;

const init = (): void => {
  if (unsubscribe) unsubscribe();
  initialized.value = true;
};

unsubscribe = authStore.$subscribe(async (mutation, state) => {
  if ((state.roarfirekit as any)?.restConfig) init();
});

const handleResize = (): void => {
  screenWidth.value = window.innerWidth;
};

onMounted((): void => {
  if ((roarfirekit.value as any)?.restConfig) init();
  window.addEventListener('resize', handleResize);
});

onUnmounted((): void => {
  window.removeEventListener('resize', handleResize);
});

const { data: userClaims } = useUserClaimsQuery({
  queryKey: ['userClaims'],
  enabled: initialized,
});

const computedItems = computed((): MenuItem[] => {
  const items: MenuItem[] = [];
  // TO DO: REMOVE USERS AFTER NAMING 3 TICKET IS COMPLETED

  // Groups only has one associated page and therefore is not nested within items
  const groupsAction = rawActions.value.find((action) => action.category === 'Groups');
  if (groupsAction) {
    items.push({
      label: groupsAction.title,
      icon: groupsAction.icon,
      command: () => {
        router.push(groupsAction.buttonLink);
      },
    });
  }

  const headers = ['Users', 'Assignments'];
  for (const header of headers) {
    const headerItems = rawActions.value
      .filter((action) => action.category === header)
      .map((action): MenuItem => {
        return {
          label: action.title,
          icon: action.icon,
          command: () => {
            router.push(action.buttonLink);
          },
        };
      });

    if (headerItems.length > 0) {
      items.push({
        label: header,
        items: headerItems,
      });
    }
  }
  return items;
});

const { isAdmin, isSuperAdmin } = useUserType(userClaims);

const computedIsBasicView = computed((): boolean => {
  if (!userClaims.value) {
    return false;
  }
  return !isSuperAdmin.value && !isAdmin.value;
});

const isAtHome = computed((): boolean => {
  return router.currentRoute.value.fullPath === '/';
});

const rawActions = computed((): NavbarAction[] => {
  return getNavbarActions({
    isSuperAdmin: isSuperAdmin.value,
    isAdmin: authStore.isUserAdmin,
    includeHomeLink: !isAtHome.value,
  });
});

const toggleMenu = (event: Event): void => {
  menu.value.toggle(event);
};
</script>

<style scoped>
.p-button {
  min-width: 2.5rem;
  min-height: 2.5rem;
  top: -2px;
}
nav {
  min-width: 100%;
}

@media screen and (max-width: 768px) {
  .levante-logo :deep(img) {
    width: 160px !important;
  }
}
</style>
