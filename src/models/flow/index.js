"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlowConstants = void 0;
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
exports.FlowConstants = {
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
};
