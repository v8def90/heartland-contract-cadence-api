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
 * HEART token balance information
 *
 * @description Represents the balance information for a Flow address.
 * Used by balance query endpoints.
 *
 * @example
 * ```typescript
 * const balanceData: BalanceData = {
 *   balance: "1000.00000000",
 *   address: "0x58f9e6153690c852",
 *   decimals: 8,
 *   formatted: "1,000.00 HEART"
 * };
 * ```
 */
export interface BalanceData {
  /** Raw balance value as string (to avoid precision issues) */
  balance: string;
  /** Flow address that owns this balance */
  address: string;
  /** Number of decimal places for the token */
  decimals: number;
  /** Human-readable formatted balance with token symbol */
  formatted: string;
}

/**
 * Token transfer transaction result
 *
 * @description Represents the result of a successful token transfer transaction.
 *
 * @example
 * ```typescript
 * const transferData: TransferData = {
 *   txId: "abc123def456",
 *   status: "sealed",
 *   amount: "100.0",
 *   tax: "5.0",
 *   netAmount: "95.0",
 *   recipient: "0x1234567890abcdef",
 *   blockHeight: 12345678
 * };
 * ```
 */
export interface TransferData {
  /** Flow transaction ID */
  txId: string;
  /** Transaction status (pending, executed, sealed, expired) */
  status: string;
  /** Original transfer amount */
  amount: string;
  /** Tax amount deducted */
  tax: string;
  /** Net amount transferred after tax */
  netAmount: string;
  /** Recipient Flow address */
  recipient: string;
  /** Block height where transaction was included */
  blockHeight: number;
}

/**
 * Total supply information
 *
 * @description Represents the total supply of HEART tokens.
 *
 * @example
 * ```typescript
 * const supplyData: TotalSupplyData = {
 *   totalSupply: "1000000.00000000",
 *   formatted: "1,000,000.00 HEART",
 *   decimals: 8
 * };
 * ```
 */
export interface TotalSupplyData {
  /** Total supply as string */
  totalSupply: string;
  /** Formatted total supply with symbol */
  formatted: string;
  /** Token decimals */
  decimals: number;
}

/**
 * Tax rate information
 *
 * @description Represents the current tax rate configuration.
 *
 * @example
 * ```typescript
 * const taxRateData: TaxRateData = {
 *   taxRate: 5.0,
 *   formatted: "5.00%"
 * };
 * ```
 */
export interface TaxRateData {
  /** Tax rate as percentage (e.g., 5.0 for 5%) */
  taxRate: number;
  /** Formatted tax rate string */
  formatted: string;
}

/**
 * Treasury account information
 *
 * @description Represents treasury account details.
 *
 * @example
 * ```typescript
 * const treasuryData: TreasuryData = {
 *   address: "0x58f9e6153690c852",
 *   balance: "50000.00000000"
 * };
 * ```
 */
export interface TreasuryData {
  /** Treasury Flow address */
  address: string;
  /** Current treasury balance */
  balance: string;
}

/**
 * Contract pause status
 *
 * @description Represents whether the Heart contract is paused.
 *
 * @example
 * ```typescript
 * const pauseStatus: PauseStatusData = {
 *   isPaused: false,
 *   lastChanged: "2024-07-04T00:00:00.000Z"
 * };
 * ```
 */
export interface PauseStatusData {
  /** Whether the contract is currently paused */
  isPaused: boolean;
  /** Timestamp when pause status was last changed */
  lastChanged?: string;
}

/**
 * Admin capabilities information
 *
 * @description Represents the admin capabilities for a specific address.
 *
 * @example
 * ```typescript
 * const adminCaps: AdminCapabilitiesData = {
 *   address: "0x58f9e6153690c852",
 *   isAdmin: true,
 *   isMinter: true,
 *   isPauser: true,
 *   isTaxManager: false
 * };
 * ```
 */
export interface AdminCapabilitiesData {
  /** Address being checked */
  address: string;
  /** Whether address has admin capabilities */
  isAdmin: boolean;
  /** Whether address can mint tokens */
  isMinter: boolean;
  /** Whether address can pause/unpause contract */
  isPauser: boolean;
  /** Whether address can manage tax settings */
  isTaxManager: boolean;
}
