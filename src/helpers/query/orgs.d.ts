import { Organization } from '@/types/organization';

declare module '@/helpers/query/orgs' {
  export function orgFetchAll(): Promise<any[]>;
}

export function orgFetchAll(): Promise<Organization[]>; 