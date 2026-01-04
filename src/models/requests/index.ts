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

/**
 * Blocto Wallet authentication request payload
 *
 * @description Request to authenticate using Blocto wallet signature
 * and generate JWT token for API access.
 *
 * @example
 * ```typescript
 * const request: BloctoAuthRequest = {
 *   address: "0x58f9e6153690c852",
 *   signature: "abc123...",
 *   message: "Login to Heart Token API",
 *   timestamp: 1640995200000,
 *   nonce: "unique-nonce-123"
 * };
 * ```
 */
export interface BloctoAuthRequest {
  /** User's Flow address (0x prefixed) */
  address: string;
  /** Blocto wallet signature */
  signature: string;
  /** Original message that was signed */
  message: string;
  /** Timestamp when signature was created */
  timestamp: number;
  /** Nonce for replay protection (required) */
  nonce: string;
}

/**
 * Flow Wallet authentication request payload
 *
 * @description Request to authenticate using Flow wallet signature
 * and generate JWT token for API access. Supports Flow Wallet, Lilico,
 * Dapper, and other Flow-compatible wallets.
 *
 * @example
 * ```typescript
 * const request: FlowAuthRequest = {
 *   address: "0x58f9e6153690c852",
 *   signature: "abc123...",
 *   message: "Login to Heart Token API\nNonce: xyz\nTimestamp: 1640995200000",
 *   timestamp: 1640995200000,
 *   nonce: "xyz"
 * };
 * ```
 */
export interface FlowAuthRequest {
  /** User's Flow address (0x prefixed) */
  address: string;
  /** Flow wallet signature */
  signature: string;
  /** Original message that was signed */
  message: string;
  /** Timestamp when signature was created */
  timestamp: number;
  /** Nonce for replay protection (required) */
  nonce: string;
}

/**
 * Transaction job request payload
 *
 * @description Base interface for all transaction job requests
 * that will be processed asynchronously via SQS.
 */
export interface TransactionJobRequest {
  /** Job identifier for tracking */
  jobId: string;
  /** Transaction type */
  type:
    | 'setup'
    | 'mint'
    | 'transfer'
    | 'burn'
    | 'pause'
    | 'unpause'
    | 'setTaxRate'
    | 'setTreasury'
    | 'batchTransfer';
  /** User address from JWT */
  userAddress: string;
  /** Transaction parameters */
  params: Record<string, unknown>;
  /** Optional metadata */
  metadata?: {
    memo?: string;
    priority?: 'low' | 'normal' | 'high';
    retryCount?: number;
  };
}

/**
 * Email/Password registration request payload
 *
 * @description Request to register a new user with email/password authentication.
 * The handle field should contain only the username part (e.g., "username").
 * The domain part (e.g., "pds-dev.heart-land.io") will be automatically appended by the API server.
 * Password is not required at registration - a temporary password will be generated automatically.
 * After email verification, user must set their password using POST /auth/set-initial-password.
 *
 * @example
 * ```typescript
 * const request: EmailPasswordRegisterRequest = {
 *   email: "user@example.com",
 *   displayName: "John Doe",
 *   handle: "username",  // Domain will be automatically appended
 *   description: "Optional user bio/description"
 * };
 * ```
 */
export interface EmailPasswordRegisterRequest {
  /** User email address */
  email: string;
  /** User display name */
  displayName: string;
  /** AT Protocol handle username (required, domain will be automatically appended by API server) */
  handle: string;
  /** Optional user bio/description */
  description?: string;
}

/**
 * Email/Password login request payload
 *
 * @description Request to authenticate with email/password.
 *
 * @example
 * ```typescript
 * const request: EmailPasswordLoginRequest = {
 *   email: "user@example.com",
 *   password: "password123"
 * };
 * ```
 */
export interface EmailPasswordLoginRequest {
  /** User email address */
  email: string;
  /** User password */
  password: string;
}

/**
 * Email verification request payload
 *
 * @description Request to verify email address using verification token.
 *
 * @example
 * ```typescript
 * const request: VerifyEmailRequest = {
 *   token: "verification-token-123",
 *   primaryDid: "did:plc:xxx"
 * };
 * ```
 */
export interface VerifyEmailRequest {
  /** Email verification token */
  token: string;
  /** User's primary DID */
  primaryDid: string;
}

/**
 * Resend verification email request payload
 *
 * @description Request to resend email verification email.
 *
 * @example
 * ```typescript
 * const request: ResendVerificationEmailRequest = {
 *   primaryDid: "did:plc:xxx",
 *   email: "user@example.com"
 * };
 * ```
 */
export interface ResendVerificationEmailRequest {
  /** User's primary DID */
  primaryDid: string;
  /** User email address */
  email: string;
}

/**
 * Password reset request payload
 *
 * @description Request to initiate password reset process.
 *
 * @example
 * ```typescript
 * const request: ResetPasswordRequestRequest = {
 *   email: "user@example.com"
 * };
 * ```
 */
export interface ResetPasswordRequestRequest {
  /** User email address */
  email: string;
}

/**
 * Password reset execution payload
 *
 * @description Request to reset password using reset token.
 *
 * @example
 * ```typescript
 * const request: ResetPasswordRequest = {
 *   token: "reset-token-123",
 *   primaryDid: "did:plc:xxx",
 *   newPassword: "NewSecurePass123!"
 * };
 * ```
 */
export interface ResetPasswordRequest {
  /** Password reset token */
  token: string;
  /** User's primary DID */
  primaryDid: string;
  /** New password */
  newPassword: string;
}

/**
 * Change password request payload
 *
 * @description Request to change password for authenticated user.
 *
 * @example
 * ```typescript
 * const request: ChangePasswordRequest = {
 *   currentPassword: "OldPassword123!",
 *   newPassword: "NewSecurePass123!"
 * };
 * ```
 */
export interface ChangePasswordRequest {
  /** Current password */
  currentPassword: string;
  /** New password */
  newPassword: string;
}

/**
 * Set initial password request payload
 *
 * @description Request to set initial password after email verification.
 * This endpoint is called after email verification to replace the temporary password
 * with a user-defined password.
 *
 * @example
 * ```typescript
 * const request: SetInitialPasswordRequest = {
 *   primaryDid: "did:plc:xxx",
 *   token: "verification-token-123",
 *   newPassword: "NewSecurePass123!"
 * };
 * ```
 */
export interface SetInitialPasswordRequest {
  /** User's primary DID */
  primaryDid: string;
  /** Email verification token */
  token: string;
  /** New password to set */
  newPassword: string;
}
