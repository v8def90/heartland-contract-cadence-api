/**
 * Image Upload Response Models
 *
 * @description Response models for image upload functionality
 * including presigned URL responses and upload status tracking
 */

import type { ApiResponse } from './ApiResponse';

/**
 * Presigned URL response data
 */
export interface PresignedUrlData {
  /** Upload ID for tracking */
  uploadId: string;
  /** Presigned URL for direct S3 upload */
  presignedUrl: string;
  /** S3 bucket name */
  bucketName: string;
  /** S3 object key */
  objectKey: string;
  /** URL expiration timestamp */
  expiresAt: string;
  /** Fields to include in the form data */
  fields: Record<string, string>;
}

/**
 * Upload status response data
 */
export interface UploadStatusData {
  /** Upload ID */
  uploadId: string;
  /** Current status */
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  /** Image type */
  imageType: 'avatar' | 'background';
  /** User ID */
  userId: string;
  /** Created timestamp */
  createdAt: string;
  /** Updated timestamp */
  updatedAt: string;
  /** Error message (if failed) */
  error?: string;
  /** Processed image URLs (if completed) */
  processedUrls?: {
    small?: string;
    medium?: string;
    large?: string;
  };
}

/**
 * Presigned URL response
 */
export type PresignedUrlResponse = ApiResponse<PresignedUrlData>;

/**
 * Upload status response
 */
export type UploadStatusResponse = ApiResponse<UploadStatusData>;

/**
 * Rate limit error response
 */
export interface RateLimitError {
  /** Error code */
  code: 'RATE_LIMIT_EXCEEDED';
  /** Error message */
  message: string;
  /** Retry after seconds */
  retryAfter: number;
  /** Current limit */
  currentLimit: number;
  /** Reset time */
  resetTime: string;
}
