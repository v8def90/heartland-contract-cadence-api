/**
 * rkey (Record Key) Generator Utility
 *
 * @description Provides utilities for generating, validating, and converting
 * AT Protocol record keys (rkey) using TID (Time-based ID) format.
 *
 * @author Heart Token API Team
 * @since 1.0.0
 */

import { TID } from '@atproto/syntax';

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
  return TID.next();
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
  return TID.isValid(rkey);
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
  try {
    return TID.toTimestamp(rkey);
  } catch {
    return null;
  }
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

