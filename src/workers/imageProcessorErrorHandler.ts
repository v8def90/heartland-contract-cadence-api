/**
 * Image Processor Error Handler
 *
 * @description Enhanced error handling for image processing failures
 * including DLQ retry logic, error categorization, and recovery strategies.
 */

import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import {
  CloudWatchLogsClient,
  PutLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { JobService } from '../services/JobService';

export interface ProcessingError {
  code: string;
  message: string;
  details?: string;
  retryable: boolean;
  category: 'validation' | 'processing' | 'network' | 'system' | 'unknown';
  retryCount?: number;
  maxRetries?: number;
}

export interface ErrorContext {
  userId: string;
  uploadId: string;
  imageType: 'avatar' | 'background';
  originalFileName: string;
  fileSize: number;
  contentType: string;
  s3ObjectKey: string;
  timestamp: string;
}

export class ImageProcessorErrorHandler {
  private sqsClient: SQSClient | null;
  private cloudWatchClient: CloudWatchLogsClient | null;
  private jobService: JobService;
  private dlqUrl: string;
  private logGroupName: string;

  constructor() {
    this.sqsClient =
      process.env.NODE_ENV === 'test'
        ? null
        : new SQSClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });

    this.cloudWatchClient =
      process.env.NODE_ENV === 'test'
        ? null
        : new CloudWatchLogsClient({
            region: process.env.AWS_REGION || 'ap-northeast-1',
          });

    this.jobService = new JobService();
    this.dlqUrl = process.env.IMAGE_PROCESSING_DLQ_URL || '';
    this.logGroupName =
      process.env.CLOUDWATCH_LOG_GROUP ||
      '/aws/lambda/heartland-image-processor';
  }

  /**
   * Handle image processing errors with appropriate categorization and recovery
   */
  public async handleError(
    error: Error,
    context: ErrorContext,
    jobId?: string
  ): Promise<void> {
    const processingError = this.categorizeError(error, context);

    console.error('Image processing error:', {
      error: processingError,
      context,
      jobId,
    });

    // Update job status if jobId is provided
    if (jobId) {
      await this.updateJobStatus(jobId, processingError);
    }

    // Log error to CloudWatch
    await this.logError(processingError, context);

    // Handle retry logic
    if (
      processingError.retryable &&
      processingError.retryCount! < processingError.maxRetries!
    ) {
      await this.scheduleRetry(context, processingError);
    } else {
      await this.handleFinalFailure(processingError, context);
    }
  }

  /**
   * Categorize errors for appropriate handling
   */
  private categorizeError(
    error: Error,
    context: ErrorContext
  ): ProcessingError {
    const errorMessage = error.message.toLowerCase();

    // Validation errors (non-retryable)
    if (
      errorMessage.includes('invalid file') ||
      errorMessage.includes('unsupported format') ||
      errorMessage.includes('corrupted')
    ) {
      return {
        code: 'VALIDATION_ERROR',
        message: 'Invalid or unsupported image file',
        details: error.message,
        retryable: false,
        category: 'validation',
        retryCount: 0,
        maxRetries: 0,
      };
    }

    // File size errors (non-retryable)
    if (
      errorMessage.includes('file too large') ||
      errorMessage.includes('size limit')
    ) {
      return {
        code: 'FILE_SIZE_ERROR',
        message: 'File size exceeds maximum allowed limit',
        details: `File size: ${context.fileSize} bytes`,
        retryable: false,
        category: 'validation',
        retryCount: 0,
        maxRetries: 0,
      };
    }

    // Sharp processing errors (retryable)
    if (
      errorMessage.includes('sharp') ||
      errorMessage.includes('image processing') ||
      errorMessage.includes('resize')
    ) {
      return {
        code: 'PROCESSING_ERROR',
        message: 'Image processing failed',
        details: error.message,
        retryable: true,
        category: 'processing',
        retryCount: 0,
        maxRetries: 3,
      };
    }

    // S3 errors (retryable)
    if (
      errorMessage.includes('s3') ||
      errorMessage.includes('aws') ||
      errorMessage.includes('network')
    ) {
      return {
        code: 'S3_ERROR',
        message: 'S3 operation failed',
        details: error.message,
        retryable: true,
        category: 'network',
        retryCount: 0,
        maxRetries: 5,
      };
    }

    // DynamoDB errors (retryable)
    if (
      errorMessage.includes('dynamodb') ||
      errorMessage.includes('database')
    ) {
      return {
        code: 'DATABASE_ERROR',
        message: 'Database operation failed',
        details: error.message,
        retryable: true,
        category: 'system',
        retryCount: 0,
        maxRetries: 3,
      };
    }

    // Memory errors (retryable with backoff)
    if (
      errorMessage.includes('memory') ||
      errorMessage.includes('out of memory')
    ) {
      return {
        code: 'MEMORY_ERROR',
        message: 'Insufficient memory for image processing',
        details: error.message,
        retryable: true,
        category: 'system',
        retryCount: 0,
        maxRetries: 2,
      };
    }

    // Unknown errors (retryable with caution)
    return {
      code: 'UNKNOWN_ERROR',
      message: 'Unknown error occurred during image processing',
      details: error.message,
      retryable: true,
      category: 'unknown',
      retryCount: 0,
      maxRetries: 2,
    };
  }

  /**
   * Update job status with error information
   */
  private async updateJobStatus(
    jobId: string,
    error: ProcessingError
  ): Promise<void> {
    try {
      await this.jobService.updateJob(jobId, {
        status: error.retryable ? 'pending' : 'failed',
        progress: 0,
        error: error.message,
        message: error.retryable
          ? `Retrying after error: ${error.message}`
          : `Processing failed: ${error.message}`,
      });
    } catch (updateError) {
      console.error('Failed to update job status:', updateError);
    }
  }

  /**
   * Log error to CloudWatch Logs
   */
  private async logError(
    error: ProcessingError,
    context: ErrorContext
  ): Promise<void> {
    if (!this.cloudWatchClient) return;

    try {
      const logEvent = {
        timestamp: Date.now(),
        message: JSON.stringify({
          level: 'ERROR',
          error: error,
          context: context,
          timestamp: new Date().toISOString(),
        }),
      };

      await this.cloudWatchClient.send(
        new PutLogEventsCommand({
          logGroupName: this.logGroupName,
          logStreamName: `error-${new Date().toISOString().split('T')[0]}`,
          logEvents: [logEvent],
        })
      );
    } catch (logError) {
      console.error('Failed to log error to CloudWatch:', logError);
    }
  }

  /**
   * Schedule retry for retryable errors
   */
  private async scheduleRetry(
    context: ErrorContext,
    error: ProcessingError
  ): Promise<void> {
    if (!this.sqsClient || !this.dlqUrl) return;

    try {
      const retryDelay = this.calculateRetryDelay(error.retryCount!);

      const retryMessage = {
        userId: context.userId,
        uploadId: context.uploadId,
        imageType: context.imageType,
        originalFileName: context.originalFileName,
        fileSize: context.fileSize,
        contentType: context.contentType,
        s3ObjectKey: context.s3ObjectKey,
        retryCount: error.retryCount! + 1,
        maxRetries: error.maxRetries!,
        retryAfter: new Date(Date.now() + retryDelay).toISOString(),
      };

      await this.sqsClient.send(
        new SendMessageCommand({
          QueueUrl: this.dlqUrl,
          MessageBody: JSON.stringify(retryMessage),
          DelaySeconds: Math.floor(retryDelay / 1000),
        })
      );

      console.log(`Retry scheduled for ${context.uploadId} in ${retryDelay}ms`);
    } catch (retryError) {
      console.error('Failed to schedule retry:', retryError);
    }
  }

  /**
   * Handle final failure (non-retryable or max retries exceeded)
   */
  private async handleFinalFailure(
    error: ProcessingError,
    context: ErrorContext
  ): Promise<void> {
    console.error(`Final failure for ${context.uploadId}:`, error);

    // Send to DLQ for manual investigation
    if (this.sqsClient && this.dlqUrl) {
      try {
        await this.sqsClient.send(
          new SendMessageCommand({
            QueueUrl: this.dlqUrl,
            MessageBody: JSON.stringify({
              type: 'FINAL_FAILURE',
              error: error,
              context: context,
              timestamp: new Date().toISOString(),
            }),
          })
        );
      } catch (dlqError) {
        console.error('Failed to send to DLQ:', dlqError);
      }
    }

    // Update job status to failed
    // Note: This would need the jobId, which should be passed from the main handler
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(retryCount: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 300000; // 5 minutes
    const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }

  /**
   * Get error statistics for monitoring
   */
  public async getErrorStatistics(): Promise<{
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    errorsByCode: Record<string, number>;
    retryableErrors: number;
    nonRetryableErrors: number;
  }> {
    // This would query CloudWatch Logs or DynamoDB for error statistics
    // For now, return mock data
    return {
      totalErrors: 0,
      errorsByCategory: {},
      errorsByCode: {},
      retryableErrors: 0,
      nonRetryableErrors: 0,
    };
  }
}
