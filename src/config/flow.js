"use strict";
/**
 * Flow Blockchain Configuration
 *
 * @description This file contains all configuration settings for Flow blockchain
 * integration including network endpoints, contract addresses, and FCL setup.
 *
 * @author Heart Token API Team
 * @since 1.0.0
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateTaxAmount = exports.formatHeartAmount = exports.isValidTransactionId = exports.isValidFlowAddress = exports.initializeFlowConfig = exports.FCL_CONFIG = exports.CADENCE_PATHS = exports.FLOW_CONSTANTS = exports.CONTRACT_ADDRESSES = exports.flowConfig = exports.FLOW_ENV = void 0;
const fcl = __importStar(require("@onflow/fcl"));
/**
 * Environment-specific configuration constants
 *
 * @description Configuration values that can be overridden by environment variables.
 * Provides sensible defaults for development and testing.
 */
exports.FLOW_ENV = {
    /** Flow access node API endpoint */
    ACCESS_NODE: process.env.FLOW_ACCESS_NODE || 'https://rest-testnet.onflow.org',
    /** Heart contract address on Flow testnet */
    HEART_CONTRACT_ADDRESS: process.env.HEART_CONTRACT_ADDRESS || '0x58f9e6153690c852',
    /** Flow discovery wallet endpoint for authentication */
    DISCOVERY_WALLET: process.env.FLOW_DISCOVERY_WALLET ||
        'https://fcl-discovery.onflow.org/testnet/authn',
    /** Network type (testnet/mainnet) */
    NETWORK: process.env.FLOW_NETWORK || 'testnet',
    /** Default gas limit for transactions */
    DEFAULT_GAS_LIMIT: parseInt(process.env.FLOW_GAS_LIMIT || '1000', 10),
    /** Request timeout in milliseconds */
    REQUEST_TIMEOUT: parseInt(process.env.FLOW_REQUEST_TIMEOUT || '30000', 10),
};
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
exports.flowConfig = {
    'accessNode.api': exports.FLOW_ENV.ACCESS_NODE,
    'discovery.wallet': exports.FLOW_ENV.DISCOVERY_WALLET,
    '0xHeart': exports.FLOW_ENV.HEART_CONTRACT_ADDRESS,
    'fcl.limit': exports.FLOW_ENV.DEFAULT_GAS_LIMIT.toString(),
};
/**
 * Contract addresses mapping
 *
 * @description Maps contract names to their deployed addresses on Flow.
 * Makes it easy to reference contracts throughout the application.
 *
 * @example
 * ```typescript
 * const heartAddress = CONTRACT_ADDRESSES.Heart;
 * ```
 */
exports.CONTRACT_ADDRESSES = {
    /** Heart token contract address */
    Heart: exports.FLOW_ENV.HEART_CONTRACT_ADDRESS,
    /** Standard contracts (these are Flow system contracts) */
    FungibleToken: '0x9a0766d93b6608b7', // Testnet address
    NonFungibleToken: '0x631e88ae7f1d7c20', // Testnet address
    FlowToken: '0x7e60df042a9c0868', // Testnet address
    MetadataViews: '0x631e88ae7f1d7c20', // Testnet address
};
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
exports.FLOW_CONSTANTS = {
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
    ADDRESS_PATTERN: /^0x[a-fA-F0-9]{16}$/,
    /** Transaction ID validation regex pattern */
    TX_ID_PATTERN: /^[a-fA-F0-9]{64}$/,
};
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
exports.CADENCE_PATHS = {
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
};
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
exports.FCL_CONFIG = {
    /** Enable debug logging in development */
    'logger.level': process.env.NODE_ENV === 'development' ? 2 : 0,
    /** Request timeout */
    'sdk.transport.timeout': exports.FLOW_ENV.REQUEST_TIMEOUT,
    /** Retry configuration */
    'sdk.transport.retry.attempts': 3,
    'sdk.transport.retry.delay': 1000,
};
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
const initializeFlowConfig = () => {
    try {
        // Apply main Flow configuration
        fcl.config(exports.flowConfig);
        // Apply additional FCL configuration
        fcl.config(exports.FCL_CONFIG);
        console.log('Flow configuration initialized successfully', {
            network: exports.FLOW_ENV.NETWORK,
            accessNode: exports.FLOW_ENV.ACCESS_NODE,
            heartContract: exports.FLOW_ENV.HEART_CONTRACT_ADDRESS,
        });
    }
    catch (error) {
        console.error('Failed to initialize Flow configuration:', error);
        throw new Error('Flow configuration initialization failed');
    }
};
exports.initializeFlowConfig = initializeFlowConfig;
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
const isValidFlowAddress = (address) => {
    return exports.FLOW_CONSTANTS.ADDRESS_PATTERN.test(address);
};
exports.isValidFlowAddress = isValidFlowAddress;
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
const isValidTransactionId = (txId) => {
    return exports.FLOW_CONSTANTS.TX_ID_PATTERN.test(txId);
};
exports.isValidTransactionId = isValidTransactionId;
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
const formatHeartAmount = (amount, includeSymbol = false) => {
    try {
        const numAmount = parseFloat(amount);
        const formatted = numAmount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: exports.FLOW_CONSTANTS.HEART_DECIMALS,
        });
        return includeSymbol
            ? `${formatted} ${exports.FLOW_CONSTANTS.HEART_SYMBOL}`
            : formatted;
    }
    catch (error) {
        console.warn('Failed to format HEART amount:', amount, error);
        return includeSymbol ? `${amount} ${exports.FLOW_CONSTANTS.HEART_SYMBOL}` : amount;
    }
};
exports.formatHeartAmount = formatHeartAmount;
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
const calculateTaxAmount = (amount, taxRate) => {
    try {
        const numAmount = parseFloat(amount);
        const taxAmount = (numAmount * taxRate) / 100;
        return taxAmount.toFixed(exports.FLOW_CONSTANTS.HEART_DECIMALS);
    }
    catch (error) {
        console.warn('Failed to calculate tax amount:', amount, taxRate, error);
        return '0.00000000';
    }
};
exports.calculateTaxAmount = calculateTaxAmount;
// Initialize Flow configuration when this module is imported
(0, exports.initializeFlowConfig)();
