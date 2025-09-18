/**
 * SNS API Response Models
 *
 * @description TypeScript interfaces for SNS API response payloads
 * @author Heart Token API Team
 * @since 1.0.0
 */

import type { ApiResponse } from './ApiResponse';

/**
 * User Profile Data
 */
export interface UserProfile {
  /** User ID */
  userId: string;
  /** Display name */
  displayName: string;
  /** Username (unique) */
  username: string;
  /** Bio description */
  bio?: string | undefined;
  /** Avatar URL */
  avatarUrl?: string | undefined;
  /** Follower count */
  followerCount: number;
  /** Following count */
  followingCount: number;
  /** Post count */
  postCount: number;
  /** Created timestamp */
  createdAt: string;
  /** Updated timestamp */
  updatedAt: string;
}

/**
 * Post Data
 */
export interface PostData {
  /** Post ID */
  postId: string;
  /** Author user ID */
  authorId: string;
  /** Author display name */
  authorName: string;
  /** Author username */
  authorUsername: string;
  /** Post content */
  content: string;
  /** Image URLs */
  images?: string[] | undefined;
  /** Tags */
  tags?: string[] | undefined;
  /** Like count */
  likeCount: number;
  /** Comment count */
  commentCount: number;
  /** Is liked by current user */
  isLiked: boolean;
  /** Created timestamp */
  createdAt: string;
  /** Updated timestamp */
  updatedAt: string;
}

/**
 * Comment Data
 */
export interface CommentData {
  /** Comment ID */
  commentId: string;
  /** Post ID */
  postId: string;
  /** Author user ID */
  authorId: string;
  /** Author display name */
  authorName: string;
  /** Author username */
  authorUsername: string;
  /** Comment content */
  content: string;
  /** Like count */
  likeCount: number;
  /** Is liked by current user */
  isLiked: boolean;
  /** Created timestamp */
  createdAt: string;
  /** Updated timestamp */
  updatedAt: string;
}

/**
 * Like Data
 */
export interface LikeData {
  /** User ID who liked */
  userId: string;
  /** User display name */
  displayName: string;
  /** User username */
  username: string;
  /** Avatar URL */
  avatarUrl?: string | undefined;
  /** Liked timestamp */
  likedAt: string;
}

/**
 * Follow Data
 */
export interface FollowData {
  /** User ID */
  userId: string;
  /** Display name */
  displayName: string;
  /** Username */
  username: string;
  /** Avatar URL */
  avatarUrl?: string | undefined;
  /** Bio */
  bio?: string | undefined;
  /** Is following back */
  isFollowingBack: boolean;
  /** Followed timestamp */
  followedAt: string;
}

/**
 * Paginated Response Data
 */
export interface PaginatedData<T> {
  /** Items array */
  items: T[];
  /** Next page cursor */
  nextCursor?: string | undefined;
  /** Has more items */
  hasMore: boolean;
  /** Total count (if available) */
  totalCount?: number;
}

/**
 * Post List Response
 */
export type PostListResponse = ApiResponse<PaginatedData<PostData>>;

/**
 * Comment List Response
 */
export type CommentListResponse = ApiResponse<PaginatedData<CommentData>>;

/**
 * Like List Response
 */
export type LikeListResponse = ApiResponse<PaginatedData<LikeData>>;

/**
 * Follow List Response
 */
export type FollowListResponse = ApiResponse<PaginatedData<FollowData>>;

/**
 * Single Post Response
 */
export type PostResponse = ApiResponse<PostData>;

/**
 * Single Comment Response
 */
export type CommentResponse = ApiResponse<CommentData>;

/**
 * User Profile Response
 */
export type UserProfileResponse = ApiResponse<UserProfile>;

/**
 * Empty Success Response
 */
export type EmptyResponse = ApiResponse<null>;
