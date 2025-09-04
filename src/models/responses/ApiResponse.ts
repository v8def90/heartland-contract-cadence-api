/**
 * API Response Models
 *
 * @description Common response types for the Flow Heart Token API.
 * These types ensure consistent response format across all endpoints.
 */

/**
 * API Error structure
 *
 * @description Standard error format for API responses.
 *
 * @example
 * ```typescript
 * const error: ApiError = {
 *   code: "INVALID_ADDRESS",
 *   message: "The provided address is not a valid Flow address",
 *   details: "Address must be 18 characters long and start with 0x"
 * };
 * ```
 */
export interface ApiError {
  /** Error code for programmatic handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Optional additional details about the error */
  details?: string;
}

/**
 * Successful API response structure
 *
 * @description Standard success response format.
 *
 * @template T - Type of the response data
 *
 * @example
 * ```typescript
 * const response: SuccessResponse<BalanceData> = {
 *   success: true,
 *   data: { balance: "1000.0", address: "0x123..." },
 *   timestamp: "2024-01-01T00:00:00.000Z"
 * };
 * ```
 */
export interface SuccessResponse<T = unknown> {
  /** Indicates successful operation */
  success: true;
  /** Response data */
  data: T;
  /** ISO timestamp of the response */
  timestamp: string;
}

/**
 * Error API response structure
 *
 * @description Standard error response format.
 *
 * @example
 * ```typescript
 * const response: ErrorResponse = {
 *   success: false,
 *   error: { code: "NOT_FOUND", message: "Resource not found" },
 *   timestamp: "2024-01-01T00:00:00.000Z"
 * };
 * ```
 */
export interface ErrorResponse {
  /** Indicates failed operation */
  success: false;
  /** Error details */
  error: ApiError;
  /** ISO timestamp of the response */
  timestamp: string;
}

/**
 * Combined API response type
 *
 * @description Union type for all possible API responses.
 *
 * @template T - Type of the success response data
 *
 * @example
 * ```typescript
 * const response: ApiResponse<BalanceData> = await getBalance(address);
 * if (response.success) {
 *   console.log(response.data.balance);
 * } else {
 *   console.error(response.error.message);
 * }
 * ```
 */
export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

/**
 * Standard API error codes
 *
 * @description Common error codes used throughout the API.
 */
export const API_ERROR_CODES = {
  // Input validation errors
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INVALID_TRANSACTION_ID: 'INVALID_TRANSACTION_ID',
  INVALID_OPERATION: 'INVALID_OPERATION',
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
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

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
export const createSuccessResponse = <T>(data: T): SuccessResponse<T> => ({
  success: true,
  data,
  timestamp: new Date().toISOString(),
});

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
export const createErrorResponse = (error: ApiError): ErrorResponse => ({
  success: false,
  error,
  timestamp: new Date().toISOString(),
});
