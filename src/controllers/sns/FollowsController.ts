/**
 * SNS Follows Controller
 *
 * @description Handles all follow-related operations for the SNS functionality
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
  FollowData,
  FollowListResponse,
  EmptyResponse,
} from '../../models/responses/SnsResponses';
import type {
  FollowUserRequest,
  GetFollowersQuery,
  GetFollowingQuery,
} from '../../models/requests/SnsRequests';
import { SnsService } from '../../services/SnsService';

/**
 * SNS Follows Controller
 *
 * @description Handles all follow-related operations including following, unfollowing,
 * and retrieving followers/following lists in the social network system.
 *
 * @example
 * ```typescript
 * const controller = new FollowsController();
 * const followers = await controller.getUserFollowers("user123", { limit: 10 });
 * ```
 */
@Route('sns/users')
@Tags('SNS Follows')
export class FollowsController extends Controller {
  private snsService: SnsService;

  constructor() {
    super();
    this.snsService = new SnsService();
  }

  /**
   * Follow a user
   *
   * @description Follows the specified user. If already following, this operation
   * is idempotent and will return success.
   *
   * @param request - Follow request containing target user ID
   * @returns Promise resolving to empty success response
   *
   * @security JWT authentication required
   */
  @Post('follow')
  @Security('jwt')
  @SuccessResponse('200', 'User followed successfully')
  @Response<ApiResponse>('400', 'Invalid follow request')
  @Response<ApiResponse>('401', 'Authentication required')
  @Response<ApiResponse>('404', 'Target user not found')
  @Response<ApiResponse>('500', 'Failed to follow user')
  @Example<EmptyResponse>({
    success: true,
    data: null,
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async followUser(
    @Body() request: FollowUserRequest,
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
            details: 'Valid JWT token is required to follow users',
          },
          timestamp: new Date().toISOString(),
        };
      }

      const followerId = user.id;
      const followingId = request.targetUserId;

