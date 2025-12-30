/**
 * User Authentication Service
 *
 * @description Unified authentication service for email/password and Flow wallet authentication.
 * Handles user registration, login, and DID generation via PDS integration.
 *
 * @author Heart Token API Team
 * @since 1.0.0
 */

import { PasswordService } from './PasswordService';
import { EmailVerificationService } from './EmailVerificationService';
import { EmailService } from './EmailService';
import { PdsService } from './PdsService';
import {
  SnsService,
  type DynamoDBIdentityLinkItem,
} from './SnsService';
import { generateJwtToken } from '../middleware/passport';
import type { AuthData } from '../models/responses';

/**
 * Registration result
 */
export interface RegistrationResult {
  success: boolean;
  primaryDid?: string;
  email?: string;
  emailVerified?: boolean;
  verificationTokenSent?: boolean;
  authData?: AuthData;
  error?: string;
}

/**
 * Login result
 */
export interface LoginResult {
  success: boolean;
  primaryDid?: string;
  authData?: AuthData;
  error?: string;
}

/**
 * User Authentication Service
 *
 * @description Provides unified authentication for multiple methods.
 * Integrates with PDS for DID generation and manages user credentials.
 *
 * @example
 * ```typescript
 * const authService = UserAuthService.getInstance();
 * const result = await authService.registerWithEmailPassword(email, password, displayName);
 * ```
 */
export class UserAuthService {
  private static instance: UserAuthService;

