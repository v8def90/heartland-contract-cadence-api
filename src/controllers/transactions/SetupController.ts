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
import type { AccountSetupData } from '../../models/responses';
import { FlowService } from '../../services/FlowService';

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
 * Provides functionality to initialize HEART token vaults for new accounts.
 *
 * @tags Setup
 */
@Route('/setup')
@Tags('Setup')
export class SetupController extends Controller {
  private flowService: FlowService;

  constructor() {
    super();
    this.flowService = new FlowService();
  }

  /**
   * Set up HEART token vault for an account
   *
   * @description Creates a new HEART token vault for the specified address and sets up
   * the necessary storage and public capabilities. This is required before an account
   * can receive or manage HEART tokens.
   *
   * @param request - Setup request containing the address to configure
   * @returns Promise resolving to setup completion status
   */
  @Post('/account')
  @SuccessResponse('200', 'Account setup completed successfully')
  @Response<ErrorResponse>('400', 'Invalid address format')
  @Response<ErrorResponse>('500', 'Setup transaction failed')
  @Example<ApiResponse<AccountSetupData>>({
    success: true,
    data: {
      address: '0x58f9e6153690c852',
      setupComplete: true,
      vaultPath: '/storage/HeartVault',
      publicPath: '/public/HeartVault',
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
  ): Promise<ApiResponse<AccountSetupData>> {
    try {
      console.log(
        'DEBUG setupAccount: Starting account setup for address:',
        request.address
      );

      // Use FlowService to set up the account
      const flowResponse = await this.flowService.setupAccount(request.address);

      if (!flowResponse.success) {
        console.error(
          'ERROR setupAccount: FlowService returned error:',
          flowResponse.error
        );
        return flowResponse;
      }

      console.log(
        'DEBUG setupAccount: Account setup completed successfully:',
        flowResponse.data
      );

      return flowResponse;
    } catch (error) {
      console.error('ERROR setupAccount: Unexpected error:', error);
      return createErrorResponse({
        code: API_ERROR_CODES.FLOW_TRANSACTION_ERROR,
        message: 'Failed to setup HEART token vault',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
