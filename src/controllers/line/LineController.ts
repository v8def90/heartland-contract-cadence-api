/**
 * LINE Account Linking Controller
 *
 * @description Handles LINE account linking operations including nonce generation,
 * account linking completion, status checking, and unlinking.
 *
 * @author Heart Token API Team
 * @since 1.0.0
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Route,
  Security,
  Body,
  Query,
  Tags,
  Example,
  SuccessResponse,
  Response,
  Request,
} from 'tsoa';
import type { ApiResponse } from '../../models/responses';
import type {
  LineLinkResponse,
  LineCompleteLinkResponse,
  LineLinkStatus,
  LineUnlinkResponse,
} from '../../models/responses/LineResponses';
import type {
  LineLinkRequest,
  LineCompleteLinkRequest,
} from '../../models/requests/LineRequests';
import { LineLinkService } from '../../services/LineLinkService';
import { UserAuthService } from '../../services/UserAuthService';
import { verifyJwtToken, type JwtPayload } from '../../middleware/passport';

/**
 * LINE Account Linking Controller
 *
 * @description Provides endpoints for LINE account linking operations.
 * Supports both email/password and JWT authentication for initiating linking.
 *
 * @example
 * ```typescript
 * const controller = new LineController();
 * const result = await controller.linkAccount(request, linkToken);
 * ```
 */
@Route('line')
@Tags('LINE Account Linking')
export class LineController extends Controller {
  private lineLinkService: LineLinkService;
  private userAuthService: UserAuthService;

  constructor() {
    super();
    this.lineLinkService = LineLinkService.getInstance();
    this.userAuthService = UserAuthService.getInstance();
  }