      // Prevent self-follow
      if (followerId === followingId) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'SELF_FOLLOW_NOT_ALLOWED',
            message: 'Cannot follow yourself',
            details: 'Users cannot follow their own account',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Check if target user exists
      const targetUser = await this.snsService.getUserProfile(followingId);
      if (!targetUser) {
        this.setStatus(404);
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'Target user not found',
            details: `No user found with ID: ${followingId}`,
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Check if already following
      const isFollowing = await this.snsService.isFollowing(
        followerId,
        followingId
      );
      if (isFollowing) {
        // Already following, return success (idempotent)
        return {
          success: true,
          data: null,
          timestamp: new Date().toISOString(),
        };
      }

      // Follow the user
      await this.snsService.followUser(followerId, followingId);

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
          code: 'FOLLOW_ERROR',
          message: 'Failed to follow user',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Unfollow a user
   *
   * @description Unfollows the specified user. If not following, this operation
   * is idempotent and will return success.
   *
   * @param request - Follow request containing target user ID
   * @returns Promise resolving to empty success response
   *
   * @security JWT authentication required
   */
  @Post('unfollow')
  @Security('jwt')
  @SuccessResponse('200', 'User unfollowed successfully')
  @Response<ApiResponse>('400', 'Invalid unfollow request')
  @Response<ApiResponse>('401', 'Authentication required')
  @Response<ApiResponse>('404', 'Target user not found')
  @Response<ApiResponse>('500', 'Failed to unfollow user')
  @Example<EmptyResponse>({
    success: true,
    data: null,
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async unfollowUser(
    @Body() request: FollowUserRequest,
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
            details: 'Valid JWT token is required to unfollow users',
          },
          timestamp: new Date().toISOString(),
        };
      }

      const followerId = user.id;
      const followingId = request.targetUserId;

      // Check if target user exists
      const targetUser = await this.snsService.getUserProfile(followingId);
      if (!targetUser) {
        this.setStatus(404);
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'Target user not found',
            details: `No user found with ID: ${followingId}`,
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Check if following
      const isFollowing = await this.snsService.isFollowing(
        followerId,
        followingId
      );
      if (!isFollowing) {
        // Not following, return success (idempotent)
        return {
          success: true,
          data: null,
          timestamp: new Date().toISOString(),
        };
      }

      // Unfollow the user
      await this.snsService.unfollowUser(followerId, followingId);

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
          code: 'UNFOLLOW_ERROR',
          message: 'Failed to unfollow user',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get user followers with pagination
   *
   * @description Retrieves followers for a specific user with pagination support.
   * Followers are returned in reverse chronological order (newest first).
   *
   * @param userId - The ID of the user to get followers for
   * @param limit - Number of followers to return (max 50, default 20)
   * @param cursor - Pagination cursor for next page
   * @returns Promise resolving to paginated followers data
   */
  @Get('{userId}/followers')
  @SuccessResponse('200', 'Followers retrieved successfully')
  @Response<ApiResponse>('400', 'Invalid query parameters')
  @Response<ApiResponse>('404', 'User not found')
  @Response<ApiResponse>('500', 'Failed to retrieve followers')
  @Example<FollowListResponse>({
    success: true,
    data: {
      items: [
        {
          userId: 'user-123',
          displayName: 'John Doe',
          username: 'johndoe',
          avatarUrl: 'https://example.com/avatar.jpg',
          bio: 'Software developer',
          isFollowingBack: true,
          followedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          userId: 'user-456',
          displayName: 'Jane Smith',
          username: 'janesmith',
          avatarUrl: 'https://example.com/avatar2.jpg',
          bio: 'Designer',
          isFollowingBack: false,
          followedAt: '2024-01-01T01:00:00.000Z',
        },
      ],
      nextCursor:
        'eyJQSyI6IlVTRVIjdXNlci0xMjMiLCJTSyI6IkZPTExPVyMyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFoiLCJ1c2VyLTQ1NiJ9',
      hasMore: true,
      totalCount: 150,
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async getUserFollowers(
    @Path() userId: string,
    @Query() limit: number = 20,
    @Query() cursor?: string
  ): Promise<FollowListResponse> {
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

      // Check if user exists
      const user = await this.snsService.getUserProfile(userId);
      if (!user) {
        this.setStatus(404);
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            details: `No user found with ID: ${userId}`,
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Get followers
      const result = await this.snsService.getUserFollowers(
        userId,
        limit,
        cursor
      );

      // Get user profiles for all followers
      const followersWithUserInfo: FollowData[] = [];
      for (const follower of result.items) {
        const userProfile = await this.snsService.getUserProfile(
          follower.userId
        );
        if (userProfile) {
          // TODO: Check if current user is following back
          const isFollowingBack = false; // This should be checked based on current user

          followersWithUserInfo.push({
            ...follower,
            displayName: userProfile.displayName,
            username: userProfile.handle, // AT Protocol standard: handle (previously username)
            avatarUrl: userProfile.avatar, // AT Protocol standard: avatar (previously avatarUrl)
            bio: userProfile.description, // AT Protocol standard: description (previously bio)
            isFollowingBack,
          });
        }
      }

      return {
        success: true,
        data: {
          items: followersWithUserInfo,
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
          code: 'FOLLOWERS_RETRIEVAL_ERROR',
          message: 'Failed to retrieve followers',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get user following with pagination
   *
   * @description Retrieves following list for a specific user with pagination support.
   * Following are returned in reverse chronological order (newest first).
   *
   * @param userId - The ID of the user to get following for
   * @param limit - Number of following to return (max 50, default 20)
   * @param cursor - Pagination cursor for next page
   * @returns Promise resolving to paginated following data
   */
  @Get('{userId}/following')
  @SuccessResponse('200', 'Following retrieved successfully')
  @Response<ApiResponse>('400', 'Invalid query parameters')
  @Response<ApiResponse>('404', 'User not found')
  @Response<ApiResponse>('500', 'Failed to retrieve following')
  @Example<FollowListResponse>({
    success: true,
    data: {
      items: [
        {
          userId: 'user-789',
          displayName: 'Alice Johnson',
          username: 'alicej',
          avatarUrl: 'https://example.com/avatar3.jpg',
          bio: 'Artist',
          isFollowingBack: true,
          followedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          userId: 'user-101',
          displayName: 'Bob Wilson',
          username: 'bobw',
          avatarUrl: 'https://example.com/avatar4.jpg',
          bio: 'Writer',
          isFollowingBack: false,
          followedAt: '2024-01-01T01:00:00.000Z',
        },
      ],
      nextCursor:
        'eyJQSyI6IlVTRVIjdXNlci0xMjMiLCJTSyI6IkZPTExPVyMyMDI0LTAxLTAxVDAwOjAwOjAwLjAwMFoiLCJ1c2VyLTc4OSJ9',
      hasMore: true,
      totalCount: 75,
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async getUserFollowing(
    @Path() userId: string,
    @Query() limit: number = 20,
    @Query() cursor?: string
  ): Promise<FollowListResponse> {
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

      // Check if user exists
      const user = await this.snsService.getUserProfile(userId);
      if (!user) {
        this.setStatus(404);
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            details: `No user found with ID: ${userId}`,
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Get following
      const result = await this.snsService.getUserFollowing(
        userId,
        limit,
        cursor
      );

      // Get user profiles for all following
      const followingWithUserInfo: FollowData[] = [];
      for (const following of result.items) {
        const userProfile = await this.snsService.getUserProfile(
          following.userId
        );
        if (userProfile) {
          // TODO: Check if following back
          const isFollowingBack = false; // This should be checked based on current user

          followingWithUserInfo.push({
            ...following,
            displayName: userProfile.displayName,
            username: userProfile.handle, // AT Protocol standard: handle (previously username)
            avatarUrl: userProfile.avatar, // AT Protocol standard: avatar (previously avatarUrl)
            bio: userProfile.description, // AT Protocol standard: description (previously bio)
            isFollowingBack,
          });
        }
      }

      return {
        success: true,
        data: {
          items: followingWithUserInfo,
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
          code: 'FOLLOWING_RETRIEVAL_ERROR',
          message: 'Failed to retrieve following',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }
}
