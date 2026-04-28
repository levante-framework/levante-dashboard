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

/** Array of keys to use for the CSV header */
export const USER_CSV_HEADERS = Object.values(NORMALIZED_USER_CSV_HEADERS).filter((header) => header !== 'site');