  private passwordService: PasswordService;
  private emailVerificationService: EmailVerificationService;
  private emailService: EmailService;
  private pdsService: PdsService;
  private snsService: SnsService;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.passwordService = PasswordService.getInstance();
    this.emailVerificationService = EmailVerificationService.getInstance();
    this.emailService = EmailService.getInstance();
    this.pdsService = PdsService.getInstance();
    this.snsService = new SnsService();
  }

  /**
   * Get singleton instance
   *
   * @returns UserAuthService instance
   */
  public static getInstance(): UserAuthService {
    if (!UserAuthService.instance) {
      UserAuthService.instance = new UserAuthService();
    }
    return UserAuthService.instance;
  }

  /**
   * Normalize email address
   *
   * @description Normalizes email address for consistent storage and lookup.
   *
   * @param email - Email address
   * @returns Normalized email address
   */
  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  /**
   * Register new user with email/password
   *
   * @description Registers a new user with email/password authentication.
   * Creates DID via PDS, stores user profile and credentials, and sends verification email.
   *
   * @param email - User email address
   * @param password - User password
   * @param displayName - User display name
   * @param handle - Optional AT Protocol handle
   * @returns Registration result with DID and auth data
   *
   * @example
   * ```typescript
   * const result = await authService.registerWithEmailPassword(
   *   'user@example.com',
   *   'password123',
   *   'John Doe'
   * );
   * ```
   */
  public async registerWithEmailPassword(
    email: string,
    password: string,
    displayName: string,
    handle?: string
  ): Promise<RegistrationResult> {
    try {
      // Normalize email
      const normalizedEmail = this.normalizeEmail(email);

      // Validate password strength
      const passwordValidation =
        this.passwordService.validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        return {
          success: false,
          error: `Password validation failed: ${passwordValidation.errors.join(', ')}`,
        };
      }

      // Check if email already exists (via identity lookup)
      const existingLookup = await this.snsService.getIdentityLookup(
        `email:${normalizedEmail}`
      );
      if (existingLookup && existingLookup.status === 'verified') {
        return {
          success: false,
          error: 'Email already registered',
        };
      }

      // Hash password
      const passwordHash = await this.passwordService.hashPassword(password);

      // Create account via PDS (generate DID)
      const pdsResult = await this.pdsService.createAccount(
        normalizedEmail,
        password,
        handle
      );

      if (!pdsResult.success || !pdsResult.did) {
        return {
          success: false,
          error: pdsResult.error || 'Failed to create account via PDS',
        };
      }

      const primaryDid = pdsResult.did;
      const finalHandle = pdsResult.handle || handle;

      // Create user profile (DynamoDBUserProfileItem)
      await this.snsService.createUserProfileItem(primaryDid, {
        handle: finalHandle || '',
        displayName,
        followerCount: 0,
        followingCount: 0,
        postCount: 0,
        primaryEmail: normalizedEmail,
        primaryEmailNormalized: normalizedEmail,
        emailLoginEnabled: true,
        authProviders: {
          emailPassword: true,
        },
        accountStatus: 'active',
      });

      // Create identity link (DynamoDBIdentityLinkItem)
      await this.snsService.createIdentityLink(primaryDid, {
        linkedId: `email:${normalizedEmail}`,
        kind: 'account',
        role: 'login',
        status: 'pending',
        email: normalizedEmail,
        emailNormalized: normalizedEmail,
        emailVerified: false,
        passwordHash,
        passwordKdf: 'bcrypt',
        passwordUpdatedAt: new Date().toISOString(),
        kdfParams: {
          cost: 12, // bcrypt rounds
        },
        failedLoginCount: 0,
      });

      // Create identity lookup (DynamoDBIdentityLookupItem)
      await this.snsService.createIdentityLookup(`email:${normalizedEmail}`, {
        primaryDid,
        status: 'verified',
        linkType: 'email',
        emailNormalized: normalizedEmail,
        emailVerified: false,
      });

      // Generate email verification token
      const { token, expiresAt } =
        await this.emailVerificationService.generateVerificationToken(
          primaryDid,
          normalizedEmail
        );
      const tokenHash =
        this.emailVerificationService.getTokenHash(token);

      // Store verification token (in identity link)
      await this.snsService.updateIdentityLink(
        primaryDid,
        `email:${normalizedEmail}`,
        {
          emailVerifyTokenHash: tokenHash,
          emailVerifyTokenExpiresAt: expiresAt,
          emailVerifySentAt: new Date().toISOString(),
        }
      );

      // Send verification email
      await this.emailService.sendVerificationEmail(
        normalizedEmail,
        token,
        primaryDid
      );

      // Send welcome email
      await this.emailService.sendWelcomeEmail(
        normalizedEmail,
        displayName,
        primaryDid
      );

      // Generate JWT token (optional, for immediate login)
      const jwtToken = generateJwtToken(
        primaryDid,
        'email',
        'user',
        undefined,
        normalizedEmail
      );

      const payload = require('../middleware/passport').verifyJwtToken(jwtToken);
      const expiresIn = payload ? payload.exp - payload.iat : 86400;

      const authData: AuthData = {
        token: jwtToken,
        expiresIn,
        email: normalizedEmail,
        role: 'user',
        issuedAt: new Date(payload.iat * 1000).toISOString(),
      };

      return {
        success: true,
        primaryDid,
        email: normalizedEmail,
        emailVerified: false,
        verificationTokenSent: true,
        authData,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Login with email/password
   *
   * @description Authenticates a user with email/password.
   * Verifies password and email verification status, then generates JWT token.
   *
   * @param email - User email address
   * @param password - User password
   * @returns Login result with auth data
   *
   * @example
   * ```typescript
   * const result = await authService.loginWithEmailPassword(
   *   'user@example.com',
   *   'password123'
   * );
   * ```
   */
  public async loginWithEmailPassword(
    email: string,
    password: string
  ): Promise<LoginResult> {
    try {
      // Normalize email
      const normalizedEmail = this.normalizeEmail(email);

      // Get user by email (via identity lookup)
      const lookup = await this.snsService.getIdentityLookup(
        `email:${normalizedEmail}`
      );
      if (!lookup || lookup.status !== 'verified') {
        return {
          success: false,
          error: 'User not found',
        };
      }

      const primaryDid = lookup.primaryDid;

      // Get identity link (credentials)
      const identityLink = await this.snsService.getIdentityLink(
        primaryDid,
        `email:${normalizedEmail}`
      );
      if (!identityLink) {
        return {
          success: false,
          error: 'Authentication credentials not found',
        };
      }

      // Check account lock
      if (
        identityLink.lockUntil &&
        new Date(identityLink.lockUntil) > new Date()
      ) {
        return {
          success: false,
          error: `Account is locked until ${identityLink.lockUntil}`,
        };
      }

      // Verify password
      if (!identityLink.passwordHash) {
        return {
          success: false,
          error: 'Password not set for this account',
        };
      }

      const isValidPassword = await this.passwordService.verifyPassword(
        password,
        identityLink.passwordHash
      );

      if (!isValidPassword) {
        // Increment failed login count
        const failedCount = (identityLink.failedLoginCount || 0) + 1;
        const lockUntil =
          failedCount >= 5
            ? new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
            : undefined;

        const updateData: Partial<DynamoDBIdentityLinkItem> = {
          failedLoginCount: failedCount,
          lastFailedLoginAt: new Date().toISOString(),
        };
        if (lockUntil) {
          updateData.lockUntil = lockUntil;
        }
        await this.snsService.updateIdentityLink(
          primaryDid,
          `email:${normalizedEmail}`,
          updateData
        );

        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      // Check email verification (required)
      if (!identityLink.emailVerified) {
        return {
          success: false,
          error: 'EMAIL_NOT_VERIFIED',
        };
      }

      // Reset failed login count and update last login
      await this.snsService.updateIdentityLink(
        primaryDid,
        `email:${normalizedEmail}`,
        {
          failedLoginCount: 0,
          lastLoginAt: new Date().toISOString(),
        }
      );

      // Generate JWT token
      const jwtToken = generateJwtToken(
        primaryDid,
        'email',
        'user',
        undefined,
        normalizedEmail
      );

      const payload = require('../middleware/passport').verifyJwtToken(jwtToken);
      const expiresIn = payload ? payload.exp - payload.iat : 86400;

      const authData: AuthData = {
        token: jwtToken,
        expiresIn,
        email: normalizedEmail,
        role: 'user',
        issuedAt: new Date(payload.iat * 1000).toISOString(),
      };

      return {
        success: true,
        primaryDid,
        authData,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Link email to existing account
   *
   * @description Links an email/password to an existing account (e.g., Flow wallet authenticated user).
   *
   * @param primaryDid - User's primary DID
   * @param email - Email address
   * @param password - Password
   * @returns Success result
   */
  public async linkEmailToAccount(
    primaryDid: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const normalizedEmail = this.normalizeEmail(email);

      // Validate password
      const passwordValidation =
        this.passwordService.validatePasswordStrength(password);
      if (!passwordValidation.valid) {
        return {
          success: false,
          error: `Password validation failed: ${passwordValidation.errors.join(', ')}`,
        };
      }

      // Hash password
      const passwordHash = await this.passwordService.hashPassword(password);

      // Create identity link
      await this.snsService.createIdentityLink(primaryDid, {
        linkedId: `email:${normalizedEmail}`,
        kind: 'account',
        role: 'login',
        status: 'pending',
        email: normalizedEmail,
        emailNormalized: normalizedEmail,
        emailVerified: false,
        passwordHash,
        passwordKdf: 'bcrypt',
        passwordUpdatedAt: new Date().toISOString(),
        kdfParams: {
          cost: 12, // bcrypt rounds
        },
        failedLoginCount: 0,
      });

      // Create identity lookup
      await this.snsService.createIdentityLookup(`email:${normalizedEmail}`, {
        primaryDid,
        status: 'verified',
        linkType: 'email',
        emailNormalized: normalizedEmail,
        emailVerified: false,
      });

      // Generate and send verification email
      const { token } =
        await this.emailVerificationService.generateVerificationToken(
          primaryDid,
          normalizedEmail
        );
      await this.emailService.sendVerificationEmail(
        normalizedEmail,
        token,
        primaryDid
      );

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get user authentication methods
   *
   * @description Returns available authentication methods for a user.
   *
   * @param primaryDid - User's primary DID
   * @returns Authentication methods
   */
  public async getAuthMethods(primaryDid: string): Promise<{
    emailPassword?: boolean;
    flow?: boolean;
    atproto?: boolean;
  }> {
    const profile = await this.snsService.getUserProfileItem(primaryDid);
    return profile?.authProviders || {};
  }
}

