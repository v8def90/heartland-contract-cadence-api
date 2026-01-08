/**
 * SNS Feed Controller
 *
 * @description Handles feed-related operations for the SNS functionality
 * @author Heart Token API Team
 * @since 1.0.0
 */

import {
  Controller,
  Get,
  Route,
  Security,
  Query,
  Tags,
  Example,
  SuccessResponse,
  Response,
} from 'tsoa';
import type { ApiResponse } from '../../models/responses/ApiResponse';
import type {
  PostData,
  PostListResponse,
} from '../../models/responses/SnsResponses';
import type { GetFeedQuery } from '../../models/requests/SnsRequests';
import { SnsService } from '../../services/SnsService';

/**
 * SNS Feed Controller
 *
 * @description Handles feed-related operations including retrieving personalized
 * feeds for users based on their following relationships.
 *
 * @example
 * ```typescript
 * const controller = new FeedController();
 * const feed = await controller.getFeed({ limit: 20 });
 * ```
 */
@Route('sns/feed')
@Tags('SNS Feed')
export class FeedController extends Controller {
  private snsService: SnsService;

  constructor() {
    super();
    this.snsService = new SnsService();
  }

  /**
   * Get personalized feed
   *
   * @description Retrieves a personalized feed of posts from users that the
   * authenticated user is following. Posts are returned in reverse chronological order.
   *
   * @param limit - Number of posts to return (max 50, default 20)
   * @param cursor - Pagination cursor for next page
   * @returns Promise resolving to paginated feed data
   *
   * @security JWT authentication required
   */
  @Get()
  @Security('jwt')
  @SuccessResponse('200', 'Feed retrieved successfully')
  @Response<ApiResponse>('400', 'Invalid query parameters')
  @Response<ApiResponse>('401', 'Authentication required')
  @Response<ApiResponse>('500', 'Failed to retrieve feed')
  @Example<PostListResponse>({
    success: true,
    data: {
      items: [
        {
          uri: 'at://did:plc:xxx/app.bsky.feed.post/3k2abc123def456',
          rkey: '3k2abc123def456',
          ownerDid: 'did:plc:xxx',
          authorName: 'John Doe',
          authorUsername: 'johndoe',
          text: 'Just finished a great workout! 💪',
          embed: {
            images: [
              {
                url: 'https://example.com/workout.jpg',
                alt: 'Workout image',
              },
            ],
          },
          facets: [
            {
              type: 'tag',
              value: 'fitness',
              startIndex: 0,
              endIndex: 7,
            },
          ],
          isLiked: false,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          uri: 'at://did:plc:yyy/app.bsky.feed.post/3k2def456ghi789',
          rkey: '3k2def456ghi789',
          ownerDid: 'did:plc:yyy',
          authorName: 'Jane Smith',
          authorUsername: 'janesmith',
          text: 'Beautiful sunset today 🌅',
          embed: {
            images: [
              {
                url: 'https://example.com/sunset.jpg',
                alt: 'Sunset image',
              },
            ],
          },
          facets: [
            {
              type: 'tag',
              value: 'nature',
              startIndex: 0,
              endIndex: 6,
            },
          ],
          isLiked: true,
          createdAt: '2024-01-01T01:00:00.000Z',
          updatedAt: '2024-01-01T01:00:00.000Z',
        },
      ],
      nextCursor:
        'eyJQSyI6IlVTRVIjdXNlci00NTYiLCJTSyI6IlBPU1QjMjAyNC0wMS0wMVQwMDowMDowMC4wMDBaIiwicG9zdC0xMjMifQ==',
      hasMore: true,
      totalCount: 150,
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async getFeed(
    @Query() limit: number = 20,
    @Query() cursor?: string
  ): Promise<PostListResponse> {
    try {
      // TODO: Extract user ID from JWT token
      const userId = 'temp-user-id'; // This should come from JWT middleware

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

      // Get user's following list
      const followingResult = await this.snsService.getUserFollowing(
        userId,
        1000
      ); // Get all following
      const followingIds = followingResult.items.map(follow => follow.userId);

      if (followingIds.length === 0) {
        // User is not following anyone, return empty feed
        return {
          success: true,
          data: {
            items: [],
            nextCursor: undefined,
            hasMore: false,
          },
          timestamp: new Date().toISOString(),
        };
      }

      // TODO: Implement feed aggregation logic
      // This is a simplified implementation that gets posts from all followed users
      // In a real implementation, you would want to:
      // 1. Aggregate posts from all followed users
      // 2. Sort by creation time
      // 3. Apply pagination
      // 4. Cache frequently accessed data

      // For now, we'll get posts from the first followed user as a placeholder
      const firstFollowingId = followingIds[0];
      if (!firstFollowingId) {
        return {
          success: true,
          data: {
            items: [],
            nextCursor: undefined,
            hasMore: false,
          },
          timestamp: new Date().toISOString(),
        };
      }

      const feedResult = await this.snsService.getUserPosts(
        firstFollowingId,
        limit,
        cursor
      );

      // Posts already have author information from SnsService
      const postsWithAuthorInfo: PostData[] = feedResult.items.map(post => ({
        ...post,
        // TODO: Check if current user liked this post
        isLiked: false, // This should come from JWT middleware
      }));

      return {
        success: true,
        data: {
          items: postsWithAuthorInfo,
          nextCursor: feedResult.nextCursor,
          hasMore: feedResult.hasMore,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'FEED_RETRIEVAL_ERROR',
          message: 'Failed to retrieve feed',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get global feed (public posts)
   *
   * @description Retrieves a global feed of public posts from all users.
   * This endpoint does not require authentication.
   *
   * @param limit - Number of posts to return (max 50, default 20)
   * @param cursor - Pagination cursor for next page
   * @returns Promise resolving to paginated feed data
   */
  @Get('global')
  @SuccessResponse('200', 'Global feed retrieved successfully')
  @Response<ApiResponse>('400', 'Invalid query parameters')
  @Response<ApiResponse>('500', 'Failed to retrieve global feed')
  @Example<PostListResponse>({
    success: true,
    data: {
      items: [
        {
          uri: 'at://did:plc:zzz/app.bsky.feed.post/3k2ghi789jkl012',
          rkey: '3k2ghi789jkl012',
          ownerDid: 'did:plc:zzz',
          authorName: 'Alice Johnson',
          authorUsername: 'alicej',
          text: 'Excited to share my latest project! 🚀',
          embed: {
            images: [
              {
                url: 'https://example.com/project.jpg',
                alt: 'Project image',
              },
            ],
          },
          facets: [
            {
              type: 'tag',
              value: 'project',
              startIndex: 0,
              endIndex: 7,
            },
          ],
          isLiked: false,
          createdAt: '2024-01-01T02:00:00.000Z',
          updatedAt: '2024-01-01T02:00:00.000Z',
        },
      ],
      nextCursor:
        'eyJQSyI6IlVTRVIjdXNlci03ODkiLCJTSyI6IlBPU1QjMjAyNC0wMS0wMVQwMDowMDowMC4wMDBaIiwicG9zdC00NTYifQ==',
      hasMore: true,
      totalCount: 1000,
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async getGlobalFeed(
    @Query() limit: number = 20,
    @Query() cursor?: string
  ): Promise<PostListResponse> {
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

      // Get all posts from service (reuse existing getAllPosts method)
      const result = await this.snsService.getAllPosts(limit, cursor);

      if (!result.success) {
        this.setStatus(500);
        return {
          success: false,
          error: {
            code: 'GLOBAL_FEED_RETRIEVAL_ERROR',
            message: 'Failed to retrieve global feed',
            details: result.error || 'Unknown error occurred',
          },
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: true,
        data: result.data!,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'GLOBAL_FEED_RETRIEVAL_ERROR',
          message: 'Failed to retrieve global feed',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }
}
