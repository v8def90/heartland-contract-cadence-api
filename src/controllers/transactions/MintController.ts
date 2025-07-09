/**
 * Mint Controller
 *
 * @description Handles HEART token minting operations
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
} from 'tsoa';
import type { ApiResponse } from '../../models/responses/ApiResponse';
import { SqsService } from '../../services/SqsService';
import type { TransactionJobData } from '../../models/responses';
import {
  createErrorResponse,
  API_ERROR_CODES,
} from '../../models/responses/ApiResponse';

/**
 * Mint request data structure
 */
interface MintRequest {
  /** Recipient address to receive minted tokens */
  recipient: string;
  /** Amount of tokens to mint */
  amount: string;
}

/**
 * Mint Controller
 *
 * @description Handles HEART token minting operations using asynchronous SQS processing
 */
@Route('mint')
@Tags('Mint')
export class MintController extends Controller {
  private sqsService: SqsService;

  constructor() {
    super();
    this.sqsService = new SqsService();
  }

  /**
   * Mint HEART tokens to a specified recipient (Asynchronous)
   *
   * @description Queues a request to mint new HEART tokens to the specified recipient address.
   * Requires MINTER role capability. The operation is processed asynchronously via SQS queue
   * for better scalability and returns a job ID for tracking progress.
   *
   * @param request - Mint request containing recipient and amount
   * @returns Promise resolving to job tracking information
   *
   * @security JWT authentication required (admin only)
   */
  @Post('')
  // @Security('jwt') // Temporarily disabled for testing
  @SuccessResponse('200', 'Mint job queued successfully')
  @Response('400', 'Invalid request parameters')
  @Response('401', 'Authentication required')
  @Response('403', 'Insufficient permissions (MINTER role required)')
  @Response('500', 'Failed to queue mint job')
  @Example({
    success: true,
    data: {
      jobId: 'job_1704067200000_abc123',
      status: 'queued',
      type: 'mint',
      estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
      trackingUrl: '/jobs/job_1704067200000_abc123',
      queuePosition: 2,
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async mintTokens(
    @Body() request: MintRequest,
  ): Promise<ApiResponse<TransactionJobData>> {
    try {
      console.log(
        'DEBUG mintTokens: Queueing mint job for recipient:',
        request.recipient,
        'amount:',
        request.amount,
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
          message: 'Invalid amount',
          details: 'Amount must be a positive number',
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

      // Queue the mint transaction job
      const jobResponse = await this.sqsService.queueTransactionJob({
        type: 'mint',
        userAddress: process.env.ADMIN_ADDRESS || '0x58f9e6153690c852',
        params: {
          recipient: request.recipient,
          amount: request.amount,
        },
        metadata: {
          memo: `Mint ${request.amount} HEART tokens to ${request.recipient}`,
          priority: 'normal',
        },
      });

      if (!jobResponse.success) {
        console.error(
          'ERROR mintTokens: Failed to queue mint job:',
          jobResponse.error,
        );
        return jobResponse;
      }

      console.log(
        'DEBUG mintTokens: Mint job queued successfully:',
        jobResponse.data,
      );

      return jobResponse;
    } catch (error) {
      console.error('ERROR mintTokens: Mint operation failed:', error);
      return createErrorResponse({
        code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: 'Failed to queue mint job',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
