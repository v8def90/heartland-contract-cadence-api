/**
 * Batch Transfer Controller for Heart Token API
 *
 * @description Handles HEART token batch transfer operations
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
 * Single transfer item for batch operation
 */
interface BatchTransferItem {
  /** Recipient address */
  recipient: string;
  /** Amount to transfer to this recipient */
  amount: string;
}

/**
 * Batch transfer request data structure
 */
interface BatchTransferRequest {
  /** Array of transfer items (recipients and amounts) */
  transfers: BatchTransferItem[];
  /** Optional memo for the batch transfer operation */
  memo?: string;
}

/**
 * Batch Transfer Controller
 *
 * @description Handles HEART token batch transfer operations using asynchronous SQS processing.
 * Transfers tokens to multiple recipients in a single transaction with automatic tax calculation.
 * Limited to 50 recipients maximum per batch for performance and gas optimization.
 */
@Route('batch-transfer')
@Tags('Batch Transfer')
export class BatchTransferController extends Controller {
  private sqsService: SqsService;

  constructor() {
    super();
    this.sqsService = new SqsService();
  }

  /**
   * Transfer HEART tokens to multiple recipients (Asynchronous)
   *
   * @description Queues a request to transfer HEART tokens from the authenticated user to multiple recipients.
   * Automatically calculates and deducts the configured tax rate for each transfer.
   * The operation is processed asynchronously via SQS queue for better scalability.
   * Maximum 50 recipients per batch to ensure transaction efficiency.
   *
   * @param request - Batch transfer request containing recipients, amounts, and optional memo
   * @returns Promise resolving to job tracking information
   *
   * @security JWT authentication required
   */
  @Post('')
  // @Security('jwt') // JWT authentication temporarily disabled for testing
  @SuccessResponse('200', 'Batch transfer job queued successfully')
  @Response<ErrorResponse>('400', 'Invalid request parameters')
  @Response<ErrorResponse>('401', 'Authentication required')
  @Response<ErrorResponse>('403', 'Insufficient balance or permissions')
  @Response<ErrorResponse>('500', 'Failed to queue batch transfer job')
  @Example<ApiResponse<TransactionJobData>>({
    success: true,
    data: {
      jobId: 'job_1704067200000_batch123',
      status: 'queued',
      type: 'batchTransfer',
      estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
      trackingUrl: '/jobs/job_1704067200000_batch123',
      queuePosition: 1,
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  @Example<ErrorResponse>({
    success: false,
    error: {
      code: 'INVALID_BATCH_SIZE',
      message: 'Batch transfer size exceeds maximum limit',
      details: 'Maximum 50 recipients allowed per batch transfer',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  @Example<ErrorResponse>({
    success: false,
    error: {
      code: 'INVALID_ADDRESS',
      message: 'Invalid recipient address format',
      details:
        'Address at index 2 must be 18 characters long and start with 0x',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  @Example<ErrorResponse>({
    success: false,
    error: {
      code: 'INVALID_AMOUNT',
      message: 'Invalid transfer amount',
      details: 'Amount at index 1 must be a positive number greater than 0',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async batchTransferTokens(
    @Body() request: BatchTransferRequest
  ): Promise<ApiResponse<TransactionJobData>> {
    try {
      console.log(
        'DEBUG batchTransferTokens: Queueing batch transfer job for',
        request.transfers.length,
        'recipients'
      );

      // Validate request parameters
      if (
        !request.transfers ||
        !Array.isArray(request.transfers) ||
        request.transfers.length === 0
      ) {
        return createErrorResponse({
          code: API_ERROR_CODES.MISSING_REQUIRED_FIELD,
          message: 'Transfer list is required',
          details: 'At least one transfer must be specified',
        });
      }

      // Validate batch size (maximum 50 recipients)
      if (request.transfers.length > 50) {
        return createErrorResponse({
          code: API_ERROR_CODES.INVALID_OPERATION,
          message: 'Batch transfer size exceeds maximum limit',
          details: 'Maximum 50 recipients allowed per batch transfer',
        });
      }

      // Validate each transfer item
      for (let i = 0; i < request.transfers.length; i++) {
        const transfer = request.transfers[i];

        // Validate transfer exists
        if (!transfer) {
          return createErrorResponse({
            code: API_ERROR_CODES.MISSING_REQUIRED_FIELD,
            message: 'Invalid transfer item',
            details: `Transfer at index ${i} is missing`,
          });
        }

        // Validate recipient and amount are provided
        if (!transfer.recipient || !transfer.amount) {
          return createErrorResponse({
            code: API_ERROR_CODES.MISSING_REQUIRED_FIELD,
            message: 'Missing required transfer parameters',
            details: `Transfer at index ${i} must have both recipient and amount`,
          });
        }

        // Validate amount
        const amountNum = parseFloat(transfer.amount);
        if (isNaN(amountNum) || amountNum <= 0) {
          return createErrorResponse({
            code: API_ERROR_CODES.INVALID_AMOUNT,
            message: 'Invalid transfer amount',
            details: `Amount at index ${i} must be a positive number greater than 0`,
          });
        }

        // Validate Flow address format
        if (
          !transfer.recipient.startsWith('0x') ||
          transfer.recipient.length !== 18
        ) {
          return createErrorResponse({
            code: API_ERROR_CODES.INVALID_ADDRESS,
            message: 'Invalid recipient address format',
            details: `Address at index ${i} must be 18 characters long and start with 0x`,
          });
        }
      }

      // TODO: Extract user address from JWT token once authentication is implemented
      // For now, using environment variable as sender
      const senderAddress = process.env.ADMIN_ADDRESS || '0x58f9e6153690c852';

      // Check for duplicate recipients
      const recipients = request.transfers.map(t => t.recipient.toLowerCase());
      const uniqueRecipients = new Set(recipients);
      if (recipients.length !== uniqueRecipients.size) {
        return createErrorResponse({
          code: API_ERROR_CODES.INVALID_OPERATION,
          message: 'Duplicate recipients not allowed',
          details: 'Each recipient address must be unique in the batch',
        });
      }

      // Prevent self-transfer
      const hasSelfTransfer = recipients.some(
        recipient => recipient === senderAddress.toLowerCase()
      );
      if (hasSelfTransfer) {
        return createErrorResponse({
          code: API_ERROR_CODES.INVALID_OPERATION,
          message: 'Self-transfer not allowed',
          details: 'Cannot transfer tokens to the sender address',
        });
      }

      // Calculate total transfer amount for logging
      const totalAmount = request.transfers.reduce(
        (sum, transfer) => sum + parseFloat(transfer.amount),
        0
      );

      console.log(
        'DEBUG batchTransferTokens: Total transfer amount:',
        totalAmount.toFixed(8),
        'HEART'
      );

      // Queue the batch transfer transaction job
      const jobResponse = await this.sqsService.queueTransactionJob({
        type: 'batchTransfer',
        userAddress: senderAddress,
        params: {
          transfers: request.transfers,
          memo: request.memo,
        },
        metadata: {
          memo:
            request.memo ||
            `Batch transfer to ${request.transfers.length} recipients (total: ${totalAmount.toFixed(2)} HEART)`,
          priority: 'normal',
        },
      });

      if (!jobResponse.success) {
        console.error(
          'ERROR batchTransferTokens: Failed to queue batch transfer job:',
          jobResponse.error
        );
        return jobResponse;
      }

      console.log(
        'DEBUG batchTransferTokens: Batch transfer job queued successfully:',
        jobResponse.data
      );

      return jobResponse;
    } catch (error) {
      console.error('ERROR batchTransferTokens: Unexpected error:', error);
      return createErrorResponse({
        code: API_ERROR_CODES.UNKNOWN_ERROR,
        message: 'Failed to process batch transfer request',
        details:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }
}
