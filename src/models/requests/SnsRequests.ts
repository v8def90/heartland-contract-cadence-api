/**
 * SNS API Request Models
 *
 * @description TypeScript interfaces for SNS API request payloads
 * @author Heart Token API Team
 * @since 1.0.0
 */

import type { ApiResponse } from '../responses/ApiResponse';

/**
 * Create Post Request
 */
export interface CreatePostRequest {
  /** Post content (max 1000 characters) */
  content: string;
  /** Optional image URLs */
  images?: string[];
  /** Optional tags */
  tags?: string[];
}

/**
 * Update Post Request
 */
export interface UpdatePostRequest {
  /** Post content (max 1000 characters) */
  content: string;
  /** Optional image URLs */
  images?: string[];
  /** Optional tags */
  tags?: string[];
}

/**
 * Create Comment Request
 */
export interface CreateCommentRequest {
  /** Comment content (max 500 characters) */
  content: string;
}

/**
 * Follow User Request
 */
export interface FollowUserRequest {
  /** Target user ID to follow */
  targetUserId: string;
}

/**
 * Search Users Request
 */
export interface SearchUsersRequest {
  /** Search query (username or display name) */
  query: string;
  /** Number of results to return (max 50, default 20) */
  limit?: number;
  /** Pagination cursor for next page */
  cursor?: string;
}

/**
 * Like Post Request
 */
export interface LikePostRequest {
  /** Post ID to like */
  postId: string;
}

/**
 * Get Posts Query Parameters
 */
export interface GetPostsQuery {
  /** Number of posts to return (max 50) */
  limit?: number;
  /** Pagination cursor */
  cursor?: string;
}

/**
 * Get Comments Query Parameters
 */
export interface GetCommentsQuery {
  /** Number of comments to return (max 50) */
  limit?: number;
  /** Pagination cursor */
  cursor?: string;
}

/**
 * Get Likes Query Parameters
 */
export interface GetLikesQuery {
  /** Number of likes to return (max 50) */
  limit?: number;
  /** Pagination cursor */
  cursor?: string;
}

/**
 * Get Followers Query Parameters
 */
export interface GetFollowersQuery {
  /** Number of followers to return (max 50) */
  limit?: number;
  /** Pagination cursor */
  cursor?: string;
}

/**
 * Get Following Query Parameters
 */
export interface GetFollowingQuery {
  /** Number of following to return (max 50) */
  limit?: number;
  /** Pagination cursor */
  cursor?: string;
}

/**
 * Get Feed Query Parameters
 */
export interface GetFeedQuery {
  /** Number of posts to return (max 50) */
  limit?: number;
  /** Pagination cursor */
  cursor?: string;
}
