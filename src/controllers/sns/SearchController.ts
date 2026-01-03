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
  Post,
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
import type { ApiResponse } from '../../models/responses/ApiResponse';
import type {
  SearchUsersResponse,
  SearchUserData,
} from '../../models/responses/SnsResponses';
import type { SearchUsersRequest } from '../../models/requests/SnsRequests';
import { SnsService } from '../../services/SnsService';

/**
 * SNS Search Controller
 *
 * @description Provides search functionality for SNS features.
 * Supports user search by username or display name with pagination.
 *
 * @example
 * ```typescript
 * const searchController = new SearchController();
 * const results = await searchController.searchUsers({ query: "john" });
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
   * Search users by username or display name
   *
   * @description Searches for users based on username or display name.
   * Supports pagination and optional authentication for follow status.
   *
   * @param request - Search request containing query and pagination parameters
   * @param requestObj - Express request object for authentication
   * @returns Promise resolving to search results
   *
   * @example
   * ```typescript
   * const searchRequest: SearchUsersRequest = {
   *   query: "john",
   *   limit: 20,
   *   cursor: "eyJQSyI6IlVTRVIjdXNlci0xMjMiLCJTSyI6IlBST0ZJTEUifQ=="
   * };
   * const result = await searchController.searchUsers(searchRequest);
   * ```
   */
  @Post('users')
  @SuccessResponse('200', 'Search completed successfully')
  @Response<ApiResponse>('400', 'Invalid search request')
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
        {
          did: 'did:plc:abcdef1234567890',
          displayName: 'Jane Smith',
          handle: 'janesmith',
          description: 'Designer',
          avatar: 'https://example.com/avatar2.jpg',
          banner: 'https://example.com/background2.jpg',
          email: 'jane.smith@example.com',
          walletAddress: '0xabcdef1234567890',
          followerCount: 300,
          followingCount: 150,
          postCount: 78,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          isFollowing: true,
        },
      ],
      nextCursor: 'eyJQSyI6IlVTRVIjdXNlci00NTYiLCJTSyI6IlBST0ZJTEUifQ==',
      hasMore: true,
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  @Example<ApiResponse>({
    success: false,
    error: {
      code: 'INVALID_QUERY',
      message: 'Search query is required',
      details: 'The query field must be provided and cannot be empty',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async searchUsers(
    @Body() request: SearchUsersRequest,
    @Request() requestObj?: any
  ): Promise<SearchUsersResponse> {
    try {
      // Validate request
      if (!request.query || request.query.trim().length === 0) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'INVALID_QUERY',
            message: 'Search query is required',
            details: 'The query field must be provided and cannot be empty',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Validate limit
      const limit = Math.min(request.limit || 20, 50);
      if (limit < 1) {
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
        request.query.trim(),
        limit,
        request.cursor,
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
      console.error('Error in searchUsers:', error);
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

  /**
   * Search users by query string (GET endpoint for simple searches)
   *
   * @description Simple GET endpoint for searching users by query string.
   * Useful for quick searches without complex request bodies.
   *
   * @param query - Search query string
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
