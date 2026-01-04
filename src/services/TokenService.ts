/**
 * Token Management Service
 *
 * @description Service for managing HEART token balances and transactions in DynamoDB.
 * Handles balance management, transfers, and transaction history.
 *
 * @author Heart Token API Team
 * @since 1.0.0
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import type { ApiResponse } from '../models/responses/ApiResponse';
import {
  createSuccessResponse,
  createErrorResponse,
  API_ERROR_CODES,
} from '../models/responses/ApiResponse';
import type {
  TokenBalanceData,
  TokenTransactionData,
  TransferResultData,
  TransactionHistoryData,
} from '../models/responses/TokenResponses';
import type {
  DynamoDBTokenBalanceItem,
  DynamoDBTokenTransactionItem,
} from '../models/dynamodb/TokenModels';
import {
  TOKEN_DECIMAL_PRECISION,
  INITIAL_BALANCE,
  INITIAL_BALANCE_DECIMAL,
  getWeightThresholds,
  getTaxRate,
  formatTokenAmount,
  parseTokenAmount,
} from '../utils/tokenConstants';
import { v4 as uuidv4 } from 'uuid';
import { SnsService } from './SnsService';

/**
 * Transfer parameters
 */
interface TransferParams {
  senderDid: string;
  recipientDid: string;
  amount: string;
  message: string;
  idempotencyKey?: string;
}

/**
 * Transaction history query parameters
 */
interface HistoryParams {
  did: string;
  type: 'sender' | 'recipient';
  limit?: number;
  cursor?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Token Service Class
 */
export class TokenService {
  private client: DynamoDBDocumentClient | null;
  private tableName: string;
  private snsService: SnsService;

  constructor() {
    // Initialize SnsService for user validation
    this.snsService = new SnsService();

    // For local development, skip DynamoDB client initialization
    if (process.env.NODE_ENV === 'development' || !process.env.AWS_REGION) {
      console.log(
        'TokenService: Skipping DynamoDB client initialization for local development'
      );
      this.client = null;
      this.tableName = 'mock-table';
    } else {
      // Only initialize DynamoDB client if AWS credentials are available
      try {
        // Check if AWS credentials are available
        if (!process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_PROFILE) {
          console.log(
            'TokenService: No AWS credentials found, using mock mode'
          );
          this.client = null;
          this.tableName = 'mock-table';
        } else {
          const dynamoClient = new DynamoDBClient({
            region: process.env.AWS_REGION || 'ap-northeast-1',
          });
          this.client = DynamoDBDocumentClient.from(dynamoClient);
          this.tableName =
            process.env.SNS_TABLE_NAME || 'heartland-api-v3-sns-dev';
        }
      } catch (error) {
        console.log(
          'TokenService: Failed to initialize DynamoDB client, using mock mode:',
          error
        );
        this.client = null;
        this.tableName = 'mock-table';
      }
    }
  }

  /**
   * Get token balance for a user
   *
   * @description Retrieves the HEART token balance for a given primaryDid.
   * If the balance record doesn't exist, returns the initial balance (1000 HEART)
   * without creating a record.
   *
   * @param primaryDid - User's primary DID
   * @returns Promise resolving to balance data
   */
  async getBalance(primaryDid: string): Promise<ApiResponse<TokenBalanceData>> {
    try {
      if (!this.client) {
        // Mock mode: return initial balance
        return createSuccessResponse<TokenBalanceData>({
          primaryDid,
          balance: INITIAL_BALANCE,
          balanceDecimal: INITIAL_BALANCE_DECIMAL,
          formatted: `${INITIAL_BALANCE_DECIMAL.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: TOKEN_DECIMAL_PRECISION,
          })} HEART`,
          updatedAt: new Date().toISOString(),
        });
      }

      const command = new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `TOKEN_BALANCE#${primaryDid}`,
          SK: 'BALANCE',
        },
      });

      const response = await this.client.send(command);

      if (!response.Item) {
        // Balance record doesn't exist, return initial balance
        return createSuccessResponse<TokenBalanceData>({
          primaryDid,
          balance: INITIAL_BALANCE,
          balanceDecimal: INITIAL_BALANCE_DECIMAL,
          formatted: `${INITIAL_BALANCE_DECIMAL.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: TOKEN_DECIMAL_PRECISION,
          })} HEART`,
          updatedAt: new Date().toISOString(),
        });
      }

