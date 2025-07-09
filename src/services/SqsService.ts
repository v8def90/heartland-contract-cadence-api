/**
 * SQS Service for Transaction Queue Management
 *
 * @description Lightweight service for managing AWS SQS transaction queue operations.
 * Uses SQS message attributes and CloudWatch Logs for job tracking.
 */

import {
  SQSClient,
  SendMessageCommand,
  GetQueueAttributesCommand,
} from '@aws-sdk/client-sqs';
import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import {
  createErrorResponse,
  createSuccessResponse,
  API_ERROR_CODES,
} from '../models/responses/ApiResponse';
import type { ApiResponse } from '../models/responses/ApiResponse';
import type { TransactionJobData, JobStatusData } from '../models/responses';
import type { TransactionJobRequest } from '../models/requests';

/**
 * Job status enumeration
 */
export type JobStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * SQS Service class
 *
 * @description Manages transaction job queueing and lightweight status tracking.
 */
export class SqsService {
  private sqsClient: SQSClient;
  private cloudWatchClient: CloudWatchLogsClient;
  private queueUrl: string;

  constructor() {
    const region = process.env.AWS_REGION || 'ap-northeast-1';
    this.sqsClient = new SQSClient({ region });
    this.cloudWatchClient = new CloudWatchLogsClient({ region });
    this.queueUrl = process.env.TRANSACTION_QUEUE_URL || '';
  }

