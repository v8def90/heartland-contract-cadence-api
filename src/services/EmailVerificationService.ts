/**
 * Email Verification Service
 *
 * @description Handles email verification token generation, validation, and management.
 * Provides secure token-based email verification with rate limiting and expiration.
 *
 * @author Heart Token API Team
 * @since 1.0.0
 */

import crypto from 'crypto';

/**
 * Email verification token result
 */
export interface EmailVerificationTokenResult {
  token: string;
  expiresAt: string;
}

/**
 * Email verification status
 */
export interface EmailVerificationStatus {
  isVerified: boolean;
  canResend: boolean;
  nextResendAt?: string;
}

/**
 * Email Verification Service
 *
 * @description Manages email verification tokens and status.
 * Tokens are hashed before storage for security.
 *
 * @example
 * ```typescript
 * const service = EmailVerificationService.getInstance();
 * const { token, expiresAt } = await service.generateVerificationToken(did, email);
 * ```
 */
export class EmailVerificationService {
  private static instance: EmailVerificationService;

  /**
   * Token expiration time in milliseconds (default: 24 hours)
   */
  private readonly tokenExpiry: number;

  /**
   * Maximum resend attempts per day (default: 3)
   */
  private readonly maxResendsPerDay: number;

  /**
   * Minimum time between resends in milliseconds (default: 5 minutes)
   */
  private readonly minResendInterval: number;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.tokenExpiry = parseInt(
      process.env.EMAIL_VERIFICATION_TOKEN_EXPIRY || '86400000',
      10
    ); // 24 hours
    this.maxResendsPerDay = parseInt(
      process.env.EMAIL_VERIFICATION_MAX_RESENDS || '3',
      10
    );
    this.minResendInterval = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get singleton instance
   *
   * @returns EmailVerificationService instance
   */
  public static getInstance(): EmailVerificationService {
    if (!EmailVerificationService.instance) {
      EmailVerificationService.instance = new EmailVerificationService();
    }
    return EmailVerificationService.instance;
  }

  /**
   * Generate secure random token
   *
   * @description Generates a cryptographically secure random token for email verification.
   *
   * @param length - Token length in bytes (default: 32)
   * @returns Base64 URL-safe encoded token
   */
  private generateToken(length: number = 32): string {
    const randomBytes = crypto.randomBytes(length);
    return randomBytes.toString('base64url');
  }

  /**
   * Hash token for storage
   *
   * @description Hashes a token using SHA-256 for secure storage.
   *
   * @param token - Plain token
   * @returns SHA-256 hash of token
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }


  /**
   * Generate email verification token
   *
   * @description Generates a new email verification token with expiration.
   * The token should be sent to the user via email.
   *
   * @param primaryDid - User's primary DID
   * @param email - Email address to verify
   * @returns Token and expiration timestamp
   *
   * @example
   * ```typescript
   * const { token, expiresAt } = await service.generateVerificationToken(did, email);
   * // Store token hash in database
   * // Send token to user via email
   * ```
   */
  public async generateVerificationToken(
    primaryDid: string,
    email: string
  ): Promise<EmailVerificationTokenResult> {
    const token = this.generateToken(32);
    const expiresAt = new Date(Date.now() + this.tokenExpiry).toISOString();

    return {
      token,
      expiresAt,
    };
  }

  /**
   * Get token hash for storage
   *
   * @description Returns the hash of a token for secure database storage.
   *
   * @param token - Plain token
   * @returns Token hash
   */
  public getTokenHash(token: string): string {
    return this.hashToken(token);
  }

  /**
   * Verify email verification token
   *
   * @description Verifies an email verification token.
   * This method should be called with the token hash from the database.
   *
   * @param token - Plain token from user
   * @param tokenHash - Stored token hash from database
   * @param expiresAt - Token expiration timestamp
   * @returns True if token is valid, false otherwise
   *
   * @example
   * ```typescript
   * const isValid = await service.verifyToken(token, storedHash, expiresAt);
   * if (isValid) {
   *   // Mark email as verified
   * }
   * ```
   */
  public async verifyToken(
    token: string,
    tokenHash: string,
    expiresAt: string
  ): Promise<boolean> {
    // Check expiration
    if (new Date(expiresAt) < new Date()) {
      return false;
    }

    // Verify token hash
    return this.verifyTokenHash(token, tokenHash);
  }

  /**
   * Verify token hash (internal method)
   *
   * @description Internal method to verify token against hash.
   *
   * @param token - Plain token
   * @param hash - Stored hash
   * @returns True if token matches hash
   */
  private verifyTokenHash(token: string, hash: string): boolean {
    const tokenHash = this.hashToken(token);
    return crypto.timingSafeEqual(
      Buffer.from(tokenHash),
      Buffer.from(hash)
    );
  }

  /**
   * Check if resend is allowed
   *
   * @description Checks if a verification email can be resent based on rate limits.
   *
   * @param lastSentAt - Last send timestamp (ISO string)
   * @param resendCount - Number of resends in the last 24 hours
   * @returns True if resend is allowed, false otherwise
   */
  public canResend(
    lastSentAt?: string,
    resendCount: number = 0
  ): { allowed: boolean; nextResendAt?: string } {
    // Check daily limit
    if (resendCount >= this.maxResendsPerDay) {
      const nextResendAt = new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ).toISOString(); // 24 hours from now
      return {
        allowed: false,
        nextResendAt,
      };
    }

    // Check minimum interval
    if (lastSentAt) {
      const lastSent = new Date(lastSentAt);
      const minNextResend = new Date(
        lastSent.getTime() + this.minResendInterval
      );

      if (minNextResend > new Date()) {
        return {
          allowed: false,
          nextResendAt: minNextResend.toISOString(),
        };
      }
    }

    return {
      allowed: true,
    };
  }

  /**
   * Get verification status
   *
   * @description Returns the verification status for an email address.
   *
   * @param isVerified - Whether email is verified
   * @param lastSentAt - Last send timestamp
   * @param resendCount - Number of resends in last 24 hours
   * @returns Verification status
   */
  public getVerificationStatus(
    isVerified: boolean,
    lastSentAt?: string,
    resendCount: number = 0
  ): EmailVerificationStatus {
    const resendCheck = this.canResend(lastSentAt, resendCount);

    return {
      isVerified,
      canResend: resendCheck.allowed,
      ...(resendCheck.nextResendAt && { nextResendAt: resendCheck.nextResendAt }),
    };
  }
}

