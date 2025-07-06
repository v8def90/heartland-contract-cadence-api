/**
 * Balance Controller for Heart Token API
 *
 * @description Handles balance-related queries for HEART tokens.
 * All endpoints in this controller are read-only operations.
 */

import {
  Controller,
  Get,
  Route,
  Path,
  Query,
  Tags,
  Example,
  SuccessResponse,
  Response,
} from 'tsoa';
import type {
  ApiResponse,
  ErrorResponse,
} from '../../models/responses/ApiResponse';
import type { BalanceData } from '../../models/responses';
import {
  createSuccessResponse,
  createErrorResponse,
  API_ERROR_CODES,
} from '../../models/responses/ApiResponse';
import { isValidFlowAddress, formatHeartAmount } from '../../config/flow';
import { FLOW_CONSTANTS } from '../../config/flow';

/**
 * Balance Controller
 *
 * @description Handles all balance-related API endpoints for the Flow Heart Token contract.
 * Provides functionality for checking individual and batch balances.
 *
 * @route /balance
 * @tags Balance
 */
@Route('balance')
@Tags('Balance')
export class BalanceController extends Controller {
  /**
   * Get batch balance for multiple addresses
   *
   * @description Retrieves HEART token balances for multiple Flow addresses in a single request.
   * Useful for batch operations or dashboard displays.
   *
   * @param addresses - Comma-separated list of Flow addresses
   * @returns Promise resolving to array of balance information
   *
   * @example addresses "0x58f9e6153690c852,0x1234567890abcdef"
   */
  @Get('batch')
  @SuccessResponse('200', 'Batch balance retrieved successfully')
  @Response<ErrorResponse>('400', 'Invalid address format in batch')
  @Response<ErrorResponse>('413', 'Too many addresses requested')
  @Response<ErrorResponse>('500', 'Flow network error')
  @Example<ApiResponse<BalanceData[]>>({
    success: true,
    data: [
      {
        balance: '1000.0',
        address: '0x58f9e6153690c852',
        decimals: 8,
        formatted: '1,000.00 HEART',
      },
      {
        balance: '500.0',
        address: '0x1234567890abcdef',
        decimals: 8,
        formatted: '500.00 HEART',
      },
    ],
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async getBatchBalance(
    @Query() addresses: string
  ): Promise<ApiResponse<BalanceData[]>> {
    try {
      // Debug logging
      console.log(
        'DEBUG getBatchBalance: Raw addresses parameter:',
        JSON.stringify(addresses)
      );
      console.log(
        'DEBUG getBatchBalance: Type of addresses:',
        typeof addresses
      );

      // Validate addresses parameter exists
      if (!addresses) {
        return createErrorResponse({
          code: API_ERROR_CODES.INVALID_ADDRESS,
          message: 'Missing addresses parameter',
          details: 'addresses query parameter is required',
        });
      }

      // Parse addresses - handle both string and array cases
      let addressList: string[];
      if (typeof addresses === 'string') {
        addressList = addresses.split(',').map(addr => addr.trim());
      } else if (Array.isArray(addresses)) {
        addressList = (addresses as string[]).map((addr: string) =>
          String(addr).trim()
        );
      } else {
        return createErrorResponse({
          code: API_ERROR_CODES.INVALID_ADDRESS,
          message: 'Invalid addresses parameter format',
          details: 'addresses must be a comma-separated string',
        });
      }

      console.log(
        'DEBUG getBatchBalance: Parsed address list:',
        JSON.stringify(addressList)
      );

      // Validate batch size
      if (addressList.length === 0) {
        return createErrorResponse({
          code: API_ERROR_CODES.INVALID_ADDRESS,
          message: 'No addresses provided',
          details: 'At least one address must be provided',
        });
      }

      if (addressList.length > 10) {
        return createErrorResponse({
          code: API_ERROR_CODES.INVALID_AMOUNT,
          message: 'Too many addresses requested',
          details: 'Maximum 10 addresses allowed per batch request',
        });
      }

      // Validate each address individually with detailed logging
      const invalidAddresses: string[] = [];
      const validationDetails: Array<{
        address: string;
        length: number;
        isValid: boolean;
      }> = [];

      for (const addr of addressList) {
        const isValid = isValidFlowAddress(addr);
        validationDetails.push({
          address: addr,
          length: addr.length,
          isValid,
        });

        if (!isValid) {
          invalidAddresses.push(addr);
        }
      }

      console.log(
        'DEBUG getBatchBalance: Validation details:',
        JSON.stringify(validationDetails, null, 2)
      );
      console.log(
        'DEBUG getBatchBalance: Invalid addresses:',
        JSON.stringify(invalidAddresses)
      );

      if (invalidAddresses.length > 0) {
        return createErrorResponse({
          code: API_ERROR_CODES.INVALID_ADDRESS,
          message: 'Invalid Flow address format in batch',
          details: `Invalid addresses: ${invalidAddresses.join(', ')}. Each address must be 18 characters long and start with 0x`,
        });
      }

      // Mock implementation for now
      const balances: BalanceData[] = addressList.map(address => {
        const mockBalance = this.getMockBalance(address);
        return {
          balance: mockBalance,
          address,
          decimals: 8,
          formatted: formatHeartAmount(mockBalance),
        };
      });

      console.log(
        'DEBUG getBatchBalance: Successfully processed batch request for',
        addressList.length,
        'addresses'
      );

      return createSuccessResponse<BalanceData[]>(balances);
    } catch (error) {
      console.error('ERROR in getBatchBalance:', error);
      return createErrorResponse({
        code: API_ERROR_CODES.FLOW_SCRIPT_ERROR,
        message: 'Failed to retrieve batch balances',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get HEART token balance for a specific address
   *
   * @description Retrieves the current HEART token balance for the specified Flow address.
   * This operation executes a Flow script and does not require authentication.
   *
   * @param address - Flow blockchain address (0x prefixed hex string)
   * @returns Promise resolving to balance information
   *
   * @example address "0x58f9e6153690c852"
   */
  @Get('{address}')
  @SuccessResponse('200', 'Balance retrieved successfully')
  @Response<ErrorResponse>('400', 'Invalid address format')
  @Response<ErrorResponse>('404', 'Address not found or not set up')
  @Response<ErrorResponse>('500', 'Flow network error')
  @Example<ApiResponse<BalanceData>>({
    success: true,
    data: {
      balance: '1000.0',
      address: '0x58f9e6153690c852',
      decimals: 8,
      formatted: '1,000.00 HEART',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async getBalance(
    @Path() address: string
  ): Promise<ApiResponse<BalanceData>> {
    try {
      // DEBUG: Check if batch requests are coming here
      console.log(
        'DEBUG getBalance: Received address parameter:',
        JSON.stringify(address)
      );

      if (!address || typeof address !== 'string') {
        return createErrorResponse({
          code: API_ERROR_CODES.INVALID_ADDRESS,
          message: 'Address parameter is required',
          details: 'Address must be provided as a string',
        });
      }

      // Check if this is actually a batch request being misrouted
      if (address === 'batch') {
        console.log(
          '⚠️  WARNING: Batch request routed to getBalance function!'
        );
        return createErrorResponse({
          code: API_ERROR_CODES.INVALID_ADDRESS,
          message: 'Batch requests should use /balance/batch endpoint',
          details: 'Use /balance/batch?addresses=addr1,addr2 instead',
        });
      }

      // Validate address format
      if (!isValidFlowAddress(address)) {
        return createErrorResponse({
          code: API_ERROR_CODES.INVALID_ADDRESS,
          message: 'Invalid Flow address format',
          details: 'Address must be 18 characters long and start with 0x',
        });
      }

      // Mock implementation for now - will be replaced with actual Flow integration
      const mockBalance = this.getMockBalance(address);

      return createSuccessResponse<BalanceData>({
        balance: mockBalance,
        address,
        decimals: 8,
        formatted: formatHeartAmount(mockBalance),
      });
    } catch (error) {
      return createErrorResponse({
        code: API_ERROR_CODES.FLOW_SCRIPT_ERROR,
        message: 'Failed to retrieve balance',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Check if an address has a HEART token vault set up
   *
   * @description Checks whether the specified address has a HEART token vault
   * properly configured to receive and hold tokens.
   *
   * @param address - Flow blockchain address to check
   * @returns Promise resolving to setup status
   *
   * @example address "0x58f9e6153690c852"
   */
  @Get('{address}/setup-status')
  @SuccessResponse('200', 'Setup status checked successfully')
  @Response<ErrorResponse>('400', 'Invalid address format')
  @Response<ErrorResponse>('500', 'Flow network error')
  @Example<ApiResponse<{ isSetUp: boolean; hasVault: boolean }>>({
    success: true,
    data: {
      isSetUp: true,
      hasVault: true,
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async getSetupStatus(
    @Path() address: string
  ): Promise<ApiResponse<{ isSetUp: boolean; hasVault: boolean }>> {
    // Validate address format
    if (!isValidFlowAddress(address)) {
      return createErrorResponse({
        code: API_ERROR_CODES.INVALID_ADDRESS,
        message: 'Invalid Flow address format',
        details: 'Address must be 18 characters long and start with 0x',
      });
    }

    try {
      // Mock implementation for now
      const isSetUp = address !== '0x0000000000000000'; // Mock: zero address is not set up
      const hasVault = isSetUp;

      return createSuccessResponse({
        isSetUp,
        hasVault,
      });
    } catch (error) {
      return createErrorResponse({
        code: API_ERROR_CODES.FLOW_SCRIPT_ERROR,
        message: 'Failed to check setup status',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Mock balance generator for testing
   *
   * @description Generates mock balance data for testing purposes.
   * Will be replaced with actual Flow integration.
   *
   * @param address - Flow address
   * @returns Mock balance as string
   */
  private getMockBalance(address: string): string {
    // Generate deterministic mock balance based on address
    const hash = address.slice(2, 10); // Take part of address
    const mockValue = parseInt(hash, 16) % 100000; // Generate value 0-99999
    return (mockValue / 100).toFixed(2); // Convert to decimal with 2 places
  }

  /**
   * Debug endpoint for testing batch address parsing
   *
   * @description Test endpoint to debug address parsing issues
   *
   * @param addresses - Comma-separated list of Flow addresses
   * @returns Debug information
   */
  @Get('debug-batch')
  @SuccessResponse('200', 'Debug information retrieved successfully')
  public async debugBatchAddresses(@Query() addresses: string): Promise<any> {
    console.log('=== DEBUG BATCH ADDRESSES ===');
    console.log('Raw addresses parameter:', JSON.stringify(addresses));
    console.log('Raw addresses type:', typeof addresses);
    console.log('Raw addresses length:', addresses?.length || 'undefined');

    const addressList = addresses.split(',').map(addr => addr.trim());
    console.log('Parsed address list:', JSON.stringify(addressList));

    const validationResults = addressList.map(addr => ({
      address: addr,
      length: addr.length,
      startsWithOx: addr.startsWith('0x'),
      isValid: isValidFlowAddress(addr),
      pattern: FLOW_CONSTANTS.ADDRESS_PATTERN.test(addr),
    }));

    console.log(
      'Validation results:',
      JSON.stringify(validationResults, null, 2)
    );

    return {
      debug: true,
      raw: addresses,
      parsed: addressList,
      validation: validationResults,
      timestamp: new Date().toISOString(),
    };
  }
}
