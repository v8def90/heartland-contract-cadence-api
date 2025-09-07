/**
 * Flow Blockchain Configuration
 *
 * @description This file contains all configuration settings for Flow blockchain
 * integration including network endpoints, contract addresses, and FCL setup.
 * Supports both mainnet and testnet environments via environment variables.
 *
 * @author Heart Token API Team
 * @since 1.0.0
 */

import * as fcl from '@onflow/fcl';
import type { FlowConfig } from '../models/flow';

// Load environment variables using require syntax
require('dotenv').config();

/**
 * Get network-specific configuration values
 *
 * @description Returns configuration values based on the current network.
 * Automatically selects appropriate endpoints for testnet or mainnet.
 */
function getNetworkConfig(): {
  network: string;
  accessNode: string;
  discoveryWallet: string;
} {
  const network = process.env.FLOW_NETWORK || 'testnet';

  // Default endpoints based on network
  const networkDefaults = {
    testnet: {
      accessNode: 'https://rest-testnet.onflow.org',
      discoveryWallet: 'https://fcl-discovery.onflow.org/testnet/authn',
    },
    mainnet: {
      accessNode: 'https://rest-mainnet.onflow.org',
      discoveryWallet: 'https://fcl-discovery.onflow.org/authn',
    },
  };

  const defaults =
    networkDefaults[network as keyof typeof networkDefaults] ||
    networkDefaults.testnet;

  return {
    network,
    accessNode: process.env.FLOW_ACCESS_NODE || defaults.accessNode,
    discoveryWallet:
      process.env.FLOW_DISCOVERY_WALLET || defaults.discoveryWallet,
  };
}

/**
 * Environment-specific configuration constants
 *
 * @description Configuration values that can be overridden by environment variables.
 * Provides sensible defaults for development and testing based on the selected network.
 */
export const FLOW_ENV = ((): {
  NETWORK: string;
  ACCESS_NODE: string;
  HEART_CONTRACT_ADDRESS: string;
  DISCOVERY_WALLET: string;
  DEFAULT_GAS_LIMIT: number;
  REQUEST_TIMEOUT: number;
  ADMIN_ADDRESS: string;
  ADMIN_PRIVATE_KEY: string;
} => {
  const networkConfig = getNetworkConfig();

  return {
    /** Network type (testnet/mainnet) */
    NETWORK: networkConfig.network,

    /** Flow access node API endpoint (network-specific) */
    ACCESS_NODE: networkConfig.accessNode,

    /** Heart contract address */
    HEART_CONTRACT_ADDRESS:
      process.env.HEART_CONTRACT_ADDRESS || '0x58f9e6153690c852',

    /** Flow discovery wallet endpoint for authentication (network-specific) */
    DISCOVERY_WALLET: networkConfig.discoveryWallet,

    /** Default gas limit for transactions */
    DEFAULT_GAS_LIMIT: parseInt(process.env.FLOW_GAS_LIMIT || '1000', 10),

    /** Request timeout in milliseconds */
    REQUEST_TIMEOUT: parseInt(process.env.FLOW_REQUEST_TIMEOUT || '30000', 10),

    /** Admin account address for transactions */
    ADMIN_ADDRESS: process.env.ADMIN_ADDRESS || '0x58f9e6153690c852',

    /** Admin private key for signing transactions (DO NOT commit real keys) */
    ADMIN_PRIVATE_KEY: process.env.ADMIN_PRIVATE_KEY || '',
  };
})();

/**
 * Flow Client Library (FCL) configuration
 *
 * @description Configuration object used to initialize FCL for Flow blockchain interaction.
 * This configuration is applied when the application starts.
 *
 * @example
 * ```typescript
 * import { flowConfig } from './config/flow';
 * fcl.config(flowConfig);
 * ```
 */
export const flowConfig: FlowConfig = {
  'accessNode.api': FLOW_ENV.ACCESS_NODE,
  'discovery.wallet': FLOW_ENV.DISCOVERY_WALLET,
  '0xHeart': FLOW_ENV.HEART_CONTRACT_ADDRESS,
  'fcl.limit': FLOW_ENV.DEFAULT_GAS_LIMIT.toString(),
};

/**
 * Network-specific contract addresses
 *
 * @description Contract addresses for different Flow networks.
 * These are the official system contract addresses.
 */
const NETWORK_CONTRACTS = {
  testnet: {
    FungibleToken: '0x9a0766d93b6608b7',
    NonFungibleToken: '0x631e88ae7f1d7c20',
    FlowToken: '0x7e60df042a9c0868',
    MetadataViews: '0x631e88ae7f1d7c20',
  },
  mainnet: {
    FungibleToken: '0xf233dcee88fe0abe',
    NonFungibleToken: '0x1d7e57aa55817448',
    FlowToken: '0x1654653399040a61',
    MetadataViews: '0x1d7e57aa55817448',
  },
} as const;

