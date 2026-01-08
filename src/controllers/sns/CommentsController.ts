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
  Request,
} from 'tsoa';
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
import { parsePostAtUri, extractRkeyFromUri } from '../../utils/atUri';

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
@Route('sns/posts/comments')
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
      uri: 'at://did:plc:xxx/app.bsky.feed.post/3k2abc123def456',
      rkey: '3k2abc123def456',
      ownerDid: 'did:plc:xxx',
      rootPostUri: 'at://did:plc:yyy/app.bsky.feed.post/3k2def456ghi789',
      parentPostUri: 'at://did:plc:yyy/app.bsky.feed.post/3k2def456ghi789',
      authorName: 'John Doe',
      authorUsername: 'johndoe',
      text: 'Great post!',
      isLiked: false,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async createComment(
    @Query() rootPostUri: string,
    @Body() request: CreateCommentRequest,
    @Request() requestObj: any
  ): Promise<CommentResponse> {
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
            details: 'Valid JWT token is required to create comments',
          },
          timestamp: new Date().toISOString(),
        };
      }

      const userId = user.id; // ownerDid

      // Validate text length
      if (request.text.length > 500) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'CONTENT_TOO_LONG',
            message: 'Comment text must be 500 characters or less',
            details: `Received ${request.text.length} characters`,
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Validate root post URI
      const rootParsed = parsePostAtUri(rootPostUri);
      if (!rootParsed) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'INVALID_URI',
            message: 'Invalid root post URI format',
            details: `Invalid URI: ${rootPostUri}`,
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Check if root post exists
      const rootPost = await this.snsService.getPost(rootPostUri);
      if (!rootPost) {
        this.setStatus(404);
        return {
          success: false,
          error: {
            code: 'POST_NOT_FOUND',
            message: 'Root post not found',
            details: `No post found with URI: ${rootPostUri}`,
          },
          timestamp: new Date().toISOString(),
        };
      }

      // For direct comments, parentPostUri is the same as rootPostUri
      const parentPostUri = rootPostUri;

      // Create comment (Reply Post) in database (AT Protocol compliant)
      const commentUri = await this.snsService.createComment(
        userId, // ownerDid
        request.text, // text (previously content)
        rootPostUri, // rootPostUri
        parentPostUri // parentPostUri
      );

      // Get created comment by URI
      const commentRkey = extractRkeyFromUri(commentUri);
      if (!commentRkey) {
        this.setStatus(500);
        return {
          success: false,
          error: {
            code: 'COMMENT_CREATION_FAILED',
            message: 'Failed to extract rkey from created comment URI',
            details: 'Comment was created but could not be retrieved',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Get created comment
      const comments = await this.snsService.getPostComments(rootPostUri, 1000);
      const comment = comments.items.find(c => c.uri === commentUri);
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

      // Comment already has author information from SnsService
      const commentData: CommentData = comment;

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
          uri: 'at://did:plc:xxx/app.bsky.feed.post/3k2abc123def456',
          rkey: '3k2abc123def456',
          ownerDid: 'did:plc:xxx',
          rootPostUri: 'at://did:plc:yyy/app.bsky.feed.post/3k2def456ghi789',
          parentPostUri: 'at://did:plc:yyy/app.bsky.feed.post/3k2def456ghi789',
          authorName: 'John Doe',
          authorUsername: 'johndoe',
          text: 'Great post!',
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
    @Query() rootPostUri: string,
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

      // Validate root post URI
      const rootParsed = parsePostAtUri(rootPostUri);
      if (!rootParsed) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'INVALID_URI',
            message: 'Invalid root post URI format',
            details: `Invalid URI: ${rootPostUri}`,
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Check if root post exists
      const rootPost = await this.snsService.getPost(rootPostUri);
      if (!rootPost) {
        this.setStatus(404);
        return {
          success: false,
          error: {
            code: 'POST_NOT_FOUND',
            message: 'Root post not found',
            details: `No post found with URI: ${rootPostUri}`,
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Get comments (Reply Posts) using rootPostUri
      const result = await this.snsService.getPostComments(
        rootPostUri,
        limit,
        cursor
      );

      // Comments already have author information from SnsService
      const commentsWithAuthorInfo: CommentData[] = result.items;

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
  @Delete()
  @Security('jwt')
  @SuccessResponse('200', 'Comment deleted successfully')
  @Response<ApiResponse>('400', 'Invalid URI or missing ownerDid')
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
    @Query() rootPostUri: string,
    @Query() uri?: string,
    @Query() rkey?: string,
    @Query() ownerDid?: string,
    @Request() requestObj?: any
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
            details: 'Valid JWT token is required to delete comments',
          },
          timestamp: new Date().toISOString(),
        };
      }

      const userId = user.id;

      // Use uri if provided, otherwise use rkey with ownerDid
      const commentUri =
        uri ||
        (rkey && ownerDid ? `at://${ownerDid}/app.bsky.feed.post/${rkey}` : '');
      if (!commentUri) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Either uri or (rkey and ownerDid) must be provided',
            details:
              'Provide either uri query parameter or both rkey and ownerDid query parameters',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Get comment from root post's comments
      const comments = await this.snsService.getPostComments(rootPostUri, 1000);
      const comment = comments.items.find(c => c.uri === commentUri);

      if (!comment) {
        this.setStatus(404);
        return {
          success: false,
          error: {
            code: 'COMMENT_NOT_FOUND',
            message: 'Comment not found',
            details: `No comment found with URI: ${commentUri}`,
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Check if user is the author
      if (comment.ownerDid !== userId) {
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

      // Delete comment (Reply Post)
      await this.snsService.deleteComment(comment.uri, comment.ownerDid);

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
