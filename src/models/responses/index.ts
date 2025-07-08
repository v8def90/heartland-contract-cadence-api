/**
 * API Response Type Definitions
 *
 * @description This file contains all TypeScript type definitions for API responses.
 * These types ensure type safety across the entire application and auto-generate
 * OpenAPI documentation through tsoa decorators.
 *
 * @author Heart Token API Team
 * @since 1.0.0
 */

/**
 * Standard API error structure
 *
 * @description Represents an error that occurred during API processing.
 * Used consistently across all error responses.
 *
 * @example
 * ```typescript
 * const error: ApiError = {
 *   code: "FLOW_NETWORK_ERROR",
 *   message: "Unable to connect to Flow network",
 *   details: "Network timeout after 30 seconds"
 * };
 * ```
 */
export interface ApiError {
  /** Error code identifier (UPPER_SNAKE_CASE) */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Optional additional error details */
  details?: string;
}

/**
 * Standard error response structure
 *
 * @description Used for all API error responses to maintain consistency.
 *
 * @example
 * ```typescript
 * const errorResponse: ErrorResponse = {
 *   success: false,
 *   error: {
 *     code: "INVALID_ADDRESS",
 *     message: "Invalid Flow address format"
 *   },
 *   timestamp: "2024-07-04T00:00:00.000Z"
 * };
 * ```
 */
export interface ErrorResponse {
  /** Always false for error responses */
  success: false;
  /** Error information */
  error: ApiError;
  /** ISO timestamp when the error occurred */
  timestamp: string;
}

/**
 * Standard success response structure
 *
 * @description Generic success response wrapper for all successful API calls.
 *
 * @template T - Type of the response data
 *
 * @example
 * ```typescript
 * const successResponse: SuccessResponse<BalanceData> = {
 *   success: true,
 *   data: {
 *     balance: "1000.0",
 *     address: "0x123..."
 *   },
 *   timestamp: "2024-07-04T00:00:00.000Z"
 * };
 * ```
 */
export interface SuccessResponse<T = unknown> {
  /** Always true for success responses */
  success: true;
  /** Response payload data */
  data: T;
  /** ISO timestamp when the response was generated */
  timestamp: string;
}

/**
 * Union type for all API responses
 *
 * @description All API endpoints return either a success or error response.
 * This type ensures consistent response structure across the entire API.
 *
 * @template T - Type of the success response data
 *
 * @example
 * ```typescript
 * const response: ApiResponse<string> = await getBalance(address);
 * if (response.success) {
 *   console.log(response.data); // TypeScript knows this is string
 * } else {
 *   console.error(response.error.message);
 * }
 * ```
 */
export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

/**
 * Response Models for Heart Token API
 *
 * @description TypeScript interfaces for all API response payloads.
 * These models define the structure of successful API responses.
 */

/**
 * Balance information response
 *
 * @description Contains HEART token balance information for an address.
 *
 * @example
 * ```typescript
 * const response: BalanceData = {
 *   balance: "1000.0",
 *   address: "0x58f9e6153690c852",
 *   decimals: 8,
 *   formatted: "1,000.00 HEART"
 * };
 * ```
 */
export interface BalanceData {
  /** Raw balance as string (avoids precision issues) */
  balance: string;
  /** Address that owns the balance */
  address: string;
  /** Number of decimal places for the token */
  decimals: number;
  /** Human-readable formatted balance */
  formatted: string;
}

/**
 * Token supply information response
 *
 * @description Contains total supply information for HEART tokens.
 *
 * @example
 * ```typescript
 * const response: TotalSupplyData = {
 *   totalSupply: "1000000.0",
 *   decimals: 8,
 *   formatted: "1,000,000.00 HEART"
 * };
 * ```
 */
export interface TotalSupplyData {
  /** Total supply as string */
  totalSupply: string;
  /** Number of decimal places for the token */
  decimals: number;
  /** Human-readable formatted total supply */
  formatted: string;
}

/**
 * Tax rate information response
 *
 * @description Contains current tax rate information.
 *
 * @example
 * ```typescript
 * const response: TaxRateData = {
 *   taxRate: 5.0,
 *   formatted: "5.0%"
 * };
 * ```
 */
export interface TaxRateData {
  /** Tax rate as percentage */
  taxRate: number;
  /** Human-readable formatted tax rate */
  formatted: string;
}

/**
 * Treasury account information response
 *
 * @description Contains treasury account address information.
 *
 * @example
 * ```typescript
 * const response: TreasuryData = {
 *   treasuryAddress: "0x58f9e6153690c852",
 *   isValid: true
 * };
 * ```
 */
export interface TreasuryData {
  /** Treasury account address */
  treasuryAddress: string;
  /** Whether the treasury address is valid */
  isValid: boolean;
}

