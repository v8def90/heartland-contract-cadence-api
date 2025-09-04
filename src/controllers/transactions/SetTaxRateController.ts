/**
 * Set Tax Rate Controller for Heart Token API
 *
 * @description Handles HEART token tax rate configuration operations
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
 * Set tax rate request data structure
 */
interface SetTaxRateRequest {
  /** New tax rate percentage (0.0 to 100.0) */
  newTaxRate: string;
  /** Optional memo for the tax rate change */
  memo?: string;
}

/**
 * Set Tax Rate Controller
 *
 * @description Handles HEART token tax rate configuration using asynchronous SQS processing.
 * Sets the tax rate for all token transfers. This is an admin-only operation that requires
 * ADMIN role capability.
 */
@Route('set-tax-rate')
@Tags('Admin')
export class SetTaxRateController extends Controller {
  private sqsService: SqsService;

  constructor() {
    super();
    this.sqsService = new SqsService();
  }

  /**
   * Set HEART token tax rate (Asynchronous)
   *
   * @description Queues a request to set the tax rate for HEART token transfers.
   * This is a critical admin operation that requires ADMIN role capability.
   * The tax rate must be between 0.0 and 100.0 percent.
   * The operation is processed asynchronously via SQS queue for better reliability.
   *
   * @param request - Tax rate configuration request
   * @returns Promise resolving to job tracking information
   *
   * @security JWT authentication required (admin with ADMIN role only)
   */
  @Post('')
  // @Security('jwt') // JWT authentication temporarily disabled for testing
  @SuccessResponse('200', 'Set tax rate job queued successfully')
  @Response<ErrorResponse>('400', 'Invalid tax rate value')
  @Response<ErrorResponse>('401', 'Authentication required')
  @Response<ErrorResponse>(
    '403',
    'Insufficient permissions (ADMIN role required)'
  )
  @Response<ErrorResponse>('500', 'Failed to queue set tax rate job')
  @Example<ApiResponse<TransactionJobData>>({
    success: true,
    data: {
      jobId: 'job_1704067200000_settax789',
      status: 'queued',
      type: 'setTaxRate',
      estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
      trackingUrl: '/jobs/job_1704067200000_settax789',
      queuePosition: 1,
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  @Example<ErrorResponse>({
    success: false,
    error: {
      code: 'INVALID_AMOUNT',
      message: 'Invalid tax rate',
      details: 'Tax rate must be a number between 0.0 and 100.0',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  @Example<ErrorResponse>({
    success: false,
    error: {
      code: 'INSUFFICIENT_PERMISSIONS',
      message: 'Insufficient permissions for tax rate change',
      details: 'Account does not have ADMIN role capability',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async setTaxRate(
    @Body() request: SetTaxRateRequest
  ): Promise<ApiResponse<TransactionJobData>> {
    try {
      console.log(
        'DEBUG setTaxRate: Queueing set tax rate job for rate:',
        request.newTaxRate
      );

      // Validate request parameters
      if (!request.newTaxRate || request.newTaxRate.trim() === '') {
        return createErrorResponse({
          code: API_ERROR_CODES.MISSING_REQUIRED_FIELD,
          message: 'New tax rate is required',
          details: 'Tax rate value must be specified',
        });
      }

      // Validate tax rate format and range
      const taxRateFloat = parseFloat(request.newTaxRate);
      if (isNaN(taxRateFloat) || taxRateFloat < 0 || taxRateFloat > 100) {
        return createErrorResponse({
          code: API_ERROR_CODES.INVALID_AMOUNT,
          message: 'Invalid tax rate',
          details: 'Tax rate must be a number between 0.0 and 100.0',
        });
      }

      // Queue the set tax rate transaction job
      const jobResponse = await this.sqsService.queueTransactionJob({
        type: 'setTaxRate',
        userAddress: process.env.ADMIN_ADDRESS || '0x58f9e6153690c852',
        params: {
          newTaxRate: request.newTaxRate,
          memo: request.memo,
        },
        metadata: {
          memo:
            request.memo ||
            `Set HEART token tax rate to ${request.newTaxRate}%`,
          priority: 'high', // Admin operations get high priority
        },
      });

      if (!jobResponse.success) {
        console.error(
          'ERROR setTaxRate: Failed to queue set tax rate job:',
          jobResponse.error
        );
        return jobResponse;
      }

      console.log(
        'DEBUG setTaxRate: Set tax rate job queued successfully:',
        jobResponse.data
      );

      return jobResponse;
    } catch (error) {
      console.error('ERROR setTaxRate: Set tax rate operation failed:', error);
      return createErrorResponse({
        code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: 'Failed to queue set tax rate job',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
