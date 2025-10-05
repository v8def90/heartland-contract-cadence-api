/**
 * DynamoDB Job Item Interface
 *
 * @description Defines the structure of job items stored in DynamoDB
 */

export interface DynamoDBJobItem {
  PK: string; // JOB#{jobId}
  SK: string; // META
  GSI1PK: string; // USER#{userId}
  GSI1SK: string; // JOB#{jobId}
  GSI2PK: string; // JOB_TYPE#{jobType}
  GSI2SK: string; // JOB#{jobId}
  jobId: string;
  userId: string;
  jobType: 'image_upload' | 'image_processing' | 'image_cleanup';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
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
  expiresAt: string;
  ttl?: number | undefined; // DynamoDB TTL
}

export interface JobQueryOptions {
  userId?: string | undefined;
  jobType?: string | undefined;
  status?: string | undefined;
  limit?: number | undefined;
  cursor?: string | undefined;
  sortOrder?: 'asc' | 'desc' | undefined;
}