/**
 * Contract pause status response
 *
 * @description Contains information about contract pause status.
 *
 * @example
 * ```typescript
 * const response: PauseStatusData = {
 *   isPaused: false,
 *   pausedAt: null,
 *   pausedBy: null
 * };
 * ```
 */
export interface PauseStatusData {
  /** Whether the contract is currently paused */
  isPaused: boolean;
  /** Timestamp when paused (if applicable) */
  pausedAt: string | null;
  /** Address that paused the contract (if applicable) */
  pausedBy: string | null;
}

/**
 * Tax calculation response
 *
 * @description Contains tax calculation results for a given amount.
 *
 * @example
 * ```typescript
 * const response: TaxCalculationData = {
 *   amount: "100.0",
 *   taxRate: 5.0,
 *   taxAmount: "5.0",
 *   netAmount: "95.0"
 * };
 * ```
 */
export interface TaxCalculationData {
  /** Original amount */
  amount: string;
  /** Tax rate applied */
  taxRate: number;
  /** Tax amount calculated */
  taxAmount: string;
  /** Net amount after tax deduction */
  netAmount: string;
}

/**
 * Admin capabilities response
 *
 * @description Contains information about admin capabilities for an address.
 *
 * @example
 * ```typescript
 * const response: AdminCapabilitiesData = {
 *   address: "0x58f9e6153690c852",
 *   canMint: true,
 *   canBurn: true,
 *   canPause: true,
 *   canSetTaxRate: true,
 *   canSetTreasury: true,
 *   isAdmin: true
 * };
 * ```
 */
export interface AdminCapabilitiesData {
  /** Address being checked */
  address: string;
  /** Can mint new tokens */
  canMint: boolean;
  /** Can burn tokens */
  canBurn: boolean;
  /** Can pause/unpause contract */
  canPause: boolean;
  /** Can set tax rate */
  canSetTaxRate: boolean;
  /** Can set treasury address */
  canSetTreasury: boolean;
  /** Has admin privileges */
  isAdmin: boolean;
}

/**
 * Transaction result response
 *
 * @description Contains information about a completed transaction.
 *
 * @example
 * ```typescript
 * const response: TransactionData = {
 *   txId: "abc123def456",
 *   status: "sealed",
 *   blockHeight: 12345678,
 *   blockId: "def456ghi789",
 *   events: []
 * };
 * ```
 */
export interface TransactionData {
  /** Transaction ID */
  txId: string;
  /** Transaction status */
  status: 'pending' | 'sealed' | 'executed' | 'expired';
  /** Block height where transaction was included */
  blockHeight?: number;
  /** Block ID where transaction was included */
  blockId?: string;
  /** Events emitted by the transaction */
  events?: TransactionEvent[];
}

/**
 * Transaction event data
 *
 * @description Information about events emitted during transaction execution.
 *
 * @example
 * ```typescript
 * const event: TransactionEvent = {
 *   type: "A.58f9e6153690c852.Heart.TokensTransferred",
 *   values: { amount: "100.0", from: "0x123...", to: "0x456..." }
 * };
 * ```
 */
export interface TransactionEvent {
  /** Event type identifier */
  type: string;
  /** Event values */
  values: Record<string, unknown>;
}

/**
 * Transfer operation response
 *
 * @description Contains information about a completed transfer.
 *
 * @example
 * ```typescript
 * const response: TransferData = {
 *   txId: "abc123def456",
 *   status: "sealed",
 *   amount: "100.0",
 *   tax: "5.0",
 *   netAmount: "95.0",
 *   recipient: "0x1234567890abcdef",
 *   sender: "0x58f9e6153690c852",
 *   blockHeight: 12345678
 * };
 * ```
 */
export interface TransferData extends TransactionData {
  /** Transfer amount */
  amount: string;
  /** Tax amount deducted */
  tax: string;
  /** Net amount received by recipient */
  netAmount: string;
  /** Recipient address */
  recipient: string;
  /** Sender address */
  sender: string;
}

/**
 * Batch transfer operation response
 *
 * @description Contains information about a completed batch transfer.
 *
 * @example
 * ```typescript
 * const response: BatchTransferData = {
 *   txId: "abc123def456",
 *   status: "sealed",
 *   totalAmount: "150.0",
 *   totalTax: "7.5",
 *   totalNetAmount: "142.5",
 *   transfers: [
 *     { recipient: "0x123...", amount: "100.0", tax: "5.0", netAmount: "95.0" },
 *     { recipient: "0x456...", amount: "50.0", tax: "2.5", netAmount: "47.5" }
 *   ],
 *   blockHeight: 12345678
 * };
 * ```
 */
export interface BatchTransferData extends TransactionData {
  /** Total amount transferred */
  totalAmount: string;
  /** Total tax deducted */
  totalTax: string;
  /** Total net amount transferred */
  totalNetAmount: string;
  /** Individual transfer details */
  transfers: Array<{
    recipient: string;
    amount: string;
    tax: string;
    netAmount: string;
  }>;
}

