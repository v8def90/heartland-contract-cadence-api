/**
 * Authentication Controller
 *
 * @description Handles authentication operations including login, token verification,
 * and token refresh for the Heart Token API.
 *
 * @author Heart Token API Team
 * @since 1.0.0
 */

import {
  Controller,
  Post,
  Route,
  Body,
  Tags,
  Example,
  SuccessResponse,
  Response,
  Security,
  Request,
} from 'tsoa';
import type { ApiResponse } from '../../models/responses/ApiResponse';
import type {
  AuthData,
  TokenVerificationData,
  BloctoAuthData,
  FlowAuthData,
} from '../../models/responses/index';
import type {
  LoginRequest,
  VerifyTokenRequest,
  BloctoAuthRequest,
  FlowAuthRequest,
} from '../../models/requests/index';
import {
  generateJwtToken,
  verifyJwtToken,
  type JwtPayload,
} from '../../middleware/passport';
import { v4 as uuidv4 } from 'uuid';
import { BloctoAuthService } from '../../services/BloctoAuthService';
import { FlowAuthService } from '../../services/FlowAuthService';

/**
 * Authentication Controller
 *
 * @description Provides endpoints for user authentication and token management.
 * Supports JWT-based authentication with role-based access control.
 *
 * @example
 * ```typescript
 * const authController = new AuthController();
 * const loginResult = await authController.login({ address: "0x123..." });
 * ```
 */
@Route('auth')
@Tags('Authentication')
export class AuthController extends Controller {
  private bloctoAuthService: BloctoAuthService;
  private flowAuthService: FlowAuthService;

