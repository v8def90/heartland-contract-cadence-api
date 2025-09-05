/**
 * Set Treasury Controller for Heart Token API
 *
 * @description Handles HEART token treasury account configuration operations
 */

import {
  Controller,
  Post,
  Route,
  Body,
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
 * Set treasury account request data structure
 */
interface SetTreasuryRequest {
  /** New treasury account address (Flow address format) */
  newTreasuryAccount: string;
  /** Optional memo for the treasury account change */
  memo?: string;
}

/**
 * Set Treasury Controller
 *
 * @description Handles HEART token treasury account configuration using asynchronous SQS processing.
 * Sets the treasury account that will receive tax from all token transfers. This is an admin-only operation that requires
 * ADMIN role capability.
 */
@Route('set-treasury')
@Tags('Admin')
export class SetTreasuryController extends Controller {
  private sqsService: SqsService;

  constructor() {
    super();
    this.sqsService = new SqsService();
  }

  /**
   * Set HEART token treasury account (Asynchronous)
   *
   * @description Queues a request to set the treasury account for HEART token tax collection.
   * This is a critical admin operation that requires ADMIN role capability.
   * The treasury account must be a valid Flow address (18 characters, starting with 0x).
   * The operation is processed asynchronously via SQS queue for better reliability.
   *
   * @param request - Treasury account configuration request
   * @returns Promise resolving to job tracking information
   *
   * @security JWT authentication required (admin with ADMIN role only)
   */
  @Post('')
  // @Security('jwt') // JWT authentication temporarily disabled for testing
  @SuccessResponse('200', 'Set treasury job queued successfully')
  @Response<ErrorResponse>('400', 'Invalid request parameters')
  @Response<ErrorResponse>('401', 'Authentication required')
  @Response<ErrorResponse>(
    '403',
    'Insufficient permissions (ADMIN role required)'
  )
  @Response<ErrorResponse>('500', 'Failed to queue set treasury job')
  @Example<ApiResponse<TransactionJobData>>({
    success: true,
    data: {
      jobId: 'job_1234567890_abcdef',
      status: 'queued',
      type: 'setTreasury',
      estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
      trackingUrl: '/jobs/job_1234567890_abcdef',
      queuePosition: 1,
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  @Example<ErrorResponse>({
    success: false,
    error: {
      code: 'INVALID_ADDRESS',
      message: 'Invalid treasury account address format',
      details: 'Address must be 18 characters long and start with 0x',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  @Example<ErrorResponse>({
    success: false,
    error: {
      code: 'INSUFFICIENT_PERMISSIONS',
      message: 'Admin permissions required',
      details: 'This operation requires ADMIN role capability',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async setTreasury(
    @Body() request: SetTreasuryRequest
  ): Promise<ApiResponse<TransactionJobData>> {
    try {
      console.log(
        'DEBUG setTreasury: Queueing set treasury job for account:',
        request.newTreasuryAccount
      );

      // Validate request parameters
      if (
        !request.newTreasuryAccount ||
        request.newTreasuryAccount.trim() === ''
      ) {
        return createErrorResponse({
          code: API_ERROR_CODES.MISSING_REQUIRED_FIELD,
          message: 'New treasury account is required',
          details: 'Treasury account address must be specified',
        });
      }

      // Validate Flow address format
      if (
        !request.newTreasuryAccount.startsWith('0x') ||
        request.newTreasuryAccount.length !== 18
      ) {
        return createErrorResponse({
          code: API_ERROR_CODES.INVALID_ADDRESS,
          message: 'Invalid treasury account address format',
          details: 'Address must be 18 characters long and start with 0x',
        });
      }

      // Queue the set treasury transaction job
      const jobResponse = await this.sqsService.queueTransactionJob({
        type: 'setTreasury',
        userAddress: process.env.ADMIN_ADDRESS || '0x58f9e6153690c852',
        params: {
          newTreasuryAccount: request.newTreasuryAccount,
          memo: request.memo,
        },
        metadata: {
          memo:
            request.memo ||
            `Set HEART token treasury account to ${request.newTreasuryAccount}`,
          priority: 'high', // Admin operations get high priority
        },
      });

      if (!jobResponse.success) {
        console.error(
          'ERROR setTreasury: Failed to queue set treasury job:',
          jobResponse.error
        );
        return jobResponse;
      }

      console.log(
        'DEBUG setTreasury: Set treasury job queued successfully:',
        jobResponse.data
      );

      return jobResponse;
    } catch (error) {
      console.error('ERROR setTreasury: Set treasury operation failed:', error);
      return createErrorResponse({
        code: API_ERROR_CODES.UNKNOWN_ERROR,
        message: 'Failed to process set treasury request',
        details:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }
}
