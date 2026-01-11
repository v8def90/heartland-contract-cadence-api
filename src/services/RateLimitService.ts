/**
 * Rate Limit Service
 *
 * @description Service for implementing rate limiting for image upload
 * including concurrent upload limits and time-based rate limits
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import type { RateLimitError } from '../models/responses/UploadResponses';

export interface RateLimitConfig {
  /** Maximum concurrent uploads per user */
  maxConcurrentUploads: number;
  /** Maximum uploads per hour per user */
  maxUploadsPerHour: number;
  /** Rate limit window in seconds */
  windowSeconds: number;
}

export interface RateLimitData {
  /** Current concurrent uploads */
  currentConcurrent: number;
  /** Uploads in current window */
  currentWindowUploads: number;
  /** Window start time */
  windowStart: number;
  /** Last upload time */
  lastUploadTime: number;
}

export class RateLimitService {
  private client: DynamoDBDocumentClient | null;
  private tableName: string;
  private config: RateLimitConfig;

  constructor() {
    this.tableName = process.env.SNS_TABLE_NAME || '';
    this.client =
      process.env.NODE_ENV === 'test'
        ? null
        : DynamoDBDocumentClient.from(
            new DynamoDBClient({
              region: process.env.AWS_REGION || 'ap-northeast-1',
            })
          );

    this.config = {
      maxConcurrentUploads: 3,
      maxUploadsPerHour: 100,
      windowSeconds: 3600, // 1 hour
    };
  }

  /**
   * Check if user can upload (rate limit check)
   *
   * @param userId - User ID
   * @param imageType - Type of image
   * @returns Promise<boolean> - true if allowed, false if rate limited
   */
  async canUpload(userId: string, imageType: string): Promise<boolean> {
    if (!this.client) {
      // Mock response for local development
      return true;
    }

    try {
      const rateLimitData = await this.getRateLimitData(userId);
      const now = Date.now();

      // Check concurrent uploads
      if (rateLimitData.currentConcurrent >= this.config.maxConcurrentUploads) {
        return false;
      }

      // Check hourly rate limit
      const windowStart = now - this.config.windowSeconds * 1000;
      if (rateLimitData.windowStart < windowStart) {
        // Reset window
        rateLimitData.currentWindowUploads = 0;
        rateLimitData.windowStart = now;
      }

      if (rateLimitData.currentWindowUploads >= this.config.maxUploadsPerHour) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Rate limit check error:', error);
      // Allow upload on error to avoid blocking users
      return true;
    }
  }

  /**
   * Record upload attempt
   *
   * @param userId - User ID
   * @param imageType - Type of image
   * @param uploadId - Upload ID
   */
  async recordUpload(
    userId: string,
    imageType: string,
    uploadId: string
  ): Promise<void> {
    if (!this.client) {
      console.log('Mock recordUpload:', { userId, imageType, uploadId });
      return;
    }

    try {
      const now = Date.now();
      const rateLimitData = await this.getRateLimitData(userId);

      // Update rate limit data
      const windowStart = now - this.config.windowSeconds * 1000;
      if (rateLimitData.windowStart < windowStart) {
        rateLimitData.currentWindowUploads = 0;
        rateLimitData.windowStart = now;
      }

      rateLimitData.currentConcurrent += 1;
      rateLimitData.currentWindowUploads += 1;
      rateLimitData.lastUploadTime = now;

      await this.updateRateLimitData(userId, rateLimitData);

      // Record individual upload
      await this.recordIndividualUpload(userId, uploadId, now);
    } catch (error) {
      console.error('Record upload error:', error);
    }
  }

  /**
   * Record upload completion
   *
   * @param userId - User ID
   * @param uploadId - Upload ID
   */
  async recordUploadCompletion(
    userId: string,
    uploadId: string
  ): Promise<void> {
    if (!this.client) {
      console.log('Mock recordUploadCompletion:', { userId, uploadId });
      return;
    }

    try {
      const rateLimitData = await this.getRateLimitData(userId);
      rateLimitData.currentConcurrent = Math.max(
        0,
        rateLimitData.currentConcurrent - 1
      );

      await this.updateRateLimitData(userId, rateLimitData);
      await this.removeIndividualUpload(userId, uploadId);
    } catch (error) {
      console.error('Record upload completion error:', error);
    }
  }

  /**
   * Get rate limit error response
   *
   * @param userId - User ID
   * @returns Rate limit error details
   */
  async getRateLimitError(userId: string): Promise<RateLimitError> {
    const rateLimitData = await this.getRateLimitData(userId);
    const now = Date.now();
    const resetTime = new Date(
      rateLimitData.windowStart + this.config.windowSeconds * 1000
    );

    return {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Upload rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil((resetTime.getTime() - now) / 1000),
      currentLimit: this.config.maxUploadsPerHour,
      resetTime: resetTime.toISOString(),
    };
  }

  /**
   * Get rate limit data for user
   *
   * @param userId - User ID
   * @returns Rate limit data
   */
  private async getRateLimitData(userId: string): Promise<RateLimitData> {
    if (!this.client) {
      return {
        currentConcurrent: 0,
        currentWindowUploads: 0,
        windowStart: Date.now(),
        lastUploadTime: 0,
      };
    }

    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `RATE_LIMIT#${userId}`,
          SK: 'UPLOAD_LIMITS',
        },
      });

      const result = await this.client.send(command);

      if (result.Item) {
        return result.Item as RateLimitData;
      }

      // Return default data
      return {
        currentConcurrent: 0,
        currentWindowUploads: 0,
        windowStart: Date.now(),
        lastUploadTime: 0,
      };
    } catch (error) {
      console.error('Get rate limit data error:', error);
      return {
        currentConcurrent: 0,
        currentWindowUploads: 0,
        windowStart: Date.now(),
        lastUploadTime: 0,
      };
    }
  }

  /**
   * Update rate limit data
   *
   * @param userId - User ID
   * @param data - Rate limit data
   */
  private async updateRateLimitData(
    userId: string,
    data: RateLimitData
  ): Promise<void> {
    if (!this.client) return;

    const command = new PutCommand({
      TableName: this.tableName,
      Item: {
        PK: `RATE_LIMIT#${userId}`,
        SK: 'UPLOAD_LIMITS',
        ...data,
        ttl: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours TTL
      },
    });

    await this.client.send(command);
  }

  /**
   * Record individual upload
   *
   * @param userId - User ID
   * @param uploadId - Upload ID
   * @param timestamp - Upload timestamp
   */
  private async recordIndividualUpload(
    userId: string,
    uploadId: string,
    timestamp: number
  ): Promise<void> {
    if (!this.client) return;

    const command = new PutCommand({
      TableName: this.tableName,
      Item: {
        PK: `RATE_LIMIT#${userId}`,
        SK: `UPLOAD#${uploadId}`,
        uploadId,
        timestamp,
        ttl: Math.floor(timestamp / 1000) + 24 * 60 * 60, // 24 hours TTL
      },
    });

    await this.client.send(command);
  }

  /**
   * Remove individual upload record
   *
   * @param userId - User ID
   * @param uploadId - Upload ID
   */
  private async removeIndividualUpload(
    userId: string,
    uploadId: string
  ): Promise<void> {
    if (!this.client) return;

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: `RATE_LIMIT#${userId}`,
        SK: `UPLOAD#${uploadId}`,
      },
      UpdateExpression: 'SET #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'completed',
      },
    });

    await this.client.send(command);
  }
}
