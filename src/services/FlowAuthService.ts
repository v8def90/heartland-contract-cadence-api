/**
 * Flow Wallet Authentication Service
 *
 * @description Handles Flow wallet signature verification, timestamp validation,
 * and nonce management for secure authentication using @onflow/fcl.
 *
 * Key differences from BloctoAuthService:
 * - Uses @onflow/fcl (Cadence 1.0 compatible)
 * - No fclCryptoContract option needed (uses Flow default)
 * - Supports multiple Flow wallets (Flow, Lilico, Dapper, etc.)
 *
 * @author Heart Token API Team
 * @since 1.0.0
 */

import * as fcl from '@onflow/fcl';
import type { FlowAuthRequest } from '../models/requests/index';
import type { FlowAuthData } from '../models/responses/index';
import { NonceService } from './NonceService';
import {
  validateFlowAddress,
  validateTimestamp,
  isHexString,
  normalizeSignature,
  generateAuthData,
} from '../utils/authHelpers';
import { FLOW_ENV } from '../config/flow';

/**
 * Flow Wallet Authentication Service
 *
 * @description Provides secure authentication using Flow wallet signatures
 * with Flow blockchain integration and replay attack protection.
 * Uses singleton pattern to ensure nonce consistency across requests.
 *
 * @example
 * ```typescript
 * const authService = FlowAuthService.getInstance();
 * const result = await authService.verifySignature(request);
 * ```
 */
export class FlowAuthService {
  private static instance: FlowAuthService;
  private readonly nonceService: NonceService;
  private readonly timestampTolerance: number;
  private initialized: boolean = false;

  private constructor() {
    this.nonceService = new NonceService();
    this.timestampTolerance = 2 * 60 * 1000; // 2 minutes
    this.initializeFcl();
  }

