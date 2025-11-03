/**
 * Authentication Helper Utilities
 *
 * @description Common utilities for Blocto and Flow wallet authentication.
 * Provides shared validation, formatting, and utility functions.
 *
 * @author Heart Token API Team
 * @since 1.0.0
 */

import { v4 as uuidv4 } from 'uuid';
import { generateJwtToken, verifyJwtToken } from '../middleware/passport';

/**
 * Validate Flow address format
 *
 * @description Validates that an address follows Flow blockchain format:
 * - Starts with 0x
 * - Contains exactly 16 hexadecimal characters after 0x
 * - Total length of 18 characters
 *
 * @param address - Flow address to validate
 * @returns Error message if invalid, null if valid
 *
 * @example
 * ```typescript
 * const error = validateFlowAddress("0x58f9e6153690c852");
 * if (error) {
 *   console.error(error);
 * }
 * ```
 */
export function validateFlowAddress(address: string): string | null {
  if (!address) {
    return 'Address is required';
  }

  if (!address.startsWith('0x')) {
    return 'Address must start with 0x';
  }

  if (address.length !== 18) {
    return 'Address must be 18 characters (0x + 16 hex)';
  }

  if (!/^0x[0-9a-fA-F]{16}$/.test(address)) {
    return 'Address must contain only hexadecimal characters';
  }

  return null;
}

/**
 * Validate timestamp for replay attack prevention
 *
 * @description Validates that a timestamp is within acceptable tolerance
 * to prevent replay attacks. Checks both future and past timestamps.
 *
 * @param timestamp - Timestamp to validate (milliseconds since epoch)
 * @param tolerance - Tolerance in milliseconds (default: 2 minutes)
 * @returns Error message if invalid, null if valid
 *
 * @example
 * ```typescript
 * const error = validateTimestamp(Date.now(), 2 * 60 * 1000);
 * if (error) {
 *   console.error(error);
 * }
 * ```
 */
export function validateTimestamp(
  timestamp: number,
  tolerance: number = 2 * 60 * 1000
): string | null {
  if (!timestamp || typeof timestamp !== 'number') {
    return 'Invalid timestamp format';
  }

  const now = Date.now();
  const diff = Math.abs(now - timestamp);

  if (diff > tolerance) {
    return `Timestamp too old or in the future (diff: ${diff}ms, tolerance: ${tolerance}ms)`;
  }

  return null;
}

/**
 * Check if string is hex format
 *
 * @description Determines if a string is a valid hexadecimal string.
 * Valid hex strings contain only 0-9, a-f, A-F and have even length.
 *
 * @param str - String to check
 * @returns True if hex format, false otherwise
 *
 * @example
 * ```typescript
 * isHexString("4c6f67696e"); // true
 * isHexString("Hello");      // false
 * ```
 */
export function isHexString(str: string): boolean {
  if (!str || typeof str !== 'string') {
    return false;
  }
  return /^[0-9a-fA-F]+$/.test(str) && str.length % 2 === 0;
}

/**
 * Normalize signature format
 *
 * @description Normalizes a Flow signature to standard format:
 * - Removes 0x prefix if present
 * - Validates hexadecimal format
 * - Validates length (128 characters = 64 bytes)
 * - Adds 0x prefix back
 *
 * @param signature - Signature to normalize
 * @returns Normalized signature with 0x prefix, or null if invalid
 *
 * @example
 * ```typescript
 * const normalized = normalizeSignature("abc123...");
 * // Returns: "0xabc123..." or null if invalid
 * ```
 */
export function normalizeSignature(signature: string): string | null {
  if (!signature) {
    return null;
  }

  // Remove 0x prefix if present
  const cleanSig = signature.replace(/^0x/, '');

  // Validate hex format
  if (!/^[0-9a-fA-F]+$/.test(cleanSig)) {
    return null;
  }

  // Flow signatures should be 128 characters (64 bytes)
  if (cleanSig.length !== 128) {
    return null;
  }

  // Add 0x prefix
  return `0x${cleanSig}`;
}

/**
 * Generate authentication data with JWT token
 *
 * @description Generates complete authentication data including JWT token,
 * expiration time, and wallet-specific metadata.
 *
 * @param address - User's Flow address
 * @param walletType - Wallet type identifier
 * @param metadata - Optional wallet-specific metadata
 * @returns Authentication data with JWT token
 *
 * @example
 * ```typescript
 * const authData = generateAuthData(
 *   "0x58f9e6153690c852",
 *   "flow",
 *   { flowMetadata: { walletName: "Flow Wallet" } }
 * );
 * ```
 */
export function generateAuthData<T extends Record<string, any>>(
  address: string,
  walletType: string,
  metadata?: T
): {
  token: string;
  expiresIn: number;
  address: string;
  role: 'user' | 'admin' | 'minter' | 'pauser';
  issuedAt: string;
  walletType: string;
} & T {
  // Generate user ID (in production, retrieve from database)
  const userId = uuidv4();

  // Determine role (in production, retrieve from database)
  const role: 'user' | 'admin' | 'minter' | 'pauser' = 'user';

  // Generate JWT token
  const token = generateJwtToken(userId, address, role);

  // Parse token to get expiration time
  const payload = verifyJwtToken(token);

  if (!payload) {
    throw new Error('Failed to verify generated token');
  }

  // Calculate expiration time in seconds
  const expiresIn = payload.exp - payload.iat;

  return {
    token,
    expiresIn,
    address,
    role,
    issuedAt: new Date(payload.iat * 1000).toISOString(),
    walletType,
    ...(metadata || ({} as T)),
  } as any;
}
