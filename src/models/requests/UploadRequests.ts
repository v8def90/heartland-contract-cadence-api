/**
 * Image Upload Request Models
 *
 * @description Request models for image upload functionality
 * including presigned URL generation and upload status tracking
 */

/**
 * Presigned URL generation request
 */
export interface PresignedUrlRequest {
  /** File type (png, jpg, jpeg, svg, webp) */
  fileType: string;
  /** File size in bytes (max 10MB) */
  fileSize: number;
  /** Content type (e.g., image/png, image/jpeg) */
  contentType: string;
}

/**
 * Upload status request
 */
export interface UploadStatusRequest {
  /** Upload ID for tracking */
  uploadId: string;
}

/**
 * Image type enumeration
 */
export type ImageType = 'avatar' | 'background' | 'post';

/**
 * Supported file types
 */
export const SUPPORTED_FILE_TYPES = [
  'png',
  'jpg',
  'jpeg',
  'svg',
  'webp',
] as const;

/**
 * Maximum file size (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Presigned URL expiration time (5 minutes)
 */
export const PRESIGNED_URL_EXPIRY = 300; // 5 minutes
