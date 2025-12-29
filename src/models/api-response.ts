import type { Patient } from './patient';
import type { Pagination } from './pagination';
import type { ApiMetadata } from './api-metadata';

interface ApiResponse {
  data: Patient[];
  pagination: Pagination;
  metadata: ApiMetadata;
}

export type { ApiResponse };