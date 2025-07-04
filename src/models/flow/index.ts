/**
 * Flow Blockchain Type Definitions
 *
 * @description This file contains all TypeScript type definitions specific to
 * Flow blockchain integration, including FCL types, transaction results, and
 * contract interaction patterns.
 *
 * @author Heart Token API Team
 * @since 1.0.0
 */

/**
 * Flow network configuration
 *
 * @description Configuration object for Flow Client Library (FCL).
 * Defines network endpoints and contract addresses.
 *
 * @example
 * ```typescript
 * const config: FlowConfig = {
 *   "accessNode.api": "https://rest-testnet.onflow.org",
 *   "discovery.wallet": "https://fcl-discovery.onflow.org/testnet/authn",
 *   "0xHeart": "0x58f9e6153690c852"
 * };
 * ```
 */
export interface FlowConfig {
  /** Flow access node API endpoint */
  'accessNode.api': string;
  /** Wallet discovery endpoint for authentication */
  'discovery.wallet': string;
  /** Heart contract address placeholder */
  '0xHeart': string;
  /** Additional configuration properties */
  [key: string]: string;
}

/**
 * Flow address type
 *
 * @description Represents a valid Flow blockchain address.
 * Always starts with '0x' followed by 16 hexadecimal characters.
 *
 * @example
 * ```typescript
 * const address: FlowAddress = "0x58f9e6153690c852";
 * ```
 */
export type FlowAddress = string;

/**
 * Flow transaction ID type
 *
 * @description Represents a Flow transaction identifier.
 * 64-character hexadecimal string.
 *
 * @example
 * ```typescript
 * const txId: FlowTransactionId = "abc123def456...";
 * ```
 */
export type FlowTransactionId = string;

/**
 * Flow script execution result
 *
 * @description Generic result wrapper for Flow script execution.
 * Scripts are read-only operations that don't modify blockchain state.
 *
 * @template T - Type of the script return value
 *
 * @example
 * ```typescript
 * const result: ScriptResult<string> = await executeScript(scriptCode);
 * if (result.success) {
 *   console.log("Balance:", result.data);
 * }
 * ```
 */
export interface ScriptResult<T = unknown> {
  /** Whether the script executed successfully */
  success: boolean;
  /** Script return value (if successful) */
  data?: T;
  /** Error message (if failed) */
  error?: string;
  /** Execution time in milliseconds */
  executionTime?: number;
}

/**
 * Flow transaction execution result
 *
 * @description Result wrapper for Flow transaction execution.
 * Transactions modify blockchain state and require gas fees.
 *
 * @example
 * ```typescript
 * const result: TransactionResult = await executeTransaction(txCode);
 * if (result.success) {
 *   console.log("Transaction ID:", result.txId);
 * }
 * ```
 */
export interface TransactionResult {
  /** Whether the transaction was successful */
  success: boolean;
  /** Transaction ID (if successful) */
  txId?: FlowTransactionId;
  /** Full transaction object from Flow */
  transaction?: FlowTransaction;
  /** Error message (if failed) */
  error?: string;
  /** Gas used by the transaction */
  gasUsed?: number;
  /** Execution time in milliseconds */
  executionTime?: number;
}

/**
 * Flow transaction status
 *
 * @description Represents the various states a Flow transaction can be in.
 *
 * @example
 * ```typescript
 * const status: FlowTransactionStatus = "sealed";
 * ```
 */
export type FlowTransactionStatus =
  | 'unknown'
  | 'pending'
  | 'finalized'
  | 'executed'
  | 'sealed'
  | 'expired';

/**
 * Flow transaction object
 *
 * @description Represents a complete Flow transaction with all metadata.
 *
 * @example
 * ```typescript
 * const transaction: FlowTransaction = {
 *   id: "abc123...",
 *   status: "sealed",
 *   statusCode: 0,
 *   blockId: "def456...",
 *   blockHeight: 12345678,
 *   gasUsed: 1000,
 *   events: []
 * };
 * ```
 */
export interface FlowTransaction {
  /** Transaction ID */
  id: FlowTransactionId;
  /** Current transaction status */
  status: FlowTransactionStatus;
  /** Status code (0 = success) */
  statusCode: number;
  /** ID of the block containing this transaction */
  blockId?: string;
  /** Height of the block containing this transaction */
  blockHeight?: number;
  /** Amount of gas consumed */
  gasUsed?: number;
  /** Events emitted by the transaction */
  events: FlowEvent[];
  /** Error message if transaction failed */
  errorMessage?: string;
}

/**
 * Flow event object
 *
 * @description Represents an event emitted during transaction execution.
 * Events provide detailed information about what happened in a transaction.
 *
 * @example
 * ```typescript
 * const event: FlowEvent = {
 *   type: "A.58f9e6153690c852.Heart.TokensTransferred",
 *   transactionId: "abc123...",
 *   transactionIndex: 0,
 *   eventIndex: 0,
 *   data: { amount: "100.0", from: "0x123...", to: "0x456..." }
 * };
 * ```
 */
export interface FlowEvent {
  /** Event type identifier */
  type: string;
  /** Transaction that emitted this event */
  transactionId: FlowTransactionId;
  /** Index of this transaction in the block */
  transactionIndex: number;
  /** Index of this event in the transaction */
  eventIndex: number;
  /** Event payload data */
  data: Record<string, unknown>;
}