/**
 * Account setup response
 *
 * @description Contains information about account setup operation.
 *
 * @example
 * ```typescript
 * const response: AccountSetupData = {
 *   address: "0x58f9e6153690c852",
 *   setupComplete: true,
 *   vaultPath: "/storage/heartVault",
 *   publicPath: "/public/heartBalance"
 * };
 * ```
 */
export interface AccountSetupData {
  /** Address that was set up */
  address: string;
  /** Whether setup was completed successfully */
  setupComplete: boolean;
  /** Storage path for the vault */
  vaultPath: string;
  /** Public path for balance checking */
  publicPath: string;
}

/**
 * Authentication response
 *
 * @description Contains authentication information and JWT token.
 *
 * @example
 * ```typescript
 * const response: AuthData = {
 *   token: "eyJhbGciOiJIUzI1NiIs...",
 *   expiresIn: 86400,
 *   address: "0x58f9e6153690c852",
 *   role: "user",
 *   issuedAt: "2024-01-01T00:00:00.000Z"
 * };
 * ```
 */
export interface AuthData {
  /** JWT token */
  token: string;
  /** Token expiration time in seconds */
  expiresIn: number;
  /** Authenticated user address */
  address: string;
  /** User role */
  role: 'user' | 'admin' | 'minter' | 'pauser';
  /** Token issued timestamp */
  issuedAt: string;
}

/**
 * Token verification response
 *
 * @description Contains token verification results.
 *
 * @example
 * ```typescript
 * const response: TokenVerificationData = {
 *   valid: true,
 *   address: "0x58f9e6153690c852",
 *   role: "user",
 *   expiresAt: "2024-01-02T00:00:00.000Z",
 *   issuedAt: "2024-01-01T00:00:00.000Z"
 * };
 * ```
 */
export interface TokenVerificationData {
  /** Whether token is valid */
  valid: boolean;
  /** Address from token (if valid) */
  address?: string;
  /** Role from token (if valid) */
  role?: string;
  /** Token expiration timestamp (if valid) */
  expiresAt?: string;
  /** Token issued timestamp (if valid) */
  issuedAt?: string;
  /** Error message (if invalid) */
  error?: string;
}

/**
 * Transaction job response
 *
 * @description Response when a transaction is queued for asynchronous processing.
 *
 * @example
 * ```typescript
 * const response: TransactionJobData = {
 *   jobId: "job_12345678",
 *   status: "queued",
 *   type: "mint",
 *   estimatedCompletionTime: "2024-01-01T00:01:00.000Z",
 *   trackingUrl: "/jobs/job_12345678"
 * };
 * ```
 */
export interface TransactionJobData {
  /** Unique job identifier */
  jobId: string;
  /** Current job status */
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  /** Transaction type */
  type: string;
  /** Estimated completion time */
  estimatedCompletionTime?: string;
  /** URL to track job progress */
  trackingUrl: string;
  /** Queue position (if applicable) */
  queuePosition?: number;
}

/**
 * Job status tracking response
 *
 * @description Detailed status information for a specific transaction job.
 *
 * @example
 * ```typescript
 * const response: JobStatusData = {
 *   jobId: "job_12345678",
 *   status: "completed",
 *   type: "mint",
 *   createdAt: "2024-01-01T00:00:00.000Z",
 *   completedAt: "2024-01-01T00:01:00.000Z",
 *   result: { txId: "abc123", status: "sealed" }
 * };
 * ```
 */
export interface JobStatusData {
  /** Job identifier */
  jobId: string;
  /** Current status */
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  /** Transaction type */
  type: string;
  /** Job creation timestamp */
  createdAt: string;
  /** Processing start timestamp */
  startedAt?: string;
  /** Completion timestamp */
  completedAt?: string;
  /** Transaction result (if completed) */
  result?: {
    txId?: string;
    status?: string;
    blockHeight?: number;
    events?: unknown[];
  };
  /** Error information (if failed) */
  error?: {
    code: string;
    message: string;
    details?: string;
  };
  /** Processing logs */
  logs?: string[];
  /** Progress percentage (0-100) */
  progress?: number;
}

/**
 * Blocto authentication response
 *
 * @description Response after successful Blocto wallet authentication.
 *
 * @example
 * ```typescript
 * const response: BloctoAuthData = {
 *   token: "eyJhbGciOiJIUzI1NiIs...",
 *   expiresIn: 86400,
 *   address: "0x58f9e6153690c852",
 *   role: "user",
 *   issuedAt: "2024-01-01T00:00:00.000Z",
 *   walletType: "blocto"
 * };
 * ```
 */
export interface BloctoAuthData extends AuthData {
  /** Wallet type identifier */
  walletType: 'blocto';
  /** Blocto-specific metadata */
  bloctoMetadata?: {
    appId?: string;
    walletVersion?: string;
    deviceType?: string;
  };
}
