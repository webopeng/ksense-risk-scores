import { Pagination } from './pagination';
import type { Patient } from './patient';

interface FetchResult {
  page: number;
  data: Patient[];
  success: boolean;
  pagination: Pagination | null;
}

export type { FetchResult };