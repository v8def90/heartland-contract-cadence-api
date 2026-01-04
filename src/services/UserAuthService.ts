/**
 * User Authentication Service
 *
 * @description Unified authentication service for email/password and Flow wallet authentication.
 * Handles user registration, login, and DID generation via PDS integration.
 *
 * @author Heart Token API Team
 * @since 1.0.0
 */

import crypto from 'crypto';
import { PasswordService } from './PasswordService';
import { EmailVerificationService } from './EmailVerificationService';
import { EmailService } from './EmailService';
import { PdsService } from './PdsService';
import { SnsService, type DynamoDBIdentityLinkItem } from './SnsService';
import { TokenService } from './TokenService';
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
  private tokenService: TokenService;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.passwordService = PasswordService.getInstance();
    this.emailVerificationService = EmailVerificationService.getInstance();
    this.emailService = EmailService.getInstance();
    this.pdsService = PdsService.getInstance();
    this.snsService = new SnsService();
    this.tokenService = new TokenService();
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
   * Creates DID via PDS using a temporary password, stores user profile and credentials, and sends verification email.
   * The handle should contain only the username part (e.g., "username").
   * The domain part will be automatically appended based on PDS_ENDPOINT.
   * After email verification, user must set their password using setInitialPassword.
   *
   * @param email - User email address
   * @param displayName - User display name
   * @param handle - AT Protocol handle username (domain will be automatically appended)
   * @param description - Optional user bio/description
   * @returns Registration result with DID and auth data
   *
   * @example
   * ```typescript
   * const result = await authService.registerWithEmailPassword(
   *   'user@example.com',
   *   'John Doe',
   *   'username',  // Domain will be automatically appended
   *   'Optional bio'
   * );
   * ```
   */
  public async registerWithEmailPassword(
    email: string,
    displayName: string,
    handle?: string,
    description?: string
  ): Promise<RegistrationResult> {
    try {
      // Normalize email
      const normalizedEmail = this.normalizeEmail(email);

      // Generate temporary password for PDS account creation
      const temporaryPassword =
        this.passwordService.generateTemporaryPassword(32);
      console.log('Generated temporary password for account creation');

      // Check if email already exists (via identity lookup)
      const existingLookup = await this.snsService.getIdentityLookup(
        `email:${normalizedEmail}`
      );
      let existingPrimaryDid: string | undefined;
      let isDeletedAccount = false;

      if (existingLookup && existingLookup.status === 'verified') {
        // Check if the account is deleted - if so, allow re-registration
        existingPrimaryDid = existingLookup.primaryDid;
        const existingProfile =
          await this.snsService.getUserProfileItem(existingPrimaryDid);

        console.log('Checking existing account for re-registration:', {
          email: normalizedEmail,
          primaryDid: existingPrimaryDid,
          profileExists: !!existingProfile,
          accountStatus: existingProfile?.accountStatus,
        });

        // If account is deleted or accountStatus is null/undefined, allow re-registration
        if (existingProfile) {
          if (existingProfile.accountStatus === 'active') {
            // Account exists and is active - prevent re-registration
            return {
              success: false,
              error: 'Email already registered',
            };
          } else {
            // Account is deleted, suspended, or has null/undefined status - allow re-registration
            isDeletedAccount = true;
            console.log(
              'Re-registering account (deleted/suspended/null status):',
              {
                email: normalizedEmail,
                primaryDid: existingPrimaryDid,
                accountStatus: existingProfile.accountStatus,
              }
            );
          }
        } else {
          // Profile not found but lookup exists - this shouldn't happen, but allow registration
          console.warn('Identity lookup exists but profile not found:', {
            email: normalizedEmail,
            primaryDid: existingPrimaryDid,
          });
          // Allow registration to proceed
        }
      }

      // Create account via PDS (generate DID)
      // handle is required by AT Protocol
      if (!handle) {
        return {
          success: false,
          error: 'Handle is required for account creation',
        };
      }

      // Append domain to handle if not already present
      // This allows clients to send just the username part
      let fullHandle = handle;
      const handleDomain = this.pdsService.getHandleDomain();

      // Check if handle already contains the domain
      if (handle.endsWith(`.${handleDomain}`)) {
        // Handle already includes the domain, use as is
        fullHandle = handle;
      } else {
        // Append domain to handle (assume it's just the username)
        fullHandle = `${handle}.${handleDomain}`;
      }

      let primaryDid: string;
      let finalHandle: string;
      let pdsAccessJwt: string | undefined;
      let pdsRefreshJwt: string | undefined;

      if (isDeletedAccount && existingPrimaryDid) {
        // For deleted accounts, PDS account was already deleted
        // Create a new PDS account with a new handle (or reuse if handle is available)
        // Use the new DID from PDS server (not the old one)
        const pdsResult = await this.pdsService.createAccount(
          normalizedEmail,
          temporaryPassword, // Use temporary password
          fullHandle
        );

        if (!pdsResult.success || !pdsResult.did) {
          return {
            success: false,
            error: pdsResult.error || 'Failed to create account via PDS',
          };
        }

        // Use the new DID from PDS server (not the old one)
        primaryDid = pdsResult.did; // Use new DID from PDS
        finalHandle = pdsResult.handle || fullHandle;
        pdsAccessJwt = pdsResult.accessJwt;
        pdsRefreshJwt = pdsResult.refreshJwt;

        // Migrate existing data from old DID to new DID
        // 1. Update existing profile to new DID (or create new profile if old one doesn't exist)
        try {
          const existingProfile =
            await this.snsService.getUserProfileItem(existingPrimaryDid);
          if (existingProfile) {
            // Delete old profile and create new one with new DID
            // Note: We keep the old profile for audit purposes (soft delete already done)
            // Just create a new profile with the new DID
            console.log(
              'Migrating profile from old DID to new DID:',
              existingPrimaryDid,
              '->',
              primaryDid
            );
          }
        } catch (error) {
          console.warn(
            'Error checking existing profile during migration:',
            error
          );
          // Continue with registration even if profile check fails
        }

        // 2. Migrate IdentityLinks from old DID to new DID
        try {
          const oldIdentityLinks =
            await this.snsService.queryIdentityLinks(existingPrimaryDid);
          for (const oldLink of oldIdentityLinks) {
            // Create new IdentityLink with new DID
            // Keep old link for audit purposes
            // Encrypt temporary password for storage
            const encryptedTemporaryPassword =
              this.passwordService.encryptTemporaryPassword(temporaryPassword);

            const newLinkData: any = {
              linkedId: oldLink.linkedId,
              kind: oldLink.kind,
              role: oldLink.role,
              status: 'pending', // Reset status for re-registration
              email: oldLink.email,
              emailNormalized: oldLink.emailNormalized,
              emailVerified: false, // Reset verification status
              // passwordHash is not set here - will be set in setInitialPassword
              temporaryPasswordEncrypted: encryptedTemporaryPassword,
              temporaryPasswordCreatedAt: new Date().toISOString(),
              passwordChangedFromTemporary: false,
              kdfParams: {
                cost: 12,
              },
              failedLoginCount: 0,
            };

            // Save PDS tokens if available
            if (pdsAccessJwt) {
              newLinkData.pdsAccessJwt = pdsAccessJwt;
            }
            if (pdsRefreshJwt) {
              newLinkData.pdsRefreshJwt = pdsRefreshJwt;
            }
            if (pdsAccessJwt) {
              newLinkData.pdsTokensUpdatedAt = new Date().toISOString();
            }

            // Create new IdentityLink with new DID
            await this.snsService.createIdentityLink(primaryDid, newLinkData);
          }
        } catch (error) {
          console.warn(
            'Error migrating IdentityLinks during re-registration:',
            error
          );
          // Continue with registration even if migration fails
        }

        // 3. Update IdentityLookup to point to new DID
        try {
          const existingLookup = await this.snsService.getIdentityLookup(
            `email:${normalizedEmail}`
          );
          if (existingLookup) {
            await this.snsService.updateIdentityLookup(
              `email:${normalizedEmail}`,
              {
                primaryDid,
                status: 'verified',
                emailVerified: false, // Reset verification status
              }
            );
          }
        } catch (error) {
          console.warn(
            'Error updating IdentityLookup during re-registration:',
            error
          );
          // Continue with registration even if update fails
        }
      } else {
        // Create new account via PDS
        const pdsResult = await this.pdsService.createAccount(
          normalizedEmail,
          temporaryPassword, // Use temporary password
          fullHandle
        );

        if (!pdsResult.success || !pdsResult.did) {
          return {
            success: false,
            error: pdsResult.error || 'Failed to create account via PDS',
          };
        }

        primaryDid = pdsResult.did;
        finalHandle = pdsResult.handle || fullHandle;
        pdsAccessJwt = pdsResult.accessJwt;
        pdsRefreshJwt = pdsResult.refreshJwt;
      }

      // Extract username from handle
      const username = finalHandle ? finalHandle.split('.')[0] : undefined;

      // Create user profile (DynamoDBUserProfileItem)
      // For re-registration, this will create a new profile with the new DID
      // The old profile (with old DID) remains for audit purposes
      await this.snsService.createUserProfileItem(primaryDid, {
        handle: finalHandle || '',
        ...(username && { username }),
        displayName,
        ...(description && { bio: description }), // Map description to bio field
        followerCount: 0,
        followingCount: 0,
        postCount: 0,
        primaryEmail: normalizedEmail,
        primaryEmailNormalized: normalizedEmail,
        email: normalizedEmail, // For search
        emailLoginEnabled: true,
        authProviders: {
          emailPassword: true,
        },
        accountStatus: 'active',
      });

      // Create identity link (DynamoDBIdentityLinkItem)
      // For re-registration, this will create a new link with the new DID
      // The old link (with old DID) remains for audit purposes
      if (!isDeletedAccount || !existingPrimaryDid) {
        // Only create new IdentityLink if this is a new account
        // For re-registration, IdentityLinks were already migrated above
        // Encrypt temporary password for storage
        const encryptedTemporaryPassword =
          this.passwordService.encryptTemporaryPassword(temporaryPassword);

        const identityLinkData: any = {
          linkedId: `email:${normalizedEmail}`,
          kind: 'account',
          role: 'login',
          status: 'pending',
          email: normalizedEmail,
          emailNormalized: normalizedEmail,
          emailVerified: false,
          // passwordHash is not set here - will be set in setInitialPassword
          temporaryPasswordEncrypted: encryptedTemporaryPassword,
          temporaryPasswordCreatedAt: new Date().toISOString(),
          passwordChangedFromTemporary: false,
          kdfParams: {
            cost: 12, // bcrypt rounds
          },
          failedLoginCount: 0,
        };

        // Save PDS tokens for account deletion if available
        if (pdsAccessJwt) {
          identityLinkData.pdsAccessJwt = pdsAccessJwt;
        }
        if (pdsRefreshJwt) {
          identityLinkData.pdsRefreshJwt = pdsRefreshJwt;
        }
        if (pdsAccessJwt) {
          identityLinkData.pdsTokensUpdatedAt = new Date().toISOString();
        }

        await this.snsService.createIdentityLink(primaryDid, identityLinkData);
      }

      // Create or update identity lookup (DynamoDBIdentityLookupItem)
      // For re-registration, this was already updated above
      if (!isDeletedAccount || !existingPrimaryDid) {
        // Only create new IdentityLookup if this is a new account
        // For re-registration, IdentityLookup was already updated above
        await this.snsService.createIdentityLookup(`email:${normalizedEmail}`, {
          primaryDid,
          status: 'verified',
          linkType: 'email',
          emailNormalized: normalizedEmail,
          emailVerified: false,
        });
      }

      // Initialize token balance for new account
      // This should happen after account creation is successful
      // If balance initialization fails, log the error but don't fail registration
      try {
        await this.tokenService.initializeBalance(primaryDid);
        console.log(
          `Successfully initialized token balance for ${primaryDid} with 1000 HEART`
        );
      } catch (error) {
        // Log error but don't fail registration
        // Balance can be manually initialized later if needed
        console.error(
          `Failed to initialize token balance for ${primaryDid}:`,
          error
        );
        console.error(
          `Account registration succeeded, but balance initialization failed. ` +
            `Balance should be manually initialized for DID: ${primaryDid}`
        );
        // TODO: Send notification to administrators about failed balance initialization
      }

      // Generate email verification token
      const { token, expiresAt } =
        await this.emailVerificationService.generateVerificationToken(
          primaryDid,
          normalizedEmail
        );
      const tokenHash = this.emailVerificationService.getTokenHash(token);

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

      const payload = require('../middleware/passport').verifyJwtToken(
        jwtToken
      );
      const expiresIn = payload ? payload.exp - payload.iat : 86400;

      // Get user profile for displayName and handle
      const userProfile = await this.snsService.getUserProfileItem(primaryDid);

      const authData: AuthData = {
        token: jwtToken,
        expiresIn,
        email: normalizedEmail,
        did: primaryDid,
        ...(userProfile?.displayName && { displayName: userProfile.displayName }),
        ...(userProfile?.handle && { handle: userProfile.handle }),
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

      // Check if account is deleted
      const profile = await this.snsService.getUserProfileItem(primaryDid);
      if (profile && profile.accountStatus === 'deleted') {
        return {
          success: false,
          error: 'Account has been deleted',
        };
      }

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

      // Check if password has been changed from temporary password
      // If passwordChangedFromTemporary is false or undefined (for existing users), allow login
      // Only block if explicitly false (new users who haven't set password)
      if (identityLink.passwordChangedFromTemporary === false) {
        return {
          success: false,
          error: 'PASSWORD_NOT_SET',
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

      const payload = require('../middleware/passport').verifyJwtToken(
        jwtToken
      );
      const expiresIn = payload ? payload.exp - payload.iat : 86400;

      // Get user profile for displayName and handle
      const userProfile = profile || (await this.snsService.getUserProfileItem(primaryDid));

      const authData: AuthData = {
        token: jwtToken,
        expiresIn,
        email: normalizedEmail,
        did: primaryDid,
        ...(userProfile?.displayName && { displayName: userProfile.displayName }),
        ...(userProfile?.handle && { handle: userProfile.handle }),
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
   * Request password reset
   *
   * @description Initiates password reset process by generating a reset token and sending reset email.
   *
   * @param email - User email address
   * @returns Success result
   *
   * @example
   * ```typescript
   * const result = await authService.requestPasswordReset('user@example.com');
   * ```
   */
  public async requestPasswordReset(
    email: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const normalizedEmail = this.normalizeEmail(email);

      // Get user by email (via identity lookup)
      const lookup = await this.snsService.getIdentityLookup(
        `email:${normalizedEmail}`
      );
      if (!lookup || lookup.status !== 'verified') {
        // Don't reveal if email exists for security
        return {
          success: true, // Return success even if email doesn't exist
        };
      }

      const primaryDid = lookup.primaryDid;

      // Get identity link
      const identityLink = await this.snsService.getIdentityLink(
        primaryDid,
        `email:${normalizedEmail}`
      );
      if (!identityLink || !identityLink.emailVerified) {
        // Don't reveal if email exists for security
        return {
          success: true,
        };
      }

      // Generate password reset token
      const resetToken = this.passwordService.generateResetToken(32);
      const tokenHash = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
      const expiresAt = new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ).toISOString(); // 24 hours

      // Store reset token in identity link
      await this.snsService.updateIdentityLink(
        primaryDid,
        `email:${normalizedEmail}`,
        {
          resetTokenHash: tokenHash,
          resetTokenExpiresAt: expiresAt,
          resetRequestedAt: new Date().toISOString(),
        }
      );

      // Send password reset email
      await this.emailService.sendPasswordResetEmail(
        normalizedEmail,
        resetToken,
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
   * Reset password using reset token
   *
   * @description Resets user password using a valid reset token.
   *
   * @param token - Password reset token
   * @param primaryDid - User's primary DID
   * @param newPassword - New password
   * @returns Success result
   *
   * @example
   * ```typescript
   * const result = await authService.resetPassword(
   *   'reset-token-123',
   *   'did:plc:xxx',
   *   'NewSecurePass123!'
   * );
   * ```
   */
  public async resetPassword(
    token: string,
    primaryDid: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate password strength
      const passwordValidation =
        this.passwordService.validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        return {
          success: false,
          error: `Password validation failed: ${passwordValidation.errors.join(', ')}`,
        };
      }

      // Query all identity links for this primaryDid to find email link
      const identityLinks =
        await this.snsService.queryIdentityLinks(primaryDid);

      // Find email identity link with reset token
      const identityLink = identityLinks.find(
        link =>
          link.linkedId.startsWith('email:') &&
          link.resetTokenHash &&
          link.resetTokenExpiresAt
      );

      if (!identityLink) {
        return {
          success: false,
          error: 'Invalid or expired reset token',
        };
      }

      // Verify token
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const storedHash = identityLink.resetTokenHash;

      if (!storedHash || tokenHash !== storedHash) {
        return {
          success: false,
          error: 'Invalid reset token',
        };
      }

      // Check expiration
      if (
        !identityLink.resetTokenExpiresAt ||
        new Date(identityLink.resetTokenExpiresAt) < new Date()
      ) {
        return {
          success: false,
          error: 'Reset token has expired',
        };
      }

      // Hash new password
      const passwordHash = await this.passwordService.hashPassword(newPassword);

      // Update password and clear reset token
      await this.snsService.updateIdentityLink(
        primaryDid,
        identityLink.linkedId,
        {
          passwordHash,
          passwordUpdatedAt: new Date().toISOString(),
          failedLoginCount: 0, // Reset failed login count
        },
        ['resetTokenHash', 'resetTokenExpiresAt'] // Remove reset token fields
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
   * Change password for authenticated user
   *
   * @description Changes password for an authenticated user after verifying current password.
   *
   * @param primaryDid - User's primary DID
   * @param currentPassword - Current password
   * @param newPassword - New password
   * @returns Success result
   *
   * @example
   * ```typescript
   * const result = await authService.changePassword(
   *   'did:plc:xxx',
   *   'OldPassword123!',
   *   'NewSecurePass123!'
   * );
   * ```
   */
  public async changePassword(
    primaryDid: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate new password strength
      const passwordValidation =
        this.passwordService.validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        return {
          success: false,
          error: `Password validation failed: ${passwordValidation.errors.join(', ')}`,
        };
      }

      // Query all identity links for this primaryDid to find email link
      const identityLinks =
        await this.snsService.queryIdentityLinks(primaryDid);

      // Find email identity link
      const identityLink = identityLinks.find(link =>
        link.linkedId.startsWith('email:')
      );

      if (!identityLink || !identityLink.passwordHash) {
        return {
          success: false,
          error: 'Password authentication not found for this account',
        };
      }

      // Verify current password
      const isValidPassword = await this.passwordService.verifyPassword(
        currentPassword,
        identityLink.passwordHash
      );

      if (!isValidPassword) {
        return {
          success: false,
          error: 'Current password is incorrect',
        };
      }

      // Update PDS-side password if pdsAccessJwt is available
      if (identityLink.pdsAccessJwt) {
        const pdsUpdateResult = await this.pdsService.changePassword(
          primaryDid,
          currentPassword, // oldPassword = current password
          newPassword, // newPassword = new password
          identityLink.pdsAccessJwt
        );

        if (!pdsUpdateResult.success) {
          // Log warning but continue with API-side update
          console.warn(
            'PDS password update failed, continuing with API-side update:',
            pdsUpdateResult.error
          );
        }
      }

      // Hash new password for API-side storage
      const passwordHash = await this.passwordService.hashPassword(newPassword);

      // Update API-side password
      await this.snsService.updateIdentityLink(
        primaryDid,
        identityLink.linkedId,
        {
          passwordHash,
          passwordUpdatedAt: new Date().toISOString(),
          failedLoginCount: 0, // Reset failed login count
        }
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

  /**
   * Set initial password after email verification
   *
   * @description Sets the initial password for a user after email verification.
   * Replaces the temporary password with a user-defined password.
   * Updates both API-side and PDS-side passwords.
   *
   * @param primaryDid - User's primary DID
   * @param token - Email verification token
   * @param newPassword - New password to set
   * @returns Success result
   *
   * @example
   * ```typescript
   * const result = await authService.setInitialPassword(
   *   'did:plc:xxx',
   *   'verification-token-123',
   *   'NewSecurePass123!'
   * );
   * ```
   */
  public async setInitialPassword(
    primaryDid: string,
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate password strength
      const passwordValidation =
        this.passwordService.validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        return {
          success: false,
          error: `Password validation failed: ${passwordValidation.errors.join(', ')}`,
        };
      }

      // Get identity link to verify token and get temporary password
      const identityLinks =
        await this.snsService.queryIdentityLinks(primaryDid);
      const emailLink = identityLinks.find(link =>
        link.linkedId.startsWith('email:')
      );

      if (!emailLink) {
        return {
          success: false,
          error: 'Email identity link not found',
        };
      }

      // Verify email verification token
      if (
        !emailLink.emailVerifyTokenHash ||
        !emailLink.emailVerifyTokenExpiresAt
      ) {
        return {
          success: false,
          error: 'Verification token not found',
        };
      }

      const emailVerificationService = this.emailVerificationService;
      const isValid = await emailVerificationService.verifyToken(
        token,
        emailLink.emailVerifyTokenHash,
        emailLink.emailVerifyTokenExpiresAt
      );

      if (!isValid) {
        return {
          success: false,
          error: 'Invalid or expired verification token',
        };
      }

      // Check if email is verified
      if (!emailLink.emailVerified) {
        return {
          success: false,
          error: 'Email not verified',
        };
      }

      // Check if password has already been changed from temporary
      if (emailLink.passwordChangedFromTemporary) {
        return {
          success: false,
          error: 'Password has already been set',
        };
      }

      // Decrypt temporary password
      let temporaryPassword: string | null = null;
      if (emailLink.temporaryPasswordEncrypted) {
        try {
          temporaryPassword = this.passwordService.decryptTemporaryPassword(
            emailLink.temporaryPasswordEncrypted
          );
        } catch (error) {
          console.error('Failed to decrypt temporary password:', error);
          return {
            success: false,
            error: 'Failed to decrypt temporary password',
          };
        }
      }

      // Update PDS-side password if temporary password is available
      if (temporaryPassword && emailLink.pdsAccessJwt) {
        const pdsUpdateResult = await this.pdsService.changePassword(
          primaryDid,
          temporaryPassword, // oldPassword = temporary password
          newPassword, // newPassword = user-defined password
          emailLink.pdsAccessJwt
        );

        if (!pdsUpdateResult.success) {
          // Log warning but continue with API-side update
          console.warn(
            'PDS password update failed, continuing with API-side update:',
            pdsUpdateResult.error
          );
        }
      }

      // Hash new password for API-side storage
      const passwordHash = await this.passwordService.hashPassword(newPassword);

      // Update API-side password and clear temporary password
      await this.snsService.updateIdentityLink(
        primaryDid,
        emailLink.linkedId,
        {
          passwordHash,
          passwordUpdatedAt: new Date().toISOString(),
          passwordChangedFromTemporary: true,
          failedLoginCount: 0, // Reset failed login count
        },
        ['temporaryPasswordEncrypted', 'temporaryPasswordCreatedAt'] // Remove temporary password fields
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
}
