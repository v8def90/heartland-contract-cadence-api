/**
 * API Request Type Definitions
 *
 * @description This file contains all TypeScript type definitions for API requests.
 * These types ensure type safety for incoming requests and auto-generate
 * OpenAPI documentation through tsoa decorators.
 *
 * @author Heart Token API Team
 * @since 1.0.0
 */

/**
 * Request Models for Heart Token API
 *
 * @description TypeScript interfaces for all API request payloads.
 * These models are used for request validation and type safety.
 */

/**
 * Transfer request payload
 *
 * @description Request to transfer HEART tokens to a recipient address.
 *
 * @example
 * ```typescript
 * const request: TransferRequest = {
 *   recipient: "0x58f9e6153690c852",
 *   amount: "100.0"
 * };
 * ```
 */
export interface TransferRequest {
  /** Recipient Flow address (0x prefixed) */
  recipient: string;
  /** Amount to transfer (string representation of decimal) */
  amount: string;
}

/**
 * Individual transfer item for batch operations
 *
 * @description Single transfer item within a batch transfer request.
 */
export interface TransferItem {
  /** Recipient Flow address (0x prefixed) */
  recipient: string;
  /** Amount to transfer (string representation of decimal) */
  amount: string;
}

/**
 * Batch transfer request payload
 *
 * @description Request to transfer HEART tokens to multiple recipients.
 *
 * @example
 * ```typescript
 * const request: BatchTransferRequest = {
 *   transfers: [
 *     { recipient: "0x58f9e6153690c852", amount: "100.0" },
 *     { recipient: "0x1234567890abcdef", amount: "50.0" }
 *   ]
 * };
 * ```
 */
export interface BatchTransferRequest {
  /** Array of transfer items */
  transfers: TransferItem[];
}

/**
 * Mint tokens request payload (admin only)
 *
 * @description Request to mint new HEART tokens to a recipient address.
 *
 * @example
 * ```typescript
 * const request: MintTokensRequest = {
 *   recipient: "0x58f9e6153690c852",
 *   amount: "1000.0"
 * };
 * ```
 */
export interface MintTokensRequest {
  /** Recipient Flow address (0x prefixed) */
  recipient: string;
  /** Amount to mint (string representation of decimal) */
  amount: string;
}

/**
 * Burn tokens request payload
 *
 * @description Request to burn HEART tokens from the sender's account.
 *
 * @example
 * ```typescript
 * const request: BurnTokensRequest = {
 *   amount: "50.0"
 * };
 * ```
 */
export interface BurnTokensRequest {
  /** Amount to burn (string representation of decimal) */
  amount: string;
}

/**
 * Set tax rate request payload (admin only)
 *
 * @description Request to update the tax rate for transfers.
 *
 * @example
 * ```typescript
 * const request: SetTaxRateRequest = {
 *   taxRate: 5.0
 * };
 * ```
 */
export interface SetTaxRateRequest {
  /** Tax rate as percentage (e.g., 5.0 for 5%) */
  taxRate: number;
}

/**
 * Set treasury account request payload (admin only)
 *
 * @description Request to update the treasury account address.
 *
 * @example
 * ```typescript
 * const request: SetTreasuryRequest = {
 *   treasuryAddress: "0x58f9e6153690c852"
 * };
 * ```
 */
export interface SetTreasuryRequest {
  /** New treasury account address (0x prefixed) */
  treasuryAddress: string;
}

/**
 * Setup account request payload
 *
 * @description Request to setup a HEART token vault for an address.
 *
 * @example
 * ```typescript
 * const request: SetupAccountRequest = {
 *   address: "0x58f9e6153690c852"
 * };
 * ```
 */
export interface SetupAccountRequest {
  /** Address to setup vault for (0x prefixed) */
  address: string;
}

/**
 * Authentication login request payload
 *
 * @description Request to authenticate and generate JWT token.
 *
 * @example
 * ```typescript
 * const request: LoginRequest = {
 *   address: "0x58f9e6153690c852",
 *   signature: "abc123..."
 * };
 * ```
 */
export interface LoginRequest {
  /** User's Flow address (0x prefixed) */
  address: string;
  /** Optional signature for verification */
  signature?: string;
}

/**
 * JWT token verification request payload
 *
 * @description Request to verify a JWT token.
 *
 * @example
 * ```typescript
 * const request: VerifyTokenRequest = {
 *   token: "eyJhbGciOiJIUzI1NiIs..."
 * };
 * ```
 */
export interface VerifyTokenRequest {
  /** JWT token to verify */
  token: string;
}

/**
 * Pause contract request
 *
 * @description Request payload for pausing the Heart contract.
 * Requires pauser privileges.
 *
 * @example
 * ```typescript
 * const pauseRequest: PauseContractRequest = {
 *   reason: "Emergency maintenance"
 * };
 * ```
 */
export interface PauseContractRequest {
  /** Reason for pausing the contract */
  reason?: string;
}

/**
 * Unpause contract request
 *
 * @description Request payload for unpausing the Heart contract.
 * Requires pauser privileges.
 *
 * @example
 * ```typescript
 * const unpauseRequest: UnpauseContractRequest = {
 *   reason: "Maintenance completed"
 * };
 * ```
 */
export interface UnpauseContractRequest {
  /** Reason for unpausing the contract */
  reason?: string;
}

/**
 * Generic admin action request
 *
 * @description Base interface for administrative actions.
 * Can be extended for specific admin operations.
 *
 * @example
 * ```typescript
 * const adminRequest: AdminActionRequest = {
 *   action: "emergency_pause",
 *   reason: "Security incident detected",
 *   metadata: { severity: "high" }
 * };
 * ```
 */
export interface AdminActionRequest {
  /** Type of administrative action */
  action: string;
  /** Reason for the action */
  reason?: string;
  /** Additional metadata for the action */
  metadata?: Record<string, unknown>;
}

/**
 * Tax calculation request
 *
 * @description Request payload for calculating tax on a transfer amount.
 * Used for frontend preview of tax before actual transfer.
 *
 * @example
 * ```typescript
 * const taxCalcRequest: TaxCalculationRequest = {
 *   amount: "1000.0"
 * };
 * ```
 */
export interface TaxCalculationRequest {
  /** Amount to calculate tax for */
  amount: string;
}
