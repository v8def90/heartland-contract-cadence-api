/**
 * Setup Controller for Heart Token API
 *
 * @description Handles account setup transactions for HEART tokens.
 * Provides functionality to set up HEART token vaults for new accounts.
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
import type {
  ApiResponse,
  ErrorResponse,
} from '../../models/responses/ApiResponse';
import {
  createErrorResponse,
  API_ERROR_CODES,
} from '../../models/responses/ApiResponse';
import type { TransactionJobData } from '../../models/responses';
import { SqsService } from '../../services/SqsService';

/**
 * Setup Account Request
 *
 * @description Request body for setting up a HEART token vault
 */
export interface SetupAccountRequest {
  /** Flow address to set up vault for */
  address: string;
}

/**
 * Setup Controller
 *
 * @description Handles account setup transactions for the Flow Heart Token contract.
 * Provides asynchronous transaction processing via SQS queue.
 *
 * @tags Setup
 */
@Route('/setup')
@Tags('Setup')
export class SetupController extends Controller {
  private sqsService: SqsService;

  constructor() {
    super();
    this.sqsService = new SqsService();
  }

  /**
   * Set up HEART token vault for an account (Asynchronous)
   *
   * @description Queues a request to create a new HEART token vault for the specified address.
   * This operation is processed asynchronously via SQS queue for better scalability.
   * Returns a job ID that can be used to track the transaction progress.
   *
   * @param request - Setup request containing the address to configure
   * @returns Promise resolving to job tracking information
   */
  @Post('/account')
  @SuccessResponse('200', 'Account setup job queued successfully')
  @Response<ErrorResponse>('400', 'Invalid address format')
  @Response<ErrorResponse>('500', 'Failed to queue setup job')
  @Example<ApiResponse<TransactionJobData>>({
    success: true,
    data: {
      jobId: 'job_1704067200000_abc123',
      status: 'queued',
      type: 'setup',
      estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
      trackingUrl: '/jobs/job_1704067200000_abc123',
      queuePosition: 3,
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  @Example<ErrorResponse>({
    success: false,
    error: {
      code: 'INVALID_ADDRESS',
      message: 'Invalid Flow address format',
      details: 'Address must be 18 characters long and start with 0x',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async setupAccount(
    @Body() request: SetupAccountRequest
  ): Promise<ApiResponse<TransactionJobData>> {
    try {
      // Validate address format
      if (!request.address) {
        return createErrorResponse({
          code: API_ERROR_CODES.MISSING_REQUIRED_FIELD,
          message: 'Address is required',
          details: 'Address field must be provided',
        });
      }

      // Check if address is a string
      if (typeof request.address !== 'string') {
        return createErrorResponse({
          code: API_ERROR_CODES.INVALID_ADDRESS,
          message: 'Invalid address format',
          details: 'Address must be a valid string',
        });
      }

      // Basic Flow address format validation (case-insensitive)
      if (
        !request.address.toLowerCase().startsWith('0x') ||
        request.address.length < 3
      ) {
        return createErrorResponse({
          code: API_ERROR_CODES.INVALID_ADDRESS,
          message: 'Invalid Flow address format',
          details: 'Address must start with 0x and be a valid hex string',
        });
      }

      // Validate hex characters (case-insensitive)
      const hexPart = request.address.slice(2);
      if (!/^[0-9a-fA-F]+$/.test(hexPart)) {
        return createErrorResponse({
          code: API_ERROR_CODES.INVALID_ADDRESS,
          message: 'Invalid Flow address format',
          details: 'Address must contain only valid hexadecimal characters',
        });
      }

      // Queue the setup account transaction job
      const jobResponse = await this.sqsService.queueTransactionJob({
        type: 'setup',
        userAddress: request.address,
        params: {
          address: request.address,
        },
        metadata: {
          memo: `Setup HEART vault for ${request.address}`,
          priority: 'normal',
        },
      });

      if (!jobResponse.success) {
        return jobResponse;
      }

      return jobResponse;
    } catch (error) {
      return createErrorResponse({
        code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: 'Failed to queue account setup job',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Set up admin account with minter role (Asynchronous)
   *
   * @description Queues a request to create a Minter resource in the admin account.
   * This operation is processed asynchronously via SQS queue.
   *
   * @returns Promise resolving to job tracking information
   */
  @Post('/admin-minter')
  @SuccessResponse('200', 'Admin minter setup job queued successfully')
  @Response<ErrorResponse>('500', 'Failed to queue setup job')
  @Example<ApiResponse<TransactionJobData>>({
    success: true,
    data: {
      jobId: 'job_1704067200000_def456',
      status: 'queued',
      type: 'setup',
      estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
      trackingUrl: '/jobs/job_1704067200000_def456',
      queuePosition: 1,
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async setupAdminWithMinter(): Promise<
    ApiResponse<TransactionJobData>
  > {
    try {
      console.log(
        'DEBUG setupAdminWithMinter: Queueing admin minter setup job...'
      );

      // Queue the admin minter setup transaction job
      const jobResponse = await this.sqsService.queueTransactionJob({
        type: 'setup',
        userAddress: process.env.ADMIN_ADDRESS || '0x58f9e6153690c852',
        params: {
          setupType: 'adminMinter',
        },
        metadata: {
          memo: 'Setup admin account with minter role',
          priority: 'high',
        },
      });

      if (!jobResponse.success) {
        console.error(
          'ERROR setupAdminWithMinter: Failed to queue job:',
          jobResponse.error
        );
        return jobResponse;
      }

      console.log(
        'DEBUG setupAdminWithMinter: Admin minter setup job queued successfully:',
        jobResponse.data
      );

      return jobResponse;
    } catch (error) {
      console.error('ERROR setupAdminWithMinter: Unexpected error:', error);
      return createErrorResponse({
        code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: 'Failed to queue admin minter setup job',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Set up admin roles (Minter, Pauser, TaxManager) for admin account (Asynchronous)
   *
   * @description Queues a request to create Minter, Pauser, and TaxManager resources.
   * This operation is processed asynchronously via SQS queue.
   *
   * @returns Promise resolving to job tracking information
   */
  @Post('/admin-roles')
  @SuccessResponse('200', 'Admin roles setup job queued successfully')
  @Response<ErrorResponse>('500', 'Failed to queue setup job')
  @Example<ApiResponse<TransactionJobData>>({
    success: true,
    data: {
      jobId: 'job_1704067200000_ghi789',
      status: 'queued',
      type: 'setup',
      estimatedCompletionTime: '2024-01-01T00:05:00.000Z',
      trackingUrl: '/jobs/job_1704067200000_ghi789',
      queuePosition: 2,
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async setupAdminRoles(): Promise<ApiResponse<TransactionJobData>> {
    try {
      console.log('DEBUG setupAdminRoles: Queueing admin roles setup job...');

      // Queue the admin roles setup transaction job
      const jobResponse = await this.sqsService.queueTransactionJob({
        type: 'setup',
        userAddress: process.env.ADMIN_ADDRESS || '0x58f9e6153690c852',
        params: {
          setupType: 'adminRoles',
        },
        metadata: {
          memo: 'Setup admin roles (Minter, Pauser, TaxManager)',
          priority: 'high',
        },
      });

      if (!jobResponse.success) {
        console.error(
          'ERROR setupAdminRoles: Failed to queue job:',
          jobResponse.error
        );
        return jobResponse;
      }

      console.log(
        'DEBUG setupAdminRoles: Admin roles setup job queued successfully:',
        jobResponse.data
      );

      return jobResponse;
    } catch (error) {
      console.error('ERROR setupAdminRoles: Unexpected error:', error);
      return createErrorResponse({
        code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: 'Failed to queue admin roles setup job',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
