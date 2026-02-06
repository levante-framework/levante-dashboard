<template>
  <div v-if="localUserType === 'student'" class="edit-user-modal">
    <div class="form-field">
      <label>Email</label>
      <PvInputText v-model="localUserData.email" disabled />
    </div>

    <div class="form-field">
      <label>School</label>
      <PvSelect
        v-model="selectedSchoolId"
        option-label="name"
        option-value="id"
        :options="schoolOptions"
        placeholder="Select school"
      />
    </div>

    <div class="form-field">
      <label>Class</label>
      <PvSelect
        v-model="selectedClassId"
        option-label="name"
        option-value="id"
        :options="classOptions"
        placeholder="Select class"
      />
    </div>

    <div class="form-field">
      <label>Birthday (Month / Year)</label>
      <div class="inline-row">
        <PvSelect
          v-model="localUserData.birthMonth"
          option-label="label"
          option-value="value"
          :options="monthOptions"
          placeholder="Month"
        />
        <PvSelect
          v-model="localUserData.birthYear"
          option-label="label"
          option-value="value"
          :options="yearOptions"
          placeholder="Year"
        />
      </div>
    </div>

    <div class="link-section">
      <div class="section-title">Linked Teachers</div>
      <div class="section-subtitle">CURRENT</div>
      <div v-if="currentTeacherRows.length" class="link-list">
        <div v-for="teacher in currentTeacherRows" :key="teacher.id" class="link-row">
          <span>{{ teacher.label }}</span>
          <button type="button" class="link-remove" @click="removeTeacher(teacher.id)">×</button>
        </div>
      </div>
      <div v-else class="empty-state">No current teachers linked</div>

      <div class="section-subtitle">PAST</div>
      <div v-if="pastTeacherRows.length" class="link-list">
        <div v-for="teacher in pastTeacherRows" :key="teacher.id" class="link-row">
          <span>{{ teacher.label }}</span>
        </div>
      </div>
      <div v-else class="empty-state">No past teachers linked</div>

      <PvSelect
        v-model="selectedTeacherToAdd"
        option-label="label"
        option-value="id"
        :options="availableTeacherOptions"
        placeholder="Add teacher..."
        class="mt-2"
        @change="addTeacher"
      />
      <div v-if="availableTeacherOptions.length === 0" class="empty-state">No teachers available in this group</div>
      <small class="helper-text">Teachers must belong to the same school/class to be linked</small>
    </div>

    <div class="link-section">
      <div class="section-title">Linked Caregivers</div>
      <div class="section-subtitle">CURRENT</div>
      <div v-if="currentCaregiverRows.length" class="link-list">
        <div v-for="caregiver in currentCaregiverRows" :key="caregiver.id" class="link-row">
          <span>{{ caregiver.label }}</span>
          <button type="button" class="link-remove" @click="removeCaregiver(caregiver.id)">×</button>
        </div>
      </div>
      <div v-else class="empty-state">No current caregivers linked</div>

      <div class="section-subtitle">PAST</div>
      <div v-if="pastCaregiverRows.length" class="link-list">
        <div v-for="caregiver in pastCaregiverRows" :key="caregiver.id" class="link-row">
          <span>{{ caregiver.label }}</span>
        </div>
      </div>
      <div v-else class="empty-state">No past caregivers linked</div>

      <PvSelect
        v-model="selectedCaregiverToAdd"
        option-label="label"
        option-value="id"
        :options="availableCaregiverOptions"
        placeholder="Add caregiver..."
        class="mt-2"
        @change="addCaregiver"
      />
      <div v-if="availableCaregiverOptions.length === 0" class="empty-state">No caregivers available in this group</div>
    </div>
  </div>
  <div v-else class="empty-state">Editing is available for student users only.</div>
</template>
<script setup lang="ts">
import { watch, ref, onMounted, computed } from 'vue';
import { useAuthStore } from '@/store/auth';
import { storeToRefs } from 'pinia';
import _isEmpty from 'lodash/isEmpty';
import PvSelect from 'primevue/select';
import PvInputText from 'primevue/inputtext';

interface UserData {
  id?: string;
  email?: string;
  birthMonth?: number;
  birthYear?: number;
  studentData?: { dob?: Date | string | null };
  schools?: { current?: string[] };
  classes?: { current?: string[] };
  teacherLinks?: { current?: string[]; dates?: Record<string, { from: any; to: any }> };
  parentLinks?: { current?: string[]; dates?: Record<string, { from: any; to: any }> };
  teacherIds?: string[];
  parentIds?: string[];
  userType?: string;
}

interface LocalUserData {
  id?: string;
  email: string;
  birthMonth: number | null;
  birthYear: number | null;
  userType?: string;
  orgIds: {
    schools: string[];
    classes: string[];
  };
  teacherLinkIds: string[];
  caregiverLinkIds: string[];
}