/**
 * Get contract addresses based on current network
 *
 * @description Returns the appropriate contract addresses for the current network.
 * Automatically selects testnet or mainnet addresses based on FLOW_NETWORK environment variable.
 *
 * @returns Contract addresses object
 *
 * @example
 * ```typescript
 * const addresses = getContractAddresses();
 * console.log(addresses.FungibleToken); // 0x9a0766d93b6608b7 (testnet)
 * ```
 */
export function getContractAddresses(): {
  Heart: string;
  FungibleToken: string;
  NonFungibleToken: string;
  FlowToken: string;
  MetadataViews: string;
} {
  const network = (process.env.FLOW_NETWORK || 'testnet') as
    | 'testnet'
    | 'mainnet';
  const networkContracts =
    NETWORK_CONTRACTS[network] || NETWORK_CONTRACTS.testnet;

  return {
    /** Heart token contract address */
    Heart: process.env.HEART_CONTRACT_ADDRESS || '0x58f9e6153690c852',

    /** Standard Flow contracts (network-specific) */
    FungibleToken: networkContracts.FungibleToken,
    NonFungibleToken: networkContracts.NonFungibleToken,
    FlowToken: networkContracts.FlowToken,
    MetadataViews: networkContracts.MetadataViews,
  };
}

/**
 * Contract addresses mapping (dynamic based on network)
 *
 * @description Maps contract names to their deployed addresses on Flow.
 * Automatically uses the correct addresses based on the current network.
 *
 * @example
 * ```typescript
 * const heartAddress = CONTRACT_ADDRESSES.Heart;
 * const ftAddress = CONTRACT_ADDRESSES.FungibleToken;
 * ```
 */
export const CONTRACT_ADDRESSES = getContractAddresses();

/**
 * Flow network constants
 *
 * @description Constants specific to Flow blockchain operations and Heart token.
 *
 * @example
 * ```typescript
 * const decimals = FLOW_CONSTANTS.HEART_DECIMALS;
 * ```
 */
export const FLOW_CONSTANTS = {
  /** Heart token decimal places */
  HEART_DECIMALS: 8,

  /** Heart token symbol */
  HEART_SYMBOL: 'HEART',

  /** Flow token decimal places */
  FLOW_DECIMALS: 8,

  /** Flow token symbol */
  FLOW_SYMBOL: 'FLOW',

  /** Minimum transfer amount (to prevent dust) */
  MIN_TRANSFER_AMOUNT: '0.00000001',

  /** Maximum transfer amount (per transaction) */
  MAX_TRANSFER_AMOUNT: '1000000.00000000',

  /** Default tax rate (5%) */
  DEFAULT_TAX_RATE: 5.0,

  /** Maximum tax rate allowed (20%) */
  MAX_TAX_RATE: 20.0,

  /** Address validation regex pattern */
  ADDRESS_PATTERN: /^0x[a-f0-9]{16}$/,

  /** Transaction ID validation regex pattern */
  TX_ID_PATTERN: /^[a-f0-9]{64}$/,
} as const;

/**
 * Flow script and transaction paths
 *
 * @description File paths for Cadence scripts and transactions.
 * Used to load and execute blockchain operations.
 *
 * @example
 * ```typescript
 * const scriptPath = CADENCE_PATHS.SCRIPTS.GET_BALANCE;
 * ```
 */
export const CADENCE_PATHS = {
  /** Read-only script file paths */
  SCRIPTS: {
    GET_BALANCE: './scripts/get-balance.cdc',
    GET_TOTAL_SUPPLY: './scripts/get-total-supply.cdc',
    GET_TAX_RATE: './scripts/get-tax-rate.cdc',
    GET_TREASURY_ACCOUNT: './scripts/get-treasury-account.cdc',
    GET_PAUSE_STATUS: './scripts/get-pause-status.cdc',
    CALCULATE_TAX: './scripts/calculate-tax.cdc',
    GET_ADMIN_CAPABILITIES: './scripts/get-admin-capabilities.cdc',
  },

  /** State-changing transaction file paths */
  TRANSACTIONS: {
    SETUP_ACCOUNT: './transactions/setup-account.cdc',
    MINT_TOKENS: './transactions/mint-tokens.cdc',
    TRANSFER_TOKENS: './transactions/transfer-heart.cdc',
    BATCH_TRANSFER: './transactions/batch-transfer.cdc',
    BURN_TOKENS: './transactions/burn-tokens.cdc',
    PAUSE_CONTRACT: './transactions/pause-heart.cdc',
    UNPAUSE_CONTRACT: './transactions/unpause-heart.cdc',
    SET_TAX_RATE: './transactions/set-tax-rate.cdc',
    SET_TREASURY: './transactions/set-treasury-account.cdc',
  },
} as const;

/**
 * FCL configuration values
 *
 * @description Additional FCL configuration options for fine-tuning behavior.
 *
 * @example
 * ```typescript
 * fcl.config(FCL_CONFIG);
 * ```
 */
export const FCL_CONFIG = {
  /** Enable debug logging in development */
  'logger.level': process.env.NODE_ENV === 'development' ? 2 : 0,

  /** Request timeout */
  'sdk.transport.timeout': FLOW_ENV.REQUEST_TIMEOUT,

  /** Retry configuration */
  'sdk.transport.retry.attempts': 3,
  'sdk.transport.retry.delay': 1000,
} as const;

