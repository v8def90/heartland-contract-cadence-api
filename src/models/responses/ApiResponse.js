"use strict";
/**
 * API Response Models
 *
 * @description Common response types for the Flow Heart Token API.
 * These types ensure consistent response format across all endpoints.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createErrorResponse = exports.createSuccessResponse = exports.API_ERROR_CODES = void 0;
/**
 * Standard API error codes
 *
 * @description Common error codes used throughout the API.
 */
exports.API_ERROR_CODES = {
    // Input validation errors
    INVALID_ADDRESS: 'INVALID_ADDRESS',
    INVALID_AMOUNT: 'INVALID_AMOUNT',
    INVALID_TRANSACTION_ID: 'INVALID_TRANSACTION_ID',
    MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
    // Flow network errors
    FLOW_NETWORK_ERROR: 'FLOW_NETWORK_ERROR',
    FLOW_SCRIPT_ERROR: 'FLOW_SCRIPT_ERROR',
    FLOW_TRANSACTION_ERROR: 'FLOW_TRANSACTION_ERROR',
    FLOW_ACCOUNT_ERROR: 'FLOW_ACCOUNT_ERROR',
    // Heart contract errors
    CONTRACT_ERROR: 'CONTRACT_ERROR',
    INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
    CONTRACT_PAUSED: 'CONTRACT_PAUSED',
    UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
    // Authentication errors
    AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
    INVALID_TOKEN: 'INVALID_TOKEN',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
    // General errors
    NOT_FOUND: 'NOT_FOUND',
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    RATE_LIMITED: 'RATE_LIMITED',
};
/**
 * Helper function to create success response
 *
 * @template T - Type of the response data
 * @param data - Response data
 * @returns Formatted success response
 *
 * @example
 * ```typescript
 * return createSuccessResponse({ balance: "1000.0" });
 * ```
 */
const createSuccessResponse = (data) => ({
    success: true,
    data,
    timestamp: new Date().toISOString(),
});
exports.createSuccessResponse = createSuccessResponse;
/**
 * Helper function to create error response
 *
 * @param error - Error details
 * @returns Formatted error response
 *
 * @example
 * ```typescript
 * return createErrorResponse({
 *   code: API_ERROR_CODES.INVALID_ADDRESS,
 *   message: "Invalid Flow address format"
 * });
 * ```
 */
const createErrorResponse = (error) => ({
    success: false,
    error,
    timestamp: new Date().toISOString(),
});
exports.createErrorResponse = createErrorResponse;
