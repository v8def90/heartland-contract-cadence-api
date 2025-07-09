/**
 * Job Controller for Heart Token API
 *
 * @description Handles job tracking and status queries for asynchronous operations.
 * Provides functionality to track SQS job progress via CloudWatch Logs.
 */

import {
  Controller,
  Get,
  Route,
  Path,
  Tags,
  Example,
  SuccessResponse,
  Response,
} from 'tsoa';
import type {
  ApiResponse,
  ErrorResponse,
} from '../../models/responses/ApiResponse';
import type { JobStatusData } from '../../models/responses';
import { SqsService } from '../../services/SqsService';

/**
 * Job Controller
 *
 * @description Handles job tracking operations for asynchronous transaction processing.
 * Provides endpoints to check job status and progress.
 *
 * @tags Jobs
 */
@Route('/jobs')
@Tags('Jobs')
export class JobController extends Controller {
  private sqsService: SqsService;

  constructor() {
    super();
    this.sqsService = new SqsService();
  }

  /**
   * Get job status by job ID
   *
   * @description Retrieves the current status and progress of a transaction job.
   * Jobs are tracked via CloudWatch Logs and SQS message attributes.
   *
   * @param jobId - Job identifier returned from transaction endpoints
   * @returns Promise resolving to job status information
   */
  @Get('/{jobId}')
  @SuccessResponse('200', 'Job status retrieved successfully')
  @Response<ErrorResponse>('404', 'Job not found')
  @Response<ErrorResponse>('500', 'Failed to retrieve job status')
  @Example<ApiResponse<JobStatusData>>({
    success: true,
    data: {
      jobId: 'job_1704067200000_abc123',
      status: 'completed',
      type: 'mint',
      progress: 100,
      createdAt: '2024-01-01T00:00:00.000Z',
      startedAt: '2024-01-01T00:01:00.000Z',
      completedAt: '2024-01-01T00:05:00.000Z',
      result: {
        txId: 'f1a2b3c4d5e6f7g8h9i0',
        blockHeight: 12345678,
        status: 'sealed',
      },
    },
    timestamp: '2024-01-01T00:05:00.000Z',
  })
  @Example<ErrorResponse>({
    success: false,
    error: {
      code: 'JOB_NOT_FOUND',
      message: 'Job not found',
      details:
        'Job with ID job_1704067200000_abc123 does not exist or has expired',
    },
    timestamp: '2024-01-01T00:05:00.000Z',
  })
  public async getJobStatus(
    @Path() jobId: string,
  ): Promise<ApiResponse<JobStatusData>> {
    console.log(`DEBUG getJobStatus: Retrieving status for job: ${jobId}`);

    const result = await this.sqsService.getJobStatus(jobId);

    if (result.success) {
      console.log(
        `DEBUG getJobStatus: Job status retrieved successfully: ${result.data.status}`,
      );
    } else {
      console.log(
        `DEBUG getJobStatus: Failed to retrieve job status: ${result.error?.message}`,
      );
    }

    return result;
  }
}