      const balanceItem = response.Item as DynamoDBTokenBalanceItem;
      const balanceDecimal = parseTokenAmount(balanceItem.balance);

      return createSuccessResponse<TokenBalanceData>({
        primaryDid: balanceItem.primaryDid,
        balance: balanceItem.balance,
        balanceDecimal,
        formatted: `${balanceDecimal.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: TOKEN_DECIMAL_PRECISION,
        })} HEART`,
        updatedAt: balanceItem.updatedAt,
      });
    } catch (error) {
      console.error('TokenService.getBalance error:', error);
      return createErrorResponse({
        code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve token balance',
        details:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }

  /**
   * Initialize balance for a new user
   *
   * @description Creates a balance record with the initial balance (1000 HEART)
   * for a new user. Called during account creation.
   *
   * @param primaryDid - User's primary DID
   * @returns Promise resolving to void
   */
  async initializeBalance(primaryDid: string): Promise<void> {
    try {
      if (!this.client) {
        console.log('TokenService.initializeBalance: Mock mode, skipping');
        return;
      }

      const now = new Date().toISOString();
      const balanceItem: DynamoDBTokenBalanceItem = {
        PK: `TOKEN_BALANCE#${primaryDid}`,
        SK: 'BALANCE',
        primaryDid,
        balance: INITIAL_BALANCE,
        balanceDecimal: INITIAL_BALANCE_DECIMAL,
        updatedAt: now,
        createdAt: now,
        GSI9PK: 'TOKEN_BALANCE#ALL',
        GSI9SK: `${INITIAL_BALANCE_DECIMAL}#${primaryDid}`,
      };

      const command = new PutCommand({
        TableName: this.tableName,
        Item: balanceItem,
        ConditionExpression: 'attribute_not_exists(PK)',
      });

      await this.client.send(command);
      console.log(
        `TokenService.initializeBalance: Initialized balance for ${primaryDid}`
      );
    } catch (error) {
      // If the balance already exists, that's okay (idempotent operation)
      if (
        error instanceof Error &&
        error.name === 'ConditionalCheckFailedException'
      ) {
        console.log(
          `TokenService.initializeBalance: Balance already exists for ${primaryDid}`
        );
        return;
      }

      console.error('TokenService.initializeBalance error:', error);
      // Don't throw error - balance initialization failure shouldn't block account creation
      // Log the error for manual intervention
      console.error(
        `TokenService.initializeBalance: Failed to initialize balance for ${primaryDid}. Manual intervention may be required.`
      );
    }
  }

  /**
   * Calculate weight value
   *
   * @description Calculates weight using the formula: amount / (balance - amount + 1)
   *
   * @param amount - Transfer amount
   * @param balance - Current balance
   * @returns Weight value
   */
  calculateWeight(amount: number, balance: number): number {
    if (balance <= 0) {
      return 0;
    }
    const denominator = balance - amount + 1;
    if (denominator <= 0) {
      return amount; // Fallback if denominator is invalid
    }
    return amount / denominator;
  }

  /**
   * Evaluate weight into 5 levels
   *
   * @description Evaluates weight value into 5 levels (1-5) based on thresholds.
   *
   * @param weight - Weight value
   * @returns Weight level (1-5)
   */
  evaluateWeight(weight: number): number {
    const thresholds = getWeightThresholds();

    if (weight < thresholds.threshold1) {
      return 1;
    }
    if (weight < thresholds.threshold2) {
      return 2;
    }
    if (weight < thresholds.threshold3) {
      return 3;
    }
    if (weight < thresholds.threshold4) {
      return 4;
    }
    return 5;
  }

  /**
   * Validate transfer request
   *
   * @description Validates transfer parameters including balance check,
   * recipient existence, and idempotency key.
   *
   * @param params - Transfer parameters
   * @returns Promise resolving to void (throws error if validation fails)
   */
  async validateTransfer(params: TransferParams): Promise<void> {
    // Validate amount
    const amountDecimal = parseTokenAmount(params.amount);
    if (amountDecimal <= 0) {
      throw new Error('Transfer amount must be greater than 0');
    }

    // Validate sender balance
    const balanceResponse = await this.getBalance(params.senderDid);
    if (!balanceResponse.success) {
      throw new Error('Failed to retrieve sender balance');
    }

    const senderBalance = parseTokenAmount(balanceResponse.data.balance);
    const taxRate = getTaxRate();
    const taxAmount = (amountDecimal * taxRate) / 100;
    const totalRequired = amountDecimal + taxAmount;

    if (senderBalance < totalRequired) {
      throw new Error(
        `Insufficient balance. Required: ${formatTokenAmount(
          totalRequired
        )}, Available: ${formatTokenAmount(senderBalance)}`
      );
    }

    // Validate recipient exists (check if user profile exists)
    try {
      const recipientProfile = await this.snsService.getUserProfile(
        params.recipientDid
      );
      if (!recipientProfile) {
        throw new Error('Recipient user not found');
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Recipient user not found'
      ) {
        throw error;
      }
      throw new Error('Failed to validate recipient');
    }

    // Note: idempotencyKeyの重複チェックは、TransactWriteItemsのConditionExpressionで
    // アトミックに実行されます（最終一貫性の問題を回避するため）
    // ここでのチェックは削除しました
  }

  /**
   * Get transaction by idempotency key
   *
   * @description Checks if a transaction with the given idempotency key already exists.
   *
   * @param idempotencyKey - Idempotency key
   * @returns Promise resolving to transaction item or null
   */
  private async getTransactionByIdempotencyKey(
    idempotencyKey: string
  ): Promise<DynamoDBTokenTransactionItem | null> {
    if (!this.client) {
      return null;
    }

    try {
      // Query GSI11 (all transactions) with filter on idempotencyKey
      // Note: This is a query operation with filter, but idempotency keys should be rare
      // For better performance, consider creating a separate index for idempotency keys
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI11',
        KeyConditionExpression: 'GSI11PK = :pk',
        FilterExpression: 'idempotencyKey = :key',
        ExpressionAttributeValues: {
          ':pk': 'TOKEN_TX#ALL',
          ':key': idempotencyKey,
        },
        Limit: 1,
      });

      const response = await this.client.send(command);
      if (response.Items && response.Items.length > 0) {
        return response.Items[0] as DynamoDBTokenTransactionItem;
      }
      return null;
    } catch (error) {
      console.error(
        'TokenService.getTransactionByIdempotencyKey error:',
        error
      );
      return null;
    }
  }

  /**
   * Transfer tokens
   *
   * @description Transfers HEART tokens from sender to recipient using DynamoDB TransactWriteItems
   * for atomic updates. Includes balance updates, transaction history creation, and weight calculation.
   *
   * @param params - Transfer parameters
   * @returns Promise resolving to transfer result
   */
  async transfer(
    params: TransferParams
  ): Promise<ApiResponse<TransferResultData>> {
    try {
      // Validate transfer
      await this.validateTransfer(params);

      if (!this.client) {
        // Mock mode: return success without actual transfer
        const transactionId = uuidv4();
        return createSuccessResponse<TransferResultData>({
          transactionId,
          primaryDid: params.senderDid,
          recipientDid: params.recipientDid,
          amount: params.amount,
          netAmount: params.amount,
          message: params.message,
          status: 'completed',
          senderBalance: INITIAL_BALANCE,
          recipientBalance: INITIAL_BALANCE,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        });
      }

      // Get current balances
      const senderBalanceResponse = await this.getBalance(params.senderDid);
      if (!senderBalanceResponse.success) {
        return createErrorResponse({
          code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: 'Failed to retrieve sender balance',
        });
      }

      const recipientBalanceResponse = await this.getBalance(
        params.recipientDid
      );
      if (!recipientBalanceResponse.success) {
        return createErrorResponse({
          code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: 'Failed to retrieve recipient balance',
        });
      }

      const senderBalance = parseTokenAmount(
        senderBalanceResponse.data.balance
      );
      const recipientBalance = parseTokenAmount(
        recipientBalanceResponse.data.balance
      );
      const amountDecimal = parseTokenAmount(params.amount);
      const taxRate = getTaxRate();
      const taxAmountDecimal = (amountDecimal * taxRate) / 100;
      const netAmountDecimal = amountDecimal - taxAmountDecimal;

      // Calculate weight
      const weight = this.calculateWeight(amountDecimal, senderBalance);
      const weightLevel = this.evaluateWeight(weight);

      // Calculate new balances
      const newSenderBalance = senderBalance - amountDecimal - taxAmountDecimal;
      const newRecipientBalance = recipientBalance + netAmountDecimal;

      // Generate transaction ID
      const transactionId = uuidv4();
      const now = new Date().toISOString();
      const timestamp = Date.now().toString();

      // Create transaction item
      const transactionItem: DynamoDBTokenTransactionItem = {
        PK: `TOKEN_TX#${params.senderDid}`,
        SK: `TX#${timestamp}#${transactionId}`,
        transactionId,
        primaryDid: params.senderDid,
        recipientDid: params.recipientDid,
        amount: formatTokenAmount(amountDecimal),
        amountDecimal,
        taxAmount: formatTokenAmount(taxAmountDecimal),
        taxAmountDecimal,
        taxRate,
        netAmount: formatTokenAmount(netAmountDecimal),
        netAmountDecimal,
        weight,
        weightLevel,
        message: params.message,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
        ...(params.idempotencyKey && { idempotencyKey: params.idempotencyKey }),
        // GSI keys
        GSI10PK: `TOKEN_TX#RECIPIENT#${params.recipientDid}`,
        GSI10SK: `TX#${timestamp}#${transactionId}`,
        GSI11PK: 'TOKEN_TX#ALL',
        GSI11SK: `TX#${timestamp}#${transactionId}`,
        GSI12PK: `TOKEN_TX#STATUS#pending`,
        GSI12SK: `TX#${timestamp}#${transactionId}`,
      };

      // Prepare transaction items for TransactWriteItems
      const transactionItems: any[] = [];

      // 0. Check idempotency key (if provided) - MUST be first operation
      // This ensures atomic duplicate prevention using ConditionExpression
      // PK: IDEMPOTENCY#{senderDid}#{idempotencyKey}
      // This avoids eventual consistency issues with GSI queries
      if (params.idempotencyKey) {
        transactionItems.push({
          Put: {
            TableName: this.tableName,
            Item: {
              PK: `IDEMPOTENCY#${params.senderDid}#${params.idempotencyKey}`,
              SK: 'METADATA',
              transactionId,
              senderDid: params.senderDid,
              recipientDid: params.recipientDid,
              amount: formatTokenAmount(amountDecimal),
              createdAt: now,
            },
            ConditionExpression: 'attribute_not_exists(PK)', // Prevent duplicate idempotencyKey
          },
        });
      }

      // 1. Create transaction record
      transactionItems.push({
        Put: {
          TableName: this.tableName,
          Item: transactionItem,
        },
      });

      // 2. Update sender balance
      const senderBalanceKey = {
        PK: `TOKEN_BALANCE#${params.senderDid}`,
        SK: 'BALANCE',
      };

      // Check if sender balance exists
      const senderBalanceExists = await this.balanceExists(params.senderDid);
      if (senderBalanceExists) {
        transactionItems.push({
          Update: {
            TableName: this.tableName,
            Key: senderBalanceKey,
            UpdateExpression:
              'SET balance = :balance, balanceDecimal = :balanceDecimal, updatedAt = :updatedAt, GSI9SK = :gsi9sk',
            ConditionExpression: 'balanceDecimal >= :required',
            ExpressionAttributeValues: {
              ':balance': formatTokenAmount(newSenderBalance),
              ':balanceDecimal': newSenderBalance,
              ':updatedAt': now,
              ':gsi9sk': `${newSenderBalance}#${params.senderDid}`,
              ':required': amountDecimal + taxAmountDecimal,
            },
          },
        });
      } else {
        // Create sender balance if it doesn't exist
        transactionItems.push({
          Put: {
            TableName: this.tableName,
            Item: {
              ...senderBalanceKey,
              primaryDid: params.senderDid,
              balance: formatTokenAmount(newSenderBalance),
              balanceDecimal: newSenderBalance,
              updatedAt: now,
              createdAt: now,
              GSI9PK: 'TOKEN_BALANCE#ALL',
              GSI9SK: `${newSenderBalance}#${params.senderDid}`,
            },
            ConditionExpression: 'attribute_not_exists(PK)',
          },
        });
      }

      // 3. Update or create recipient balance
      const recipientBalanceKey = {
        PK: `TOKEN_BALANCE#${params.recipientDid}`,
        SK: 'BALANCE',
      };

      const recipientBalanceExists = await this.balanceExists(
        params.recipientDid
      );
      if (recipientBalanceExists) {
        transactionItems.push({
          Update: {
            TableName: this.tableName,
            Key: recipientBalanceKey,
            UpdateExpression:
              'SET balance = :balance, balanceDecimal = :balanceDecimal, updatedAt = :updatedAt, GSI9SK = :gsi9sk',
            ExpressionAttributeValues: {
              ':balance': formatTokenAmount(newRecipientBalance),
              ':balanceDecimal': newRecipientBalance,
              ':updatedAt': now,
              ':gsi9sk': `${newRecipientBalance}#${params.recipientDid}`,
            },
          },
        });
      } else {
        // Create recipient balance if it doesn't exist
        transactionItems.push({
          Put: {
            TableName: this.tableName,
            Item: {
              ...recipientBalanceKey,
              primaryDid: params.recipientDid,
              balance: formatTokenAmount(newRecipientBalance),
              balanceDecimal: newRecipientBalance,
              updatedAt: now,
              createdAt: now,
              GSI9PK: 'TOKEN_BALANCE#ALL',
              GSI9SK: `${newRecipientBalance}#${params.recipientDid}`,
            },
            ConditionExpression: 'attribute_not_exists(PK)',
          },
        });
      }

      // Execute transaction
      const transactCommand = new TransactWriteCommand({
        TransactItems: transactionItems,
      });

      await this.client.send(transactCommand);

      // Update transaction status to completed
      // Update the transaction item status
      const updateCommand = new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `TOKEN_TX#${params.senderDid}`,
          SK: `TX#${timestamp}#${transactionId}`,
        },
        UpdateExpression:
          'SET #status = :status, completedAt = :completedAt, GSI12PK = :gsi12pk, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': 'completed',
          ':completedAt': now,
          ':gsi12pk': `TOKEN_TX#STATUS#completed`,
          ':updatedAt': now,
        },
      });

      await this.client.send(updateCommand);

      return createSuccessResponse<TransferResultData>({
        transactionId,
        primaryDid: params.senderDid,
        recipientDid: params.recipientDid,
        amount: formatTokenAmount(amountDecimal),
        taxAmount: formatTokenAmount(taxAmountDecimal),
        netAmount: formatTokenAmount(netAmountDecimal),
        weight,
        weightLevel,
        message: params.message,
        status: 'completed',
        senderBalance: formatTokenAmount(newSenderBalance),
        recipientBalance: formatTokenAmount(newRecipientBalance),
        createdAt: now,
        completedAt: now,
      });
    } catch (error) {
      console.error('TokenService.transfer error:', error);

      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('Insufficient balance')) {
          return createErrorResponse({
            code: API_ERROR_CODES.INSUFFICIENT_BALANCE,
            message: 'Insufficient balance for transfer',
            details: error.message,
          });
        }

        if (error.message.includes('Recipient user not found')) {
          return createErrorResponse({
            code: API_ERROR_CODES.NOT_FOUND,
            message: 'Recipient user not found',
            details: error.message,
          });
        }

        if (error.message.includes('Duplicate idempotency key')) {
          return createErrorResponse({
            code: API_ERROR_CODES.VALIDATION_ERROR,
            message: 'Duplicate idempotency key',
            details: error.message,
          });
        }

        // Handle DynamoDB transaction errors
        if (error.name === 'TransactionCanceledException') {
          // Check if it's due to idempotency key duplicate
          // CancellationReasons is an array where each element corresponds to a TransactItem
          // The first item (index 0) is our idempotency key check
          const cancellationReasons =
            (error as any).CancellationReasons || [];
          
          // Log for debugging (can be removed in production)
          console.log('TransactionCanceledException CancellationReasons:', JSON.stringify(cancellationReasons, null, 2));

          // Check if the first item (idempotency key check) failed with ConditionalCheckFailed
          // If idempotencyKey was provided and the first item failed, it's a duplicate
          const firstReason = cancellationReasons[0];
          const idempotencyKeyConflict =
            params.idempotencyKey && // Only if idempotencyKey was provided
            firstReason &&
            firstReason.Code === 'ConditionalCheckFailed';

          if (idempotencyKeyConflict) {
            return createErrorResponse({
              code: API_ERROR_CODES.VALIDATION_ERROR,
              message: 'Duplicate idempotency key',
              details:
                'A transaction with this idempotency key already exists',
            });
          }

          return createErrorResponse({
            code: API_ERROR_CODES.TRANSACTION_FAILED,
            message: 'Transaction failed',
            details: 'One or more conditions were not met',
          });
        }
      }

      return createErrorResponse({
        code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: 'Transfer failed',
        details:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }

  /**
   * Check if balance exists
   *
   * @description Checks if a balance record exists for a given primaryDid.
   *
   * @param primaryDid - User's primary DID
   * @returns Promise resolving to boolean
   */
  private async balanceExists(primaryDid: string): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `TOKEN_BALANCE#${primaryDid}`,
          SK: 'BALANCE',
        },
      });

      const response = await this.client.send(command);
      return !!response.Item;
    } catch (error) {
      console.error('TokenService.balanceExists error:', error);
      return false;
    }
  }

  /**
   * Update transaction status
   *
   * @description Updates the status of a transaction and updates GSI12 keys.
   *
   * @param transactionId - Transaction ID
   * @param status - New status
   * @param timestamp - Timestamp
   */
  private async updateTransactionStatus(
    transactionId: string,
    status: 'completed' | 'failed' | 'cancelled',
    timestamp: string
  ): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      // Find transaction by scanning (or use a better method if available)
      // For now, we'll need to update this after we have the transaction record
      // This is a simplified version - in production, you might want to store
      // the transaction PK/SK when creating it
      console.log(
        `TokenService.updateTransactionStatus: Updating transaction ${transactionId} to ${status}`
      );
      // Note: This method needs the PK/SK to update, which we should store
      // For now, this is a placeholder
    } catch (error) {
      console.error('TokenService.updateTransactionStatus error:', error);
    }
  }

  /**
   * Get transaction history
   *
   * @description Retrieves transaction history for a user (as sender or recipient).
   * Supports pagination and date filtering.
   *
   * @param params - History query parameters
   * @returns Promise resolving to transaction history
   */
  async getTransactionHistory(
    params: HistoryParams
  ): Promise<ApiResponse<TransactionHistoryData>> {
    try {
      if (!this.client) {
        // Mock mode: return empty history
        return createSuccessResponse<TransactionHistoryData>({
          transactions: [],
          hasMore: false,
        });
      }

      const limit = Math.min(params.limit || 20, 100); // Default 20, max 100
      const now = new Date().toISOString();

      let command: QueryCommand;
      let indexName: string | undefined;

      if (params.type === 'sender') {
        // Query by sender (PK)
        command = new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
          ExpressionAttributeValues: {
            ':pk': `TOKEN_TX#${params.did}`,
            ':sk': 'TX#',
          },
          ScanIndexForward: false, // Descending order (newest first)
          Limit: limit + 1, // Fetch one extra to check if there are more
        });
      } else {
        // Query by recipient (GSI10)
        indexName = 'GSI10';
        command = new QueryCommand({
          TableName: this.tableName,
          IndexName: indexName,
          KeyConditionExpression: 'GSI10PK = :pk AND begins_with(GSI10SK, :sk)',
          ExpressionAttributeValues: {
            ':pk': `TOKEN_TX#RECIPIENT#${params.did}`,
            ':sk': 'TX#',
          },
          ScanIndexForward: false, // Descending order (newest first)
          Limit: limit + 1, // Fetch one extra to check if there are more
        });
      }

      // Add date filtering if provided
      if (params.startDate || params.endDate) {
        const filterExpressions: string[] = [];
        const expressionAttributeValues: Record<string, any> = {
          ...command.input.ExpressionAttributeValues,
        };

        if (params.startDate) {
          filterExpressions.push('createdAt >= :startDate');
          expressionAttributeValues[':startDate'] = params.startDate;
        }

        if (params.endDate) {
          filterExpressions.push('createdAt <= :endDate');
          expressionAttributeValues[':endDate'] = params.endDate;
        }

        if (filterExpressions.length > 0) {
          command.input.FilterExpression = filterExpressions.join(' AND ');
          command.input.ExpressionAttributeValues = expressionAttributeValues;
        }
      }

      // Handle cursor (pagination)
      // Cursor is base64-encoded JSON of LastEvaluatedKey from previous request
      if (params.cursor) {
        try {
          const decodedCursor = JSON.parse(
            Buffer.from(params.cursor, 'base64').toString('utf-8')
          );
          command.input.ExclusiveStartKey = decodedCursor;
        } catch (error) {
          console.error(
            'TokenService.getTransactionHistory: Invalid cursor format:',
            error
          );
          // If cursor is invalid, ignore it and start from beginning
        }
      }

      const response = await this.client.send(command);
      const items = (response.Items || []) as DynamoDBTokenTransactionItem[];

      // Check if there are more results
      // hasMore should be true if:
      // 1. We fetched more items than the limit (items.length > limit), OR
      // 2. DynamoDB returned a LastEvaluatedKey (indicating more items exist)
      const hasMore =
        items.length > limit || !!response.LastEvaluatedKey;
      const transactions = hasMore && items.length > limit
        ? items.slice(0, limit)
        : items;

      // Generate cursor for next page using LastEvaluatedKey
      // Cursor is base64-encoded JSON of LastEvaluatedKey
      let cursor: string | undefined;
      if (response.LastEvaluatedKey) {
        try {
          cursor = Buffer.from(
            JSON.stringify(response.LastEvaluatedKey)
          ).toString('base64');
        } catch (error) {
          console.error(
            'TokenService.getTransactionHistory: Failed to encode cursor:',
            error
          );
        }
      } else if (hasMore && items.length > limit) {
        // If we have more items but no LastEvaluatedKey, create cursor from last item
        // This can happen when FilterExpression filters out items
        const lastItem = transactions[transactions.length - 1];
        if (lastItem) {
          try {
            const lastKey: any = {
              PK: lastItem.PK,
              SK: lastItem.SK,
            };
            if (indexName === 'GSI10') {
              lastKey.GSI10PK = lastItem.GSI10PK;
              lastKey.GSI10SK = lastItem.GSI10SK;
            }
            cursor = Buffer.from(JSON.stringify(lastKey)).toString('base64');
          } catch (error) {
            console.error(
              'TokenService.getTransactionHistory: Failed to create cursor from last item:',
              error
            );
          }
        }
      }

      // Convert to response format
      const transactionData: TokenTransactionData[] = transactions.map(
        item => ({
          transactionId: item.transactionId,
          primaryDid: item.primaryDid,
          recipientDid: item.recipientDid,
          amount: item.amount,
          amountDecimal: item.amountDecimal,
          ...(item.taxAmount && { taxAmount: item.taxAmount }),
          ...(item.taxAmountDecimal !== undefined && {
            taxAmountDecimal: item.taxAmountDecimal,
          }),
          ...(item.taxRate !== undefined && { taxRate: item.taxRate }),
          netAmount: item.netAmount,
          netAmountDecimal: item.netAmountDecimal,
          ...(item.weight !== undefined && { weight: item.weight }),
          ...(item.weightLevel !== undefined && {
            weightLevel: item.weightLevel,
          }),
          message: item.message,
          status: item.status,
          ...(item.memo && { memo: item.memo }),
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          ...(item.completedAt && { completedAt: item.completedAt }),
          ...(item.failedAt && { failedAt: item.failedAt }),
          ...(item.errorMessage && { errorMessage: item.errorMessage }),
          ...(item.senderAddress && { senderAddress: item.senderAddress }),
          ...(item.receiverAddress && {
            receiverAddress: item.receiverAddress,
          }),
          ...(item.blockchainRegistration !== undefined && {
            blockchainRegistration: item.blockchainRegistration,
          }),
          ...(item.indicator1 && { indicator1: item.indicator1 }),
          ...(item.indicator2 && { indicator2: item.indicator2 }),
          ...(item.indicator3 && { indicator3: item.indicator3 }),
          ...(item.indicator4 && { indicator4: item.indicator4 }),
          ...(item.indicator5 && { indicator5: item.indicator5 }),
          ...(item.indicator6 && { indicator6: item.indicator6 }),
        })
      );

      return createSuccessResponse<TransactionHistoryData>({
        transactions: transactionData,
        ...(cursor && { cursor }),
        hasMore,
      });
    } catch (error) {
      console.error('TokenService.getTransactionHistory error:', error);
      return createErrorResponse({
        code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve transaction history',
        details:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }
}
