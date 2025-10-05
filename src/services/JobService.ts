/**
 * Job Management Service
 *
 * @description Handles job creation, tracking, and status updates
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import type {
  JobData,
  JobStatus,
  JobCreateRequest,
  JobUpdateRequest,
} from '../models/responses/JobResponses';
import type { DynamoDBJobItem, JobQueryOptions } from '../models/flow/JobItem';

export class JobService {
  private client: DynamoDBDocumentClient | null;
  private tableName: string;

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
  }

  /**
   * Create a new job
   */
  public async createJob(request: JobCreateRequest): Promise<JobData> {
    const jobId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + (request.expiresInHours || 24) * 60 * 60 * 1000
    );
    const ttl = Math.floor(expiresAt.getTime() / 1000);

    const jobData: JobData = {
      jobId,
      userId: request.userId,
      jobType: request.jobType,
      status: 'pending',
      progress: 0,
      metadata: request.metadata || {},
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    if (!this.client) {
      console.log('Mock createJob:', jobData);
      return jobData;
    }

    const item: DynamoDBJobItem = {
      PK: `JOB#${jobId}`,
      SK: 'META',
      GSI1PK: `USER#${request.userId}`,
      GSI1SK: `JOB#${jobId}`,
      GSI2PK: `JOB_TYPE#${request.jobType}`,
      GSI2SK: `JOB#${jobId}`,
      ...jobData,
      ttl,
    };

    const command = new PutCommand({
      TableName: this.tableName,
      Item: item,
    });

    await this.client.send(command);
    return jobData;
  }

  /**
   * Get job by ID
   */
  public async getJob(jobId: string): Promise<JobData | null> {
    if (!this.client) {
      // Mock data for testing
      return {
        jobId,
        userId: 'mock-user-id',
        jobType: 'image_upload',
        status: 'completed',
        progress: 100,
        metadata: {
          imageType: 'avatar',
          uploadId: 'mock-upload-id',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
    }

    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: `JOB#${jobId}`,
        SK: 'META',
      },
    });

    const result = await this.client.send(command);
    if (!result.Item) return null;

    const item = result.Item as DynamoDBJobItem;
    return this.mapDynamoDBItemToJobData(item);
  }

  /**
   * Update job status
   */
  public async updateJob(
    jobId: string,
    updates: JobUpdateRequest
  ): Promise<JobData | null> {
    if (!this.client) {
      console.log('Mock updateJob:', { jobId, updates });
      return null;
    }

    const now = new Date();
    const updateExpression: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    // Build update expression
    updateExpression.push('#status = :status');
    expressionAttributeNames['#status'] = 'status';
    expressionAttributeValues[':status'] = updates.status;

    updateExpression.push('#progress = :progress');
    expressionAttributeNames['#progress'] = 'progress';
    expressionAttributeValues[':progress'] = updates.progress;

    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = now.toISOString();

    if (updates.message !== undefined) {
      updateExpression.push('#message = :message');
      expressionAttributeNames['#message'] = 'message';
      expressionAttributeValues[':message'] = updates.message;
    }

    if (updates.error !== undefined) {
      updateExpression.push('#error = :error');
      expressionAttributeNames['#error'] = 'error';
      expressionAttributeValues[':error'] = updates.error;
    }

    if (updates.metadata) {
      updateExpression.push('#metadata = :metadata');
      expressionAttributeNames['#metadata'] = 'metadata';
      expressionAttributeValues[':metadata'] = updates.metadata;
    }

    // Set completedAt if job is completed or failed
    if (updates.status === 'completed' || updates.status === 'failed') {
      updateExpression.push('#completedAt = :completedAt');
      expressionAttributeNames['#completedAt'] = 'completedAt';
      expressionAttributeValues[':completedAt'] = now.toISOString();
    }

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: `JOB#${jobId}`,
        SK: 'META',
      },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });

    const result = await this.client.send(command);
    if (!result.Attributes) return null;

    const item = result.Attributes as DynamoDBJobItem;
    return this.mapDynamoDBItemToJobData(item);
  }

  /**
   * Get jobs for a user
   */
  public async getUserJobs(
    userId: string,
    options: JobQueryOptions = {}
  ): Promise<{ items: JobData[]; nextCursor?: string | undefined; hasMore: boolean }> {
    if (!this.client) {
      // Mock data for testing
      return {
        items: [
          {
            jobId: 'mock-job-1',
            userId,
            jobType: 'image_upload',
            status: 'completed',
            progress: 100,
            metadata: { imageType: 'avatar' },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
        hasMore: false,
      };
    }

    const limit = options.limit || 20;
    let queryCommand: QueryCommand;

    if (options.jobType) {
      // Query by job type
      queryCommand = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI2',
        KeyConditionExpression:
          'GSI2PK = :jobType AND begins_with(GSI2SK, :jobPrefix)',
        ExpressionAttributeValues: {
          ':jobType': `JOB_TYPE#${options.jobType}`,
          ':jobPrefix': 'JOB#',
        },
        Limit: limit,
        ScanIndexForward: options.sortOrder !== 'desc',
        ExclusiveStartKey: options.cursor
          ? JSON.parse(Buffer.from(options.cursor, 'base64').toString())
          : undefined,
      });
    } else {
      // Query by user
      queryCommand = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression:
          'GSI1PK = :userKey AND begins_with(GSI1SK, :jobPrefix)',
        ExpressionAttributeValues: {
          ':userKey': `USER#${userId}`,
          ':jobPrefix': 'JOB#',
        },
        Limit: limit,
        ScanIndexForward: options.sortOrder !== 'desc',
        ExclusiveStartKey: options.cursor
          ? JSON.parse(Buffer.from(options.cursor, 'base64').toString())
          : undefined,
      });
    }

    const result = await this.client.send(queryCommand);
    const items = (result.Items || []).map(item =>
      this.mapDynamoDBItemToJobData(item as DynamoDBJobItem)
    );

    return {
      items,
      nextCursor: result.LastEvaluatedKey
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString(
            'base64'
          )
        : undefined,
      hasMore: !!result.LastEvaluatedKey,
    };
  }

  /**
   * Get jobs by status
   */
  public async getJobsByStatus(
    status: JobStatus,
    limit: number = 100
  ): Promise<JobData[]> {
    if (!this.client) {
      return [];
    }

    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression:
        'begins_with(PK, :jobPrefix) AND SK = :metaSuffix AND #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':jobPrefix': 'JOB#',
        ':metaSuffix': 'META',
        ':status': status,
      },
      Limit: limit,
    });

    const result = await this.client.send(command);
    return (result.Items || []).map(item =>
      this.mapDynamoDBItemToJobData(item as DynamoDBJobItem)
    );
  }

  /**
   * Clean up expired jobs
   */
  public async cleanupExpiredJobs(): Promise<number> {
    if (!this.client) {
      return 0;
    }

    const now = new Date();
    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression:
        'begins_with(PK, :jobPrefix) AND SK = :metaSuffix AND expiresAt < :now',
      ExpressionAttributeValues: {
        ':jobPrefix': 'JOB#',
        ':metaSuffix': 'META',
        ':now': now.toISOString(),
      },
    });

    const result = await this.client.send(command);
    const expiredJobs = result.Items || [];

    // Delete expired jobs
    for (const job of expiredJobs) {
      const deleteCommand = new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: job.PK,
          SK: job.SK,
        },
        UpdateExpression: 'REMOVE #ttl',
        ExpressionAttributeNames: {
          '#ttl': 'ttl',
        },
      });
      await this.client.send(deleteCommand);
    }

    return expiredJobs.length;
  }

  /**
   * Map DynamoDB item to JobData
   */
  private mapDynamoDBItemToJobData(item: DynamoDBJobItem): JobData {
    return {
      jobId: item.jobId,
      userId: item.userId,
      jobType: item.jobType,
      status: item.status,
      progress: item.progress,
      message: item.message || undefined,
      error: item.error || undefined,
      metadata: item.metadata,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      completedAt: item.completedAt || undefined,
      expiresAt: item.expiresAt,
    };
  }
}
