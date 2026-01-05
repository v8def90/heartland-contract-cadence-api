/**
 * Token Management Controller
 *
 * @description Handles HEART token balance and transaction operations.
 * Provides endpoints for checking balances, transferring tokens, and viewing transaction history.
 *
 * @author Heart Token API Team
 * @since 1.0.0
 */

import {
  Controller,
  Get,
  Post,
  Route,
  Path,
  Query,
  Body,
  Request,
  Security,
  Tags,
  Example,
  SuccessResponse,
  Response,
} from 'tsoa';
import type {
  ApiResponse,
  ErrorResponse,
} from '../../models/responses/ApiResponse';
import type {
  TokenBalanceData,
  TransferResultData,
  TransactionHistoryData,
} from '../../models/responses/TokenResponses';
import type {
  TransferTokenRequest,
  TransactionHistoryQuery,
} from '../../models/requests/TokenRequests';
import {
  createSuccessResponse,
  createErrorResponse,
  API_ERROR_CODES,
} from '../../models/responses/ApiResponse';
import { TokenService } from '../../services/TokenService';

/**
 * Token Controller
 *
 * @description Manages HEART token operations including balance queries,
 * transfers, and transaction history retrieval.
 *
 * @route /tokens
 * @tags Tokens
 */
@Route('tokens')
@Tags('Tokens')
export class TokenController extends Controller {
  private tokenService: TokenService;

  constructor() {
    super();
    this.tokenService = new TokenService();
  }

