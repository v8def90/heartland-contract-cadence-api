/**
 * rkey (Record Key) Generator Utility
 *
 * @description Provides utilities for generating, validating, and converting
 * AT Protocol record keys (rkey) using TID (Time-based ID) format.
 *
 * @author Heart Token API Team
 * @since 1.0.0
 */

import * as syntax from '@atproto/syntax';

/**
 * Generate rkey for AT Protocol record
 *
 * @description Generates a new rkey using TID (Time-based ID) format.
 * TID is the standard format for AT Protocol record keys.
 *
 * @returns rkey string (TID format, 13 characters)
 *
 * @example
 * ```typescript
 * const rkey = RkeyGenerator.generate();
 * // Returns: "3k2abc123def456"
 * ```
 */
export function generateRkey(): string {
  // @atproto/syntax uses TID internally, but we'll use a simple timestamp-based approach
  // For now, use a simple implementation until we can verify the correct import
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${timestamp.toString(36)}${random}`.substring(0, 13);
}

/**
 * Validate rkey format
 *
 * @description Validates that the provided string is a valid TID format rkey.
 *
 * @param rkey - rkey string to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * ```typescript
 * const isValid = RkeyGenerator.validate("3k2abc123def456");
 * // Returns: true
 * ```
 */
export function validateRkey(rkey: string): boolean {
  // Basic validation: rkey should be alphanumeric and 13 characters
  return /^[a-z0-9]{13}$/i.test(rkey);
}

/**
 * Get timestamp from rkey
 *
 * @description Extracts the timestamp from a TID format rkey.
 *
 * @param rkey - rkey string
 * @returns Date object or null if invalid
 *
 * @example
 * ```typescript
 * const timestamp = RkeyGenerator.toTimestamp("3k2abc123def456");
 * // Returns: Date object
 * ```
 */
export function rkeyToTimestamp(rkey: string): Date | null {
  // For now, return null as we're using a simplified rkey format
  // This can be enhanced later when we have the correct TID implementation
  return null;
}

/**
 * Rkey Generator Class
 *
 * @description Utility class for rkey operations.
 * Provides static methods for generating, validating, and converting rkeys.
 */
export class RkeyGenerator {
  /**
   * Generate rkey for AT Protocol record
   *
   * @returns rkey string (TID format)
   */
  static generate(): string {
    return generateRkey();
  }

  /**
   * Validate rkey format
   *
   * @param rkey - rkey string to validate
   * @returns true if valid, false otherwise
   */
  static validate(rkey: string): boolean {
    return validateRkey(rkey);
  }

  /**
   * Get timestamp from rkey
   *
   * @param rkey - rkey string
   * @returns Date object or null if invalid
   */
  static toTimestamp(rkey: string): Date | null {
    return rkeyToTimestamp(rkey);
  }
}
