/**
 * Password Service
 *
 * @description Handles password hashing, verification, and strength validation
 * using bcrypt for secure password management.
 *
 * @author Heart Token API Team
 * @since 1.0.0
 */

import bcrypt from 'bcryptjs';

/**
 * Password strength validation result
 */
export interface PasswordStrengthResult {
  valid: boolean;
  errors: string[];
}

/**
 * Password Service
 *
 * @description Provides secure password hashing, verification, and strength validation.
 * Uses bcrypt with configurable salt rounds for password hashing.
 *
 * @example
 * ```typescript
 * const passwordService = PasswordService.getInstance();
 * const hash = await passwordService.hashPassword('myPassword123');
 * const isValid = await passwordService.verifyPassword('myPassword123', hash);
 * ```
 */
export class PasswordService {
  private static instance: PasswordService;

  /**
   * Bcrypt salt rounds (default: 12)
   */
  private readonly saltRounds: number;

  /**
   * Minimum password length (default: 8)
   */
  private readonly minLength: number;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.saltRounds = parseInt(process.env.PASSWORD_BCRYPT_ROUNDS || '12', 10);
    this.minLength = parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10);
  }

  /**
   * Get singleton instance
   *
   * @returns PasswordService instance
   */
  public static getInstance(): PasswordService {
    if (!PasswordService.instance) {
      PasswordService.instance = new PasswordService();
    }
    return PasswordService.instance;
  }

  /**
   * Hash password using bcrypt
   *
   * @description Generates a secure hash of the password using bcrypt.
   * The hash includes salt and can be safely stored in the database.
   *
   * @param password - Plain text password
   * @returns Promise resolving to hashed password
   *
   * @example
   * ```typescript
   * const hash = await passwordService.hashPassword('myPassword123');
   * // Store hash in database
   * ```
   */
  public async hashPassword(password: string): Promise<string> {
    try {
      const hash = await bcrypt.hash(password, this.saltRounds);
      return hash;
    } catch (error) {
      throw new Error(
        `Password hashing failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Verify password against hash
   *
   * @description Verifies a plain text password against a stored hash.
   * Uses timing-safe comparison to prevent timing attacks.
   *
   * @param password - Plain text password to verify
   * @param hash - Stored password hash
   * @returns Promise resolving to true if password matches, false otherwise
   *
   * @example
   * ```typescript
   * const isValid = await passwordService.verifyPassword('myPassword123', storedHash);
   * if (isValid) {
   *   // Password is correct
   * }
   * ```
   */
  public async verifyPassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    try {
      const isValid = await bcrypt.compare(password, hash);
      return isValid;
    } catch (error) {
      throw new Error(
        `Password verification failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Validate password strength
   *
   * @description Validates password strength based on length and complexity requirements.
   * Checks for minimum length and character variety (uppercase, lowercase, numbers, symbols).
   *
   * @param password - Password to validate
   * @returns Password strength validation result
   *
   * @example
   * ```typescript
   * const result = passwordService.validatePasswordStrength('myPassword123');
   * if (!result.valid) {
   *   console.error('Password errors:', result.errors);
   * }
   * ```
   */
  public validatePasswordStrength(password: string): PasswordStrengthResult {
    const errors: string[] = [];

    // Check minimum length
    if (password.length < this.minLength) {
      errors.push(
        `Password must be at least ${this.minLength} characters long`
      );
    }

    // Check for character variety (at least 3 of 4 types)
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSymbols = /[^A-Za-z0-9]/.test(password);

    const typeCount = [
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSymbols,
    ].filter(Boolean).length;

    if (typeCount < 3) {
      errors.push(
        'Password must contain at least 3 of the following: uppercase letters, lowercase letters, numbers, symbols'
      );
    }

    // Check for common passwords (basic check)
    const commonPasswords = [
      'password',
      '12345678',
      'password123',
      'admin123',
      'qwerty123',
    ];
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push(
        'Password is too common. Please choose a more secure password'
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate password reset token
   *
   * @description Generates a secure random token for password reset.
   * The token should be hashed before storing in the database.
   *
   * @param length - Token length in bytes (default: 32)
   * @returns Base64 URL-safe encoded token
   *
   * @example
   * ```typescript
   * const token = passwordService.generateResetToken();
   * // Hash token before storing
   * ```
   */
  public generateResetToken(length: number = 32): string {
    const crypto = require('crypto');
    const randomBytes = crypto.randomBytes(length);
    return randomBytes.toString('base64url');
  }
}
