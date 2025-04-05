export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'superAdmin' | 'user';
  orgId: string;
  [key: string]: unknown;
} 