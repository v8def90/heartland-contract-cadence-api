/**
 * SNS Comments Controller
 *
 * @description Handles all comment-related operations for the SNS functionality
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
} from 'tsoa';
import { v4 as uuidv4 } from 'uuid';
import type { ApiResponse } from '../../models/responses/ApiResponse';
import type {
  CommentData,
  CommentListResponse,
  CommentResponse,
  EmptyResponse,
} from '../../models/responses/SnsResponses';
import type {
  CreateCommentRequest,
  GetCommentsQuery,
} from '../../models/requests/SnsRequests';
import { SnsService } from '../../services/SnsService';

/**
 * SNS Comments Controller
 *
 * @description Handles all comment-related operations including creation, retrieval,
 * and deletion of comments on posts in the social network system.
 *
 * @example
 * ```typescript
 * const controller = new CommentsController();
 * const comments = await controller.getPostComments("post123", { limit: 10 });
 * ```
 */
@Route('sns/posts/{postId}/comments')
@Tags('SNS Comments')
export class CommentsController extends Controller {
  private snsService: SnsService;

  constructor() {
    super();
    this.snsService = new SnsService();
  }

  /**
   * Create a new comment on a post
   *
   * @description Creates a new comment on the specified post with the provided content.
   * The comment will be associated with the authenticated user.
   *
   * @param postId - The ID of the post to comment on
   * @param request - Comment creation request containing content
   * @returns Promise resolving to the created comment data
   *
   * @security JWT authentication required
   */
  @Post()
  @Security('jwt')
  @SuccessResponse('201', 'Comment created successfully')
  @Response<ApiResponse>('400', 'Invalid comment request')
  @Response<ApiResponse>('401', 'Authentication required')
  @Response<ApiResponse>('404', 'Post not found')
  @Response<ApiResponse>('500', 'Failed to create comment')
  @Example<CommentResponse>({
    success: true,
    data: {
      commentId: 'comment-123',
      postId: 'post-456',
      authorId: 'user-789',
      authorName: 'John Doe',
      authorUsername: 'johndoe',
      content: 'Great post!',
      likeCount: 0,
      isLiked: false,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async createComment(
    @Path() postId: string,
    @Body() request: CreateCommentRequest
  ): Promise<CommentResponse> {
    try {
      // TODO: Extract user ID from JWT token
      const userId = 'temp-user-id'; // This should come from JWT middleware

      // Validate content length
      if (request.content.length > 500) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'CONTENT_TOO_LONG',
            message: 'Comment content must be 500 characters or less',
            details: `Received ${request.content.length} characters`,
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

      // Generate comment ID
      const commentId = `comment-${uuidv4()}`;

      // Create comment in database
      await this.snsService.createComment(
        commentId,
        postId,
        userId,
        request.content
      );

      // Get user profile for author info
      const userProfile = await this.snsService.getUserProfile(userId);
      if (!userProfile) {
        this.setStatus(500);
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User profile not found',
            details: 'Unable to retrieve author information',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Get created comment
      const comments = await this.snsService.getPostComments(postId, 1);
      const comment = comments.items.find(c => c.commentId === commentId);
      if (!comment) {
        this.setStatus(500);
        return {
          success: false,
          error: {
            code: 'COMMENT_CREATION_FAILED',
            message: 'Failed to retrieve created comment',
            details: 'Comment was created but could not be retrieved',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Populate author information
      const commentData: CommentData = {
        ...comment,
        authorName: userProfile.displayName,
        authorUsername: userProfile.username,
      };

      this.setStatus(201);
      return {
        success: true,
        data: commentData,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'COMMENT_CREATION_ERROR',
          message: 'Failed to create comment',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get comments for a post with pagination
   *
   * @description Retrieves comments for a specific post with pagination support.
   * Comments are returned in reverse chronological order (newest first).
   *
   * @param postId - The ID of the post to get comments for
   * @param limit - Number of comments to return (max 50, default 20)
   * @param cursor - Pagination cursor for next page
   * @returns Promise resolving to paginated comments data
   */
  @Get()
  @SuccessResponse('200', 'Comments retrieved successfully')
  @Response<ApiResponse>('400', 'Invalid query parameters')
  @Response<ApiResponse>('404', 'Post not found')
  @Response<ApiResponse>('500', 'Failed to retrieve comments')
  @Example<CommentListResponse>({
    success: true,
    data: {
      items: [
        {
          commentId: 'comment-123',
          postId: 'post-456',
          authorId: 'user-789',
          authorName: 'John Doe',
          authorUsername: 'johndoe',
          content: 'Great post!',
          likeCount: 3,
          isLiked: false,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      nextCursor:
        'eyJQSyI6IlBPU1QjcG9zdC00NTYiLCJTSyI6IkNPTU1FTlQjMjAyNC0wMS0wMVQwMDowMDowMC4wMDBaIiwicG9zdC00NTYifQ==',
      hasMore: true,
      totalCount: 15,
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async getPostComments(
    @Path() postId: string,
    @Query() limit: number = 20,
    @Query() cursor?: string
  ): Promise<CommentListResponse> {
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

      // Get comments
      const result = await this.snsService.getPostComments(
        postId,
        limit,
        cursor
      );

      // Get author profiles for all comments
      const commentsWithAuthorInfo: CommentData[] = [];
      for (const comment of result.items) {
        const userProfile = await this.snsService.getUserProfile(
          comment.authorId
        );
        if (userProfile) {
          commentsWithAuthorInfo.push({
            ...comment,
            authorName: userProfile.displayName,
            authorUsername: userProfile.username,
          });
        }
      }

      return {
        success: true,
        data: {
          items: commentsWithAuthorInfo,
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
          code: 'COMMENTS_RETRIEVAL_ERROR',
          message: 'Failed to retrieve comments',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Delete a comment
   *
   * @description Deletes a comment. Only the comment author can delete their own comments.
   *
   * @param postId - The ID of the post the comment belongs to
   * @param commentId - The ID of the comment to delete
   * @returns Promise resolving to empty success response
   *
   * @security JWT authentication required
   */
  @Delete('{commentId}')
  @Security('jwt')
  @SuccessResponse('200', 'Comment deleted successfully')
  @Response<ApiResponse>('401', 'Authentication required')
  @Response<ApiResponse>('403', 'Not authorized to delete this comment')
  @Response<ApiResponse>('404', 'Comment not found')
  @Response<ApiResponse>('500', 'Failed to delete comment')
  @Example<EmptyResponse>({
    success: true,
    data: null,
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async deleteComment(
    @Path() postId: string,
    @Path() commentId: string
  ): Promise<EmptyResponse> {
    try {
      // TODO: Extract user ID from JWT token
      const userId = 'temp-user-id'; // This should come from JWT middleware

      // Get comment to check ownership
      const comments = await this.snsService.getPostComments(postId, 1000);
      const comment = comments.items.find(c => c.commentId === commentId);

      if (!comment) {
        this.setStatus(404);
        return {
          success: false,
          error: {
            code: 'COMMENT_NOT_FOUND',
            message: 'Comment not found',
            details: `No comment found with ID: ${commentId}`,
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Check if user is the author
      if (comment.authorId !== userId) {
        this.setStatus(403);
        return {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authorized to delete this comment',
            details: 'Only the comment author can delete their comments',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Delete comment
      await this.snsService.deleteComment(postId, commentId);

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
          code: 'COMMENT_DELETION_ERROR',
          message: 'Failed to delete comment',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }
}
