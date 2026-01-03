/**
 * PDS (Personal Data Server) Service
 *
 * @description Handles integration with AT Protocol PDS for DID generation and account management.
 * Uses custom PDS server (https://pds-dev.heart-land.io) for development.
 * Can be configured via PDS_ENDPOINT environment variable.
 *
 * @author Heart Token API Team
 * @since 1.0.0
 */

import { BskyAgent } from '@atproto/api';

/**
 * PDS account creation result
 */
export interface PdsAccountResult {
  success: boolean;
  did?: string; // did:plc:...
  handle?: string;
  accessJwt?: string;
  refreshJwt?: string;
  error?: string;
}

/**
 * PDS Service
 *
 * @description Manages integration with AT Protocol PDS for DID generation.
 * Uses com.atproto.server.createAccount API (no authentication required).
 *
 * @example
 * ```typescript
 * const pdsService = PdsService.getInstance();
 * const result = await pdsService.createAccount(email, password, handle);
 * ```
 */
export class PdsService {
  private static instance: PdsService;

  /**
   * PDS endpoint URL
   */
  private readonly pdsEndpoint: string;

  /**
   * Request timeout in milliseconds
   */
  private readonly timeout: number;

  /**
   * Maximum retry attempts
   */
  private readonly maxRetries: number;

