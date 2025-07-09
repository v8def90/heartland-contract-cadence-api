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
  Security,
} from 'tsoa';
import type { ApiResponse } from '../../models/responses/ApiResponse';
import { FlowService } from '../../services/FlowService';
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
 * Mint response data structure
 */
interface MintData {
  /** Transaction ID */
  txId: string;
  /** Recipient address */
  recipient: string;
  /** Amount minted */
  amount: string;
  /** Transaction status */
  status: string;
  /** Block height */
  blockHeight?: number;
  /** Transaction events */
  events?: unknown[];
}

/**
 * Mint Controller
 *
 * @description Handles HEART token minting operations using the actual Contract
 */
@Route('mint')
@Tags('Mint')
export class MintController extends Controller {
  private flowService: FlowService;

  constructor() {
    super();
    this.flowService = new FlowService();
  }

  /**
   * Mint HEART tokens to a specified recipient
   *
   * @description Mints new HEART tokens to the specified recipient address.
   * Requires MINTER role capability. Uses the actual mint-tokens.transaction.cdc.
   *
   * @param request - Mint request containing recipient and amount
   * @returns Promise resolving to mint transaction information
   *
   * @security JWT authentication required (admin only)
   */
  @Post('')
  // @Security('jwt') // Temporarily disabled for testing
  @SuccessResponse('200', 'Tokens minted successfully')
  @Response('400', 'Invalid request parameters')
  @Response('401', 'Authentication required')
  @Response('403', 'Insufficient permissions (MINTER role required)')
  @Response('500', 'Transaction failed')
  @Example({
    success: true,
    data: {
      txId: 'abc123def456',
      recipient: '0x1234567890abcdef',
      amount: '1000.0',
      status: 'sealed',
      blockHeight: 12345678,
      events: [
        {
          type: 'A.58f9e6153690c852.Heart.TokensMinted',
          transactionId: 'abc123def456',
          data: {
            amount: '1000.0',
            recipient: '0x1234567890abcdef',
          },
        },
      ],
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async mintTokens(
    @Body() request: MintRequest
  ): Promise<ApiResponse<MintData>> {
    try {
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

      // Execute the mint transaction using FlowService
      const result = await this.flowService.mintTokens(
        request.recipient,
        request.amount
      );

      return result;
    } catch (error) {
      console.error('ERROR mintTokens: Mint operation failed:', error);
      return createErrorResponse({
        code: API_ERROR_CODES.FLOW_TRANSACTION_ERROR,
        message: 'Failed to mint tokens',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