interface Props {
  userData: UserData;
  userType?: string;
  editMode?: boolean;
  schoolOptions?: { id: string; name: string }[];
  classOptions?: { id: string; name: string }[];
  teacherOptions?: { id: string; label: string; schools?: string[]; classes?: string[] }[];
  caregiverOptions?: { id: string; label: string; schools?: string[]; classes?: string[] }[];
}

interface LinkRow {
  id: string;
  label: string;
}

interface Emits {
  modalClosed: [];
  'update:userData': [userData: LocalUserData];
}

const props = withDefaults(defineProps<Props>(), {
  userType: 'student',
  editMode: false,
});

const emit = defineEmits<Emits>();

const authStore = useAuthStore();
const { roarfirekit } = storeToRefs(authStore);
const initialized = ref<boolean>(false);

const localUserData = ref<LocalUserData>({
  id: undefined,
  email: '',
  birthMonth: null,
  birthYear: null,
  userType: undefined,
  orgIds: {
    schools: [],
    classes: [],
  },
  teacherLinkIds: [],
  caregiverLinkIds: [],
});

const pastTeacherIds = ref<string[]>([]);
const pastCaregiverIds = ref<string[]>([]);

const localUserType = computed((): string | null => {
  if (props.userData?.userType) return props.userData.userType;
  if (props.userType) return props.userType;
  return null;
});

const setupUserData = (): void => {
  const teacherCurrent = props.userData?.teacherLinks?.current ?? props.userData?.teacherIds ?? [];
  const parentCurrent = props.userData?.parentLinks?.current ?? props.userData?.parentIds ?? [];
  const teacherDates = props.userData?.teacherLinks?.dates ?? {};
  const parentDates = props.userData?.parentLinks?.dates ?? {};

  pastTeacherIds.value = Object.entries(teacherDates)
    .filter(([, value]) => value?.to)
    .map(([id]) => id)
    .filter((id) => !teacherCurrent.includes(id));

  pastCaregiverIds.value = Object.entries(parentDates)
    .filter(([, value]) => value?.to)
    .map(([id]) => id)
    .filter((id) => !parentCurrent.includes(id));

  const birthMonth = props.userData?.birthMonth ?? null;
  const birthYear = props.userData?.birthYear ?? null;
  const dobValue = props.userData?.studentData?.dob;
  const derivedDob = dobValue ? new Date(dobValue as string) : null;

  localUserData.value = {
    id: props.userData?.id,
    email: props.userData?.email ?? '',
    birthMonth: birthMonth ?? (derivedDob && !Number.isNaN(derivedDob.getTime()) ? derivedDob.getMonth() + 1 : null),
    birthYear: birthYear ?? (derivedDob && !Number.isNaN(derivedDob.getTime()) ? derivedDob.getFullYear() : null),
    userType: localUserType.value || undefined,
    orgIds: {
      schools: props.userData?.schools?.current ?? [],
      classes: props.userData?.classes?.current ?? [],
    },
    teacherLinkIds: [...teacherCurrent],
    caregiverLinkIds: [...parentCurrent],
  };
};

watch(
  () => props.userData?.id,
  (userId) => {
    if (userId) {
      setupUserData();
    }
  },
  { immediate: true },
);

const selectedSchoolId = computed({
  get: () => localUserData.value.orgIds.schools[0] ?? null,
  set: (value) => {
    localUserData.value.orgIds.schools = value ? [value] : [];
  },
});

const selectedClassId = computed({
  get: () => localUserData.value.orgIds.classes[0] ?? null,
  set: (value) => {
    localUserData.value.orgIds.classes = value ? [value] : [];
  },
});

const schoolOptions = computed(() => props.schoolOptions ?? []);
const classOptions = computed(() => props.classOptions ?? []);
const teacherOptions = computed(() => props.teacherOptions ?? []);
const caregiverOptions = computed(() => props.caregiverOptions ?? []);

const monthOptions = [
  { label: 'January (1)', value: 1 },
  { label: 'February (2)', value: 2 },
  { label: 'March (3)', value: 3 },
  { label: 'April (4)', value: 4 },
  { label: 'May (5)', value: 5 },
  { label: 'June (6)', value: 6 },
  { label: 'July (7)', value: 7 },
  { label: 'August (8)', value: 8 },
  { label: 'September (9)', value: 9 },
  { label: 'October (10)', value: 10 },
  { label: 'November (11)', value: 11 },
  { label: 'December (12)', value: 12 },
];

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: currentYear - 1899 }, (_, idx) => {
  const year = currentYear - idx;
  return { label: String(year), value: year };
});

const buildRows = (ids: string[], options: { id: string; label: string }[]): LinkRow[] => {
  if (!ids.length) return [];
  return ids.map((id) => ({
    id,
    label: options.find((option) => option.id === id)?.label ?? id,
  }));
};

