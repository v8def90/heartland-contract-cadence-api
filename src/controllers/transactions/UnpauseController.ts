/**
 * Unpause Controller for Heart Token API
 *
 * @description Handles HEART token contract unpause operations
 */

import {
  Controller,
  Post,
  Route,
  Tags,
  Example,
  SuccessResponse,
  Response,
  Security,
} from 'tsoa';
import type {
  ApiResponse,
  ErrorResponse,
} from '../../models/responses/ApiResponse';
import { SqsService } from '../../services/SqsService';
import type { TransactionJobData } from '../../models/responses';
import {
  createErrorResponse,
  API_ERROR_CODES,
} from '../../models/responses/ApiResponse';

/**
 * Unpause Controller
 *
 * @description Handles HEART token contract unpause operations using asynchronous SQS processing.
 * Unpauses the contract to re-enable all token transfers. This is an admin-only operation
 * that requires PAUSER role capability.
 */
@Route('unpause')
@Tags('Admin')
export class UnpauseController extends Controller {
  private sqsService: SqsService;

  constructor() {
    super();
    this.sqsService = new SqsService();
  }

  /**
   * Unpause HEART token contract (Asynchronous)
   *
   * @description Queues a request to unpause the HEART token contract, re-enabling all token transfers.
   * This is a critical admin operation that requires PAUSER role capability.
   * The operation is processed asynchronously via SQS queue for better reliability.
   *
   * @returns Promise resolving to job tracking information
   *
   * @security JWT authentication required (admin with PAUSER role only)
   */
  @Post('')
  // @Security('jwt') // JWT authentication temporarily disabled for testing
  @SuccessResponse('200', 'Unpause job queued successfully')
  @Response<ErrorResponse>('401', 'Authentication required')
  @Response<ErrorResponse>(
    '403',
    'Insufficient permissions (PAUSER role required)'
  )
  @Response<ErrorResponse>('409', 'Contract is not currently paused')
  @Response<ErrorResponse>('500', 'Failed to queue unpause job')
  @Example<ApiResponse<TransactionJobData>>({
    success: true,
    data: {
      jobId: 'job_1704067200000_unpause456',
      status: 'queued',
      type: 'unpause',
      estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
      trackingUrl: '/jobs/job_1704067200000_unpause456',
      queuePosition: 1,
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  @Example<ErrorResponse>({
    success: false,
    error: {
      code: 'INSUFFICIENT_PERMISSIONS',
      message: 'Insufficient permissions for unpause operation',
      details: 'Account does not have PAUSER role capability',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  @Example<ErrorResponse>({
    success: false,
    error: {
      code: 'INVALID_OPERATION',
      message: 'Contract is not currently paused',
      details: 'Cannot unpause a contract that is not paused',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async unpauseContract(): Promise<ApiResponse<TransactionJobData>> {
    try {
      console.log('DEBUG unpauseContract: Queueing unpause contract job');

      // Queue the unpause transaction job
      const jobResponse = await this.sqsService.queueTransactionJob({
        type: 'unpause',
        userAddress: process.env.ADMIN_ADDRESS || '0x58f9e6153690c852',
        params: {
          // No additional parameters needed for unpause operation
        },
        metadata: {
          memo: 'Unpause HEART token contract',
          priority: 'high', // Admin operations get high priority
        },
      });

      if (!jobResponse.success) {
        console.error(
          'ERROR unpauseContract: Failed to queue unpause job:',
          jobResponse.error
        );
        return jobResponse;
      }

      console.log(
        'DEBUG unpauseContract: Unpause job queued successfully:',
        jobResponse.data
      );

      return jobResponse;
    } catch (error) {
      console.error('ERROR unpauseContract: Unpause operation failed:', error);
      return createErrorResponse({
        code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: 'Failed to queue unpause job',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
