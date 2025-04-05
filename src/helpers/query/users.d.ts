import { User } from '@/types/user';

declare module '@/helpers/query/users' {
  export function fetchUsersByOrg(orgId: string): Promise<any[]>;
  export function countUsersByOrg(orgId: string): Promise<number>;
}

export function fetchUsersByOrg(orgId: string): Promise<User[]>;
export function countUsersByOrg(orgId: string): Promise<number>; 