  /**
   * Initialize @onflow/fcl with Flow network configuration
   *
   * @private
   * @description Configures @onflow/fcl with the proper network settings.
   * This is required for @onflow/fcl to work correctly in Lambda environment.
   */
  private initializeFcl(): void {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize @onflow/fcl with Flow network configuration
      fcl.config({
        'accessNode.api': FLOW_ENV.ACCESS_NODE,
        'discovery.wallet': FLOW_ENV.DISCOVERY_WALLET,
        '0xHeart': FLOW_ENV.HEART_CONTRACT_ADDRESS,
        'fcl.limit': '1000',
      });

      this.initialized = true;
      console.log('@onflow/fcl initialized successfully for FlowAuthService', {
        accessNode: FLOW_ENV.ACCESS_NODE,
        network: FLOW_ENV.NETWORK,
      });
    } catch (error) {
      console.error('Failed to initialize @onflow/fcl:', error);
      // Don't throw here - allow lazy initialization on first use
      this.initialized = false;
    }
  }

  /**
   * Get singleton instance of FlowAuthService
   *
   * @returns FlowAuthService instance
   */
  public static getInstance(): FlowAuthService {
    if (!FlowAuthService.instance) {
      FlowAuthService.instance = new FlowAuthService();
    }
    return FlowAuthService.instance;
  }

  /**
   * Verify Flow wallet signature and authenticate user
   *
   * @description Verifies the signature, validates timestamp, checks nonce,
   * and generates JWT token for authenticated user.
   *
   * @param request - Flow authentication request
   * @returns Promise resolving to authentication data or error
   *
   * @example
   * ```typescript
   * const request: FlowAuthRequest = {
   *   address: "0x58f9e6153690c852",
   *   signature: "abc123...",
   *   message: "Login to Heart Token API",
   *   timestamp: 1640995200000,
   *   nonce: "unique-nonce-123"
   * };
   * const result = await authService.verifySignature(request);
   * ```
   */
  public async verifySignature(
    request: FlowAuthRequest
  ): Promise<
    { success: true; data: FlowAuthData } | { success: false; error: string }
  > {
    try {
      console.log('FlowAuthService.verifySignature - Start:', {
        address: request.address,
        nonce: request.nonce,
        timestamp: request.timestamp,
        message: request.message?.substring(0, 50) + '...',
      });

      // 1. Validate request structure
      const validationError = this.validateRequest(request);
      if (validationError) {
        console.log(
          'FlowAuthService.verifySignature - Validation error:',
          validationError
        );
        return { success: false, error: validationError };
      }

      // 2. Validate timestamp (prevent replay attacks)
      const timestampError = validateTimestamp(
        request.timestamp,
        this.timestampTolerance
      );
      if (timestampError) {
        console.log(
          'FlowAuthService.verifySignature - Timestamp error:',
          timestampError
        );
        return { success: false, error: timestampError };
      }

      // 3. Validate and manage nonce (prevent replay attacks)
      const nonceValid = await this.nonceService.validateNonce({
        nonce: request.nonce,
        currentTimestamp: request.timestamp,
      });
      if (!nonceValid) {
        console.log(
          'FlowAuthService.verifySignature - Nonce validation failed:',
          request.nonce
        );
        return { success: false, error: 'Invalid or expired nonce' };
      }

      // 4. Verify Flow address format
      const addressError = validateFlowAddress(request.address);
      if (addressError) {
        console.log(
          'FlowAuthService.verifySignature - Address error:',
          addressError
        );
        return { success: false, error: addressError };
      }

      // 5. Decode message if it's in hex format (frontend might send hex)
      let decodedMessage = request.message;
      if (isHexString(request.message)) {
        console.log('Message is in hex format, decoding...');
        decodedMessage = Buffer.from(request.message, 'hex').toString('utf-8');
        console.log('Decoded message:', decodedMessage);
      }

      // 6. Verify signature using FCL
      console.log(
        'FlowAuthService.verifySignature - Verifying signature with @onflow/fcl...'
      );
      const signatureResult = await this.verifyFlowSignature(
        request.address,
        decodedMessage,
        request.signature
      );

      if (!signatureResult.success) {
        console.log(
          'FlowAuthService.verifySignature - Signature verification failed:',
          signatureResult.error
        );
        return {
          success: false,
          error: `Signature verification failed: ${signatureResult.error}`,
        };
      }

      console.log(
        'FlowAuthService.verifySignature - Signature verified, marking nonce as used...'
      );
      // 7. Mark nonce as used
      await this.nonceService.markNonceAsUsed({
        nonce: request.nonce,
        usedAt: Date.now(),
      });

      console.log(
        'FlowAuthService.verifySignature - Nonce marked as used, generating auth data...'
      );
      // 8. Generate JWT token
      const authData = this.generateAuthDataInternal(request);

      console.log('FlowAuthService.verifySignature - Success');
      return { success: true, data: authData };
    } catch (error) {
      console.error('Flow authentication error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      };
    }
  }

  /**
   * Generate a new nonce for authentication
   *
   * @description Creates a unique nonce for replay attack protection.
   * The nonce should be included in the message that gets signed.
   *
   * @returns Promise resolving to unique nonce string
   *
   * @example
   * ```typescript
   * const nonce = await authService.generateNonce();
   * const message = `Login to Heart Token API\nNonce: ${nonce}\nTimestamp: ${Date.now()}`;
   * ```
   */
  public async generateNonce(): Promise<string> {
    return this.nonceService.generateNonce();
  }

  /**
   * Generate authentication message for signing
   *
   * @description Creates a standardized message that users should sign
   * with their Flow wallet for authentication.
   *
   * @param nonce - Unique nonce for this authentication attempt
   * @param timestamp - Timestamp for this authentication attempt
   * @returns Message string to be signed
   *
   * @example
   * ```typescript
   * const message = authService.generateAuthMessage(nonce, Date.now());
   * // User signs this message with their Flow wallet
   * ```
   */
  public generateAuthMessage(nonce: string, timestamp: number): string {
    return `Login to Heart Token API\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
  }

  /**
   * Validate request structure
   *
   * @private
   * @param request - Flow authentication request
   * @returns Error message if invalid, null if valid
   */
  private validateRequest(request: FlowAuthRequest): string | null {
    if (!request.address) {
      return 'Address is required';
    }

    if (!request.signature) {
      return 'Signature is required';
    }

    if (!request.message) {
      return 'Message is required';
    }

    if (!request.timestamp) {
      return 'Timestamp is required';
    }

    if (!request.nonce) {
      return 'Nonce is required';
    }

    return null;
  }

  /**
   * Verify signature using Flow Client Library
   *
   * @description Uses @onflow/fcl to verify Flow wallet signatures.
   * No fclCryptoContract option needed - uses Flow default (Cadence 1.0 compatible).
   *
   * @private
   */
  private async verifyFlowSignature(
    address: string,
    message: string,
    signature: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Ensure FCL is initialized before use
      if (!this.initialized) {
        this.initializeFcl();
      }

      console.log('Getting key ID for address:', address);

      // Get the correct key ID for the address
      const keyId = await this.getKeyIdForAddress(address);

      if (keyId === null) {
        console.warn(
          'Could not determine key ID for address, trying fallback methods:',
          address
        );

        // Try with key ID 0 as fallback (common default)
        console.log('Trying fallback with key ID 0');
        const fallbackResult = await this.trySignatureVerification(
          address,
          message,
          signature,
          0
        );
        if (fallbackResult) {
          console.log('Fallback verification with key ID 0 succeeded');
          return { success: true };
        }

        // Try with multiple key IDs if available
        const keyIds = await this.getAllKeyIdsForAddress(address);
        if (keyIds && keyIds.length > 0) {
          console.log('Trying multiple key IDs:', keyIds);
          for (const id of keyIds) {
            const result = await this.trySignatureVerification(
              address,
              message,
              signature,
              id
            );
            if (result) {
              console.log('Signature verification succeeded with key ID:', id);
              return { success: true };
            }
          }
        }

        console.error(
          'All signature verification attempts failed for address:',
          address
        );
        return {
          success: false,
          error: 'Could not verify signature with any available key ID',
        };
      }

      console.log('Using key ID:', keyId, 'for address:', address);

      // Verify signature using FCL with the correct key ID
      const isValid = await this.trySignatureVerification(
        address,
        message,
        signature,
        keyId
      );

      if (isValid) {
        console.log(
          'Signature verification succeeded with primary key ID:',
          keyId
        );
        return { success: true };
      }

      // Primary key ID failed, try all available keys as fallback
      console.log(
        'Primary key ID failed, trying all available keys as fallback...'
      );
      const keyIds = await this.getAllKeyIdsForAddress(address);
      if (keyIds && keyIds.length > 0) {
        console.log('Trying multiple key IDs as fallback:', keyIds);
        for (const id of keyIds) {
          // Skip the primary key ID we already tried
          if (id === keyId) {
            console.log(`Skipping key ID ${id} (already tried as primary)`);
            continue;
          }

          const result = await this.trySignatureVerification(
            address,
            message,
            signature,
            id
          );
          if (result) {
            console.log(
              'Signature verification succeeded with fallback key ID:',
              id
            );
            return { success: true };
          }
        }
      }

      console.error(
        'All signature verification attempts failed for address:',
        address
      );
      return {
        success: false,
        error: 'Could not verify signature with any available key ID',
      };
    } catch (error) {
      console.error('Error in verifyFlowSignature:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  /**
   * Try signature verification with a specific key ID
   *
   * @description Uses @onflow/fcl.AppUtils.verifyUserSignatures() to verify
   * the signature. No fclCryptoContract option - uses Flow default (Cadence 1.0 compatible).
   *
   * @private
   */
  private async trySignatureVerification(
    address: string,
    message: string,
    signature: string,
    keyId: number
  ): Promise<boolean> {
    try {
      // Validate and normalize signature format
      const normalizedSignature = normalizeSignature(signature);
      if (!normalizedSignature) {
        console.log(`Invalid signature format for key ID ${keyId}:`, signature);
        return false;
      }

      // Convert message to hex string (FCL handles UserDomainTag internally)
      const messageHex = Buffer.from(message, 'utf-8').toString('hex');

      console.log('Attempting signature verification:', {
        address,
        keyId,
        messageLength: message.length,
        message: message,
        messageHex: messageHex.substring(0, 80) + '...',
        messageHexFull: messageHex,
        originalSignature: signature.substring(0, 20) + '...',
        normalizedSignature: normalizedSignature.substring(0, 20) + '...',
        signatureLength: normalizedSignature.length,
        note: 'Using @onflow/fcl - Cadence 1.0 compatible',
      });

      // Use @onflow/fcl AppUtils API (Cadence 1.0 compatible)
      // CompositeSignatures format requires f_type and f_vsn metadata
      // Flow blockchain expects signature WITHOUT 0x prefix
      const signatureWithoutPrefix = normalizedSignature.startsWith('0x')
        ? normalizedSignature.slice(2)
        : normalizedSignature;

      console.log(
        'Using Flow standard FCL verification (@onflow/fcl, Cadence 1.0 compatible)'
      );

      const isValid = await (fcl.AppUtils.verifyUserSignatures as any)(
        messageHex,
        [
          {
            f_type: 'CompositeSignature',
            f_vsn: '1.0.0',
            addr: address,
            keyId: keyId,
            signature: signatureWithoutPrefix,
          },
        ]
        // No fclCryptoContract option - uses Flow default (Cadence 1.0 compatible)
      );

      console.log(
        `Signature verification result for key ID ${keyId}:`,
        isValid
      );
      return isValid;
    } catch (error) {
      console.log(
        `Signature verification failed with key ID ${keyId}:`,
        error instanceof Error ? error.message : String(error)
      );
      return false;
    }
  }

  /**
   * Get the primary key ID for a Flow address
   *
   * @private
   */
  private async getKeyIdForAddress(address: string): Promise<number | null> {
    try {
      const account = await fcl.account(address);

      if (!account || !account.keys || account.keys.length === 0) {
        console.warn('No keys found for address:', address);
        return null;
      }

      console.log('Account data retrieved:', {
        address: account.address,
        keys: account.keys.length,
      });

      // Find the first active (non-revoked) key
      const activeKey = account.keys.find((key: any) => !key.revoked);

      if (!activeKey) {
        console.warn('No active keys found for address:', address);
        return null;
      }

      console.log('Found active key:', {
        keyId: activeKey.index,
        publicKey: activeKey.publicKey.substring(0, 20) + '...',
        revoked: activeKey.revoked,
      });

      return activeKey.index;
    } catch (error) {
      console.error('Error getting key ID for address:', error);
      return null;
    }
  }

  /**
   * Get all key IDs for a Flow address
   *
   * @description Retrieves all available key IDs for an address.
   * This is used for fallback verification when the primary key ID fails.
   *
   * @param address - Flow address to get key IDs for
   * @returns Promise resolving to array of key IDs or null if not found
   *
   * @private
   */
  private async getAllKeyIdsForAddress(
    address: string
  ): Promise<number[] | null> {
    try {
      console.log('Getting all key IDs for address:', address);
      const account = await fcl.account(address);

      if (!account || !account.keys || account.keys.length === 0) {
        console.warn('No keys found for address:', address);
        return null;
      }

      console.log('Account data retrieved:', {
        address: account.address,
        keys: account.keys.length,
      });

      // Get all active (non-revoked) key IDs
      const activeKeyIds = account.keys
        .filter((key: any) => !key.revoked)
        .map((key: any) => key.index);

      console.log('Found active key IDs:', activeKeyIds);

      return activeKeyIds.length > 0 ? activeKeyIds : null;
    } catch (error) {
      console.error('Error getting key IDs for address:', error);
      return null;
    }
  }

  /**
   * Generate authentication data with JWT token
   *
   * @private
   */
  private generateAuthDataInternal(request: FlowAuthRequest): FlowAuthData {
    const authData = generateAuthData<Record<string, any>>(
      request.address,
      'flow',
      {
        flowMetadata: {
          walletName: 'Flow Wallet',
          fclVersion: '1.20.0',
        },
      }
    );

    return {
      ...authData,
      walletType: 'flow',
      flowMetadata: {
        walletName: 'Flow Wallet',
        fclVersion: '1.20.0',
      },
    };
  }
}
