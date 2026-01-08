/**
 * SNS API Request Models
 *
 * @description TypeScript interfaces for SNS API request payloads
 * @author Heart Token API Team
 * @since 1.0.0
 */

import type { ApiResponse } from '../responses/ApiResponse';
import type {
  SimplifiedEmbedImage,
  SimplifiedFacet,
} from '../dynamodb/AtProtocolPostModels';

/**
 * Create Post Request
 *
 * @description Post creation request following AT Protocol Lexicon conventions.
 */
export interface CreatePostRequest {
  /** Post text content (AT Protocol standard, max 1000 characters, previously content) */
  text: string;
  /** Embed images (AT Protocol standard, previously images) */
  embed?: {
    images?: SimplifiedEmbedImage[];
  };
  /** Facets (AT Protocol standard, previously tags) */
  facets?: SimplifiedFacet[];
}

/**
 * Update Post Request
 *
 * @description Post update request following AT Protocol Lexicon conventions.
 */
export interface UpdatePostRequest {
  /** Post text content (AT Protocol standard, max 1000 characters, previously content) */
  text: string;
  /** Embed images (AT Protocol standard, previously images) */
  embed?: {
    images?: SimplifiedEmbedImage[];
  };
  /** Facets (AT Protocol standard, previously tags) */
  facets?: SimplifiedFacet[];
}

/**
 * Create Comment Request
 *
 * @description Comment creation request following AT Protocol Lexicon conventions.
 * Comments are treated as Reply Posts in AT Protocol.
 */
export interface CreateCommentRequest {
  /** Comment text content (AT Protocol standard, max 500 characters, previously content) */
  text: string;
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
 *
 * @description Like post request following AT Protocol Lexicon conventions.
 */
export interface LikePostRequest {
  /** Post AT URI to like (AT Protocol standard, previously postId) */
  uri: string;
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
