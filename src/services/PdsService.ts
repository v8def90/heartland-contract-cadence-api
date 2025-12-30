/**
 * PDS (Personal Data Server) Service
 *
 * @description Handles integration with AT Protocol PDS for DID generation and account management.
 * Uses the official Bluesky PDS (https://bsky.social) for development.
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
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.pdsEndpoint =
      process.env.PDS_ENDPOINT || 'https://bsky.social';
    this.timeout = parseInt(
      process.env.PDS_TIMEOUT || '30000',
      10
    ); // 30 seconds
    this.maxRetries = 3;
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
    return new Promise((resolve) => setTimeout(resolve, ms));
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
   * @param handle - Optional handle (e.g., @username.bsky.social)
   * @returns Promise with DID and account information
   *
   * @example
   * ```typescript
   * const result = await pdsService.createAccount(
   *   'user@example.com',
   *   'password123',
   *   'username.bsky.social'
   * );
   * if (result.success) {
   *   console.log('DID:', result.did);
   * }
   * ```
   */
  public async createAccount(
    email: string,
    password: string,
    handle?: string
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
        };
        if (handle) {
          createAccountParams.handle = handle;
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
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on certain errors (e.g., validation errors)
        if (
          error instanceof Error &&
          (error.message.includes('already exists') ||
            error.message.includes('invalid') ||
            error.message.includes('validation'))
        ) {
          return {
            success: false,
            error: error.message,
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
        error:
          error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