/**
 * Initialize Flow configuration
 *
 * @description Sets up FCL with the proper configuration for the current environment.
 * This function should be called when the application starts.
 *
 * @example
 * ```typescript
 * import { initializeFlowConfig } from './config/flow';
 *
 * // Initialize Flow configuration
 * initializeFlowConfig();
 * ```
 */
export const initializeFlowConfig = (): void => {
  try {
    // Apply main Flow configuration
    fcl.config(flowConfig);

    // Apply additional FCL configuration
    fcl.config(FCL_CONFIG);

    console.log('Flow configuration initialized successfully', {
      network: FLOW_ENV.NETWORK,
      accessNode: FLOW_ENV.ACCESS_NODE,
      heartContract: FLOW_ENV.HEART_CONTRACT_ADDRESS,
    });
  } catch (error) {
    console.error('Failed to initialize Flow configuration:', error);
    throw new Error('Flow configuration initialization failed');
  }
};

/**
 * Validate Flow address format
 *
 * @description Validates that a string is a properly formatted Flow address.
 *
 * @param address - Address string to validate
 * @returns True if address is valid, false otherwise
 *
 * @example
 * ```typescript
 * const isValid = isValidFlowAddress("0x58f9e6153690c852"); // true
 * const isInvalid = isValidFlowAddress("invalid"); // false
 * ```
 */
export const isValidFlowAddress = (address: string): boolean => {
  // Handle null, undefined, and non-string inputs
  if (!address || typeof address !== 'string') {
    return false;
  }

  // Flow addresses are case-insensitive, but we normalize to lowercase for validation
  const normalizedAddress = address.toLowerCase();
  return FLOW_CONSTANTS.ADDRESS_PATTERN.test(normalizedAddress);
};

/**
 * Validate transaction ID format
 *
 * @description Validates that a string is a properly formatted Flow transaction ID.
 *
 * @param txId - Transaction ID string to validate
 * @returns True if transaction ID is valid, false otherwise
 *
 * @example
 * ```typescript
 * const isValid = isValidTransactionId("abc123def456..."); // depends on format
 * ```
 */
export const isValidTransactionId = (txId: string): boolean => {
  // Handle null, undefined, and non-string inputs
  if (!txId || typeof txId !== 'string') {
    return false;
  }

  // Transaction IDs are case-insensitive, normalize to lowercase for validation
  const normalizedTxId = txId.toLowerCase();
  return FLOW_CONSTANTS.TX_ID_PATTERN.test(normalizedTxId);
};

/**
 * Format HEART token amount
 *
 * @description Formats a HEART token amount for display with proper decimals.
 *
 * @param amount - Raw amount as string
 * @param includeSymbol - Whether to include the HEART symbol
 * @returns Formatted amount string
 *
 * @example
 * ```typescript
 * const formatted = formatHeartAmount("1000.00000000", true); // "1,000.00 HEART"
 * ```
 */
export const formatHeartAmount = (
  amount: string,
  includeSymbol = false
): string => {
  try {
    const numAmount = parseFloat(amount);

    // Check for invalid numbers (NaN, Infinity, etc.)
    if (!isFinite(numAmount)) {
      return includeSymbol
        ? `${amount} ${FLOW_CONSTANTS.HEART_SYMBOL}`
        : amount;
    }

    const formatted = numAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: FLOW_CONSTANTS.HEART_DECIMALS,
    });

    return includeSymbol
      ? `${formatted} ${FLOW_CONSTANTS.HEART_SYMBOL}`
      : formatted;
  } catch (error) {
    console.warn('Failed to format HEART amount:', amount, error);
    return includeSymbol ? `${amount} ${FLOW_CONSTANTS.HEART_SYMBOL}` : amount;
  }
};

/**
 * Calculate tax amount
 *
 * @description Calculates the tax amount for a given transfer amount and tax rate.
 *
 * @param amount - Transfer amount as string
 * @param taxRate - Tax rate as percentage (e.g., 5.0 for 5%)
 * @returns Tax amount as string
 *
 * @example
 * ```typescript
 * const tax = calculateTaxAmount("100.0", 5.0); // "5.0"
 * ```
 */
export const calculateTaxAmount = (amount: string, taxRate: number): string => {
  try {
    const numAmount = parseFloat(amount);

    // Check for invalid numbers (NaN, Infinity, etc.)
    if (!isFinite(numAmount) || !isFinite(taxRate)) {
      return '0.00000000';
    }

    const taxAmount = (numAmount * taxRate) / 100;

    // Double-check the tax amount calculation result
    if (!isFinite(taxAmount)) {
      return '0.00000000';
    }

    return taxAmount.toFixed(FLOW_CONSTANTS.HEART_DECIMALS);
  } catch (error) {
    console.warn('Failed to calculate tax amount:', amount, taxRate, error);
    return '0.00000000';
  }
};

// Initialize Flow configuration when this module is imported
initializeFlowConfig();
