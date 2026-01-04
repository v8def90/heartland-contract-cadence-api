/**
 * Token Management Request Types
 *
 * @description TypeScript interfaces for token management API requests.
 *
 * @author Heart Token API Team
 * @since 1.0.0
 */

/**
 * Transfer token request
 *
 * @description Request to transfer HEART tokens to a recipient.
 *
 * @example
 * ```typescript
 * const request: TransferTokenRequest = {
 *   recipientDid: "did:plc:abc123...",
 *   amount: "100.00000000",
 *   message: "Thank you!"
 * };
 * ```
 */
export interface TransferTokenRequest {
  /** Recipient's primary DID */
  recipientDid: string;
  /** Amount to transfer (string with 8 decimal places precision) */
  amount: string;
  /** Message (required) */
  message: string;
  /** Idempotency key for preventing duplicate transfers (optional) */
  idempotencyKey?: string;
}

/**
 * Transaction history query parameters
 *
 * @description Query parameters for retrieving transaction history.
 *
 * @example
 * ```typescript
 * const query: TransactionHistoryQuery = {
 *   limit: 20,
 *   cursor: "2024-01-01T00:00:00Z#abc123",
 *   startDate: "2024-01-01T00:00:00Z",
 *   endDate: "2024-01-31T23:59:59Z"
 * };
 * ```
 */
export interface TransactionHistoryQuery {
  /** Maximum number of results to return (default: 20, max: 100) */
  limit?: number;
  /** Cursor for pagination (format: timestamp#transactionId) */
  cursor?: string;
  /** Start date for filtering (ISO 8601 format, UTC) */
  startDate?: string;
  /** End date for filtering (ISO 8601 format, UTC) */
  endDate?: string;
}