  constructor() {
    super();
    this.bloctoAuthService = BloctoAuthService.getInstance();
    this.flowAuthService = FlowAuthService.getInstance();
  }
  /**
   * User login and token generation
   *
   * @description Authenticates a user and generates a JWT token for API access.
   * This endpoint supports both direct address authentication and signature-based authentication.
   *
   * @param request - Login request containing user address and optional signature
   * @returns Promise resolving to authentication data with JWT token
   *
   * @example
   * ```typescript
   * const loginRequest: LoginRequest = {
   *   address: "0x58f9e6153690c852",
   *   signature: "0x1234567890abcdef..."
   * };
   * const result = await authController.login(loginRequest);
   * ```
   */
  @Post('login')
  @SuccessResponse('200', 'Login successful')
  @Response<ApiResponse>('400', 'Invalid request')
  @Response<ApiResponse>('401', 'Authentication failed')
  @Example<ApiResponse<AuthData>>({
    success: true,
    data: {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      expiresIn: 86400,
      address: '0x58f9e6153690c852',
      role: 'user',
      issuedAt: '2024-01-01T00:00:00.000Z',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  @Example<ApiResponse>({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Address is required',
      details: 'The address field is mandatory for authentication',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async login(
    @Body() request: LoginRequest
  ): Promise<ApiResponse<AuthData>> {
    try {
      // Validate request
      if (!request.address) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Address is required',
            details: 'The address field is mandatory for authentication',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // TODO: Implement signature verification for enhanced security
      // For now, we'll accept any valid Flow address
      const address = request.address.toLowerCase();

      // Validate Flow address format (basic validation)
      if (!address.startsWith('0x') || address.length !== 18) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid address format',
            details:
              'Address must be a valid Flow address (0x + 16 hex characters)',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Generate user ID (in production, this should come from user database)
      const userId = uuidv4();

      // Determine user role (in production, this should come from user database)
      // For now, we'll assign 'user' role to all users
      const role: 'user' | 'admin' | 'minter' | 'pauser' = 'user';

      // Generate JWT token
      const token = generateJwtToken(userId, address, role);

      // Parse token to get expiration time
      const payload = verifyJwtToken(token);
      if (!payload) {
        this.setStatus(500);
        return {
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Token generation failed',
            details: 'Unable to generate authentication token',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Calculate expiration time in seconds
      const expiresIn = payload.exp - payload.iat;

      // Create authentication response
      const authData: AuthData = {
        token,
        expiresIn,
        address,
        role,
        issuedAt: new Date(payload.iat * 1000).toISOString(),
      };

      this.setStatus(200);
      return {
        success: true,
        data: authData,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Login error:', error);
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Login failed',
          details:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Verify JWT token
   *
   * @description Verifies a JWT token and returns token information.
   * This endpoint can be used to check token validity and extract user information.
   *
   * @param request - Token verification request containing JWT token
   * @returns Promise resolving to token verification data
   *
   * @example
   * ```typescript
   * const verifyRequest: VerifyTokenRequest = {
   *   token: "eyJhbGciOiJIUzI1NiIs..."
   * };
   * const result = await authController.verifyToken(verifyRequest);
   * ```
   */
  @Post('verify')
  @SuccessResponse('200', 'Token verification successful')
  @Response<ApiResponse>('400', 'Invalid request')
  @Response<ApiResponse>('401', 'Invalid token')
  @Example<ApiResponse<TokenVerificationData>>({
    success: true,
    data: {
      valid: true,
      address: '0x58f9e6153690c852',
      role: 'user',
      expiresAt: '2024-01-02T00:00:00.000Z',
      issuedAt: '2024-01-01T00:00:00.000Z',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  @Example<ApiResponse>({
    success: false,
    error: {
      code: 'AUTHENTICATION_ERROR',
      message: 'Invalid token',
      details: 'The provided token is invalid or expired',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async verifyToken(
    @Body() request: VerifyTokenRequest
  ): Promise<ApiResponse<TokenVerificationData>> {
    try {
      // Validate request
      if (!request.token) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Token is required',
            details: 'The token field is mandatory for verification',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Verify JWT token
      const payload = verifyJwtToken(request.token);

      if (!payload) {
        this.setStatus(401);
        return {
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: 'Invalid token',
            details: 'The provided token is invalid or expired',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Check if token is expired
      const now = Date.now() / 1000;
      if (payload.exp < now) {
        this.setStatus(401);
        return {
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: 'Token expired',
            details: 'The provided token has expired',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Create verification response
      const verificationData: TokenVerificationData = {
        valid: true,
        address: payload.address,
        role: payload.role,
        expiresAt: new Date(payload.exp * 1000).toISOString(),
        issuedAt: new Date(payload.iat * 1000).toISOString(),
      };

      this.setStatus(200);
      return {
        success: true,
        data: verificationData,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Token verification error:', error);
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Token verification failed',
          details:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Refresh JWT token
   *
   * @description Refreshes a JWT token by generating a new one with extended expiration.
   * This endpoint requires a valid JWT token in the Authorization header.
   *
   * @returns Promise resolving to new authentication data
   *
   * @security JWT authentication required
   *
   * @example
   * ```typescript
   * // Requires Authorization header: "Bearer <token>"
   * const result = await authController.refreshToken();
   * ```
   */
  @Post('refresh')
  @Security('jwt')
  @SuccessResponse('200', 'Token refresh successful')
  @Response<ApiResponse>('401', 'Authentication required')
  @Response<ApiResponse>('500', 'Token refresh failed')
  @Example<ApiResponse<AuthData>>({
    success: true,
    data: {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      expiresIn: 86400,
      address: '0x58f9e6153690c852',
      role: 'user',
      issuedAt: '2024-01-01T00:00:00.000Z',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async refreshToken(
    @Request() request: any
  ): Promise<ApiResponse<AuthData>> {
    try {
      // Get user from request (set by JWT middleware)
      console.log('Refresh token - Request object:', request);
      console.log('Refresh token - Request user:', request?.user);
      console.log('Refresh token - Request headers:', request?.headers);

      // Try to get user from different possible locations
      let user = request?.user;

      // If user is not directly on request, try to get from headers
      if (!user && request?.headers?.authorization) {
        const authHeader = request.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          console.log('Refresh token - Extracted token:', token);

          // Verify the token to get user info
          const payload = verifyJwtToken(token);
          if (payload) {
            user = {
              id: payload.sub,
              address: payload.address,
              role: payload.role,
            };
            console.log('Refresh token - User from token:', user);
          }
        }
      }

      if (!user) {
        this.setStatus(401);
        return {
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: 'Authentication required',
            details: 'Valid JWT token is required for token refresh',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Generate new JWT token
      const newToken = generateJwtToken(user.id, user.address, user.role);

      // Parse token to get expiration time
      const payload = verifyJwtToken(newToken);
      if (!payload) {
        this.setStatus(500);
        return {
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Token generation failed',
            details: 'Unable to generate new authentication token',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Calculate expiration time in seconds
      const expiresIn = payload.exp - payload.iat;

      // Create authentication response
      const authData: AuthData = {
        token: newToken,
        expiresIn,
        address: user.address,
        role: user.role,
        issuedAt: new Date(payload.iat * 1000).toISOString(),
      };

      this.setStatus(200);
      return {
        success: true,
        data: authData,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Token refresh failed',
          details:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Blocto wallet authentication
   *
   * @description Authenticates a user using Blocto wallet signature verification.
   * This endpoint provides enhanced security with signature verification, timestamp validation,
   * and nonce-based replay attack protection.
   *
   * @param request - Blocto authentication request with signature and metadata
   * @returns Promise resolving to Blocto authentication data with JWT token
   *
   * @example
   * ```typescript
   * const bloctoRequest: BloctoAuthRequest = {
   *   address: "0x58f9e6153690c852",
   *   signature: "abc123...",
   *   message: "Login to Heart Token API\nNonce: unique-nonce-123\nTimestamp: 1640995200000",
   *   timestamp: 1640995200000,
   *   nonce: "unique-nonce-123"
   * };
   * const result = await authController.bloctoLogin(bloctoRequest);
   * ```
   */
  @Post('blocto-login')
  @SuccessResponse('200', 'Blocto authentication successful')
  @Response<ApiResponse>('400', 'Invalid request')
  @Response<ApiResponse>('401', 'Authentication failed')
  @Example<ApiResponse<BloctoAuthData>>({
    success: true,
    data: {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      expiresIn: 86400,
      address: '0x58f9e6153690c852',
      role: 'user',
      issuedAt: '2024-01-01T00:00:00.000Z',
      walletType: 'blocto',
      bloctoMetadata: {
        appId: 'heart-token-api',
        walletVersion: '1.0.0',
        deviceType: 'web',
      },
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  @Example<ApiResponse>({
    success: false,
    error: {
      code: 'AUTHENTICATION_ERROR',
      message: 'Invalid signature',
      details: 'The provided signature could not be verified',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async bloctoLogin(
    @Body() request: BloctoAuthRequest
  ): Promise<ApiResponse<BloctoAuthData>> {
    try {
      // Verify Blocto signature and authenticate user
      const result = await this.bloctoAuthService.verifySignature(request);

      if (!result.success) {
        this.setStatus(401);
        return {
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: result.error,
            details: 'Blocto wallet signature verification failed',
          },
          timestamp: new Date().toISOString(),
        };
      }

      this.setStatus(200);
      return {
        success: true,
        data: result.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Blocto login error:', error);
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Blocto authentication failed',
          details:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Flow wallet authentication
   *
   * @description Authenticates a user using Flow wallet signature verification.
   * Supports Flow Wallet, Lilico, Dapper, and other Flow-compatible wallets.
   * Uses @onflow/fcl for Cadence 1.0 compatible signature verification.
   *
   * @param request - Flow authentication request with signature and metadata
   * @returns Promise resolving to Flow authentication data with JWT token
   *
   * @example
   * ```typescript
   * const flowRequest: FlowAuthRequest = {
   *   address: "0x58f9e6153690c852",
   *   signature: "abc123...",
   *   message: "Login to Heart Token API\nNonce: xyz\nTimestamp: 1640995200000",
   *   timestamp: 1640995200000,
   *   nonce: "xyz"
   * };
   * const result = await authController.flowLogin(flowRequest);
   * ```
   */
  @Post('flow-login')
  @SuccessResponse('200', 'Flow authentication successful')
  @Response<ApiResponse>('400', 'Invalid request')
  @Response<ApiResponse>('401', 'Authentication failed')
  @Example<ApiResponse<FlowAuthData>>({
    success: true,
    data: {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      expiresIn: 86400,
      address: '0x58f9e6153690c852',
      role: 'user',
      issuedAt: '2024-01-01T00:00:00.000Z',
      walletType: 'flow',
      flowMetadata: {
        walletName: 'Flow Wallet',
        fclVersion: '1.20.0',
      },
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  @Example<ApiResponse>({
    success: false,
    error: {
      code: 'AUTHENTICATION_ERROR',
      message: 'Invalid signature',
      details: 'Flow wallet signature verification failed',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async flowLogin(
    @Body() request: FlowAuthRequest
  ): Promise<ApiResponse<FlowAuthData>> {
    try {
      // Verify Flow signature and authenticate user
      const result = await this.flowAuthService.verifySignature(request);

      if (!result.success) {
        this.setStatus(401);
        return {
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: result.error,
            details: 'Flow wallet signature verification failed',
          },
          timestamp: new Date().toISOString(),
        };
      }

      this.setStatus(200);
      return {
        success: true,
        data: result.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Flow login error:', error);
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Flow authentication failed',
          details:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Generate nonce for Blocto authentication
   *
   * @description Generates a unique nonce for secure Blocto wallet authentication.
   * The nonce should be included in the message that gets signed by the user's wallet.
   *
   * @returns Promise resolving to nonce data
   *
   * @example
   * ```typescript
   * const nonceResult = await authController.generateNonce();
   * // Use nonceResult.data.nonce in the authentication message
   * ```
   */
  @Post('generate-nonce')
  @SuccessResponse('200', 'Nonce generated successfully')
  @Response<ApiResponse>('500', 'Nonce generation failed')
  @Example<ApiResponse<{ nonce: string; message: string; timestamp: number }>>({
    success: true,
    data: {
      nonce: '550e8400-e29b-41d4-a716-446655440000',
      message:
        'Login to Heart Token API\nNonce: 550e8400-e29b-41d4-a716-446655440000\nTimestamp: 1640995200000',
      timestamp: 1640995200000,
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async generateNonce(): Promise<
    ApiResponse<{ nonce: string; message: string; timestamp: number }>
  > {
    try {
      const nonce = await this.bloctoAuthService.generateNonce();
      const timestamp = Date.now();
      const message = this.bloctoAuthService.generateAuthMessage(
        nonce,
        timestamp
      );

      this.setStatus(200);
      return {
        success: true,
        data: {
          nonce,
          message,
          timestamp,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Nonce generation error:', error);
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Nonce generation failed',
          details:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Generate test signature for development/staging environments
   *
   * @description Generates a test signature for development and staging environments
   * where actual FCL signature verification is not available.
   * This endpoint is only available in non-production environments.
   *
   * @param request - Test signature generation request
   * @returns Promise resolving to test signature data
   *
   * @example
   * ```typescript
   * const testRequest: TestSignatureRequest = {
   *   address: "0x58f9e6153690c852",
   *   message: "Login to Heart Token API\nNonce: 123\nTimestamp: 1640995200000"
   * };
   * const result = await authController.generateTestSignature(testRequest);
   * ```
   */
  @Post('generate-test-signature')
  @SuccessResponse('200', 'Test signature generated successfully')
  @Response<ApiResponse>('400', 'Invalid request')
  @Response<ApiResponse>('403', 'Not available in production')
  @Example<
    ApiResponse<{ signature: string; address: string; message: string }>
  >({
    success: true,
    data: {
      signature: 'test-sig-a1b2c3d4e5f6g7h8',
      address: '0x58f9e6153690c852',
      message: 'Login to Heart Token API\nNonce: 123\nTimestamp: 1640995200000',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async generateTestSignature(
    @Body() request: { address: string; message: string }
  ): Promise<
    ApiResponse<{ signature: string; address: string; message: string }>
  > {
    try {
      // Only allow in non-production environments
      if (
        process.env.NODE_ENV === 'production' &&
        process.env.STAGE === 'prod'
      ) {
        this.setStatus(403);
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Test signature generation not available in production',
            details:
              'This endpoint is only available in development and staging environments',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Validate request
      if (!request.address || !request.message) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Address and message are required',
            details:
              'Both address and message fields are mandatory for test signature generation',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Generate test signature using the service method
      const signature = (this.bloctoAuthService as any).generateTestSignature(
        request.address,
        request.message
      );

      this.setStatus(200);
      return {
        success: true,
        data: {
          signature,
          address: request.address,
          message: request.message,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Test signature generation error:', error);
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Test signature generation failed',
          details:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }
}
