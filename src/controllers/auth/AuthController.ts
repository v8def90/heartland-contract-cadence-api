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
import { UserAuthService } from '../../services/UserAuthService';
import type {
  EmailPasswordRegisterRequest,
  EmailPasswordLoginRequest,
  VerifyEmailRequest,
  ResendVerificationEmailRequest,
  ResetPasswordRequestRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  SetInitialPasswordRequest,
} from '../../models/requests';

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
  private userAuthService: UserAuthService;

  constructor() {
    super();
    this.bloctoAuthService = BloctoAuthService.getInstance();
    this.flowAuthService = FlowAuthService.getInstance();
    this.userAuthService = UserAuthService.getInstance();
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

      // Generate JWT token (Flow wallet auth)
      const token = generateJwtToken(userId, 'flow', role, address);

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
        email: payload.email,
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
      const newToken = generateJwtToken(
        user.id,
        user.authMethod || 'flow',
        user.role,
        user.address,
        user.email
      );

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
   * Generate nonce for Flow wallet authentication
   *
   * @description Generates a unique nonce for secure Flow wallet authentication.
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
      const nonce = await this.flowAuthService.generateNonce();
      const timestamp = Date.now();
      const message = this.flowAuthService.generateAuthMessage(
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

  /**
   * Register new user with email/password
   *
   * @description Registers a new user with email/password authentication.
   * Creates DID via PDS, stores user profile and credentials, and sends verification email.
   * The handle field should contain only the username part (e.g., "username").
   * The domain part will be automatically appended by the API server based on PDS_ENDPOINT.
   *
   * @param request - Registration request with email, password, display name, and handle
   * @returns Promise resolving to registration result with DID and auth data
   *
   * @example
   * ```typescript
   * const request: EmailPasswordRegisterRequest = {
   *   email: "user@example.com",
   *   password: "password123",
   *   displayName: "John Doe",
   *   handle: "username"  // Domain will be automatically appended
   * };
   * const result = await authController.register(request);
   * ```
   */
  @Post('register')
  @SuccessResponse('200', 'Registration successful')
  @Response<ApiResponse>('400', 'Invalid request')
  @Response<ApiResponse>('409', 'Email already registered')
  @Response<ApiResponse>('500', 'Registration failed')
  @Example<ApiResponse<AuthData>>({
    success: true,
    data: {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      expiresIn: 86400,
      email: 'user@example.com',
      role: 'user',
      issuedAt: '2024-01-01T00:00:00.000Z',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async register(
    @Body() request: EmailPasswordRegisterRequest
  ): Promise<ApiResponse<AuthData>> {
    try {
      // Validate request
      if (!request.email || !request.displayName || !request.handle) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email, displayName, and handle are required',
            details:
              'All fields including handle are mandatory for registration. Password will be set after email verification.',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Register user (password will be generated automatically)
      const result = await this.userAuthService.registerWithEmailPassword(
        request.email,
        request.displayName,
        request.handle,
        request.description
      );

      if (!result.success) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'REGISTRATION_ERROR',
            message: result.error || 'Registration failed',
            details: result.error || 'Unable to complete registration',
          },
          timestamp: new Date().toISOString(),
        };
      }

      if (!result.authData) {
        this.setStatus(500);
        return {
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Registration completed but auth data not generated',
            details: 'Please try logging in',
          },
          timestamp: new Date().toISOString(),
        };
      }

      this.setStatus(200);
      return {
        success: true,
        data: result.authData,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Registration error:', error);
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Registration failed',
          details:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Login with email/password
   *
   * @description Authenticates a user with email/password.
   * Verifies password and email verification status, then generates JWT token.
   *
   * @param request - Login request with email and password
   * @returns Promise resolving to authentication data with JWT token
   *
   * @example
   * ```typescript
   * const request: EmailPasswordLoginRequest = {
   *   email: "user@example.com",
   *   password: "password123"
   * };
   * const result = await authController.emailLogin(request);
   * ```
   */
  @Post('email-login')
  @SuccessResponse('200', 'Login successful')
  @Response<ApiResponse>('400', 'Invalid request')
  @Response<ApiResponse>('401', 'Authentication failed')
  @Response<ApiResponse>('403', 'Email not verified')
  @Example<ApiResponse<AuthData>>({
    success: true,
    data: {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      expiresIn: 86400,
      email: 'user@example.com',
      role: 'user',
      issuedAt: '2024-01-01T00:00:00.000Z',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async emailLogin(
    @Body() request: EmailPasswordLoginRequest
  ): Promise<ApiResponse<AuthData>> {
    try {
      // Validate request
      if (!request.email || !request.password) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email and password are required',
            details: 'Both fields are mandatory for login',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Login user
      const result = await this.userAuthService.loginWithEmailPassword(
        request.email,
        request.password
      );

      if (!result.success) {
        if (result.error === 'EMAIL_NOT_VERIFIED') {
          this.setStatus(403);
          return {
            success: false,
            error: {
              code: 'EMAIL_NOT_VERIFIED',
              message: 'メールアドレスの認証が必要です',
              details:
                'メールアドレスの認証を完了してください。認証メールを確認してください。',
            },
            timestamp: new Date().toISOString(),
          };
        }

        this.setStatus(401);
        return {
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: result.error || 'Login failed',
            details: result.error || 'Invalid email or password',
          },
          timestamp: new Date().toISOString(),
        };
      }

      if (!result.authData) {
        this.setStatus(500);
        return {
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Login successful but auth data not generated',
            details: 'Please try again',
          },
          timestamp: new Date().toISOString(),
        };
      }

      this.setStatus(200);
      return {
        success: true,
        data: result.authData,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Email login error:', error);
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
   * Verify email address
   *
   * @description Verifies an email address using a verification token.
   *
   * @param request - Verification request with token and DID
   * @returns Promise resolving to verification result
   *
   * @example
   * ```typescript
   * const request: VerifyEmailRequest = {
   *   token: "verification-token-123",
   *   primaryDid: "did:plc:xxx"
   * };
   * const result = await authController.verifyEmail(request);
   * ```
   */
  @Post('verify-email')
  @SuccessResponse('200', 'Email verified successfully')
  @Response<ApiResponse>('400', 'Invalid request')
  @Response<ApiResponse>('401', 'Invalid or expired token')
  @Example<
    ApiResponse<{ email: string; verified: boolean; passwordNotSet?: boolean }>
  >({
    success: true,
    data: {
      email: 'user@example.com',
      verified: true,
      passwordNotSet: false,
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async verifyEmail(
    @Body() request: VerifyEmailRequest
  ): Promise<
    ApiResponse<{ email: string; verified: boolean; passwordNotSet?: boolean }>
  > {
    try {
      // Validate request
      if (!request.token || !request.primaryDid) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Token and primaryDid are required',
            details: 'Both fields are mandatory for email verification',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Query all identity links for this primaryDid to find email link
      const identityLinks = await this.userAuthService[
        'snsService'
      ].queryIdentityLinks(request.primaryDid);

      // Find email identity link with verification token
      const identityLink = identityLinks.find(
        link =>
          link.linkedId.startsWith('email:') &&
          link.emailVerifyTokenHash &&
          link.emailVerifyTokenExpiresAt
      );

      if (!identityLink) {
        this.setStatus(404);
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Identity link not found',
            details: 'Unable to find email verification record',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Verify token
      if (
        !identityLink.emailVerifyTokenHash ||
        !identityLink.emailVerifyTokenExpiresAt
      ) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Verification token not found',
            details: 'No verification token exists for this email',
          },
          timestamp: new Date().toISOString(),
        };
      }

      const emailVerificationService =
        this.userAuthService['emailVerificationService'];
      const isValid = await emailVerificationService.verifyToken(
        request.token,
        identityLink.emailVerifyTokenHash,
        identityLink.emailVerifyTokenExpiresAt
      );

      if (!isValid) {
        this.setStatus(401);
        return {
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: 'Invalid or expired token',
            details: 'The verification token is invalid or has expired',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Update email verification status in identity link
      await this.userAuthService['snsService'].updateIdentityLink(
        request.primaryDid,
        identityLink.linkedId,
        {
          emailVerified: true,
          emailVerifiedAt: new Date().toISOString(),
          status: 'verified',
          verifiedAt: new Date().toISOString(),
        }
      );

      // Update email verification status in identity lookup (LINK#email record)
      // This ensures data consistency across all records
      await this.userAuthService['snsService'].updateIdentityLookup(
        identityLink.linkedId, // email:v8def90@gmail.com
        {
          emailVerified: true,
          status: 'verified',
        }
      );

      // Check if password needs to be set
      const passwordNotSet =
        identityLink.passwordChangedFromTemporary === false;

      this.setStatus(200);
      return {
        success: true,
        data: {
          email: identityLink.email || '',
          verified: true,
          passwordNotSet, // Indicate if password needs to be set
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Email verification error:', error);
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Email verification failed',
          details:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Resend verification email
   *
   * @description Resends email verification email to the user.
   *
   * @param request - Resend request with DID and email
   * @returns Promise resolving to resend result
   *
   * @example
   * ```typescript
   * const request: ResendVerificationEmailRequest = {
   *   primaryDid: "did:plc:xxx",
   *   email: "user@example.com"
   * };
   * const result = await authController.resendVerificationEmail(request);
   * ```
   */
  @Post('resend-verification-email')
  @SuccessResponse('200', 'Verification email sent successfully')
  @Response<ApiResponse>('400', 'Invalid request')
  @Response<ApiResponse>('429', 'Too many requests')
  @Example<ApiResponse<{ sent: boolean }>>({
    success: true,
    data: {
      sent: true,
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async resendVerificationEmail(
    @Body() request: ResendVerificationEmailRequest
  ): Promise<ApiResponse<{ sent: boolean }>> {
    try {
      // Validate request
      if (!request.primaryDid || !request.email) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'primaryDid and email are required',
            details: 'Both fields are mandatory',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Get identity link
      const identityLink = await this.userAuthService[
        'snsService'
      ].getIdentityLink(request.primaryDid, `email:${request.email}`);

      if (!identityLink) {
        this.setStatus(404);
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Identity link not found',
            details: 'Unable to find email verification record',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Check if already verified
      if (identityLink.emailVerified) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'ALREADY_VERIFIED',
            message: 'Email already verified',
            details: 'This email address has already been verified',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Check rate limits
      const emailVerificationService =
        this.userAuthService['emailVerificationService'];
      const resendCheck = emailVerificationService.canResend(
        identityLink.emailVerifySentAt,
        0 // TODO: Get actual resend count from database
      );

      if (!resendCheck.allowed) {
        this.setStatus(429);
        return {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests',
            details: resendCheck.nextResendAt
              ? `Please wait until ${resendCheck.nextResendAt}`
              : 'Please try again later',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Generate new token
      const { token, expiresAt } =
        await emailVerificationService.generateVerificationToken(
          request.primaryDid,
          request.email
        );
      const tokenHash = emailVerificationService.getTokenHash(token);

      // Update identity link with new token
      await this.userAuthService['snsService'].updateIdentityLink(
        request.primaryDid,
        `email:${request.email}`,
        {
          emailVerifyTokenHash: tokenHash,
          emailVerifyTokenExpiresAt: expiresAt,
          emailVerifySentAt: new Date().toISOString(),
        }
      );

      // Send email
      await this.userAuthService['emailService'].sendVerificationEmail(
        request.email,
        token,
        request.primaryDid
      );

      this.setStatus(200);
      return {
        success: true,
        data: {
          sent: true,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Resend verification email error:', error);
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to resend verification email',
          details:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Request password reset
   *
   * @description Initiates password reset process by sending a reset email.
   * For security, always returns success even if email doesn't exist.
   *
   * @param request - Password reset request with email
   * @returns Promise resolving to success result
   *
   * @example
   * ```typescript
   * const request: ResetPasswordRequestRequest = {
   *   email: "user@example.com"
   * };
   * const result = await authController.requestPasswordReset(request);
   * ```
   */
  @Post('reset-password-request')
  @SuccessResponse('200', 'Password reset email sent successfully')
  @Response<ApiResponse>('400', 'Invalid request')
  @Example<ApiResponse<{ sent: boolean }>>({
    success: true,
    data: {
      sent: true,
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async requestPasswordReset(
    @Body() request: ResetPasswordRequestRequest
  ): Promise<ApiResponse<{ sent: boolean }>> {
    try {
      // Validate request
      if (!request.email) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email is required',
            details: 'Email field is mandatory',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Request password reset
      const result = await this.userAuthService.requestPasswordReset(
        request.email
      );

      if (!result.success) {
        this.setStatus(500);
        return {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: result.error || 'Failed to send password reset email',
            details: result.error || 'Unable to process password reset request',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Always return success for security (don't reveal if email exists)
      this.setStatus(200);
      return {
        success: true,
        data: {
          sent: true,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Password reset request error:', error);
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process password reset request',
          details:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Reset password using reset token
   *
   * @description Resets user password using a valid reset token from email.
   *
   * @param request - Password reset request with token, DID, and new password
   * @returns Promise resolving to success result
   *
   * @example
   * ```typescript
   * const request: ResetPasswordRequest = {
   *   token: "reset-token-123",
   *   primaryDid: "did:plc:xxx",
   *   newPassword: "NewSecurePass123!"
   * };
   * const result = await authController.resetPassword(request);
   * ```
   */
  @Post('reset-password')
  @SuccessResponse('200', 'Password reset successfully')
  @Response<ApiResponse>('400', 'Invalid request')
  @Response<ApiResponse>('401', 'Invalid or expired token')
  @Example<ApiResponse<{ reset: boolean }>>({
    success: true,
    data: {
      reset: true,
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async resetPassword(
    @Body() request: ResetPasswordRequest
  ): Promise<ApiResponse<{ reset: boolean }>> {
    try {
      // Validate request
      if (!request.token || !request.primaryDid || !request.newPassword) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Token, primaryDid, and newPassword are required',
            details: 'All fields are mandatory for password reset',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Reset password
      const result = await this.userAuthService.resetPassword(
        request.token,
        request.primaryDid,
        request.newPassword
      );

      if (!result.success) {
        if (
          result.error?.includes('expired') ||
          result.error?.includes('Invalid')
        ) {
          this.setStatus(401);
        } else {
          this.setStatus(400);
        }
        return {
          success: false,
          error: {
            code: result.error?.includes('expired')
              ? 'TOKEN_EXPIRED'
              : result.error?.includes('Invalid')
                ? 'INVALID_TOKEN'
                : 'VALIDATION_ERROR',
            message: result.error || 'Password reset failed',
            details: result.error || 'Unable to reset password',
          },
          timestamp: new Date().toISOString(),
        };
      }

      this.setStatus(200);
      return {
        success: true,
        data: {
          reset: true,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Password reset error:', error);
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Password reset failed',
          details:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Set initial password after email verification
   *
   * @description Sets the initial password for a user after email verification.
   * This endpoint replaces the temporary password with a user-defined password.
   * Must be called after email verification is completed.
   *
   * @param request - Set initial password request with DID, token, and new password
   * @returns Promise resolving to success result
   *
   * @example
   * ```typescript
   * const request: SetInitialPasswordRequest = {
   *   primaryDid: "did:plc:xxx",
   *   token: "verification-token-123",
   *   newPassword: "NewSecurePass123!"
   * };
   * const result = await authController.setInitialPassword(request);
   * ```
   */
  @Post('set-initial-password')
  @SuccessResponse('200', 'Initial password set successfully')
  @Response<ApiResponse>('400', 'Invalid request')
  @Response<ApiResponse>('401', 'Invalid or expired token')
  @Example<ApiResponse<{ set: boolean }>>({
    success: true,
    data: {
      set: true,
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async setInitialPassword(
    @Body() request: SetInitialPasswordRequest
  ): Promise<ApiResponse<{ set: boolean }>> {
    try {
      // Validate request
      if (!request.primaryDid || !request.token || !request.newPassword) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'primaryDid, token, and newPassword are required',
            details: 'All fields are mandatory for setting initial password',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Set initial password
      const result = await this.userAuthService.setInitialPassword(
        request.primaryDid,
        request.token,
        request.newPassword
      );

      if (!result.success) {
        if (
          result.error?.includes('expired') ||
          result.error?.includes('Invalid')
        ) {
          this.setStatus(401);
        } else {
          this.setStatus(400);
        }
        return {
          success: false,
          error: {
            code: result.error?.includes('expired')
              ? 'TOKEN_EXPIRED'
              : result.error?.includes('Invalid')
                ? 'INVALID_TOKEN'
                : 'VALIDATION_ERROR',
            message: result.error || 'Initial password setup failed',
            details: result.error || 'Unable to set initial password',
          },
          timestamp: new Date().toISOString(),
        };
      }

      this.setStatus(200);
      return {
        success: true,
        data: {
          set: true,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Set initial password error:', error);
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Initial password setup failed',
          details:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Change password for authenticated user
   *
   * @description Changes password for an authenticated user after verifying current password.
   * Requires JWT authentication.
   *
   * @param request - Change password request with current and new password
   * @returns Promise resolving to success result
   *
   * @example
   * ```typescript
   * const request: ChangePasswordRequest = {
   *   currentPassword: "OldPassword123!",
   *   newPassword: "NewSecurePass123!"
   * };
   * const result = await authController.changePassword(request);
   * ```
   */
  @Post('change-password')
  @Security('jwt')
  @SuccessResponse('200', 'Password changed successfully')
  @Response<ApiResponse>('400', 'Invalid request')
  @Response<ApiResponse>('401', 'Authentication required or incorrect password')
  @Example<ApiResponse<{ changed: boolean }>>({
    success: true,
    data: {
      changed: true,
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async changePassword(
    @Body() request: ChangePasswordRequest,
    @Request() req: any
  ): Promise<ApiResponse<{ changed: boolean }>> {
    try {
      // Validate request
      if (!request.currentPassword || !request.newPassword) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Current password and new password are required',
            details: 'Both fields are mandatory for password change',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Get user DID from JWT token
      const user = req.user;
      if (!user || !user.id) {
        this.setStatus(401);
        return {
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: 'Authentication required',
            details: 'Valid JWT token is required',
          },
          timestamp: new Date().toISOString(),
        };
      }

      const primaryDid = user.id;

      // Change password
      const result = await this.userAuthService.changePassword(
        primaryDid,
        request.currentPassword,
        request.newPassword
      );

      if (!result.success) {
        if (result.error?.includes('incorrect')) {
          this.setStatus(401);
        } else {
          this.setStatus(400);
        }
        return {
          success: false,
          error: {
            code: result.error?.includes('incorrect')
              ? 'AUTHENTICATION_ERROR'
              : 'VALIDATION_ERROR',
            message: result.error || 'Password change failed',
            details: result.error || 'Unable to change password',
          },
          timestamp: new Date().toISOString(),
        };
      }

      this.setStatus(200);
      return {
        success: true,
        data: {
          changed: true,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Password change error:', error);
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Password change failed',
          details:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }
}
