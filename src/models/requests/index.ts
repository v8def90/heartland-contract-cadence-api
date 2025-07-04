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
 * Token transfer request
 *
 * @description Request payload for transferring HEART tokens.
 * Includes automatic tax calculation and validation.
 *
 * @example
 * ```typescript
 * const transferRequest: TransferRequest = {
 *   recipient: "0x1234567890abcdef",
 *   amount: "100.0",
 *   memo: "Payment for services"
 * };
 * ```
 */
export interface TransferRequest {
  /** Recipient Flow address (0x prefixed) */
  recipient: string;
  /** Amount to transfer (as string to avoid precision issues) */
  amount: string;
  /** Optional memo for the transfer */
  memo?: string;
}

/**
 * Batch transfer request
 *
 * @description Request payload for transferring tokens to multiple recipients.
 * Each transfer is processed independently with tax calculation.
 *
 * @example
 * ```typescript
 * const batchRequest: BatchTransferRequest = {
 *   transfers: [
 *     { recipient: "0x123...", amount: "100.0" },
 *     { recipient: "0x456...", amount: "200.0", memo: "Bonus payment" }
 *   ]
 * };
 * ```
 */
export interface BatchTransferRequest {
  /** Array of individual transfer requests */
  transfers: TransferRequest[];
}

/**
 * Token minting request
 *
 * @description Request payload for minting new HEART tokens.
 * Requires admin privileges.
 *
 * @example
 * ```typescript
 * const mintRequest: MintTokensRequest = {
 *   recipient: "0x58f9e6153690c852",
 *   amount: "1000.0",
 *   reason: "Initial token distribution"
 * };
 * ```
 */
export interface MintTokensRequest {
  /** Address to receive newly minted tokens */
  recipient: string;
  /** Amount of tokens to mint */
  amount: string;
  /** Reason for minting (for audit purposes) */
  reason?: string;
}

/**
 * Token burning request
 *
 * @description Request payload for burning HEART tokens.
 * Tokens are removed from total supply.
 *
 * @example
 * ```typescript
 * const burnRequest: BurnTokensRequest = {
 *   amount: "500.0",
 *   reason: "Token buyback program"
 * };
 * ```
 */
export interface BurnTokensRequest {
  /** Amount of tokens to burn from sender's balance */
  amount: string;
  /** Reason for burning (for audit purposes) */
  reason?: string;
}

/**
 * Tax rate update request
 *
 * @description Request payload for updating the transfer tax rate.
 * Requires admin privileges.
 *
 * @example
 * ```typescript
 * const taxRateRequest: SetTaxRateRequest = {
 *   taxRate: 3.5,
 *   reason: "Quarterly tax adjustment"
 * };
 * ```
 */
export interface SetTaxRateRequest {
  /** New tax rate as percentage (0.0 to 100.0) */
  taxRate: number;
  /** Reason for tax rate change */
  reason?: string;
}

/**
 * Treasury account update request
 *
 * @description Request payload for updating the treasury account address.
 * Requires admin privileges.
 *
 * @example
 * ```typescript
 * const treasuryRequest: SetTreasuryRequest = {
 *   treasuryAddress: "0x58f9e6153690c852",
 *   reason: "Treasury migration"
 * };
 * ```
 */
export interface SetTreasuryRequest {
  /** New treasury account Flow address */
  treasuryAddress: string;
  /** Reason for treasury change */
  reason?: string;
}

/**
 * Account setup request
 *
 * @description Request payload for setting up a HEART token vault.
 * Creates the necessary resources for an address to hold HEART tokens.
 *
 * @example
 * ```typescript
 * const setupRequest: SetupAccountRequest = {
 *   address: "0x1234567890abcdef"
 * };
 * ```
 */
export interface SetupAccountRequest {
  /** Flow address to set up for HEART tokens */
  address: string;
}

/**
 * Authentication login request
 *
 * @description Request payload for JWT token generation.
 * Used to authenticate users for protected endpoints.
 *
 * @example
 * ```typescript
 * const loginRequest: LoginRequest = {
 *   address: "0x58f9e6153690c852",
 *   signature: "abc123def456...",
 *   message: "Login to Heart Token API"
 * };
 * ```
 */
export interface LoginRequest {
  /** Flow address of the user */
  address: string;
  /** Cryptographic signature proving ownership */
  signature: string;
  /** Message that was signed */
  message: string;
}

/**
 * JWT token verification request
 *
 * @description Request payload for verifying JWT tokens.
 * Used to validate authentication status.
 *
 * @example
 * ```typescript
 * const verifyRequest: VerifyTokenRequest = {
 *   token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
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
