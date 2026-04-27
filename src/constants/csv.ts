/** Maximum number of records allowed for CSV export */
export const CSV_EXPORT_MAX_RECORD_COUNT: number = 10000;

/** Map of lowercase to normalized UserCsv headers */
export const NORMALIZED_USER_CSV_HEADERS = {
  id: 'id',
  usertype: 'userType',
  month: 'month',
  year: 'year',
  caregiverid: 'caregiverId',
  teacherid: 'teacherId',
  site: 'site',
  school: 'school',
  class: 'class',
  cohort: 'cohort',
  uid: 'uid',
  email: 'email',
  password: 'password',
};

/** Registered Users Watermark */
export const REGISTERED_USERS_CSV_MARKER = 'levante-registered-user';
