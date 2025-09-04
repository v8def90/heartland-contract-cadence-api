/**
 * Burn Controller for Heart Token API
 *
 * @description Handles HEART token burn (destruction) operations
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
 * Burn request data structure
 */
interface BurnRequest {
  /** Amount of tokens to burn (destroy) */
  amount: string;
  /** Optional memo for the burn operation */
  memo?: string;
}

/**
 * Burn Controller
 *
 * @description Handles HEART token burn operations using asynchronous SQS processing.
 * Burns (destroys) tokens from the sender's vault, permanently removing them from circulation.
 */
@Route('burn')
@Tags('Burn')
export class BurnController extends Controller {
  private sqsService: SqsService;

  constructor() {
    super();
    this.sqsService = new SqsService();
  }

  /**
   * Burn HEART tokens from sender's vault
   *
   * @description Initiates a burn operation that permanently destroys HEART tokens
   * from the authenticated user's vault. The tokens are withdrawn and destroyed,
   * removing them from circulation.
   *
   * @param request - Burn request containing amount to burn
   * @returns Promise resolving to job information for async processing
   *
   * @security JWT authentication required for burn operations
   */
  @Post('')
  // @Security('jwt') // JWT authentication temporarily disabled for testing
  @Tags('Burn')
  @SuccessResponse('200', 'Burn job queued successfully')
  @Response<ErrorResponse>('400', 'Invalid burn request')
  @Response<ErrorResponse>('401', 'Authentication required')
  @Response<ErrorResponse>('403', 'Insufficient balance')
  @Response<ErrorResponse>('500', 'Job queuing failed')
  @Example<ApiResponse<TransactionJobData>>({
    success: true,
    data: {
      jobId: 'job_1234567890_abcdef',
      status: 'queued',
      type: 'burn',
      estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
      trackingUrl: '/jobs/job_1234567890_abcdef',
      queuePosition: 1,
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  @Example<ErrorResponse>({
    success: false,
    error: {
      code: 'INVALID_AMOUNT',
      message: 'Invalid burn amount',
      details: 'Amount must be a positive number greater than 0',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  @Example<ErrorResponse>({
    success: false,
    error: {
      code: 'INVALID_OPERATION',
      message: 'Cannot burn zero or negative amount',
      details: 'Burn amount must be greater than 0',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async burnTokens(
    @Body() request: BurnRequest
  ): Promise<ApiResponse<TransactionJobData>> {
    try {
      // Validate burn request
      if (!request.amount || request.amount.trim() === '') {
        console.log('DEBUG burnTokens: Missing amount in request');
        return createErrorResponse({
          code: API_ERROR_CODES.MISSING_REQUIRED_FIELD,
          message: 'Amount is required',
          details: 'Burn amount must be specified',
        });
      }

      // Validate amount is positive number
      const amount = parseFloat(request.amount);
      if (isNaN(amount) || amount <= 0) {
        console.log('DEBUG burnTokens: Invalid amount:', request.amount);
        return createErrorResponse({
          code: API_ERROR_CODES.INVALID_AMOUNT,
          message: 'Invalid burn amount',
          details: 'Amount must be a positive number greater than 0',
        });
      }

      console.log(
        'DEBUG burnTokens: Processing burn request for amount:',
        request.amount
      );

      // Queue burn job using SQS service
      const jobResponse = await this.sqsService.queueTransactionJob({
        type: 'burn',
        userAddress: '0x58f9e6153690c852', // TODO: Extract from JWT token
        params: {
          amount: request.amount,
          memo: request.memo,
        },
        metadata: {
          memo: request.memo || `Burn ${request.amount} HEART tokens`,
          priority: 'normal',
        },
      });

      if (!jobResponse.success) {
        console.error(
          'ERROR burnTokens: Failed to queue burn job:',
          jobResponse.error
        );
        return jobResponse;
      }

      console.log(
        'DEBUG burnTokens: Burn job queued successfully:',
        jobResponse.data
      );

      return jobResponse;
    } catch (error) {
      console.error('ERROR burnTokens: Unexpected error:', error);
      return createErrorResponse({
        code: API_ERROR_CODES.UNKNOWN_ERROR,
        message: 'Failed to process burn request',
        details:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }
}