  /**
   * Generate nonce and return redirect URL for LINE account linking
   *
   * @description Generates a secure nonce and returns the redirect URL to LINE platform.
   * Supports both email/password and JWT authentication.
   *
   * @param request - Login information (email/password or JWT in header)
   * @param linkToken - Link token from Bot server (query parameter)
   * @param requestObj - Express request object for JWT extraction
   * @returns Promise resolving to redirect URL and nonce information
   *
   * @example
   * ```typescript
   * // Email/password authentication
   * const request: LineLinkRequest = {
   *   email: "user@example.com",
   *   password: "password123"
   * };
   * const result = await controller.linkAccount(request, "linkToken123");
   *
   * // JWT authentication (Authorization header required)
   * const result = await controller.linkAccount({}, "linkToken123");
   * ```
   */
  @Post('link')
  @SuccessResponse('200', 'Nonce generated successfully')
  @Response<ApiResponse>('400', 'Invalid request or already linked')
  @Response<ApiResponse>('401', 'Authentication required')
  @Response<ApiResponse>('404', 'User not found')
  @Response<ApiResponse>('500', 'Failed to generate nonce')
  @Example<ApiResponse<LineLinkResponse>>({
    success: true,
    data: {
      success: true,
      redirectUrl:
        'https://access.line.me/dialog/bot/accountLink?linkToken=xxx&nonce=yyy',
      nonce: 'base64EncodedNonce',
      expiresAt: '2024-01-01T00:10:00.000Z',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async linkAccount(
    @Body() request: LineLinkRequest,
    @Query() linkToken: string,
    @Request() requestObj: any
  ): Promise<ApiResponse<LineLinkResponse>> {
    try {
      // Validate linkToken
      if (!linkToken) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Link token is required',
            details: 'Link token must be provided as query parameter',
          },
          timestamp: new Date().toISOString(),
        };
      }

      let primaryDid: string | undefined;

      // Authentication method A: JWT (from Authorization header)
      const authHeader = requestObj.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const jwtToken = authHeader.substring(7);
        const payload = verifyJwtToken(jwtToken);
        if (!payload) {
          this.setStatus(401);
          return {
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Invalid or expired JWT token',
              details: 'Please login again',
            },
            timestamp: new Date().toISOString(),
          };
        }
        primaryDid = payload.sub; // JWT payloadのsubフィールドにprimaryDidが含まれる
      }
      // Authentication method B: email/password
      else if (request.email && request.password) {
        const loginResult = await this.userAuthService.loginWithEmailPassword(
          request.email,
          request.password
        );
        if (!loginResult.success || !loginResult.primaryDid) {
          this.setStatus(401);
          return {
            success: false,
            error: {
              code: 'AUTHENTICATION_ERROR',
              message: 'Invalid email or password',
              details: loginResult.error || 'Authentication failed',
            },
            timestamp: new Date().toISOString(),
          };
        }
        primaryDid = loginResult.primaryDid;
      } else {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'INVALID_AUTH_METHOD',
            message: 'Either email/password or JWT token is required',
            details:
              'Provide email/password in request body or Authorization header with JWT token',
          },
          timestamp: new Date().toISOString(),
        };
      }

      if (!primaryDid) {
        this.setStatus(404);
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            details: 'Could not determine user identity',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Check if account is already linked
      const isLinked = await this.lineLinkService.isAccountLinked(
        undefined,
        primaryDid
      );
      if (isLinked) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'ALREADY_LINKED',
            message: 'Account is already linked',
            details: 'This account is already linked to a LINE account',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Generate nonce
      const nonce = await this.lineLinkService.generateLinkNonce(
        primaryDid,
        linkToken
      );

      // Generate redirect URL
      const redirectUrl = `https://access.line.me/dialog/bot/accountLink?linkToken=${encodeURIComponent(linkToken)}&nonce=${encodeURIComponent(nonce)}`;

      // Calculate expiration time (10 minutes from now)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      this.setStatus(200);
      return {
        success: true,
        data: {
          success: true,
          redirectUrl,
          nonce, // デバッグ用（本番環境では返却しないことを推奨）
          expiresAt,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('LINE link account error:', error);
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate nonce',
          details:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Complete LINE account linking
   *
   * @description Completes the LINE account linking process.
   * Called by Bot server after receiving Webhook event.
   *
   * @param request - Complete link request with lineUserId and nonce
   * @returns Promise resolving to linking completion information
   *
   * @example
   * ```typescript
   * const request: LineCompleteLinkRequest = {
   *   lineUserId: "U1234567890abcdef",
   *   nonce: "base64EncodedNonce"
   * };
   * const result = await controller.completeLink(request);
   * ```
   */
  @Post('complete-link')
  @SuccessResponse('200', 'Account linking completed successfully')
  @Response<ApiResponse>('400', 'Invalid request or already linked')
  @Response<ApiResponse>('404', 'Nonce not found or expired')
  @Response<ApiResponse>('500', 'Failed to complete linking')
  @Example<ApiResponse<LineCompleteLinkResponse>>({
    success: true,
    data: {
      success: true,
      lineUserId: 'U1234567890abcdef',
      primaryDid: 'did:plc:lld5wgybmddzz32guiotcpce',
      linkedAt: '2024-01-01T00:00:00.000Z',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async completeLink(
    @Body() request: LineCompleteLinkRequest
  ): Promise<ApiResponse<LineCompleteLinkResponse>> {
    try {
      // Validate request
      if (!request.lineUserId || !request.nonce) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'lineUserId and nonce are required',
            details: 'Both fields are mandatory',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Get nonce information
      const nonceInfo = await this.lineLinkService.getNonceInfo(request.nonce);
      if (!nonceInfo) {
        this.setStatus(404);
        return {
          success: false,
          error: {
            code: 'INVALID_NONCE',
            message: 'Invalid or expired nonce',
            details: 'The nonce is invalid, expired, or already used',
          },
          timestamp: new Date().toISOString(),
        };
      }

      const { primaryDid } = nonceInfo;

      // Check if account is already linked
      const isLinked = await this.lineLinkService.isAccountLinked(
        request.lineUserId,
        primaryDid
      );
      if (isLinked) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'ALREADY_LINKED',
            message: 'Account is already linked',
            details: 'This account is already linked to a LINE account',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Link account
      const success = await this.lineLinkService.linkAccount(
        request.lineUserId,
        primaryDid
      );
      if (!success) {
        this.setStatus(500);
        return {
          success: false,
          error: {
            code: 'LINKING_FAILED',
            message: 'Failed to link account',
            details: 'Could not complete account linking',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Mark nonce as used
      await this.lineLinkService.markNonceAsUsed(request.nonce);

      const linkedAt = new Date().toISOString();

      this.setStatus(200);
      return {
        success: true,
        data: {
          success: true,
          lineUserId: request.lineUserId,
          primaryDid,
          linkedAt,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('LINE complete link error:', error);
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to complete linking',
          details:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get LINE account linking status
   *
   * @description Retrieves the linking status for a LINE user ID or primaryDid.
   *
   * @param lineUserId - LINE user ID (optional)
   * @param primaryDid - Primary DID (optional)
   * @returns Promise resolving to link status information
   *
   * @example
   * ```typescript
   * // Query by LINE user ID
   * const status = await controller.getLinkStatus("U1234567890abcdef");
   *
   * // Query by primaryDid
   * const status = await controller.getLinkStatus(undefined, "did:plc:xxx");
   * ```
   */
  @Get('link-status')
  @SuccessResponse('200', 'Link status retrieved successfully')
  @Response<ApiResponse>('400', 'Invalid request')
  @Response<ApiResponse>('500', 'Failed to retrieve link status')
  @Example<ApiResponse<LineLinkStatus>>({
    success: true,
    data: {
      isLinked: true,
      lineUserId: 'U1234567890abcdef',
      linkedAt: '2024-01-01T00:00:00.000Z',
      primaryDid: 'did:plc:lld5wgybmddzz32guiotcpce',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async getLinkStatus(
    @Query() lineUserId?: string,
    @Query() primaryDid?: string
  ): Promise<ApiResponse<LineLinkStatus>> {
    try {
      // Validate request
      if (!lineUserId && !primaryDid) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Either lineUserId or primaryDid is required',
            details: 'Provide at least one identifier',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Get link status
      const status = await this.lineLinkService.getLinkStatus(
        lineUserId,
        primaryDid
      );

      this.setStatus(200);
      return {
        success: true,
        data: status,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('LINE get link status error:', error);
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve link status',
          details:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Unlink LINE account
   *
   * @description Unlinks a LINE account from primaryDid.
   *
   * @param lineUserId - LINE user ID (optional)
   * @param primaryDid - Primary DID (optional)
   * @returns Promise resolving to unlinking result
   *
   * @example
   * ```typescript
   * // Unlink by LINE user ID
   * const result = await controller.unlinkAccount("U1234567890abcdef");
   *
   * // Unlink by primaryDid
   * const result = await controller.unlinkAccount(undefined, "did:plc:xxx");
   * ```
   */
  @Delete('unlink')
  @Security('jwt')
  @SuccessResponse('200', 'Account unlinked successfully')
  @Response<ApiResponse>('400', 'Invalid request')
  @Response<ApiResponse>('401', 'Authentication required')
  @Response<ApiResponse>('404', 'Link not found')
  @Response<ApiResponse>('500', 'Failed to unlink account')
  @Example<ApiResponse<LineUnlinkResponse>>({
    success: true,
    data: {
      success: true,
      unlinkedAt: '2024-01-01T00:00:00.000Z',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async unlinkAccount(
    @Query() lineUserId?: string,
    @Query() primaryDid?: string
  ): Promise<ApiResponse<LineUnlinkResponse>> {
    try {
      // Validate request
      if (!lineUserId && !primaryDid) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Either lineUserId or primaryDid is required',
            details: 'Provide at least one identifier',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Unlink account
      const success = await this.lineLinkService.unlinkAccount(
        lineUserId,
        primaryDid
      );
      if (!success) {
        this.setStatus(404);
        return {
          success: false,
          error: {
            code: 'LINK_NOT_FOUND',
            message: 'Link not found',
            details: 'No active link found for the provided identifiers',
          },
          timestamp: new Date().toISOString(),
        };
      }

      const unlinkedAt = new Date().toISOString();

      this.setStatus(200);
      return {
        success: true,
        data: {
          success: true,
          unlinkedAt,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('LINE unlink account error:', error);
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to unlink account',
          details:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }
}
