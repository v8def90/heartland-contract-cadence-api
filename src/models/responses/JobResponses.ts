/**
 * Job Tracking Response Models
 *
 * @description Defines response models for job tracking and status management
 */

import type { ApiResponse } from './ApiResponse';

export type JobStatus =
  | 'pending' // ジョブ待機中
  | 'processing' // 処理中
  | 'completed' // 完了
  | 'failed' // 失敗
  | 'cancelled'; // キャンセル

export interface JobData {
  jobId: string;
  userId: string;
  jobType: 'image_upload' | 'image_processing' | 'image_cleanup';
  status: JobStatus;
  progress: number; // 0-100
  message?: string | undefined;
  error?: string | undefined;
  metadata: {
    imageType?: 'avatar' | 'background';
    uploadId?: string;
    originalFileName?: string;
    fileSize?: number;
    contentType?: string;
    processedSizes?: string[];
    imageUrls?: Record<string, string>;
  };
  createdAt: string;
  updatedAt: string;
  completedAt?: string | undefined;
  expiresAt: string; // TTL for job cleanup
}

export type JobResponse = ApiResponse<JobData>;

export interface JobListData {
  items: JobData[];
  nextCursor?: string | undefined;
  hasMore: boolean;
  totalCount: number;
}

export type JobListResponse = ApiResponse<JobListData>;

export interface JobStatusUpdate {
  jobId: string;
  status: JobStatus;
  progress: number;
  message?: string;
  error?: string;
  metadata?: Partial<JobData['metadata']>;
}

export interface JobCreateRequest {
  userId: string;
  jobType: 'image_upload' | 'image_processing' | 'image_cleanup';
  metadata: Partial<JobData['metadata']>;
  expiresInHours?: number; // Default: 24 hours
}

export interface JobUpdateRequest {
  status: JobStatus;
  progress: number;
  message?: string;
  error?: string;
  metadata?: Partial<JobData['metadata']>;
}
