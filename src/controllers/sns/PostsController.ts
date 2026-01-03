/**
 * SNS Posts Controller
 *
 * @description Handles all post-related operations for the SNS functionality
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
import { v4 as uuidv4 } from 'uuid';
import type { ApiResponse } from '../../models/responses/ApiResponse';
import type {
  PostData,
  PostListResponse,
  PostResponse,
  EmptyResponse,
} from '../../models/responses/SnsResponses';
import type {
  CreatePostRequest,
  UpdatePostRequest,
} from '../../models/requests/SnsRequests';
import { SnsService } from '../../services/SnsService';

/**
 * SNS Posts Controller
 *
 * @description Handles all post-related operations including creation, retrieval,
 * updates, and deletion of posts in the social network system.
 *
 * @example
 * ```typescript
 * const controller = new PostsController();
 * const posts = await controller.getUserPosts("user123", { limit: 10 });
 * ```
 */
@Route('sns/posts')
@Tags('SNS Posts')
export class PostsController extends Controller {
  private snsService: SnsService;

  constructor() {
    super();
    this.snsService = new SnsService();
  }

  /**
   * Get all posts (global feed)
   *
   * @description Retrieves all posts with pagination support for the global feed.
   * This endpoint returns posts from all users in chronological order.
   *
   * @param query - Query parameters for pagination and filtering
   * @returns Promise resolving to paginated post list
   */
  @Get()
  @SuccessResponse('200', 'Posts retrieved successfully')
  @Response<ApiResponse>('400', 'Invalid query parameters')
  @Response<ApiResponse>('500', 'Failed to retrieve posts')
  @Example<PostListResponse>({
    success: true,
    data: {
      items: [
        {
          postId: 'post-123',
          authorId: 'user-456',
          authorName: 'John Doe',
          authorUsername: 'johndoe',
          content: 'Hello, world!',
          images: ['https://example.com/image.jpg'],
          tags: ['hello', 'world'],
          likeCount: 5,
          commentCount: 2,
          isLiked: false,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      nextCursor:
        'eyJQSyI6IlVTRVIjdXNlci00NTYiLCJTSyI6IlBPU1QjMjAyNC0wMS0wMVQwMDowMDowMC4wMDBaIiwicG9zdC0xMjMifQ==',
      hasMore: true,
      totalCount: 100,
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async getPosts(
    @Query() limit?: number,
    @Query() cursor?: string
  ): Promise<PostListResponse> {
    try {
      const limitValue = limit || 20;

      // Validate limit
      if (limitValue < 1 || limitValue > 50) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'INVALID_LIMIT',
            message: 'Limit must be between 1 and 50',
            details: `Received limit: ${limitValue}`,
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Get posts from service
      const result = await this.snsService.getAllPosts(limitValue, cursor);

      if (!result.success) {
        this.setStatus(500);
        return {
          success: false,
          error: {
            code: 'SERVICE_ERROR',
            message: 'Failed to retrieve posts',
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
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve posts',
          details:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Create a new post
   *
   * @description Creates a new post with the provided content, images, and tags.
   * The post will be associated with the authenticated user.
   *
   * @param request - Post creation request containing content and optional metadata
   * @returns Promise resolving to the created post data
   *
   * @security JWT authentication required
   */
  @Post()
  @Security('jwt')
  @SuccessResponse('201', 'Post created successfully')
  @Response<ApiResponse>('400', 'Invalid post request')
  @Response<ApiResponse>('401', 'Authentication required')
  @Response<ApiResponse>('500', 'Failed to create post')
  @Example<PostResponse>({
    success: true,
    data: {
      postId: 'post-123',
      authorId: 'user-456',
      authorName: 'John Doe',
      authorUsername: 'johndoe',
      content: 'Hello, world!',
      images: ['https://example.com/image.jpg'],
      tags: ['hello', 'world'],
      likeCount: 0,
      commentCount: 0,
      isLiked: false,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async createPost(
    @Body() request: CreatePostRequest,
    @Request() requestObj: any
  ): Promise<PostResponse> {
    try {
      // Extract user ID from JWT token
      const user = requestObj?.user;

      console.log('Create post - Request object:', requestObj);
      console.log('Create post - User:', user);
      console.log('Create post - User ID:', user?.id);

      if (!user || !user.id) {
        this.setStatus(401);
        return {
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: 'Authentication required',
            details: 'Valid JWT token is required to create posts',
          },
          timestamp: new Date().toISOString(),
        };
      }

      const userId = user.id;

      // Validate content length
      if (request.content.length > 1000) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'CONTENT_TOO_LONG',
            message: 'Post content must be 1000 characters or less',
            details: `Received ${request.content.length} characters`,
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Generate post ID
      const postId = `post-${uuidv4()}`;

      // Get user profile for author info
      const userProfile = await this.snsService.getUserProfile(userId);
      if (!userProfile) {
        this.setStatus(404);
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User profile not found',
            details: 'User must have a profile to create posts',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Create post in database
      await this.snsService.createPost(
        postId,
        userId,
        userProfile.displayName,
        userProfile.handle, // AT Protocol standard: handle (previously username)
        request.content,
        request.images,
        request.tags
      );

      // Get created post
      const post = await this.snsService.getPost(postId);
      if (!post) {
        this.setStatus(500);
        return {
          success: false,
          error: {
            code: 'POST_CREATION_FAILED',
            message: 'Failed to retrieve created post',
            details: 'Post was created but could not be retrieved',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Populate author information
      const postData: PostData = {
        ...post,
        authorName: userProfile.displayName,
        authorUsername: userProfile.handle, // AT Protocol standard: handle (previously username)
      };

      this.setStatus(201);
      return {
        success: true,
        data: postData,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'POST_CREATION_ERROR',
          message: 'Failed to create post',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get a specific post by ID
   *
   * @description Retrieves a single post by its ID along with author information.
   *
   * @param postId - The unique identifier of the post
   * @returns Promise resolving to the post data
   */
  @Get('{postId}')
  @SuccessResponse('200', 'Post retrieved successfully')
  @Response<ApiResponse>('404', 'Post not found')
  @Response<ApiResponse>('500', 'Failed to retrieve post')
  @Example<PostResponse>({
    success: true,
    data: {
      postId: 'post-123',
      authorId: 'user-456',
      authorName: 'John Doe',
      authorUsername: 'johndoe',
      content: 'Hello, world!',
      images: ['https://example.com/image.jpg'],
      tags: ['hello', 'world'],
      likeCount: 5,
      commentCount: 2,
      isLiked: false,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async getPost(@Path() postId: string): Promise<PostResponse> {
    try {
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

      // Get author profile
      const userProfile = await this.snsService.getUserProfile(post.authorId);
      if (!userProfile) {
        this.setStatus(500);
        return {
          success: false,
          error: {
            code: 'AUTHOR_NOT_FOUND',
            message: 'Author profile not found',
            details: 'Unable to retrieve author information',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // TODO: Check if current user liked this post
      const isLiked = false; // This should come from JWT middleware

      const postData: PostData = {
        ...post,
        authorName: userProfile.displayName,
        authorUsername: userProfile.handle, // AT Protocol standard: handle (previously username)
        isLiked,
      };

      return {
        success: true,
        data: postData,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'POST_RETRIEVAL_ERROR',
          message: 'Failed to retrieve post',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Delete a post
   *
   * @description Deletes a post and all its associated comments and likes.
   * Only the post author can delete their own posts.
   *
   * @param postId - The unique identifier of the post to delete
   * @returns Promise resolving to empty success response
   *
   * @security JWT authentication required
   */
  @Delete('{postId}')
  @Security('jwt')
  @SuccessResponse('200', 'Post deleted successfully')
  @Response<ApiResponse>('401', 'Authentication required')
  @Response<ApiResponse>('403', 'Not authorized to delete this post')
  @Response<ApiResponse>('404', 'Post not found')
  @Response<ApiResponse>('500', 'Failed to delete post')
  @Example<EmptyResponse>({
    success: true,
    data: null,
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async deletePost(
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
            details: 'Valid JWT token is required to delete posts',
          },
          timestamp: new Date().toISOString(),
        };
      }

      const userId = user.id;

      // Get post to check ownership
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

      // Check if user is the author
      if (post.authorId !== userId) {
        this.setStatus(403);
        return {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authorized to delete this post',
            details: 'Only the post author can delete their posts',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Delete post and all related data
      await this.snsService.deletePost(postId);

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
          code: 'POST_DELETION_ERROR',
          message: 'Failed to delete post',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get user posts with pagination
   *
   * @description Retrieves posts by a specific user with pagination support.
   * Posts are returned in reverse chronological order (newest first).
   *
   * @param userId - The user ID whose posts to retrieve
   * @param limit - Number of posts to return (max 50, default 20)
   * @param cursor - Pagination cursor for next page
   * @returns Promise resolving to paginated posts data
   */
  @Get('users/{userId}')
  @SuccessResponse('200', 'User posts retrieved successfully')
  @Response<ApiResponse>('400', 'Invalid query parameters')
  @Response<ApiResponse>('500', 'Failed to retrieve user posts')
  @Example<PostListResponse>({
    success: true,
    data: {
      items: [
        {
          postId: 'post-123',
          authorId: 'user-456',
          authorName: 'John Doe',
          authorUsername: 'johndoe',
          content: 'Hello, world!',
          images: ['https://example.com/image.jpg'],
          tags: ['hello', 'world'],
          likeCount: 5,
          commentCount: 2,
          isLiked: false,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      nextCursor:
        'eyJQSyI6IlVTRVIjdXNlci00NTYiLCJTSyI6IlBPU1QjMjAyNC0wMS0wMVQwMDowMDowMC4wMDBaIiwicG9zdC0xMjMifQ==',
      hasMore: true,
      totalCount: 25,
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async getUserPosts(
    @Path() userId: string,
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

      // Get user posts
      const result = await this.snsService.getUserPosts(userId, limit, cursor);

      // Get author profiles for all posts
      const postsWithAuthorInfo: PostData[] = [];
      for (const post of result.items) {
        const userProfile = await this.snsService.getUserProfile(post.authorId);
        if (userProfile) {
          postsWithAuthorInfo.push({
            ...post,
            authorName: userProfile.displayName,
            authorUsername: userProfile.handle, // AT Protocol standard: handle (previously username)
          });
        }
      }

      return {
        success: true,
        data: {
          items: postsWithAuthorInfo,
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
          code: 'USER_POSTS_RETRIEVAL_ERROR',
          message: 'Failed to retrieve user posts',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }
}
