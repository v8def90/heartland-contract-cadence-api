/**
 * SNS Likes Controller
 *
 * @description Handles all like-related operations for the SNS functionality
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
  Path,
  Query,
  Tags,
  Example,
  SuccessResponse,
  Response,
  Request,
} from 'tsoa';
import type { ApiResponse } from '../../models/responses/ApiResponse';
import type {
  LikeData,
  LikeListResponse,
  EmptyResponse,
} from '../../models/responses/SnsResponses';
import type {
  LikePostRequest,
  GetLikesQuery,
} from '../../models/requests/SnsRequests';
import { SnsService } from '../../services/SnsService';

/**
 * SNS Likes Controller
 *
 * @description Handles all like-related operations including adding, removing,
 * and retrieving likes on posts in the social network system.
 *
 * @example
 * ```typescript
 * const controller = new LikesController();
 * const likes = await controller.getPostLikes("post123", { limit: 10 });
 * ```
 */
@Route('sns/posts/{postId}/likes')
@Tags('SNS Likes')
export class LikesController extends Controller {
  private snsService: SnsService;

  constructor() {
    super();
    this.snsService = new SnsService();
  }

  /**
   * Like a post
   *
   * @description Adds a like to the specified post. If the user has already liked
   * the post, this operation is idempotent and will not create a duplicate like.
   *
   * @param postId - The ID of the post to like
   * @param request - Like request (contains postId for validation)
   * @returns Promise resolving to empty success response
   *
   * @security JWT authentication required
   */
  @Post()
  @Security('jwt')
  @SuccessResponse('200', 'Post liked successfully')
  @Response<ApiResponse>('400', 'Invalid like request')
  @Response<ApiResponse>('401', 'Authentication required')
  @Response<ApiResponse>('404', 'Post not found')
  @Response<ApiResponse>('500', 'Failed to like post')
  @Example<EmptyResponse>({
    success: true,
    data: null,
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async likePost(
    @Path() postId: string,
    @Body() request: LikePostRequest,
    @Request() requestObj: any
  ): Promise<EmptyResponse> {
    try {
      // Extract user ID from JWT token
      const user = requestObj?.user;

      if (!user || !user.id) {
        this.setStatus(401);
        return {
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: 'Authentication required',
            details: 'Valid JWT token is required to like posts',
          },
          timestamp: new Date().toISOString(),
        };
      }

      const userId = user.id;

      // Validate uri matches (if provided in request)
      if (request.uri && request.uri !== postId) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'POST_URI_MISMATCH',
            message: 'Post URI in path does not match request body',
            details: `Path: ${postId}, Body: ${request.uri}`,
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Check if post exists
      const post = await this.snsService.getPost(postId);
      if (!post) {
        this.setStatus(404);
        return {
          success: false,
          error: {
            code: 'POST_NOT_FOUND',
            message: 'Post not found',
            details: `No post found with ID: ${postId}`,
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Check if already liked
      const isLiked = await this.snsService.isPostLiked(postId, userId);
      if (isLiked) {
        // Already liked, return success (idempotent)
        return {
          success: true,
          data: null,
          timestamp: new Date().toISOString(),
        };
      }

      // Like the post
      await this.snsService.likePost(postId, userId);

      return {
        success: true,
        data: null,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'LIKE_ERROR',
          message: 'Failed to like post',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Unlike a post
   *
   * @description Removes a like from the specified post. If the user has not liked
   * the post, this operation is idempotent and will return success.
   *
   * @param postId - The ID of the post to unlike
   * @returns Promise resolving to empty success response
   *
   * @security JWT authentication required
   */
  @Delete()
  @Security('jwt')
  @SuccessResponse('200', 'Post unliked successfully')
  @Response<ApiResponse>('401', 'Authentication required')
  @Response<ApiResponse>('404', 'Post not found')
  @Response<ApiResponse>('500', 'Failed to unlike post')
  @Example<EmptyResponse>({
    success: true,
    data: null,
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async unlikePost(
    @Path() postId: string,
    @Request() requestObj: any
  ): Promise<EmptyResponse> {
    try {
      // Extract user ID from JWT token
      const user = requestObj?.user;

      if (!user || !user.id) {
        this.setStatus(401);
        return {
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: 'Authentication required',
            details: 'Valid JWT token is required to unlike posts',
          },
          timestamp: new Date().toISOString(),
        };
      }

      const userId = user.id;

      // Check if post exists
      const post = await this.snsService.getPost(postId);
      if (!post) {
        this.setStatus(404);
        return {
          success: false,
          error: {
            code: 'POST_NOT_FOUND',
            message: 'Post not found',
            details: `No post found with ID: ${postId}`,
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Check if liked
      const isLiked = await this.snsService.isPostLiked(postId, userId);
      if (!isLiked) {
        // Not liked, return success (idempotent)
        return {
          success: true,
          data: null,
          timestamp: new Date().toISOString(),
        };
      }

      // Unlike the post
      await this.snsService.unlikePost(postId, userId);

      return {
        success: true,
        data: null,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'UNLIKE_ERROR',
          message: 'Failed to unlike post',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get likes for a post with pagination
   *
   * @description Retrieves likes for a specific post with pagination support.
   * Likes are returned in reverse chronological order (newest first).
   *
   * @param postId - The ID of the post to get likes for
   * @param limit - Number of likes to return (max 50, default 20)
   * @param cursor - Pagination cursor for next page
   * @returns Promise resolving to paginated likes data
   */
  @Get()
  @SuccessResponse('200', 'Likes retrieved successfully')
  @Response<ApiResponse>('400', 'Invalid query parameters')
  @Response<ApiResponse>('404', 'Post not found')
  @Response<ApiResponse>('500', 'Failed to retrieve likes')
  @Example<LikeListResponse>({
    success: true,
    data: {
      items: [
        {
          userId: 'user-123',
          displayName: 'John Doe',
          username: 'johndoe',
          avatarUrl: 'https://example.com/avatar.jpg',
          likedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          userId: 'user-456',
          displayName: 'Jane Smith',
          username: 'janesmith',
          avatarUrl: 'https://example.com/avatar2.jpg',
          likedAt: '2024-01-01T01:00:00.000Z',
        },
      ],
      nextCursor:
        'eyJQSyI6IlBPU1QjcG9zdC00NTYiLCJTSyI6IkxJS0UjMjAyNC0wMS0wMVQwMDowMDowMC4wMDBaIiwidXNlci0xMjMifQ==',
      hasMore: true,
      totalCount: 25,
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async getPostLikes(
    @Path() postId: string,
    @Query() limit: number = 20,
    @Query() cursor?: string
  ): Promise<LikeListResponse> {
    try {
      // Validate limit
      if (limit > 50) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'INVALID_LIMIT',
            message: 'Limit must be 50 or less',
            details: `Received limit: ${limit}`,
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Check if post exists
      const post = await this.snsService.getPost(postId);
      if (!post) {
        this.setStatus(404);
        return {
          success: false,
          error: {
            code: 'POST_NOT_FOUND',
            message: 'Post not found',
            details: `No post found with ID: ${postId}`,
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Get likes
      const result = await this.snsService.getPostLikes(postId, limit, cursor);

      // Get user profiles for all likes
      const likesWithUserInfo: LikeData[] = [];
      for (const like of result.items) {
        const userProfile = await this.snsService.getUserProfile(like.userId);
        if (userProfile) {
          likesWithUserInfo.push({
            ...like,
            displayName: userProfile.displayName,
            username: userProfile.handle, // AT Protocol standard: handle (previously username)
            avatarUrl: userProfile.avatar, // AT Protocol standard: avatar (previously avatarUrl)
          });
        }
      }

      return {
        success: true,
        data: {
          items: likesWithUserInfo,
          nextCursor: result.nextCursor,
          hasMore: result.hasMore,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'LIKES_RETRIEVAL_ERROR',
          message: 'Failed to retrieve likes',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }
}