  /**
   * Default invite code for account creation
   */
  private readonly defaultInviteCode: string | undefined;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.pdsEndpoint =
      process.env.PDS_ENDPOINT || 'https://pds-dev.heart-land.io';
    this.timeout = parseInt(process.env.PDS_TIMEOUT || '30000', 10); // 30 seconds
    this.maxRetries = 3;
    this.defaultInviteCode = process.env.PDS_INVITE_CODE;
  }

  /**
   * Get singleton instance
   *
   * @returns PdsService instance
   */
  public static getInstance(): PdsService {
    if (!PdsService.instance) {
      PdsService.instance = new PdsService();
    }
    return PdsService.instance;
  }

  /**
   * Sleep utility for retry delays
   *
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get handle domain from PDS endpoint
   *
   * @description Extracts the domain part from PDS endpoint URL for handle construction.
   * Removes protocol (http://, https://) and returns the domain.
   *
   * @returns Handle domain (e.g., "pds-dev.heart-land.io")
   *
   * @example
   * ```typescript
   * const domain = pdsService.getHandleDomain();
   * // Returns: "pds-dev.heart-land.io"
   * ```
   */
  public getHandleDomain(): string {
    // Remove protocol (http:// or https://)
    let domain = this.pdsEndpoint.replace(/^https?:\/\//, '');
    // Remove trailing slash if present
    domain = domain.replace(/\/$/, '');
    return domain;
  }

  /**
   * Create account via PDS and generate DID
   *
   * @description Creates a new account on the PDS and generates a DID.
   * Uses com.atproto.server.createAccount API (no authentication required).
   * Implements retry logic with exponential backoff.
   *
   * @param email - User email address
   * @param password - User password
   * @param handle - Handle (required, e.g., username.pds-dev.heart-land.io)
   * @param inviteCode - Optional invite code (uses PDS_INVITE_CODE env var if not provided)
   * @returns Promise with DID and account information
   *
   * @example
   * ```typescript
   * const result = await pdsService.createAccount(
   *   'user@example.com',
   *   'password123',
   *   'username.pds-dev.heart-land.io'
   * );
   * if (result.success) {
   *   console.log('DID:', result.did);
   * }
   * ```
   */
  public async createAccount(
    email: string,
    password: string,
    handle: string,
    inviteCode?: string
  ): Promise<PdsAccountResult> {
    let lastError: Error | null = null;

    // Retry with exponential backoff
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        // Create BskyAgent instance
        const agent = new BskyAgent({
          service: this.pdsEndpoint,
        });

        // Create account
        const createAccountParams: any = {
          email,
          password,
          handle, // Required by AT Protocol
        };

        // Add invite code (required by PDS server)
        const finalInviteCode = inviteCode || this.defaultInviteCode;
        if (finalInviteCode) {
          createAccountParams.inviteCode = finalInviteCode;
        } else {
          // If no invite code is provided, return error
          return {
            success: false,
            error:
              'Invite code is required for account creation. Please provide PDS_INVITE_CODE environment variable or pass inviteCode parameter.',
          };
        }

        const response = await agent.createAccount(createAccountParams);

        const result: PdsAccountResult = {
          success: true,
          did: response.data.did,
          accessJwt: response.data.accessJwt,
          refreshJwt: response.data.refreshJwt,
        };
        if (response.data.handle) {
          result.handle = response.data.handle;
        }
        return result;
      } catch (error: any) {
        // Extract detailed error message
        let errorMessage = 'Unknown error';
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (error?.data?.error) {
          errorMessage = error.data.error;
        } else if (error?.data?.message) {
          errorMessage = error.data.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }

        lastError = new Error(errorMessage);

        // Log detailed error for debugging
        console.error('PDS createAccount error:', {
          message: errorMessage,
          error: error,
          data: error?.data,
        });

        // Don't retry on certain errors (e.g., validation errors, verification required)
        if (
          errorMessage.includes('already exists') ||
          errorMessage.includes('invalid') ||
          errorMessage.includes('validation') ||
          errorMessage.includes('Verification is now required') ||
          errorMessage.includes('verification')
        ) {
          return {
            success: false,
            error: errorMessage,
          };
        }

        // Exponential backoff: wait 1s, 2s, 4s
        if (attempt < this.maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000;
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    return {
      success: false,
      error: lastError
        ? lastError.message
        : 'Failed to create account after retries',
    };
  }

  /**
   * Resolve DID to DID document
   *
   * @description Resolves a DID to its DID document.
   *
   * @param did - DID to resolve
   * @returns Promise with DID document
   *
   * @example
   * ```typescript
   * const result = await pdsService.resolveDid('did:plc:xxx');
   * if (result.success) {
   *   console.log('DID Document:', result.document);
   * }
   * ```
   */
  public async resolveDid(did: string): Promise<{
    success: boolean;
    document?: any;
    error?: string;
  }> {
    try {
      const agent = new BskyAgent({
        service: this.pdsEndpoint,
      });

      const response = await agent.com.atproto.identity.resolveHandle({
        handle: did,
      });

      return {
        success: true,
        document: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete account via PDS (Admin privilege)
   *
   * @description Deletes an account on the PDS server using admin privileges.
   * This method does not require password verification and is intended for
   * server-side account deletion operations.
   *
   * @param did - User's DID (did:plc:...)
   * @param accessJwt - Access JWT token for authentication
   * @returns Promise with deletion result
   *
   * @example
   * ```typescript
   * const result = await pdsService.deleteAccount(
   *   'did:plc:xxx',
   *   'eyJhbGci...'
   * );
   * if (result.success) {
   *   console.log('Account deleted successfully');
   * }
   * ```
   */
  public async deleteAccount(
    did: string,
    accessJwt: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Create BskyAgent instance (same as createAccount)
      const agent = new BskyAgent({
        service: this.pdsEndpoint,
      });

      // Delete account via PDS (admin privilege - no password required)
      // Note: Some PDS servers may require password even with admin privilege
      // In that case, we'll need to handle the error and potentially use deactivateAccount instead
      try {
        // Use BskyAgent's xrpc method with custom headers for authentication
        // This is similar to how createAccount uses agent.createAccount()
        await (agent as any).xrpc.call(
          'com.atproto.server.deleteAccount',
          {
            did,
            // Password is not required for admin privilege deletion
            // However, if the PDS server requires it, we'll catch the error
          },
          {
            encoding: 'application/json',
            headers: {
              authorization: `Bearer ${accessJwt}`,
            },
          }
        );

        return { success: true };
      } catch (deleteError: any) {
        // If deleteAccount requires password, try deactivateAccount instead
        if (
          deleteError?.message?.includes('password') ||
          deleteError?.data?.error?.includes('password')
        ) {
          console.warn(
            'deleteAccount requires password, trying deactivateAccount instead:',
            deleteError.message
          );

          // Try deactivateAccount as fallback
          await (agent as any).xrpc.call(
            'com.atproto.server.deactivateAccount',
            {
              deleteAfter: new Date().toISOString(), // Immediate deletion
            },
            {
              encoding: 'application/json',
              headers: {
                authorization: `Bearer ${accessJwt}`,
              },
            }
          );

          return { success: true };
        }

        // Re-throw if it's not a password-related error
        throw deleteError;
      }
    } catch (error: any) {
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error?.data?.error) {
        errorMessage = error.data.error;
      } else if (error?.data?.message) {
        errorMessage = error.data.message;
      }

      console.error('PDS deleteAccount error:', {
        message: errorMessage,
        error: error,
        data: error?.data,
        did,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
