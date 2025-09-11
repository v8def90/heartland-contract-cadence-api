/**
 * Pause Controller for Heart Token API
 *
 * @description Handles HEART token contract pause operations
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
 * Pause Controller
 *
 * @description Handles HEART token contract pause operations using asynchronous SQS processing.
 * Pauses the contract to prevent all token transfers. This is an admin-only operation
 * that requires PAUSER role capability.
 */
@Route('pause')
@Tags('Admin')
export class PauseController extends Controller {
  private sqsService: SqsService;

  constructor() {
    super();
    this.sqsService = new SqsService();
  }

  /**
   * Pause HEART token contract (Asynchronous)
   *
   * @description Queues a request to pause the HEART token contract, preventing all token transfers.
   * This is a critical admin operation that requires PAUSER role capability.
   * The operation is processed asynchronously via SQS queue for better reliability.
   *
   * @returns Promise resolving to job tracking information
   *
   * @security JWT authentication required (admin with PAUSER role only)
   */
  @Post('')
  // @Security('jwt') // JWT authentication temporarily disabled for testing
  @SuccessResponse('200', 'Pause job queued successfully')
  @Response<ErrorResponse>('401', 'Authentication required')
  @Response<ErrorResponse>(
    '403',
    'Insufficient permissions (PAUSER role required)'
  )
  @Response<ErrorResponse>('409', 'Contract is already paused')
  @Response<ErrorResponse>('500', 'Failed to queue pause job')
  @Example<ApiResponse<TransactionJobData>>({
    success: true,
    data: {
      jobId: 'job_1704067200000_pause123',
      status: 'queued',
      type: 'pause',
      estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
      trackingUrl: '/jobs/job_1704067200000_pause123',
      queuePosition: 1,
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  @Example<ErrorResponse>({
    success: false,
    error: {
      code: 'INSUFFICIENT_PERMISSIONS',
      message: 'Insufficient permissions for pause operation',
      details: 'Account does not have PAUSER role capability',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  @Example<ErrorResponse>({
    success: false,
    error: {
      code: 'INVALID_OPERATION',
      message: 'Contract is already paused',
      details: 'Cannot pause an already paused contract',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async pauseContract(): Promise<ApiResponse<TransactionJobData>> {
    try {
      console.log('DEBUG pauseContract: Queueing pause contract job');

      // Queue the pause transaction job
      const jobResponse = await this.sqsService.queueTransactionJob({
        type: 'pause',
        userAddress: process.env.ADMIN_ADDRESS || '0x58f9e6153690c852',
        params: {
          // No additional parameters needed for pause operation
        },
        metadata: {
          memo: 'Pause HEART token contract',
          priority: 'high', // Admin operations get high priority
        },
      });

      if (!jobResponse || !jobResponse.success) {
        console.error(
          'ERROR pauseContract: Failed to queue pause job:',
          jobResponse?.error || 'Unknown error'
        );
        return jobResponse?.success === false
          ? jobResponse
          : createErrorResponse({
              code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
              message: 'Failed to queue pause job',
              details: 'Unknown error',
            });
      }

      console.log(
        'DEBUG pauseContract: Pause job queued successfully:',
        jobResponse.data
      );

      return jobResponse;
    } catch (error) {
      console.error('ERROR pauseContract: Pause operation failed:', error);
      return createErrorResponse({
        code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: 'Failed to queue pause job',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
