/**
 * Token Management Response Types
 *
 * @description TypeScript interfaces for token management API responses.
 *
 * @author Heart Token API Team
 * @since 1.0.0
 */

/**
 * Token balance data
 *
 * @description Represents a user's HEART token balance.
 */
export interface TokenBalanceData {
  /** User's primary DID */
  primaryDid: string;
  /** Balance as string (8 decimal places precision) */
  balance: string;
  /** Balance as number */
  balanceDecimal: number;
  /** Formatted balance string (e.g., "1,000.00 HEART") */
  formatted: string;
  /** Last update timestamp (ISO 8601) */
  updatedAt: string;
}

/**
 * Token transaction data
 *
 * @description Represents a single HEART token transaction.
 */
export interface TokenTransactionData {
  /** Unique transaction ID */
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
  /** Weight value */
  weight?: number;
  /** Weight evaluation level (1-5) */
  weightLevel?: number;
  /** Message */
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
  /** Sender Flow wallet address (optional) */
  senderAddress?: string;
  /** Receiver Flow wallet address (optional) */
  receiverAddress?: string;
  /** Blockchain registration status (optional) */
  blockchainRegistration?: boolean;
  /** Indicator 1 (optional) */
  indicator1?: string;
  /** Indicator 2 (optional) */
  indicator2?: string;
  /** Indicator 3 (optional) */
  indicator3?: string;
  /** Indicator 4 (optional) */
  indicator4?: string;
  /** Indicator 5 (optional) */
  indicator5?: string;
  /** Indicator 6 (optional) */
  indicator6?: string;
}

/**
 * Transfer result data
 *
 * @description Represents the result of a token transfer operation.
 */
export interface TransferResultData {
  /** Unique transaction ID */
  transactionId: string;
  /** Sender's primary DID */
  primaryDid: string;
  /** Recipient's primary DID */
  recipientDid: string;
  /** Transfer amount as string */
  amount: string;
  /** Tax amount as string (optional) */
  taxAmount?: string;
  /** Net amount (amount - taxAmount) as string */
  netAmount: string;
  /** Weight value */
  weight?: number;
  /** Weight evaluation level (1-5) */
  weightLevel?: number;
  /** Message */
  message: string;
  /** Transaction status */
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  /** Sender's new balance after transfer */
  senderBalance: string;
  /** Recipient's new balance after transfer */
  recipientBalance: string;
  /** Creation timestamp (ISO 8601) */
  createdAt: string;
  /** Completion timestamp (ISO 8601, optional) */
  completedAt?: string;
}

/**
 * Transaction history data
 *
 * @description Represents paginated transaction history.
 */
export interface TransactionHistoryData {
  /** Array of transactions */
  transactions: TokenTransactionData[];
  /** Cursor for next page (format: timestamp#transactionId) */
  cursor?: string;
  /** Whether there are more results */
  hasMore: boolean;
  /** Total count (if available) */
  totalCount?: number;
}
