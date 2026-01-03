/**
 * SNS Search Controller
 *
 * @description Handles search operations for SNS features including user search
 * @author Heart Token API Team
 * @since 1.0.0
 */

import {
  Controller,
  Get,
  Route,
  Query,
  Tags,
  Example,
  SuccessResponse,
  Response,
  Request,
} from 'tsoa';
import type { ApiResponse } from '../../models/responses/ApiResponse';
import type {
  SearchUsersResponse,
} from '../../models/responses/SnsResponses';
import { SnsService } from '../../services/SnsService';

/**
 * SNS Search Controller
 *
 * @description Provides search functionality for SNS features.
 * Supports user search by handle (username) or displayName with pagination.
 *
 * @example
 * ```typescript
 * const searchController = new SearchController();
 * const results = await searchController.searchUsersGet("john", 20);
 * ```
 */
@Route('sns/search')
@Tags('SNS Search')
export class SearchController extends Controller {
  private snsService: SnsService;

  constructor() {
    super();
    this.snsService = new SnsService();
  }

  /**
   * Search users by query string
   *
   * @description Searches for users based on handle (username) or displayName.
   * The query parameter searches in both handle and displayName fields.
   * Supports pagination and optional authentication for follow status.
   *
   * @param query - Search query string (searches in handle and displayName)
   * @param limit - Number of results to return (max 50, default 20)
   * @param cursor - Pagination cursor for next page
   * @param requestObj - Express request object for authentication
   * @returns Promise resolving to search results
   *
   * @example
   * ```typescript
   * const results = await searchController.searchUsersGet("john", 20);
   * ```
   */
  @Get('users')
  @SuccessResponse('200', 'Search completed successfully')
  @Response<ApiResponse>('400', 'Invalid search parameters')
  @Response<ApiResponse>('500', 'Search failed')
  @Example<SearchUsersResponse>({
    success: true,
    data: {
      items: [
        {
          did: 'did:plc:lld5wgybmddzz32guiotcpce',
          displayName: 'John Doe',
          handle: 'johndoe',
          description: 'Software developer',
          avatar: 'https://example.com/avatar1.jpg',
          banner: 'https://example.com/background1.jpg',
          followerCount: 150,
          followingCount: 200,
          createdAt: '2024-01-01T00:00:00.000Z',
          email: 'john.doe@example.com',
          walletAddress: '0x1234567890abcdef',
          postCount: 45,
          updatedAt: '2024-01-01T00:00:00.000Z',
          isFollowing: false,
        },
      ],
      nextCursor: undefined,
      hasMore: false,
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async searchUsersGet(
    @Query() query: string,
    @Query() limit: number = 20,
    @Query() cursor?: string,
    @Request() requestObj?: any
  ): Promise<SearchUsersResponse> {
    try {
      // Validate query
      if (!query || query.trim().length === 0) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'INVALID_QUERY',
            message: 'Search query is required',
            details: 'The query parameter must be provided and cannot be empty',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Validate limit
      const validatedLimit = Math.min(limit, 50);
      if (validatedLimit < 1) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'INVALID_LIMIT',
            message: 'Invalid limit value',
            details: 'Limit must be between 1 and 50',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Extract current user ID if authenticated
      let currentUserId: string | undefined;
      if (requestObj?.user?.id) {
        currentUserId = requestObj.user.id;
      }

      // Search users
      const result = await this.snsService.searchUsers(
        query.trim(),
        validatedLimit,
        cursor,
        currentUserId
      );

      if (!result.success) {
        this.setStatus(500);
        return {
          success: false,
          error: {
            code: 'SEARCH_ERROR',
            message: 'Failed to search users',
            details: result.error || 'Unknown error occurred',
          },
          timestamp: new Date().toISOString(),
        };
      }

      this.setStatus(200);
      return {
        success: true,
        data: result.data!,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error in searchUsersGet:', error);
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to search users',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }
}
