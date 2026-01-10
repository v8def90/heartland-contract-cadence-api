/**
 * SNS API Response Models
 *
 * @description TypeScript interfaces for SNS API response payloads
 * @author Heart Token API Team
 * @since 1.0.0
 */

import type { ApiResponse } from './ApiResponse';
import type {
  ReplyRef,
  SimplifiedEmbedImage,
  SimplifiedFacet,
} from '../dynamodb/AtProtocolPostModels';

/**
 * User Profile Data
 *
 * @description User profile following AT Protocol Lexicon conventions.
 * Standard fields follow AT Protocol naming, while extended fields (email, walletAddress, etc.)
 * are custom extensions for this API.
 */
export interface UserProfile {
  /** User's primary DID (AT Protocol standard) */
  did: string;
  /** Display name (AT Protocol standard) */
  displayName: string;
  /** Handle (AT Protocol standard) */
  handle: string;
  /** Description (AT Protocol standard, previously bio) */
  description?: string | undefined;
  /** Avatar URL (AT Protocol standard) */
  avatar?: string | undefined;
  /** Banner URL (AT Protocol standard, previously backgroundImageUrl) */
  banner?: string | undefined;
  /** Follower count (AT Protocol standard) */
  followerCount: number;
  /** Following count (AT Protocol standard) */
  followingCount: number;
  /** Created timestamp (AT Protocol standard) */
  createdAt: string;
  /** Email address (custom extension) */
  email: string;
  /** Wallet address (custom extension, Blocto address) */
  walletAddress: string;
  /** Post count (custom extension) */
  postCount: number;
  /** Updated timestamp (custom extension) */
  updatedAt: string;
}

/**
 * Post Data
 *
 * @description Post data following AT Protocol Lexicon conventions.
 * Standard fields follow AT Protocol naming, while extended fields are custom extensions.
 */
export interface PostData {
  /** AT URI (AT Protocol standard) */
  uri: string;
  /** Record key (rkey, TID format) */
  rkey: string;
  /** Repository owner DID (AT Protocol standard) */
  ownerDid: string;
  /** Author display name */
  authorName: string;
  /** Author handle (AT Protocol standard, without domain) */
  authorUsername: string;
  /** Post text content (AT Protocol standard, previously content) */
  text: string;
  /** Embed images (AT Protocol standard, previously images) */
  embed?: {
    images?: SimplifiedEmbedImage[];
  };
  /** Facets (AT Protocol standard, previously tags) */
  facets?: SimplifiedFacet[];
  /** Is liked by current user */
  isLiked: boolean;
  /** Created timestamp (AT Protocol standard) */
  createdAt: string;
  /** Updated timestamp */
  updatedAt: string;
}

/**
 * Create User Profile Request
 */
export interface CreateUserProfileRequest {
  /** Display name */
  displayName: string;
  /** Username (unique) */
  username: string;
  /** Bio description */
  bio?: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** Background image URL */
  backgroundImageUrl?: string;
  /** Email address (required) */
  email: string;
  /** Wallet address (Blocto address, required) */
  walletAddress: string;
}

/**
 * Update User Profile Request
 */
export interface UpdateUserProfileRequest {
  /** Display name */
  displayName?: string;
  /** Username (unique) */
  username?: string;
  /** Bio description */
  bio?: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** Background image URL */
  backgroundImageUrl?: string;
  /** Email address */
  email?: string;
  /** Wallet address (Blocto address) */
  walletAddress?: string;
}

/**
 * Comment Data
 *
 * @description Comment data following AT Protocol Lexicon conventions.
 * Comments are treated as Reply Posts in AT Protocol.
 */
export interface CommentData {
  /** AT URI (AT Protocol standard) */
  uri: string;
  /** Record key (rkey, TID format) */
  rkey: string;
  /** Repository owner DID (AT Protocol standard) */
  ownerDid: string;
  /** Root post AT URI (AT Protocol standard) */
  rootPostUri: string;
  /** Parent post AT URI (AT Protocol standard) */
  parentPostUri: string;
  /** Author display name */
  authorName: string;
  /** Author handle (AT Protocol standard, without domain) */
  authorUsername: string;
  /** Comment text content (AT Protocol standard, previously content) */
  text: string;
  /** Embed images (AT Protocol standard, optional) */
  embed?: {
    images?: SimplifiedEmbedImage[];
  };
  /** Facets (AT Protocol standard, optional) */
  facets?: SimplifiedFacet[];
  /** Reply reference (AT Protocol standard, optional) */
  reply?: ReplyRef | undefined;
  /** Is liked by current user */
  isLiked: boolean;
  /** Created timestamp (AT Protocol standard) */
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
 * Search User Data
 *
 * @description Search user data following AT Protocol Lexicon conventions.
 */
export interface SearchUserData {
  /** User's primary DID (AT Protocol standard) */
  did: string;
  /** Display name (AT Protocol standard) */
  displayName: string;
  /** Handle (AT Protocol standard) */
  handle: string;
  /** Description (AT Protocol standard, previously bio) */
  description?: string | undefined;
  /** Avatar URL (AT Protocol standard) */
  avatar?: string | undefined;
  /** Banner URL (AT Protocol standard, previously backgroundImageUrl) */
  banner?: string | undefined;
  /** Follower count (AT Protocol standard) */
  followerCount: number;
  /** Following count (AT Protocol standard) */
  followingCount: number;
  /** Created timestamp (AT Protocol standard) */
  createdAt: string;
  /** Email address (custom extension) */
  email: string;
  /** Wallet address (custom extension, Blocto address) */
  walletAddress: string;
  /** Post count (custom extension) */
  postCount: number;
  /** Updated timestamp (custom extension) */
  updatedAt: string;
  /** Is following this user (if authenticated) */
  isFollowing?: boolean;
}

/**
 * Search Users Response
 */
export type SearchUsersResponse = ApiResponse<PaginatedData<SearchUserData>>;

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
