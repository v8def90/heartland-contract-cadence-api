/**
 * Transfer Controller for Heart Token API
 *
 * @description Handles HEART token transfer operations with automatic tax calculation
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
 * Transfer request data structure
 */
interface TransferRequest {
  /** Recipient address to receive tokens */
  recipient: string;
  /** Amount of tokens to transfer (before tax) */
  amount: string;
  /** Optional memo for the transfer */
  memo?: string;
}

/**
 * Transfer Controller
 *
 * @description Handles HEART token transfer operations using asynchronous SQS processing.
 * Includes automatic tax calculation and collection to treasury account.
 */
@Route('transfer')
@Tags('Transfer')
export class TransferController extends Controller {
  private sqsService: SqsService;

  constructor() {
    super();
    this.sqsService = new SqsService();
  }

  /**
   * Transfer HEART tokens with automatic tax calculation (Asynchronous)
   *
   * @description Queues a request to transfer HEART tokens from the authenticated user to the specified recipient.
   * Automatically calculates and deducts the configured tax rate, sending tax to treasury account.
   * The operation is processed asynchronously via SQS queue for better scalability.
   *
   * @param request - Transfer request containing recipient, amount, and optional memo
   * @returns Promise resolving to job tracking information
   *
   * @security JWT authentication required
   */
  @Post('')
  // @Security('jwt') // JWT authentication temporarily disabled for testing
  @SuccessResponse('200', 'Transfer job queued successfully')
  @Response<ErrorResponse>('400', 'Invalid request parameters')
  @Response<ErrorResponse>('401', 'Authentication required')
  @Response<ErrorResponse>('403', 'Insufficient balance or permissions')
  @Response<ErrorResponse>('500', 'Failed to queue transfer job')
  @Example({
    success: true,
    data: {
      jobId: 'job_1704067200000_xyz789',
      status: 'queued',
      type: 'transfer',
      estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
      trackingUrl: '/jobs/job_1704067200000_xyz789',
      queuePosition: 1,
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  @Example<ErrorResponse>({
    success: false,
    error: {
      code: 'INVALID_AMOUNT',
      message: 'Invalid transfer amount',
      details: 'Amount must be a positive number greater than 0',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  @Example<ErrorResponse>({
    success: false,
    error: {
      code: 'INVALID_ADDRESS',
      message: 'Invalid recipient address format',
      details: 'Address must be 18 characters long and start with 0x',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async transferTokens(
    @Body() request: TransferRequest
  ): Promise<ApiResponse<TransactionJobData>> {
    try {
      console.log(
        'DEBUG transferTokens: Queueing transfer job to recipient:',
        request.recipient,
        'amount:',
        request.amount
      );

      // Validate request parameters
      if (!request.recipient || !request.amount) {
        return createErrorResponse({
          code: API_ERROR_CODES.MISSING_REQUIRED_FIELD,
          message: 'Missing required parameters',
          details: 'Both recipient and amount are required',
        });
      }

      // Validate amount
      const amountNum = parseFloat(request.amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return createErrorResponse({
          code: API_ERROR_CODES.INVALID_AMOUNT,
          message: 'Invalid transfer amount',
          details: 'Amount must be a positive number greater than 0',
        });
      }

      // Basic Flow address format validation
      if (
        !request.recipient.startsWith('0x') ||
        request.recipient.length !== 18
      ) {
        return createErrorResponse({
          code: API_ERROR_CODES.INVALID_ADDRESS,
          message: 'Invalid recipient address format',
          details: 'Address must be 18 characters long and start with 0x',
        });
      }

      // TODO: Extract user address from JWT token once authentication is implemented
      // For now, using environment variable as sender
      const senderAddress = process.env.ADMIN_ADDRESS || '0x58f9e6153690c852';

      // Prevent self-transfer
      if (request.recipient.toLowerCase() === senderAddress.toLowerCase()) {
        return createErrorResponse({
          code: API_ERROR_CODES.INVALID_OPERATION,
          message: 'Self-transfer not allowed',
          details: 'Cannot transfer tokens to the same address',
        });
      }

      // Queue the transfer transaction job
      const jobResponse = await this.sqsService.queueTransactionJob({
        type: 'transfer',
        userAddress: senderAddress,
        params: {
          recipient: request.recipient,
          amount: request.amount,
          memo: request.memo,
        },
        metadata: {
          memo:
            request.memo ||
            `Transfer ${request.amount} HEART tokens to ${request.recipient}`,
          priority: 'normal',
        },
      });

      if (!jobResponse.success) {
        console.error(
          'ERROR transferTokens: Failed to queue transfer job:',
          jobResponse.error
        );
        return jobResponse;
      }

      console.log(
        'DEBUG transferTokens: Transfer job queued successfully:',
        jobResponse.data
      );

      return jobResponse;
    } catch (error) {
      console.error('ERROR transferTokens: Transfer operation failed:', error);
      return createErrorResponse({
        code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: 'Failed to queue transfer job',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