  /**
   * Get token balance for a user
   *
   * @description Retrieves the HEART token balance for the specified DID.
   * Requires JWT authentication. Users can only view their own balance.
   *
   * @param did - User's primary DID (did:plc:...)
   * @param requestObj - Request object containing authenticated user information
   * @returns Promise resolving to balance data
   *
   * @example did "did:plc:lld5wgybmddzz32guiotcpce"
   */
  @Get('balance/{did}')
  @Security('jwt')
  @SuccessResponse('200', 'Balance retrieved successfully')
  @Response<ErrorResponse>('400', 'Invalid DID format')
  @Response<ErrorResponse>('401', 'Authentication required')
  @Response<ErrorResponse>('403', 'Forbidden - Cannot view other user balance')
  @Response<ErrorResponse>('500', 'Failed to retrieve balance')
  @Example({
    success: true,
    data: {
      primaryDid: 'did:plc:lld5wgybmddzz32guiotcpce',
      balance: '1000.00000000',
      balanceDecimal: 1000.0,
      formatted: '1,000.00 HEART',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async getBalance(
    @Path() did: string,
    @Request() requestObj: any
  ): Promise<ApiResponse<TokenBalanceData>> {
    try {
      // Extract user from JWT token
      const user = requestObj?.user;
      if (!user || !user.id) {
        this.setStatus(401);
        return createErrorResponse({
          code: API_ERROR_CODES.AUTHENTICATION_REQUIRED,
          message: 'Authentication required',
          details: 'Valid JWT token is required to view balance',
        });
      }

      const authenticatedDid = user.id;

      // Validate DID format
      if (!did || did.trim().length === 0) {
        this.setStatus(400);
        return createErrorResponse({
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'DID is required',
          details: 'The did parameter cannot be empty',
        });
      }

      // Validate that authenticated user can only view their own balance
      if (authenticatedDid !== did) {
        this.setStatus(403);
        return createErrorResponse({
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Cannot view other user balance',
          details: `You can only view your own balance. Authenticated user: ${authenticatedDid}, Requested user: ${did}`,
        });
      }

      // Get balance
      const balanceResponse = await this.tokenService.getBalance(did);

      if (!balanceResponse.success) {
        this.setStatus(500);
        return balanceResponse;
      }

      this.setStatus(200);
      return balanceResponse;
    } catch (error) {
      console.error('TokenController.getBalance error:', error);
      this.setStatus(500);
      return createErrorResponse({
        code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve balance',
        details:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }

  /**
   * Transfer HEART tokens
   *
   * @description Transfers HEART tokens from the authenticated user to a recipient.
   * Requires JWT authentication. Automatically calculates tax and updates balances atomically.
   *
   * @param request - Transfer request containing recipient DID, amount, and message
   * @param requestObj - Request object containing authenticated user information
   * @returns Promise resolving to transfer result
   */
  @Post('transfer')
  @Security('jwt')
  @SuccessResponse('200', 'Transfer completed successfully')
  @Response<ErrorResponse>('400', 'Invalid transfer request')
  @Response<ErrorResponse>('401', 'Authentication required')
  @Response<ErrorResponse>('403', 'Insufficient balance')
  @Response<ErrorResponse>('404', 'Recipient not found')
  @Response<ErrorResponse>('500', 'Transfer failed')
  @Example({
    success: true,
    data: {
      transactionId: 'abc123-def456-ghi789',
      primaryDid: 'did:plc:lld5wgybmddzz32guiotcpce',
      recipientDid: 'did:plc:abc123',
      amount: '100.00000000',
      netAmount: '100.00000000',
      message: 'Thank you!',
      status: 'completed',
      senderBalance: '900.00000000',
      recipientBalance: '1100.00000000',
      createdAt: '2024-01-01T00:00:00.000Z',
      completedAt: '2024-01-01T00:00:00.000Z',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async transferTokens(
    @Body() request: TransferTokenRequest,
    @Request() requestObj: any
  ): Promise<ApiResponse<TransferResultData>> {
    try {
      // Extract user from JWT token
      const user = requestObj?.user;
      if (!user || !user.id) {
        this.setStatus(401);
        return createErrorResponse({
          code: API_ERROR_CODES.AUTHENTICATION_REQUIRED,
          message: 'Authentication required',
          details: 'Valid JWT token is required to transfer tokens',
        });
      }

      const senderDid = user.id;

      // Validate request
      if (!request.recipientDid || !request.amount || !request.message) {
        this.setStatus(400);
        return createErrorResponse({
          code: API_ERROR_CODES.MISSING_REQUIRED_FIELD,
          message: 'Missing required fields',
          details: 'recipientDid, amount, and message are required',
        });
      }

      // Validate amount
      const amountNum = parseFloat(request.amount);
      if (isNaN(amountNum) || !isFinite(amountNum) || amountNum <= 0) {
        this.setStatus(400);
        return createErrorResponse({
          code: API_ERROR_CODES.INVALID_AMOUNT,
          message: 'Invalid transfer amount',
          details: 'Amount must be a positive number greater than 0',
        });
      }

      // Prevent self-transfer
      if (senderDid === request.recipientDid) {
        this.setStatus(400);
        return createErrorResponse({
          code: API_ERROR_CODES.INVALID_OPERATION,
          message: 'Self-transfer not allowed',
          details: 'Cannot transfer tokens to yourself',
        });
      }

      // Execute transfer
      const transferResponse = await this.tokenService.transfer({
        senderDid,
        recipientDid: request.recipientDid,
        amount: request.amount,
        message: request.message,
        ...(request.idempotencyKey && {
          idempotencyKey: request.idempotencyKey,
        }),
      });

      if (!transferResponse.success) {
        // Set appropriate status code based on error
        if (
          transferResponse.error.code === API_ERROR_CODES.INSUFFICIENT_BALANCE
        ) {
          this.setStatus(403);
        } else if (transferResponse.error.code === API_ERROR_CODES.NOT_FOUND) {
          this.setStatus(404);
        } else if (
          transferResponse.error.code === API_ERROR_CODES.VALIDATION_ERROR
        ) {
          this.setStatus(400);
        } else {
          this.setStatus(500);
        }
        return transferResponse;
      }

      this.setStatus(200);
      return transferResponse;
    } catch (error) {
      console.error('TokenController.transferTokens error:', error);
      this.setStatus(500);
      return createErrorResponse({
        code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: 'Transfer failed',
        details:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }

  /**
   * Get transaction history (sent transactions)
   *
   * @description Retrieves transaction history for a user as a sender.
   * This endpoint does not require authentication and is publicly accessible.
   * Supports pagination and date filtering.
   *
   * @param did - User's primary DID (did:plc:...)
   * @param query - Query parameters for pagination and filtering
   * @returns Promise resolving to transaction history
   *
   * @example did "did:plc:lld5wgybmddzz32guiotcpce"
   * @example query { "limit": 20, "cursor": "1234567890#abc123" }
   */
  @Get('transactions/{did}')
  @SuccessResponse('200', 'Transaction history retrieved successfully')
  @Response<ErrorResponse>('400', 'Invalid DID format or query parameters')
  @Response<ErrorResponse>('500', 'Failed to retrieve transaction history')
  @Example({
    success: true,
    data: {
      transactions: [
        {
          transactionId: 'abc123-def456-ghi789',
          primaryDid: 'did:plc:lld5wgybmddzz32guiotcpce',
          recipientDid: 'did:plc:abc123...',
          amount: '100.00000000',
          amountDecimal: 100.0,
          netAmount: '100.00000000',
          netAmountDecimal: 100.0,
          message: 'Thank you!',
          status: 'completed',
          senderDisplayName: 'John Doe',
          senderHandle: 'johndoe',
          recipientDisplayName: 'Jane Smith',
          recipientHandle: 'janesmith',
          unit: 'HEART',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          completedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      cursor: '1234567890#abc123',
      hasMore: true,
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async getTransactionHistory(
    @Path() did: string,
    @Query() limit?: number,
    @Query() cursor?: string,
    @Query() startDate?: string,
    @Query() endDate?: string
  ): Promise<ApiResponse<TransactionHistoryData>> {
    try {
      // Validate DID format
      if (!did || did.trim().length === 0) {
        this.setStatus(400);
        return createErrorResponse({
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'DID is required',
          details: 'The did parameter cannot be empty',
        });
      }

      // Validate limit if provided
      if (limit !== undefined) {
        const limitNum = Number(limit);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
          this.setStatus(400);
          return createErrorResponse({
            code: API_ERROR_CODES.VALIDATION_ERROR,
            message: 'Invalid limit parameter',
            details: 'Limit must be between 1 and 100',
          });
        }
      }

      // Get transaction history
      const historyParams: any = {
        did,
        type: 'sender' as const,
      };
      if (limit !== undefined) {
        historyParams.limit = limit;
      }
      if (cursor) {
        historyParams.cursor = cursor;
      }
      if (startDate) {
        historyParams.startDate = startDate;
      }
      if (endDate) {
        historyParams.endDate = endDate;
      }
      const historyResponse =
        await this.tokenService.getTransactionHistory(historyParams);

      if (!historyResponse.success) {
        this.setStatus(500);
        return historyResponse;
      }

      this.setStatus(200);
      return historyResponse;
    } catch (error) {
      console.error('TokenController.getTransactionHistory error:', error);
      this.setStatus(500);
      return createErrorResponse({
        code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve transaction history',
        details:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }

  /**
   * Get received transaction history
   *
   * @description Retrieves transaction history for a user as a recipient.
   * This endpoint does not require authentication and is publicly accessible.
   * Supports pagination and date filtering.
   *
   * @param did - User's primary DID (did:plc:...)
   * @param limit - Maximum number of results to return (default: 20, max: 100)
   * @param cursor - Cursor for pagination (format: timestamp#transactionId)
   * @param startDate - Start date for filtering (ISO 8601 format, UTC)
   * @param endDate - End date for filtering (ISO 8601 format, UTC)
   * @returns Promise resolving to transaction history
   */
  @Get('transactions/received/{did}')
  @SuccessResponse('200', 'Received transaction history retrieved successfully')
  @Response<ErrorResponse>('400', 'Invalid DID format or query parameters')
  @Response<ErrorResponse>('500', 'Failed to retrieve transaction history')
  @Example({
    success: true,
    data: {
      transactions: [
        {
          transactionId: 'abc123-def456-ghi789',
          primaryDid: 'did:plc:sender123...',
          recipientDid: 'did:plc:lld5wgybmddzz32guiotcpce',
          amount: '100.00000000',
          amountDecimal: 100.0,
          netAmount: '100.00000000',
          netAmountDecimal: 100.0,
          message: 'Thank you!',
          status: 'completed',
          senderDisplayName: 'John Doe',
          senderHandle: 'johndoe',
          recipientDisplayName: 'Jane Smith',
          recipientHandle: 'janesmith',
          unit: 'HEART',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          completedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      cursor: '1234567890#abc123',
      hasMore: true,
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async getReceivedTransactionHistory(
    @Path() did: string,
    @Query() limit?: number,
    @Query() cursor?: string,
    @Query() startDate?: string,
    @Query() endDate?: string
  ): Promise<ApiResponse<TransactionHistoryData>> {
    try {
      // Validate DID format
      if (!did || did.trim().length === 0) {
        this.setStatus(400);
        return createErrorResponse({
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'DID is required',
          details: 'The did parameter cannot be empty',
        });
      }

      // Validate limit if provided
      if (limit !== undefined) {
        const limitNum = Number(limit);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
          this.setStatus(400);
          return createErrorResponse({
            code: API_ERROR_CODES.VALIDATION_ERROR,
            message: 'Invalid limit parameter',
            details: 'Limit must be between 1 and 100',
          });
        }
      }

      // Get received transaction history
      const historyParams: any = {
        did,
        type: 'recipient' as const,
      };
      if (limit !== undefined) {
        historyParams.limit = limit;
      }
      if (cursor) {
        historyParams.cursor = cursor;
      }
      if (startDate) {
        historyParams.startDate = startDate;
      }
      if (endDate) {
        historyParams.endDate = endDate;
      }
      const historyResponse =
        await this.tokenService.getTransactionHistory(historyParams);

      if (!historyResponse.success) {
        this.setStatus(500);
        return historyResponse;
      }

      this.setStatus(200);
      return historyResponse;
    } catch (error) {
      console.error(
        'TokenController.getReceivedTransactionHistory error:',
        error
      );
      this.setStatus(500);
      return createErrorResponse({
        code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve received transaction history',
        details:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }

  /**
   * Get transaction history filtered by sender and recipient
   *
   * @description Retrieves transaction history between a specific sender and recipient.
   * This endpoint does not require authentication and is publicly accessible.
   * Supports pagination and date filtering.
   *
   * @param senderDid - Sender's primary DID (did:plc:...)
   * @param recipientDid - Recipient's primary DID (did:plc:...)
   * @param limit - Maximum number of results to return (default: 20, max: 100)
   * @param cursor - Cursor for pagination (base64-encoded LastEvaluatedKey)
   * @param startDate - Start date for filtering (ISO 8601 format, UTC)
   * @param endDate - End date for filtering (ISO 8601 format, UTC)
   * @returns Promise resolving to transaction history
   */
  @Get('transactions/{senderDid}/to/{recipientDid}')
  @SuccessResponse('200', 'Transaction history retrieved successfully')
  @Response<ErrorResponse>('400', 'Invalid DID format or query parameters')
  @Response<ErrorResponse>('500', 'Failed to retrieve transaction history')
  @Example({
    success: true,
    data: {
      transactions: [
        {
          transactionId: 'abc123-def456-ghi789',
          primaryDid: 'did:plc:lld5wgybmddzz32guiotcpce',
          recipientDid: 'did:plc:abc123...',
          amount: '100.00000000',
          amountDecimal: 100.0,
          netAmount: '100.00000000',
          netAmountDecimal: 100.0,
          message: 'Thank you!',
          status: 'completed',
          senderDisplayName: 'John Doe',
          senderHandle: 'johndoe',
          recipientDisplayName: 'Jane Smith',
          recipientHandle: 'janesmith',
          unit: 'HEART',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          completedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      cursor: '1234567890#abc123',
      hasMore: true,
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async getTransactionHistoryBySenderAndRecipient(
    @Path() senderDid: string,
    @Path() recipientDid: string,
    @Query() limit?: number,
    @Query() cursor?: string,
    @Query() startDate?: string,
    @Query() endDate?: string
  ): Promise<ApiResponse<TransactionHistoryData>> {
    try {
      // Validate DID formats
      if (!senderDid || senderDid.trim().length === 0) {
        this.setStatus(400);
        return createErrorResponse({
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'Sender DID is required',
          details: 'The senderDid parameter cannot be empty',
        });
      }

      if (!recipientDid || recipientDid.trim().length === 0) {
        this.setStatus(400);
        return createErrorResponse({
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'Recipient DID is required',
          details: 'The recipientDid parameter cannot be empty',
        });
      }

      // Validate limit if provided
      if (limit !== undefined) {
        const limitNum = Number(limit);
        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
          this.setStatus(400);
          return createErrorResponse({
            code: API_ERROR_CODES.VALIDATION_ERROR,
            message: 'Invalid limit parameter',
            details: 'Limit must be between 1 and 100',
          });
        }
      }

      // Get transaction history filtered by sender and recipient
      const historyParams: any = {
        did: senderDid,
        type: 'sender' as const,
        recipientDid,
      };
      if (limit !== undefined) {
        historyParams.limit = limit;
      }
      if (cursor) {
        historyParams.cursor = cursor;
      }
      if (startDate) {
        historyParams.startDate = startDate;
      }
      if (endDate) {
        historyParams.endDate = endDate;
      }
      const historyResponse =
        await this.tokenService.getTransactionHistory(historyParams);

      if (!historyResponse.success) {
        this.setStatus(500);
        return historyResponse;
      }

      this.setStatus(200);
      return historyResponse;
    } catch (error) {
      console.error(
        'TokenController.getTransactionHistoryBySenderAndRecipient error:',
        error
      );
      this.setStatus(500);
      return createErrorResponse({
        code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve transaction history',
        details:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }
}
