import type { Patient } from './patient';

interface FetchResult {
  page: number;
  data: Patient[];
  success: boolean;
}

export type { FetchResult };