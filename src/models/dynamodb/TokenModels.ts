/**
 * Token Management DynamoDB Item Types
 *
 * @description TypeScript interfaces for Token Balance and Transaction items in DynamoDB.
 * These models are used for storing HEART token balances and transaction history.
 *
 * @author Heart Token API Team
 * @since 1.0.0
 */

/**
 * Token Balance Item
 *
 * @description Represents a user's HEART token balance in DynamoDB.
 * Stored with PK: TOKEN_BALANCE#{primaryDid}, SK: BALANCE
 */
export interface DynamoDBTokenBalanceItem {
  /** Partition Key: TOKEN_BALANCE#{primaryDid} */
  PK: string;
  /** Sort Key: BALANCE */
  SK: string;
  /** User's primary DID (did:plc:...) */
  primaryDid: string;
  /** Balance as string (8 decimal places precision) */
  balance: string;
  /** Balance as number (for search and calculation) */
  balanceDecimal: number;
  /** Last update timestamp (ISO 8601) */
  updatedAt: string;
  /** Creation timestamp (ISO 8601) */
  createdAt: string;
  /** GSI9 Partition Key: TOKEN_BALANCE#ALL (for querying all balances) */
  GSI9PK?: string;
  /** GSI9 Sort Key: {balanceDecimal}#{primaryDid} (for sorting by balance) */
  GSI9SK?: string;
}

/**
 * Token Transaction Item
 *
 * @description Represents a HEART token transaction in DynamoDB.
 * Stored with PK: TOKEN_TX#{primaryDid}, SK: TX#{timestamp}#{transactionId}
 */
export interface DynamoDBTokenTransactionItem {
  /** Partition Key: TOKEN_TX#{primaryDid} */
  PK: string;
  /** Sort Key: TX#{timestamp}#{transactionId} */
  SK: string;
  /** Unique transaction ID (UUID) */
  transactionId: string;
  /** Sender's primary DID */
  primaryDid: string;
  /** Recipient's primary DID */
  recipientDid: string;
  /** Transfer amount as string */
  amount: string;
  /** Transfer amount as number */
  amountDecimal: number;
  /** Tax amount as string (optional) */
  taxAmount?: string;
  /** Tax amount as number (optional) */
  taxAmountDecimal?: number;
  /** Tax rate percentage (optional) */
  taxRate?: number;
  /** Net amount (amount - taxAmount) as string */
  netAmount: string;
  /** Net amount as number */
  netAmountDecimal: number;
  /** Weight value: amount / (balance - amount + 1) */
  weight?: number;
  /** Weight evaluation level (1-5) */
  weightLevel?: number;
  /** Message (required) */
  message: string;
  /** Transaction status */
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  /** Memo/description (optional) */
  memo?: string;
  /** Creation timestamp (ISO 8601) */
  createdAt: string;
  /** Update timestamp (ISO 8601) */
  updatedAt: string;
  /** Completion timestamp (ISO 8601, optional) */
  completedAt?: string;
  /** Failure timestamp (ISO 8601, optional) */
  failedAt?: string;
  /** Error message (optional) */
  errorMessage?: string;
  /** Idempotency key for preventing duplicate transfers */
  idempotencyKey?: string;
  /** Sender Flow wallet address (future use, currently empty) */
  senderAddress?: string;
  /** Receiver Flow wallet address (future use, currently empty) */
  receiverAddress?: string;
  /** Blockchain registration status (future use) */
  blockchainRegistration?: boolean;
  /** Indicator 1 (auxiliary field, future use) */
  indicator1?: string;
  /** Indicator 2 (auxiliary field, future use) */
  indicator2?: string;
  /** Indicator 3 (auxiliary field, future use) */
  indicator3?: string;
  /** Indicator 4 (auxiliary field, future use) */
  indicator4?: string;
  /** Indicator 5 (auxiliary field, future use) */
  indicator5?: string;
  /** Indicator 6 (auxiliary field, future use) */
  indicator6?: string;
  /** GSI10 Partition Key: TOKEN_TX#RECIPIENT#{recipientDid} */
  GSI10PK?: string;
  /** GSI10 Sort Key: TX#{timestamp}#{transactionId} */
  GSI10SK?: string;
  /** GSI11 Partition Key: TOKEN_TX#ALL */
  GSI11PK?: string;
  /** GSI11 Sort Key: TX#{timestamp}#{transactionId} */
  GSI11SK?: string;
  /** GSI12 Partition Key: TOKEN_TX#STATUS#{status} */
  GSI12PK?: string;
  /** GSI12 Sort Key: TX#{timestamp}#{transactionId} */
  GSI12SK?: string;
}