  /**
   * Queue a transaction job for asynchronous processing
   *
   * @param jobRequest - Transaction job request
   * @returns Promise resolving to job information
   */
  async queueTransactionJob(
    jobRequest: Omit<TransactionJobRequest, 'jobId'>,
  ): Promise<ApiResponse<TransactionJobData>> {
    try {
      // Generate unique job ID
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const fullJobRequest: TransactionJobRequest = {
        ...jobRequest,
        jobId,
      };

      console.log(`[JOB_QUEUED] ${jobId}: Queueing transaction job`, {
        type: jobRequest.type,
        userAddress: jobRequest.userAddress,
        timestamp: new Date().toISOString(),
      });

      // Send message to SQS with extended attributes
      const sqsMessage = {
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(fullJobRequest),
        MessageAttributes: {
          JobId: {
            DataType: 'String',
            StringValue: jobId,
          },
          JobType: {
            DataType: 'String',
            StringValue: jobRequest.type,
          },
          UserAddress: {
            DataType: 'String',
            StringValue: jobRequest.userAddress,
          },
          Priority: {
            DataType: 'String',
            StringValue: jobRequest.metadata?.priority || 'normal',
          },
          CreatedAt: {
            DataType: 'String',
            StringValue: new Date().toISOString(),
          },
          Status: {
            DataType: 'String',
            StringValue: 'queued',
          },
        },
      };

      const result = await this.sqsClient.send(
        new SendMessageCommand(sqsMessage),
      );

      console.log(
        `[JOB_QUEUED] ${jobId}: Job queued successfully with messageId: ${result.MessageId}`,
      );

      const jobData: TransactionJobData = {
        jobId,
        status: 'queued',
        type: jobRequest.type,
        estimatedCompletionTime: this.calculateEstimatedCompletion(),
        trackingUrl: `/jobs/${jobId}`,
        queuePosition: await this.getQueuePosition(),
      };

      return createSuccessResponse<TransactionJobData>(jobData);
    } catch (error) {
      console.error('[JOB_QUEUE_ERROR] Failed to queue job:', error);
      return createErrorResponse({
        code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: 'Failed to queue transaction job',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get job status by job ID (via CloudWatch Logs)
   *
   * @param jobId - Job identifier
   * @returns Promise resolving to job status
   */
  async getJobStatus(jobId: string): Promise<ApiResponse<JobStatusData>> {
    try {
      console.log(`[JOB_STATUS_CHECK] ${jobId}: Retrieving job status`);

      // Search CloudWatch Logs for job events
      const logGroupName = `/aws/lambda/${process.env.AWS_LAMBDA_FUNCTION_NAME || 'heartland-contract-cadence-api'}`;
      const filterPattern = `[timestamp, requestId, level="[JOB_*]", logJobId="${jobId}*"]`;

      const endTime = Date.now();
      const startTime = endTime - 24 * 60 * 60 * 1000; // Last 24 hours

      const logEvents = await this.searchCloudWatchLogs(
        logGroupName,
        filterPattern,
        startTime,
        endTime,
      );

      if (logEvents.length === 0) {
        return createErrorResponse({
          code: API_ERROR_CODES.NOT_FOUND,
          message: 'Job not found',
          details: `Job with ID ${jobId} does not exist or has expired`,
        });
      }

      // Parse job status from log events
      const jobStatus = this.parseJobStatusFromLogs(jobId, logEvents);

      console.log(
        `[JOB_STATUS_CHECK] ${jobId}: Job status retrieved: ${jobStatus.status}`,
      );

      return createSuccessResponse<JobStatusData>(jobStatus);
    } catch (error) {
      console.error(
        `[JOB_STATUS_ERROR] ${jobId}: Failed to retrieve job status:`,
        error,
      );
      return createErrorResponse({
        code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve job status',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Log job status update (to CloudWatch)
   *
   * @param jobId - Job identifier
   * @param status - New status
   * @param details - Additional details
   */
  static logJobStatusUpdate(
    jobId: string,
    status: JobStatus,
    details: Record<string, unknown> = {},
  ): void {
    const logData = {
      jobId,
      status,
      timestamp: new Date().toISOString(),
      ...details,
    };

    console.log(`[JOB_${status.toUpperCase()}] ${jobId}:`, logData);
  }

  /**
   * Search CloudWatch Logs for job events
   *
   * @private
   * @param logGroupName - Log group name
   * @param filterPattern - Filter pattern
   * @param startTime - Start time
   * @param endTime - End time
   * @returns Promise resolving to log events
   */
  private async searchCloudWatchLogs(
    logGroupName: string,
    filterPattern: string,
    startTime: number,
    endTime: number,
  ): Promise<Array<{ timestamp: number; message: string }>> {
    try {
      const command = new FilterLogEventsCommand({
        logGroupName,
        filterPattern,
        startTime,
        endTime,
        limit: 100,
      });

      const result = await this.cloudWatchClient.send(command);

      return (
        result.events?.map(event => ({
          timestamp: event.timestamp ?? 0,
          message: event.message ?? '',
        })) || []
      );
    } catch (error) {
      console.warn('Failed to search CloudWatch logs:', error);
      return [];
    }
  }

  /**
   * Parse job status from CloudWatch log events
   *
   * @private
   * @param jobId - Job identifier
   * @param logEvents - Log events
   * @returns Job status data
   */
  private parseJobStatusFromLogs(
    jobId: string,
    logEvents: Array<{ timestamp: number; message: string }>,
  ): JobStatusData {
    const sortedEvents = logEvents.sort((a, b) => a.timestamp - b.timestamp);
    const logs = sortedEvents.map(event => event.message);

    // Determine current status from latest log event
    const latestEvent = sortedEvents[sortedEvents.length - 1];
    let status: JobStatus = 'queued';

    if (latestEvent?.message.includes('[JOB_PROCESSING]')) {
      status = 'processing';
    } else if (latestEvent?.message.includes('[JOB_COMPLETED]')) {
      status = 'completed';
    } else if (latestEvent?.message.includes('[JOB_FAILED]')) {
      status = 'failed';
    } else if (latestEvent?.message.includes('[JOB_CANCELLED]')) {
      status = 'cancelled';
    }

    // Extract timestamps
    const createdEvent = sortedEvents.find(e =>
      e.message.includes('[JOB_QUEUED]'),
    );
    const startedEvent = sortedEvents.find(e =>
      e.message.includes('[JOB_PROCESSING]'),
    );
    const completedEvent = sortedEvents.find(
      e =>
        e.message.includes('[JOB_COMPLETED]') ||
        e.message.includes('[JOB_FAILED]') ||
        e.message.includes('[JOB_CANCELLED]'),
    );

    // Extract transaction type
    const typeMatch = logs[0]?.match(/"type":"([^"]+)"/);
    const type = typeMatch?.[1] || 'unknown';

    const result: JobStatusData = {
      jobId,
      status,
      type,
      createdAt: createdEvent
        ? new Date(createdEvent.timestamp).toISOString()
        : new Date().toISOString(),
      logs,
      progress: this.calculateProgress(status),
    };

    // Only add optional properties if they exist
    if (startedEvent) {
      result.startedAt = new Date(startedEvent.timestamp).toISOString();
    }

    if (completedEvent) {
      result.completedAt = new Date(completedEvent.timestamp).toISOString();
    }

    return result;
  }

  /**
   * Calculate progress percentage based on status
   *
   * @private
   * @param status - Job status
   * @returns Progress percentage
   */
  private calculateProgress(status: JobStatus): number {
    switch (status) {
    case 'queued':
      return 0;
    case 'processing':
      return 50;
    case 'completed':
      return 100;
    case 'failed':
    case 'cancelled':
      return 0;
    default:
      return 0;
    }
  }

  /**
   * Calculate estimated completion time
   *
   * @private
   * @returns Estimated completion time
   */
  private calculateEstimatedCompletion(): string {
    // Estimate 2-5 minutes for transaction processing
    const estimatedSeconds = 120 + Math.random() * 180;
    const completionTime = new Date(Date.now() + estimatedSeconds * 1000);
    return completionTime.toISOString();
  }

  /**
   * Get current queue position (from SQS attributes)
   *
   * @private
   * @returns Queue position
   */
  private async getQueuePosition(): Promise<number> {
    try {
      const command = new GetQueueAttributesCommand({
        QueueUrl: this.queueUrl,
        AttributeNames: ['ApproximateNumberOfMessages'],
      });

      const result = await this.sqsClient.send(command);
      const queueLength = parseInt(
        result.Attributes?.ApproximateNumberOfMessages || '0',
      );

      return queueLength + 1; // Current position = queue length + 1
    } catch (error) {
      console.warn('Failed to get queue position:', error);
      return Math.floor(Math.random() * 5) + 1; // Fallback
    }
  }
}