/**
 * Flow account information
 *
 * @description Represents a Flow account with its resources and capabilities.
 *
 * @example
 * ```typescript
 * const account: FlowAccount = {
 *   address: "0x58f9e6153690c852",
 *   balance: "1000000000",
 *   code: "...",
 *   keys: [],
 *   contracts: {}
 * };
 * ```
 */
export interface FlowAccount {
  /** Account address */
  address: FlowAddress;
  /** Account FLOW balance (in microFLOW) */
  balance: string;
  /** Account code (Cadence contracts) */
  code: string;
  /** Account keys for signing */
  keys: FlowAccountKey[];
  /** Deployed contracts */
  contracts: Record<string, string>;
}

/**
 * Flow account key
 *
 * @description Represents a cryptographic key associated with a Flow account.
 *
 * @example
 * ```typescript
 * const key: FlowAccountKey = {
 *   index: 0,
 *   publicKey: "abc123...",
 *   signAlgo: 2,
 *   hashAlgo: 1,
 *   weight: 1000,
 *   sequenceNumber: 42,
 *   revoked: false
 * };
 * ```
 */
export interface FlowAccountKey {
  /** Key index */
  index: number;
  /** Public key string */
  publicKey: string;
  /** Signature algorithm ID */
  signAlgo: number;
  /** Hash algorithm ID */
  hashAlgo: number;
  /** Key weight for multi-sig */
  weight: number;
  /** Sequence number for replay protection */
  sequenceNumber: number;
  /** Whether the key is revoked */
  revoked: boolean;
}

/**
 * Heart contract event types
 *
 * @description Specific event types emitted by the Heart token contract.
 *
 * @example
 * ```typescript
 * const eventType: HeartEventType = "TokensTransferred";
 * ```
 */
export type HeartEventType =
  | 'TokensInitialized'
  | 'TokensWithdrawn'
  | 'TokensDeposited'
  | 'TokensTransferred'
  | 'TokensMinted'
  | 'TokensBurned'
  | 'TaxRateChanged'
  | 'TreasuryChanged'
  | 'ContractPaused'
  | 'ContractUnpaused';

/**
 * Heart token transfer event data
 *
 * @description Parsed event data for Heart token transfers.
 *
 * @example
 * ```typescript
 * const transferEvent: HeartTransferEvent = {
 *   amount: "100.0",
 *   tax: "5.0",
 *   from: "0x123...",
 *   to: "0x456...",
 *   treasury: "0x789..."
 * };
 * ```
 */
export interface HeartTransferEvent {
  /** Transfer amount (before tax) */
  amount: string;
  /** Tax amount deducted */
  tax: string;
  /** Sender address */
  from: FlowAddress;
  /** Recipient address */
  to: FlowAddress;
  /** Treasury address that received tax */
  treasury: FlowAddress;
}

/**
 * Heart token mint event data
 *
 * @description Parsed event data for Heart token minting.
 *
 * @example
 * ```typescript
 * const mintEvent: HeartMintEvent = {
 *   amount: "1000.0",
 *   to: "0x58f9e6153690c852"
 * };
 * ```
 */
export interface HeartMintEvent {
  /** Amount minted */
  amount: string;
  /** Recipient address */
  to: FlowAddress;
}

/**
 * Heart token burn event data
 *
 * @description Parsed event data for Heart token burning.
 *
 * @example
 * ```typescript
 * const burnEvent: HeartBurnEvent = {
 *   amount: "500.0",
 *   from: "0x58f9e6153690c852"
 * };
 * ```
 */
export interface HeartBurnEvent {
  /** Amount burned */
  amount: string;
  /** Address that burned tokens */
  from: FlowAddress;
}

/**
 * Flow network constants
 *
 * @description Common constants used throughout Flow integration.
 *
 * @example
 * ```typescript
 * if (address.length !== FlowConstants.ADDRESS_LENGTH) {
 *   throw new Error("Invalid address length");
 * }
 * ```
 */
export const FlowConstants = {
  /** Length of a Flow address (including 0x prefix) */
  ADDRESS_LENGTH: 18,
  /** Length of a transaction ID */
  TX_ID_LENGTH: 64,
  /** Default gas limit for transactions */
  DEFAULT_GAS_LIMIT: 1000,
  /** Heart token decimals */
  HEART_DECIMALS: 8,
  /** Heart token symbol */
  HEART_SYMBOL: 'HEART',
} as const;

/**
 * Flow error categories
 *
 * @description Categorizes different types of Flow-related errors.
 *
 * @example
 * ```typescript
 * const errorType: FlowErrorType = "NETWORK_ERROR";
 * ```
 */
export type FlowErrorType =
  | 'NETWORK_ERROR'
  | 'SCRIPT_ERROR'
  | 'TRANSACTION_ERROR'
  | 'ACCOUNT_ERROR'
  | 'CONTRACT_ERROR'
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR';

/**
 * Flow error interface
 *
 * @description Standardized error structure for Flow-related operations.
 *
 * @example
 * ```typescript
 * const error: FlowError = {
 *   type: "SCRIPT_ERROR",
 *   message: "Script execution failed",
 *   code: "SCRIPT_EXECUTION_FAILED",
 *   details: "Invalid argument type"
 * };
 * ```
 */
export interface FlowError {
  /** Error category */
  type: FlowErrorType;
  /** Human-readable error message */
  message: string;
  /** Specific error code */
  code: string;
  /** Additional error details */
  details?: string;
  /** Original error object */
  originalError?: unknown;
}