const currentTeacherRows = computed(() => buildRows(localUserData.value.teacherLinkIds, teacherOptions.value));
const pastTeacherRows = computed(() => buildRows(pastTeacherIds.value, teacherOptions.value));
const currentCaregiverRows = computed(() => buildRows(localUserData.value.caregiverLinkIds, caregiverOptions.value));
const pastCaregiverRows = computed(() => buildRows(pastCaregiverIds.value, caregiverOptions.value));

const availableTeacherOptions = computed(() => {
  const selectedSchool = selectedSchoolId.value;
  const selectedClass = selectedClassId.value;
  return teacherOptions.value.filter((option) => {
    if (localUserData.value.teacherLinkIds.includes(option.id)) return false;
    if (selectedClass) return (option.classes ?? []).includes(selectedClass);
    if (selectedSchool) return (option.schools ?? []).includes(selectedSchool);
    return true;
  });
});

const availableCaregiverOptions = computed(() => {
  const selectedSchool = selectedSchoolId.value;
  const selectedClass = selectedClassId.value;
  return caregiverOptions.value.filter((option) => {
    if (localUserData.value.caregiverLinkIds.includes(option.id)) return false;
    if (selectedClass) return (option.classes ?? []).includes(selectedClass);
    if (selectedSchool) return (option.schools ?? []).includes(selectedSchool);
    return true;
  });
});

const selectedTeacherToAdd = ref<string | null>(null);
const selectedCaregiverToAdd = ref<string | null>(null);

const addTeacher = () => {
  if (!selectedTeacherToAdd.value) return;
  if (!localUserData.value.teacherLinkIds.includes(selectedTeacherToAdd.value)) {
    localUserData.value.teacherLinkIds.push(selectedTeacherToAdd.value);
  }
  selectedTeacherToAdd.value = null;
};

const addCaregiver = () => {
  if (!selectedCaregiverToAdd.value) return;
  if (!localUserData.value.caregiverLinkIds.includes(selectedCaregiverToAdd.value)) {
    localUserData.value.caregiverLinkIds.push(selectedCaregiverToAdd.value);
  }
  selectedCaregiverToAdd.value = null;
};

const removeTeacher = (teacherId: string) => {
  localUserData.value.teacherLinkIds = localUserData.value.teacherLinkIds.filter((id) => id !== teacherId);
  if (!pastTeacherIds.value.includes(teacherId)) {
    pastTeacherIds.value.push(teacherId);
  }
};

const removeCaregiver = (caregiverId: string) => {
  localUserData.value.caregiverLinkIds = localUserData.value.caregiverLinkIds.filter((id) => id !== caregiverId);
  if (!pastCaregiverIds.value.includes(caregiverId)) {
    pastCaregiverIds.value.push(caregiverId);
  }
};

let unsubscribe: (() => void) | undefined;
const init = (): void => {
  if (unsubscribe) unsubscribe();
  initialized.value = true;
};

unsubscribe = authStore.$subscribe(async (mutation, state) => {
  if ((state.roarfirekit as any)?.restConfig) init();
});

onMounted((): void => {
  if ((roarfirekit.value as any)?.restConfig) init();
  if (!_isEmpty(props.userData)) setupUserData();
});

watch(
  () => localUserData.value,
  (userData) => {
    emit('update:userData', userData);
  },
  { deep: true, immediate: false },
);
</script>
<style lang="scss">
.form-container {
  display: flex;
  flex-direction: row;
  gap: 1rem;
  width: 100%;
}
.form-column {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}
.form-field {
  display: flex;
  flex-direction: column;
}
.edit-user-modal {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.inline-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
.link-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.section-title {
  font-weight: 600;
}
.section-subtitle {
  font-size: 0.75rem;
  color: var(--gray-500);
}
.link-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.link-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--gray-200);
  border-radius: 0.5rem;
}
.link-remove {
  border: none;
  background: transparent;
  color: var(--red-500);
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1;
}
.empty-state {
  color: var(--gray-500);
  font-style: italic;
}
.helper-text {
  color: var(--gray-500);
  font-size: 0.75rem;
}
.modal-header {
  margin-right: auto;
  display: flex;
  flex-direction: row;
}
.modal-icon {
  font-size: 1.6rem;
  margin-top: 6px;
}
.modal-title {
  margin-top: 0;
  margin-bottom: 0.5rem;
}
.required {
  color: var(--bright-red);
}
.admin-only {
  color: var(--blue-600);
}
.optional {
  color: var(--gray-500);
  font-style: italic;
  user-select: none;
}
.modal-footer {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  width: 100%;
  gap: 1rem;
  padding: 1.5rem;
  background-color: #e6e7eb;
  border-radius: 0 0 var(--border-radius) var(--border-radius);
}
.p-dialog .p-dialog-footer {
  padding: 0;
}
</style>
