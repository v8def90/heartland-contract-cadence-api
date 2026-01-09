/**
 * SNS DynamoDB Service
 *
 * @description Service for SNS data operations using DynamoDB
 * @author Heart Token API Team
 * @since 1.0.0
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import type {
  UserProfile,
  PostData,
  CommentData,
  LikeData,
  FollowData,
  SearchUserData,
  PaginatedData,
} from '../models/responses/SnsResponses';
import type {
  DynamoDBBskyPostRecordItem,
  ReplyRef,
  SimplifiedEmbedImage,
  SimplifiedFacet,
} from '../models/dynamodb/AtProtocolPostModels';
import { generateRkey } from '../utils/rkeyGenerator';
import {
  generatePostAtUri,
  parsePostAtUri,
  extractRkeyFromUri,
} from '../utils/atUri';

/**
 * DynamoDB Item Types
 */
export interface DynamoDBUserItem {
  PK: string; // USER#{userId}
  SK: string; // PROFILE
  GSI1PK: string; // USER#{userId}
  GSI1SK: string; // PROFILE
  userId: string;
  displayName: string;
  username: string;
  bio?: string | undefined;
  avatarUrl?: string | undefined;
  backgroundImageUrl?: string | undefined;
  email?: string | undefined;
  walletAddress?: string | undefined;
  followerCount: number;
  followingCount: number;
  postCount: number;
  createdAt: string;
  updatedAt: string;
  ttl?: number;
}

export interface DynamoDBPostItem {
  PK: string; // POST#{postId}
  SK: string; // META
  GSI1PK: string; // USER#{authorId}
  GSI1SK: string; // POST#{createdAt}#{postId}
  GSI2PK: string; // POST#{postId}
  GSI2SK: string; // META
  postId: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  content: string;
  images?: string[] | undefined;
  tags?: string[] | undefined;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  ttl?: number;
}

export interface DynamoDBCommentItem {
  PK: string; // POST#{postId}
  SK: string; // COMMENT#{commentId}
  GSI1PK: string; // POST#{postId}
  GSI1SK: string; // COMMENT#{createdAt}#{commentId}
  GSI2PK: string; // USER#{authorId}
  GSI2SK: string; // COMMENT#{createdAt}#{commentId}
  commentId: string;
  postId: string;
  authorId: string;
  content: string;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
  ttl?: number;
}

export interface DynamoDBLikeItem {
  PK: string; // POST#{postId}
  SK: string; // LIKE#{userId}
  GSI1PK: string; // POST#{postId}
  GSI1SK: string; // LIKE#{createdAt}#{userId}
  GSI2PK: string; // USER#{userId}
  GSI2SK: string; // LIKE#{createdAt}#{postId}
  postId: string;
  userId: string;
  createdAt: string;
  ttl?: number;
}

export interface DynamoDBFollowItem {
  PK: string; // USER#{followerId}
  SK: string; // FOLLOW#{followingId}
  GSI1PK: string; // USER#{followerId}
  GSI1SK: string; // FOLLOW#{createdAt}#{followingId}
  GSI2PK: string; // USER#{followingId}
  GSI2SK: string; // FOLLOWER#{createdAt}#{followerId}
  followerId: string;
  followingId: string;
  createdAt: string;
  ttl?: number;
}

/**
 * AT Protocol Data Model Types
 */

/**
 * Linked ID kind
 */
export type LinkedIdKind = 'did' | 'wallet' | 'account';

/**
 * Link role
 */
export type LinkRole = 'asset' | 'login' | 'org' | 'device' | 'other';

/**
 * Link status
 */
export type LinkStatus = 'pending' | 'verified' | 'revoked';

/**
 * AT Protocol User Profile Item
 */
export interface DynamoDBUserProfileItem {
  PK: string; // USER#{primaryDid}
  SK: string; // PROFILE
  primaryDid: string; // did:plc:...
  handle: string;
  username?: string; // handleからドメイン部分を除いたもの（検索用）
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  createdAt: string;
  updatedAt: string;
  ttl?: number;
  // Email/Password authentication
  primaryEmail?: string;
  primaryEmailNormalized?: string;
  email?: string; // 検索用（primaryEmailから）
  emailLoginEnabled?: boolean;
  authProviders?: {
    emailPassword?: boolean;
    atproto?: boolean;
    eip155?: boolean;
    flow?: boolean;
    line?: boolean; // LINEアカウント連携
  };
  lineUserId?: string; // LINEユーザーID（検索用）
  accountStatus?: 'active' | 'suspended' | 'deleted';
  suspendedAt?: string;
  deletedAt?: string;
  // GSI keys for search
  GSI6PK?: string; // USER_SEARCH#username (lowercase)
  GSI6SK?: string; // primaryDid
  GSI7PK?: string; // USER_SEARCH#displayName (lowercase)
  GSI7SK?: string; // primaryDid
  GSI8PK?: string; // USER_SEARCH#email (lowercase)
  GSI8SK?: string; // primaryDid
}

/**
 * AT Protocol Identity Link Item
 */
export interface DynamoDBIdentityLinkItem {
  PK: string; // USER#{primaryDid}
  SK: string; // LINK#{linkedId}
  primaryDid: string; // did:plc:...
  linkedId: string; // did:ethr:... / flow:... / email:alice@example.com
  kind: LinkedIdKind;
  role: LinkRole;
  status: LinkStatus;
  proofType?: 'mutual-signature' | 'provider-verified';
  proof?: {
    challengeHash: string;
    sigPrimary?: string;
    sigLinked?: string;
    issuedAt: string;
    expiresAt?: string;
  };
  createdAt: string;
  verifiedAt?: string;
  revokedAt?: string;
  // Email/Password authentication
  email?: string;
  emailNormalized?: string;
  emailVerified?: boolean;
  emailVerifiedAt?: string;
  passwordHash?: string;
  passwordKdf?: 'bcrypt' | 'argon2id' | 'scrypt';
  passwordUpdatedAt?: string;
  kdfParams?: {
    cost?: number;
    timeCost?: number;
    memoryKb?: number;
    parallelism?: number;
    N?: number;
    r?: number;
    p?: number;
  };
  failedLoginCount?: number;
  lastFailedLoginAt?: string;
  lockUntil?: string;
  emailVerifyTokenHash?: string;
  emailVerifyTokenExpiresAt?: string;
  emailVerifySentAt?: string;
  resetTokenHash?: string;
  resetTokenExpiresAt?: string;
  resetRequestedAt?: string;
  lastLoginAt?: string;
  lastLoginIpHash?: string;
  // PDS (AT Protocol) authentication tokens
  pdsAccessJwt?: string; // Access JWT for PDS operations (e.g., account deletion)
  pdsRefreshJwt?: string; // Refresh JWT for PDS operations
  pdsTokensUpdatedAt?: string; // Timestamp when PDS tokens were last updated
  // Temporary password for PDS account deletion
  temporaryPasswordEncrypted?: string; // Encrypted temporary password used for PDS account creation
  temporaryPasswordCreatedAt?: string; // Timestamp when temporary password was created
  passwordChangedFromTemporary?: boolean; // Whether password has been changed from temporary password
}

/**
 * AT Protocol Identity Lookup Item
 */
export interface DynamoDBIdentityLookupItem {
  PK: string; // LINK#{linkedId}
  SK: string; // PRIMARY
  linkedId: string; // "email:alice@example.com" / "did:ethr:..." etc
  primaryDid: string; // did:plc:...
  status: 'verified' | 'revoked';
  createdAt: string;
  linkType?: 'email' | 'did' | 'wallet' | 'account';
  emailNormalized?: string;
  emailVerified?: boolean;
  revokedAt?: string;
}

/**
 * SNS Service Class
 */
export class SnsService {
  private client: DynamoDBDocumentClient | null;

  /**
   * Extract username from handle (remove domain part)
   * @param handle - Full handle (e.g., "testuser1.pds-dev.heart-land.io")
   * @returns Username part (e.g., "testuser1")
   */
  private extractUsername(handle: string): string {
    const parts = handle.split('.');
    return parts[0] || handle;
  }
  private tableName: string;
  private mockFollows: Set<string>; // For development environment

  constructor() {
    // Initialize mock data storage for development
    this.mockFollows = new Set();

    // For local development, skip DynamoDB client initialization
    if (process.env.NODE_ENV === 'development' || !process.env.AWS_REGION) {
      console.log(
        'Skipping DynamoDB client initialization for local development'
      );
      this.client = null;
      this.tableName = 'mock-table';
    } else {
      // Only initialize DynamoDB client if AWS credentials are available
      try {
        // Check if AWS credentials are available
        if (!process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_PROFILE) {
          console.log('No AWS credentials found, using mock mode');
          this.client = null;
          this.tableName = 'mock-table';
        } else {
          const dynamoClient = new DynamoDBClient({
            region: process.env.AWS_REGION || 'ap-northeast-1',
          });
          this.client = DynamoDBDocumentClient.from(dynamoClient);
          this.tableName =
            process.env.SNS_TABLE_NAME || 'heartland-api-v3-sns-dev';
        }
      } catch (error) {
        console.log(
          'Failed to initialize DynamoDB client, using mock mode:',
          error
        );
        this.client = null;
        this.tableName = 'mock-table';
      }
    }
  }

  /**
   * Generate TTL timestamp (7 days from now)
   */
  private getTTL(): number {
    return Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
  }

  /**
   * Encode cursor for pagination
   */
  private encodeCursor(lastEvaluatedKey: Record<string, any>): string {
    return Buffer.from(JSON.stringify(lastEvaluatedKey)).toString('base64');
  }

  /**
   * Decode cursor for pagination
   */
  private decodeCursor(cursor: string): Record<string, any> | undefined {
    try {
      return JSON.parse(Buffer.from(cursor, 'base64').toString());
    } catch {
      return undefined;
    }
  }

  // ===== USER OPERATIONS =====

  /**
   * Create or update user profile
   *
   * @description Creates a user profile using the new AT Protocol data model.
   * The userId parameter is treated as primaryDid.
   *
   * @param userId - User's primary DID (did:plc:...)
   * @param profile - User profile data
   */
  async createUserProfile(
    userId: string,
    profile: Omit<UserProfile, 'did' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    // Convert UserProfile (AT Protocol Lexicon compliant) to DynamoDBUserProfileItem format
    const handle = profile.handle || userId;
    const username = this.extractUsername(handle);
    const normalizedEmail = profile.email
      ? profile.email.toLowerCase().trim()
      : undefined;

    const profileItem: Omit<
      DynamoDBUserProfileItem,
      'PK' | 'SK' | 'primaryDid' | 'createdAt' | 'updatedAt'
    > = {
      handle, // AT Protocol standard: handle
      username, // Username part for search (without domain)
      displayName: profile.displayName, // AT Protocol standard
      ...(profile.description !== undefined && { bio: profile.description }), // Map description to bio (internal storage)
      ...(profile.avatar !== undefined && { avatarUrl: profile.avatar }), // Map avatar to avatarUrl (internal storage)
      ...(profile.banner !== undefined && {
        bannerUrl: profile.banner,
      }), // Map banner to bannerUrl (internal storage)
      followerCount: profile.followerCount, // AT Protocol standard
      followingCount: profile.followingCount, // AT Protocol standard
      postCount: profile.postCount, // Custom extension
      ...(normalizedEmail && {
        primaryEmail: profile.email,
        primaryEmailNormalized: normalizedEmail,
        email: normalizedEmail, // For search
      }),
      emailLoginEnabled: !!profile.email,
      authProviders: {
        emailPassword: !!profile.email,
      },
      accountStatus: 'active',
      // GSI keys for search
      ...(username && {
        GSI6PK: `USER_SEARCH#${username.toLowerCase()}`,
        GSI6SK: userId,
      }),
      ...(profile.displayName && {
        GSI7PK: `USER_SEARCH#${profile.displayName.toLowerCase()}`,
        GSI7SK: userId,
      }),
      ...(normalizedEmail && {
        GSI8PK: `USER_SEARCH#${normalizedEmail}`,
        GSI8SK: userId,
      }),
    };

    // Use createUserProfileItem which works with DynamoDBUserProfileItem
    await this.createUserProfileItem(userId, profileItem);

    // Create identity link for email if provided
    if (profile.email) {
      const normalizedEmail = profile.email.toLowerCase().trim();
      await this.createIdentityLink(userId, {
        linkedId: `email:${normalizedEmail}`,
        kind: 'account',
        role: 'login',
        status: 'pending',
        email: normalizedEmail,
        emailNormalized: normalizedEmail,
        emailVerified: false,
      });
    }

    // Create identity link for wallet address if provided
    if (profile.walletAddress) {
      // Determine wallet type from address format
      let linkedId: string;
      if (profile.walletAddress.startsWith('0x')) {
        linkedId = `eip155:${profile.walletAddress}`;
      } else {
        linkedId = `flow:${profile.walletAddress}`;
      }

      await this.createIdentityLink(userId, {
        linkedId,
        kind: 'account',
        role: 'login',
        status: 'pending',
      });
    }
  }

  /**
   * Get user profile
   *
   * @description Retrieves user profile by primaryDid (AT Protocol DID).
   * The userId parameter is treated as primaryDid.
   *
   * @param userId - User's primary DID (did:plc:...)
   * @returns User profile or null if not found
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    // Use getUserProfileItem which works with DynamoDBUserProfileItem
    const profileItem = await this.getUserProfileItem(userId);
    if (!profileItem) return null;

    // Get email from identity link if available
    const identityLinks = await this.queryIdentityLinks(userId);
    const emailLink = identityLinks.find(
      link => link.linkedId.startsWith('email:') && link.email
    );
    const email = emailLink?.email || profileItem.primaryEmail || '';

    // Get wallet address from identity link if available
    const walletLink = identityLinks.find(
      link =>
        (link.linkedId.startsWith('flow:') ||
          link.linkedId.startsWith('eip155:')) &&
        link.linkedId
    );
    const walletAddress = walletLink?.linkedId || '';

    // Convert DynamoDBUserProfileItem to UserProfile (AT Protocol Lexicon compliant)
    // Extract username from handle (remove domain part)
    const handleValue = profileItem.handle || profileItem.primaryDid;
    const username = handleValue.includes('.')
      ? this.extractUsername(handleValue)
      : handleValue;

    return {
      did: profileItem.primaryDid, // AT Protocol standard: did
      displayName: profileItem.displayName, // AT Protocol standard
      handle: username, // AT Protocol standard: handle (domain removed)
      description: profileItem.bio, // AT Protocol standard: description (previously bio)
      avatar: profileItem.avatarUrl, // AT Protocol standard: avatar (previously avatarUrl)
      banner: profileItem.bannerUrl, // AT Protocol standard: banner (previously backgroundImageUrl)
      followerCount: profileItem.followerCount, // AT Protocol standard
      followingCount: profileItem.followingCount, // AT Protocol standard
      createdAt: profileItem.createdAt, // AT Protocol standard
      // Custom extensions
      email,
      walletAddress,
      postCount: profileItem.postCount,
      updatedAt: profileItem.updatedAt,
    };
  }

  /**
   * Update user profile
   *
   * @description Updates user profile using the new AT Protocol data model.
   * The userId parameter is treated as primaryDid.
   *
   * @param userId - User's primary DID (did:plc:...)
   * @param updates - Profile fields to update
   */
  async updateUserProfile(
    userId: string,
    updates: Partial<Omit<UserProfile, 'did' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    if (!this.client) {
      // For local development, just log the operation
      console.log('Mock updateUserProfile:', { userId, updates });
      return;
    }

    const now = new Date().toISOString();
    const updateExpression: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    // Map UserProfile (AT Protocol Lexicon compliant) fields to DynamoDBUserProfileItem fields
    if (updates.displayName !== undefined) {
      updateExpression.push('#displayName = :displayName');
      expressionAttributeNames['#displayName'] = 'displayName';
      expressionAttributeValues[':displayName'] = updates.displayName;
      // Update GSI7 key
      updateExpression.push('GSI7PK = :gsi7pk');
      expressionAttributeValues[':gsi7pk'] =
        `USER_SEARCH#${updates.displayName.toLowerCase()}`;
      updateExpression.push('GSI7SK = :gsi7sk');
      expressionAttributeValues[':gsi7sk'] = userId;
    }
    if (updates.handle !== undefined) {
      // AT Protocol standard: handle
      updateExpression.push('#handle = :handle');
      expressionAttributeNames['#handle'] = 'handle';
      expressionAttributeValues[':handle'] = updates.handle;
      // Update username and GSI6 key
      const username = this.extractUsername(updates.handle);
      updateExpression.push('#username = :username');
      expressionAttributeNames['#username'] = 'username';
      expressionAttributeValues[':username'] = username;
      updateExpression.push('GSI6PK = :gsi6pk');
      expressionAttributeValues[':gsi6pk'] =
        `USER_SEARCH#${username.toLowerCase()}`;
      updateExpression.push('GSI6SK = :gsi6sk');
      expressionAttributeValues[':gsi6sk'] = userId;
    }
    if (updates.description !== undefined) {
      // AT Protocol standard: description (map to bio for internal storage)
      updateExpression.push('#bio = :bio');
      expressionAttributeNames['#bio'] = 'bio';
      expressionAttributeValues[':bio'] = updates.description;
    }
    if (updates.avatar !== undefined) {
      // AT Protocol standard: avatar (map to avatarUrl for internal storage)
      updateExpression.push('#avatarUrl = :avatarUrl');
      expressionAttributeNames['#avatarUrl'] = 'avatarUrl';
      expressionAttributeValues[':avatarUrl'] = updates.avatar;
    }
    if (updates.banner !== undefined) {
      // AT Protocol standard: banner (map to bannerUrl for internal storage)
      updateExpression.push('#bannerUrl = :bannerUrl');
      expressionAttributeNames['#bannerUrl'] = 'bannerUrl';
      expressionAttributeValues[':bannerUrl'] = updates.banner;
    }
    if (updates.email !== undefined) {
      // Update email in profile and identity link
      const normalizedEmail = updates.email.toLowerCase().trim();
      updateExpression.push('#email = :email');
      expressionAttributeNames['#email'] = 'email';
      expressionAttributeValues[':email'] = normalizedEmail;
      updateExpression.push('primaryEmail = :primaryEmail');
      expressionAttributeValues[':primaryEmail'] = updates.email;
      updateExpression.push('primaryEmailNormalized = :primaryEmailNormalized');
      expressionAttributeValues[':primaryEmailNormalized'] = normalizedEmail;
      // Update GSI8 key
      updateExpression.push('GSI8PK = :gsi8pk');
      expressionAttributeValues[':gsi8pk'] = `USER_SEARCH#${normalizedEmail}`;
      updateExpression.push('GSI8SK = :gsi8sk');
      expressionAttributeValues[':gsi8sk'] = userId;

      // Update or create identity link for email
      const emailLink = await this.getIdentityLink(
        userId,
        `email:${normalizedEmail}`
      );
      if (emailLink) {
        await this.updateIdentityLink(userId, `email:${normalizedEmail}`, {
          email: normalizedEmail,
          emailNormalized: normalizedEmail,
        });
      } else {
        await this.createIdentityLink(userId, {
          linkedId: `email:${normalizedEmail}`,
          kind: 'account',
          role: 'login',
          status: 'pending',
          email: normalizedEmail,
          emailNormalized: normalizedEmail,
          emailVerified: false,
        });
      }
    }
    if (updates.walletAddress !== undefined) {
      // Update wallet address in identity link
      // Determine wallet type from address format
      let linkedId: string;
      if (updates.walletAddress.startsWith('0x')) {
        linkedId = `eip155:${updates.walletAddress}`;
      } else {
        linkedId = `flow:${updates.walletAddress}`;
      }

      const walletLink = await this.getIdentityLink(userId, linkedId);
      if (!walletLink) {
        await this.createIdentityLink(userId, {
          linkedId,
          kind: 'account',
          role: 'login',
          status: 'pending',
        });
      }
    }
    if (updates.followerCount !== undefined) {
      updateExpression.push('#followerCount = :followerCount');
      expressionAttributeNames['#followerCount'] = 'followerCount';
      expressionAttributeValues[':followerCount'] = updates.followerCount;
    }
    if (updates.followingCount !== undefined) {
      updateExpression.push('#followingCount = :followingCount');
      expressionAttributeNames['#followingCount'] = 'followingCount';
      expressionAttributeValues[':followingCount'] = updates.followingCount;
    }
    if (updates.postCount !== undefined) {
      updateExpression.push('#postCount = :postCount');
      expressionAttributeNames['#postCount'] = 'postCount';
      expressionAttributeValues[':postCount'] = updates.postCount;
    }

    // Always update the updatedAt timestamp
    if (updateExpression.length > 0) {
      updateExpression.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = now;

      const command = new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `USER#${userId}`,
          SK: 'PROFILE',
        },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
      });

      await this.client.send(command);
    }
  }

  /**
   * Delete user profile
   *
   * @description Performs a soft delete (logical delete) of the user profile.
   * The profile is marked as deleted rather than physically removed from the database.
   *
   * Best Practices for User Deletion:
   * 1. Profile: Mark as deleted (soft delete) - keeps data for audit/legal purposes
   * 2. Posts: Anonymize (set authorId to "deleted" or remove author info) - preserves content integrity
   * 3. Comments: Anonymize (set authorId to "deleted") - preserves thread integrity
   * 4. Likes: Delete - no need to keep anonymous likes
   * 5. Follows: Delete - clean up follow relationships
   * 6. Identity Links: Keep for audit purposes (legal/compliance requirements)
   *
   * NOTE: This implementation currently only marks the profile as deleted.
   * Full implementation should include anonymization of posts/comments and deletion of likes/follows.
   *
   * @param userId - User's primary DID (did:plc:...)
   */
  async deleteUserProfile(userId: string): Promise<void> {
    if (!this.client) {
      // For local development, just log the operation
      console.log('Mock deleteUserProfile:', { userId });
      return;
    }

    // Soft delete: Mark profile as deleted instead of physically deleting
    const updateCommand = new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PROFILE',
      },
      UpdateExpression:
        'SET accountStatus = :deleted, deletedAt = :deletedAt, #displayName = :deletedName, #handle = :deletedHandle REMOVE email, primaryEmail, primaryEmailNormalized',
      ExpressionAttributeNames: {
        '#displayName': 'displayName',
        '#handle': 'handle',
      },
      ExpressionAttributeValues: {
        ':deleted': 'deleted',
        ':deletedAt': new Date().toISOString(),
        ':deletedName': '[Deleted User]',
        ':deletedHandle': `deleted.${userId.substring(0, 8)}`,
      },
    });

    await this.client.send(updateCommand);

    // Delete PDS account if accessJwt is available
    try {
      const identityLinks = await this.queryIdentityLinks(userId);
      const emailLink = identityLinks.find(
        link => link.linkedId.startsWith('email:') && link.pdsAccessJwt
      );

      if (emailLink && emailLink.pdsAccessJwt) {
        // Import PdsService and PasswordService dynamically to avoid circular dependency
        const { PdsService } = await import('./PdsService');
        const { PasswordService } = await import('./PasswordService');
        const pdsService = PdsService.getInstance();
        const passwordService = PasswordService.getInstance();

        // Decrypt temporary password if available
        let temporaryPassword: string | null = null;
        if (emailLink.temporaryPasswordEncrypted) {
          try {
            temporaryPassword = passwordService.decryptTemporaryPassword(
              emailLink.temporaryPasswordEncrypted
            );
          } catch (error) {
            console.warn(
              'Failed to decrypt temporary password for PDS deletion:',
              error
            );
            // Continue without temporary password - will use deactivateAccount fallback
          }
        }

        const deleteResult = await pdsService.deleteAccount(
          userId,
          temporaryPassword,
          emailLink.pdsAccessJwt
        );

        if (!deleteResult.success) {
          // Log error but don't fail the entire deletion process
          // DynamoDB deletion has already succeeded
          console.error('Failed to delete PDS account:', {
            did: userId,
            error: deleteResult.error,
          });
          // Throw error to indicate PDS deletion failure
          throw new Error(`PDS account deletion failed: ${deleteResult.error}`);
        }

        console.log('PDS account deleted successfully:', { did: userId });
      } else {
        console.warn('Cannot delete PDS account: missing pdsAccessJwt', {
          did: userId,
          hasEmailLink: !!emailLink,
          hasAccessJwt: !!emailLink?.pdsAccessJwt,
        });
      }
    } catch (error) {
      // PDS deletion failed - throw error to indicate failure
      console.error('Error during PDS account deletion:', {
        did: userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(
        `Account deletion failed: PDS account deletion error - ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }

    // TODO: Implement full deletion workflow:
    // 1. Anonymize posts (set authorId to "deleted" or remove author info)
    // 2. Anonymize comments (set authorId to "deleted")
    // 3. Delete likes (remove all likes by this user)
    // 4. Delete follows (remove all follow relationships)
    // 5. Keep Identity Links for audit purposes (legal/compliance)

    // Note: Identity links are kept for audit purposes
    // If you want to delete all identity links, you would need to query and delete them separately
  }

  // ===== POST OPERATIONS (AT Protocol) =====

  /**
   * Create post (AT Protocol compliant)
   *
   * @description Creates a new post using AT Protocol data model.
   * Uses rkey (TID format) and AT URI for identification.
   *
   * @param ownerDid - Repository owner DID (did:plc:...)
   * @param text - Post text content
   * @param embed - Embed images (optional)
   * @param facets - Facets for rich text (optional)
   * @returns Promise resolving to created post AT URI
   */
  async createPost(
    ownerDid: string,
    text: string,
    embed?: { images?: SimplifiedEmbedImage[] },
    facets?: SimplifiedFacet[]
  ): Promise<string> {
    if (!this.client) {
      // For local development, just log the operation
      const mockRkey = generateRkey();
      const mockUri = generatePostAtUri(ownerDid, mockRkey);
      console.log('Mock createPost:', {
        ownerDid,
        text,
        embed,
        facets,
        rkey: mockRkey,
        uri: mockUri,
      });
      return mockUri;
    }

    // Generate rkey (TID format)
    const rkey = generateRkey();
    const uri = generatePostAtUri(ownerDid, rkey);
    const now = new Date().toISOString();

    // Build AT Protocol compliant post item
    const item: DynamoDBBskyPostRecordItem = {
      PK: `REPO#${ownerDid}`,
      SK: `REC#app.bsky.feed.post#${rkey}`,
      ownerDid,
      collection: 'app.bsky.feed.post',
      rkey,
      uri,
      text,
      createdAt: now,
      createdAtIso: now,
      updatedAtIso: now,
      ...(embed && { embed }),
      ...(facets && facets.length > 0 && { facets }),
      ttl: this.getTTL(),
      // GSI Keys
      GSI1PK: `REPO#${ownerDid}`,
      GSI1SK: `REC#app.bsky.feed.post#${rkey}`,
      GSI2PK: 'POST#ALL',
      GSI2SK: `REC#app.bsky.feed.post#${rkey}`,
    };

    const command = new PutCommand({
      TableName: this.tableName,
      Item: item,
    });

    await this.client.send(command);
    return uri;
  }

  /**
   * Get post by AT URI or rkey
   *
   * @description Retrieves a post by AT URI or rkey (AT Protocol compliant).
   *
   * @param uriOrRkey - Post AT URI or rkey
   * @param ownerDid - Repository owner DID (required if rkey is provided)
   * @returns Promise resolving to post data or null if not found
   */
  async getPost(
    uriOrRkey: string,
    ownerDid?: string
  ): Promise<PostData | null> {
    if (!this.client) {
      // Return mock data for local development
      const mockRkey = uriOrRkey.includes('at://')
        ? extractRkeyFromUri(uriOrRkey) || generateRkey()
        : uriOrRkey;
      const mockOwnerDid = ownerDid || 'did:plc:mock';
      const mockUri = generatePostAtUri(mockOwnerDid, mockRkey);
      return {
        uri: mockUri,
        rkey: mockRkey,
        ownerDid: mockOwnerDid,
        authorName: 'Mock Author',
        authorUsername: 'mockauthor',
        text: 'This is a mock post for local development',
        isLiked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Parse URI or use provided rkey
    let rkey: string;
    let resolvedOwnerDid: string;

    if (uriOrRkey.includes('at://')) {
      const parsed = parsePostAtUri(uriOrRkey);
      if (!parsed) return null;
      rkey = parsed.rkey;
      resolvedOwnerDid = parsed.ownerDid;
    } else {
      if (!ownerDid) return null;
      rkey = uriOrRkey;
      resolvedOwnerDid = ownerDid;
    }

    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: `REPO#${resolvedOwnerDid}`,
        SK: `REC#app.bsky.feed.post#${rkey}`,
      },
    });

    const result = await this.client.send(command);
    if (!result.Item) return null;

    const item = result.Item as DynamoDBBskyPostRecordItem;

    // Get author profile for display name and username
    const authorProfile = await this.getUserProfileItem(item.ownerDid);
    const authorName = authorProfile?.displayName || '';
    const authorUsername = authorProfile
      ? this.extractUsername(authorProfile.handle || item.ownerDid)
      : '';

    // embed.images is already SimplifiedEmbedImage format
    const embedImages: SimplifiedEmbedImage[] | undefined = item.embed?.images;

    // facets is already SimplifiedFacet format
    const facets: SimplifiedFacet[] | undefined = item.facets;

    // Calculate like count and comment count (AppView pattern)
    const likeCount = await this.getPostLikeCount(item.uri);
    const commentCount = await this.getPostCommentCount(item.uri);

    return {
      uri: item.uri,
      rkey: item.rkey,
      ownerDid: item.ownerDid,
      authorName,
      authorUsername,
      text: item.text,
      ...(embedImages &&
        embedImages.length > 0 && { embed: { images: embedImages } }),
      ...(facets && facets.length > 0 && { facets }),
      isLiked: false, // Will be populated by controller
      createdAt: item.createdAt,
      updatedAt: item.updatedAtIso,
    };
  }

  /**
   * Get all posts (global feed) - AT Protocol compliant
   *
   * @description Retrieves all posts using GSI2 (POST#ALL → REC#app.bsky.feed.post#{rkey}).
   * Posts are sorted by creation time descending (newest first).
   *
   * @param limit - Number of posts to return
   * @param cursor - Pagination cursor
   * @returns Promise resolving to paginated posts
   */
  async getAllPosts(
    limit: number = 20,
    cursor?: string
  ): Promise<{
    success: boolean;
    data?: PaginatedData<PostData>;
    error?: string;
  }> {
    try {
      if (!this.client) {
        // Return mock data for local development
        const mockRkey1 = generateRkey();
        const mockRkey2 = generateRkey();
        const mockOwnerDid1 = 'did:plc:mock1';
        const mockOwnerDid2 = 'did:plc:mock2';
        const mockPosts: PostData[] = [
          {
            uri: generatePostAtUri(mockOwnerDid1, mockRkey1),
            rkey: mockRkey1,
            ownerDid: mockOwnerDid1,
            authorName: 'John Doe',
            authorUsername: 'johndoe',
            text: 'Hello, world! This is a test post.',
            embed: {
              images: [
                {
                  url: 'https://example.com/image1.jpg',
                  alt: 'Test image',
                },
              ],
            },
            facets: [
              {
                type: 'tag',
                value: 'hello',
                startIndex: 0,
                endIndex: 5,
              },
            ],
            isLiked: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            uri: generatePostAtUri(mockOwnerDid2, mockRkey2),
            rkey: mockRkey2,
            ownerDid: mockOwnerDid2,
            authorName: 'Jane Smith',
            authorUsername: 'janesmith',
            text: 'Another test post for the SNS API.',
            isLiked: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];

        return {
          success: true,
          data: {
            items: mockPosts.slice(0, limit),
            nextCursor: undefined,
            hasMore: false,
          },
        };
      }

      const exclusiveStartKey = cursor ? this.decodeCursor(cursor) : undefined;

      // Use GSI2 to get all posts (POST#ALL → REC#app.bsky.feed.post#{rkey})
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :gsi2pk',
        ExpressionAttributeValues: {
          ':gsi2pk': 'POST#ALL',
        },
        ScanIndexForward: false, // Sort by creation time descending
        Limit: limit,
        ExclusiveStartKey: exclusiveStartKey,
      });

      const result = await this.client.send(command);

      const posts: PostData[] = [];
      if (result.Items) {
        for (const item of result.Items) {
          const postItem = item as DynamoDBBskyPostRecordItem;

          // Get author profile for display name and username
          const authorProfile = await this.getUserProfileItem(
            postItem.ownerDid
          );
          const authorName = authorProfile?.displayName || '';
          const authorUsername = authorProfile
            ? this.extractUsername(authorProfile.handle || postItem.ownerDid)
            : '';

          // embed.images is already SimplifiedEmbedImage format
          const embedImages: SimplifiedEmbedImage[] | undefined =
            postItem.embed?.images;

          // facets is already SimplifiedFacet format
          const facets: SimplifiedFacet[] | undefined = postItem.facets;

          // Calculate like count and comment count (AppView pattern)
          const likeCount = await this.getPostLikeCount(postItem.uri);
          const commentCount = await this.getPostCommentCount(postItem.uri);

          posts.push({
            uri: postItem.uri,
            rkey: postItem.rkey,
            ownerDid: postItem.ownerDid,
            authorName,
            authorUsername,
            text: postItem.text,
            ...(embedImages &&
              embedImages.length > 0 && { embed: { images: embedImages } }),
            ...(facets && facets.length > 0 && { facets }),
            isLiked: false, // Will be populated by controller
            createdAt: postItem.createdAt,
            updatedAt: postItem.updatedAtIso,
          });
        }
      }

      const nextCursor = result.LastEvaluatedKey
        ? this.encodeCursor(result.LastEvaluatedKey)
        : undefined;

      return {
        success: true,
        data: {
          items: posts,
          nextCursor,
          hasMore: !!result.LastEvaluatedKey,
        },
      };
    } catch (error) {
      console.error('Error getting all posts:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to retrieve posts',
      };
    }
  }

  /**
   * Get user posts with pagination - AT Protocol compliant
   *
   * @description Retrieves user posts using GSI1 (REPO#{ownerDid} → REC#app.bsky.feed.post#{rkey}).
   * Posts are sorted by creation time descending (newest first).
   *
   * @param ownerDid - Repository owner DID (did:plc:...)
   * @param limit - Number of posts to return
   * @param cursor - Pagination cursor
   * @returns Promise resolving to paginated posts
   */
  async getUserPosts(
    ownerDid: string,
    limit: number = 20,
    cursor?: string
  ): Promise<PaginatedData<PostData>> {
    if (!this.client) {
      // Return mock data for local development
      const mockRkey = generateRkey();
      const mockPosts: PostData[] = [
        {
          uri: generatePostAtUri(ownerDid, mockRkey),
          rkey: mockRkey,
          ownerDid,
          authorName: 'Mock User',
          authorUsername: 'mockuser',
          text: 'This is a mock post for local development',
          isLiked: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      return {
        items: mockPosts.slice(0, limit),
        nextCursor: undefined,
        hasMore: false,
      };
    }

    const exclusiveStartKey = cursor ? this.decodeCursor(cursor) : undefined;

    // Use GSI1 to get user posts (REPO#{ownerDid} → REC#app.bsky.feed.post#{rkey})
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      FilterExpression: '#col = :collection',
      ExpressionAttributeNames: {
        '#col': 'collection',
      },
      ExpressionAttributeValues: {
        ':gsi1pk': `REPO#${ownerDid}`,
        ':collection': 'app.bsky.feed.post',
      },
      ScanIndexForward: false, // Sort by creation time descending
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey,
    });

    const result = await this.client.send(command);

    // Get author profile once
    const authorProfile = await this.getUserProfileItem(ownerDid);
    const authorName = authorProfile?.displayName || '';
    const authorUsername = authorProfile
      ? this.extractUsername(authorProfile.handle || ownerDid)
      : '';

    const items = await Promise.all(
      (result.Items || []).map(async item => {
        const postItem = item as DynamoDBBskyPostRecordItem;

        // embed.images is already SimplifiedEmbedImage format
        const embedImages: SimplifiedEmbedImage[] | undefined =
          postItem.embed?.images;

        // facets is already SimplifiedFacet format
        const facets: SimplifiedFacet[] | undefined = postItem.facets;

        return {
          uri: postItem.uri,
          rkey: postItem.rkey,
          ownerDid: postItem.ownerDid,
          authorName,
          authorUsername,
          text: postItem.text,
          ...(embedImages &&
            embedImages.length > 0 && { embed: { images: embedImages } }),
          ...(facets && facets.length > 0 && { facets }),
          isLiked: false, // Will be populated by controller
          createdAt: postItem.createdAt,
          updatedAt: postItem.updatedAtIso,
        };
      })
    );

    return {
      items,
      nextCursor: result.LastEvaluatedKey
        ? this.encodeCursor(result.LastEvaluatedKey)
        : undefined,
      hasMore: !!result.LastEvaluatedKey,
    };
  }

  /**
   * Delete post (AT Protocol compliant)
   *
   * @description Deletes a post by AT URI or rkey. Also deletes related reply posts
   * (comments) and likes.
   *
   * @param uriOrRkey - Post AT URI or rkey
   * @param ownerDid - Repository owner DID (required if rkey is provided)
   */
  async deletePost(uriOrRkey: string, ownerDid?: string): Promise<void> {
    if (!this.client) {
      console.log('Mock deletePost:', { uriOrRkey, ownerDid });
      return;
    }

    // Parse URI or use provided rkey
    let rkey: string;
    let resolvedOwnerDid: string;

    if (uriOrRkey.includes('at://')) {
      const parsed = parsePostAtUri(uriOrRkey);
      if (!parsed) return;
      rkey = parsed.rkey;
      resolvedOwnerDid = parsed.ownerDid;
    } else {
      if (!ownerDid) return;
      rkey = uriOrRkey;
      resolvedOwnerDid = ownerDid;
    }

    const postUri = generatePostAtUri(resolvedOwnerDid, rkey);

    // Get all reply posts (comments) for this post using GSI13
    const commentsResult = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI13',
        KeyConditionExpression: 'GSI13PK = :gsi13pk',
        ExpressionAttributeValues: {
          ':gsi13pk': `REPLY#ROOT#${postUri}`,
        },
      })
    );

    // Get all likes for this post (using old LIKE structure for now)
    const likesResult = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `POST#${rkey}`, // Simplified: use rkey as postId for now
          ':sk': 'LIKE#',
        },
      })
    );

    // Delete all related items
    const deleteRequests = [
      {
        DeleteRequest: {
          Key: {
            PK: `REPO#${resolvedOwnerDid}`,
            SK: `REC#app.bsky.feed.post#${rkey}`,
          },
        },
      },
      ...(commentsResult.Items || []).map(item => ({
        DeleteRequest: {
          Key: {
            PK: (item as DynamoDBBskyPostRecordItem).PK,
            SK: (item as DynamoDBBskyPostRecordItem).SK,
          },
        },
      })),
      ...(likesResult.Items || []).map(item => ({
        DeleteRequest: { Key: { PK: item.PK, SK: item.SK } },
      })),
    ];

    // Batch delete in chunks of 25
    for (let i = 0; i < deleteRequests.length; i += 25) {
      const chunk = deleteRequests.slice(i, i + 25);
      const command = new BatchWriteCommand({
        RequestItems: {
          [this.tableName]: chunk,
        },
      });
      await this.client.send(command);
    }
  }

  // ===== COMMENT OPERATIONS (Reply Post) =====

  /**
   * Create comment (Reply Post) - AT Protocol compliant
   *
   * @description Creates a comment as a Reply Post in AT Protocol.
   * Comments are stored as posts with a reply reference to the parent post.
   *
   * @param ownerDid - Repository owner DID (comment author)
   * @param text - Comment text content
   * @param rootPostUri - Root post AT URI
   * @param parentPostUri - Parent post AT URI (usually same as rootPostUri for direct comments)
   * @returns Promise resolving to created comment AT URI
   */
  async createComment(
    ownerDid: string,
    text: string,
    rootPostUri: string,
    parentPostUri: string
  ): Promise<string> {
    if (!this.client) {
      const mockRkey = generateRkey();
      const mockUri = generatePostAtUri(ownerDid, mockRkey);
      console.log('Mock createComment:', {
        ownerDid,
        text,
        rootPostUri,
        parentPostUri,
        rkey: mockRkey,
        uri: mockUri,
      });
      return mockUri;
    }

    // Generate rkey (TID format)
    const rkey = generateRkey();
    const uri = generatePostAtUri(ownerDid, rkey);
    const now = new Date().toISOString();

    // Parse parent and root post URIs to get their rkeys
    const parentParsed = parsePostAtUri(parentPostUri);
    const rootParsed = parsePostAtUri(rootPostUri);
    if (!parentParsed || !rootParsed) {
      throw new Error('Invalid parent or root post URI');
    }

    // Build reply reference
    const reply: ReplyRef = {
      root: {
        uri: rootPostUri,
      },
      parent: {
        uri: parentPostUri,
      },
    };

    // Build AT Protocol compliant reply post item
    const item: DynamoDBBskyPostRecordItem = {
      PK: `REPO#${ownerDid}`,
      SK: `REC#app.bsky.feed.post#${rkey}`,
      ownerDid,
      collection: 'app.bsky.feed.post',
      rkey,
      uri,
      text,
      reply,
      createdAt: now,
      createdAtIso: now,
      updatedAtIso: now,
      ttl: this.getTTL(),
      // GSI Keys
      GSI1PK: `REPO#${ownerDid}`,
      GSI1SK: `REC#app.bsky.feed.post#${rkey}`,
      GSI2PK: 'POST#ALL',
      GSI2SK: `REC#app.bsky.feed.post#${rkey}`,
      // GSI13 for reply posts
      GSI13PK: `REPLY#ROOT#${rootPostUri}`,
      GSI13SK: `REC#app.bsky.feed.post#${rkey}`,
    };

    const command = new PutCommand({
      TableName: this.tableName,
      Item: item,
    });

    await this.client.send(command);
    return uri;
  }

  /**
   * Get post comments (Reply Posts) with pagination - AT Protocol compliant
   *
   * @description Retrieves comments (reply posts) for a post using GSI13
   * (REPLY#ROOT#{rootPostUri} → REC#app.bsky.feed.post#{rkey}).
   *
   * @param rootPostUri - Root post AT URI
   * @param limit - Number of comments to return
   * @param cursor - Pagination cursor
   * @returns Promise resolving to paginated comments
   */
  async getPostComments(
    rootPostUri: string,
    limit: number = 20,
    cursor?: string
  ): Promise<PaginatedData<CommentData>> {
    if (!this.client) {
      // Return mock data for local development
      const mockRkey = generateRkey();
      const mockOwnerDid = 'did:plc:mock';
      const mockComments: CommentData[] = [
        {
          uri: generatePostAtUri(mockOwnerDid, mockRkey),
          rkey: mockRkey,
          ownerDid: mockOwnerDid,
          rootPostUri,
          parentPostUri: rootPostUri,
          authorName: 'Mock Author',
          authorUsername: 'mockauthor',
          text: 'This is a mock comment for local development',
          isLiked: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      return {
        items: mockComments.slice(0, limit),
        nextCursor: undefined,
        hasMore: false,
      };
    }

    const exclusiveStartKey = cursor ? this.decodeCursor(cursor) : undefined;

    // Use GSI13 to get reply posts (REPLY#ROOT#{rootPostUri} → REC#app.bsky.feed.post#{rkey})
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'GSI13',
      KeyConditionExpression: 'GSI13PK = :gsi13pk',
      ExpressionAttributeValues: {
        ':gsi13pk': `REPLY#ROOT#${rootPostUri}`,
      },
      ScanIndexForward: false, // Sort by creation time descending
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey,
    });

    const result = await this.client.send(command);

    const items = await Promise.all(
      (result.Items || []).map(async item => {
        const replyPostItem = item as DynamoDBBskyPostRecordItem;

        // Get author profile for display name and username
        const authorProfile = await this.getUserProfileItem(
          replyPostItem.ownerDid
        );
        const authorName = authorProfile?.displayName || '';
        const authorUsername = authorProfile
          ? this.extractUsername(authorProfile.handle || replyPostItem.ownerDid)
          : '';

        // Extract root and parent URIs from reply reference
        const rootPostUriFromReply = replyPostItem.reply?.root.uri || '';
        const parentPostUriFromReply = replyPostItem.reply?.parent.uri || '';

        return {
          uri: replyPostItem.uri,
          rkey: replyPostItem.rkey,
          ownerDid: replyPostItem.ownerDid,
          rootPostUri: rootPostUriFromReply,
          parentPostUri: parentPostUriFromReply,
          authorName,
          authorUsername,
          text: replyPostItem.text,
          reply: replyPostItem.reply,
          isLiked: false, // Will be populated by controller
          createdAt: replyPostItem.createdAt,
          updatedAt: replyPostItem.updatedAtIso,
        };
      })
    );

    return {
      items,
      nextCursor: result.LastEvaluatedKey
        ? this.encodeCursor(result.LastEvaluatedKey)
        : undefined,
      hasMore: !!result.LastEvaluatedKey,
    };
  }

  /**
   * Delete comment (Reply Post) - AT Protocol compliant
   *
   * @description Deletes a comment (reply post) by AT URI or rkey.
   *
   * @param uriOrRkey - Comment AT URI or rkey
   * @param ownerDid - Repository owner DID (required if rkey is provided)
   */
  async deleteComment(uriOrRkey: string, ownerDid?: string): Promise<void> {
    if (!this.client) {
      console.log('Mock deleteComment:', { uriOrRkey, ownerDid });
      return;
    }

    // Parse URI or use provided rkey
    let rkey: string;
    let resolvedOwnerDid: string;

    if (uriOrRkey.includes('at://')) {
      const parsed = parsePostAtUri(uriOrRkey);
      if (!parsed) return;
      rkey = parsed.rkey;
      resolvedOwnerDid = parsed.ownerDid;
    } else {
      if (!ownerDid) return;
      rkey = uriOrRkey;
      resolvedOwnerDid = ownerDid;
    }

    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: {
        PK: `REPO#${resolvedOwnerDid}`,
        SK: `REC#app.bsky.feed.post#${rkey}`,
      },
    });

    await this.client.send(command);
  }

  // ===== LIKE OPERATIONS =====

  /**
   * Like post
   */
  async likePost(postId: string, userId: string): Promise<void> {
    if (!this.client) {
      // For local development, just log the operation
      console.log('Mock likePost:', { postId, userId });
      return;
    }

    const now = new Date().toISOString();
    const item: DynamoDBLikeItem = {
      PK: `POST#${postId}`,
      SK: `LIKE#${userId}`,
      GSI1PK: `POST#${postId}`,
      GSI1SK: `LIKE#${now}#${userId}`,
      GSI2PK: `USER#${userId}`,
      GSI2SK: `LIKE#${now}#${postId}`,
      postId,
      userId,
      createdAt: now,
      ttl: this.getTTL(),
    };

    const command = new PutCommand({
      TableName: this.tableName,
      Item: item,
    });

    await this.client.send(command);

    // Update post like count
    await this.updatePostLikeCount(postId, 1);
  }

  /**
   * Unlike post
   */
  async unlikePost(postId: string, userId: string): Promise<void> {
    if (!this.client) {
      // For local development, just log the operation
      console.log('Mock unlikePost:', { postId, userId });
      return;
    }

    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: {
        PK: `POST#${postId}`,
        SK: `LIKE#${userId}`,
      },
    });

    await this.client.send(command);

    // Update post like count
    await this.updatePostLikeCount(postId, -1);
  }

  /**
   * Check if user liked post
   */
  async isPostLiked(postId: string, userId: string): Promise<boolean> {
    if (!this.client) {
      // For local development, return false
      return false;
    }

    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: `POST#${postId}`,
        SK: `LIKE#${userId}`,
      },
    });

    const result = await this.client.send(command);
    return !!result.Item;
  }

  /**
   * Get post likes with pagination
   */
  async getPostLikes(
    postId: string,
    limit: number = 20,
    cursor?: string
  ): Promise<PaginatedData<LikeData>> {
    if (!this.client) {
      // Return mock data for local development
      const mockLikes: LikeData[] = [
        {
          userId: 'mock-user-1',
          displayName: 'Mock User 1',
          username: 'mockuser1',
          avatarUrl: 'https://example.com/avatar1.jpg',
          likedAt: new Date().toISOString(),
        },
      ];

      return {
        items: mockLikes.slice(0, limit),
        nextCursor: undefined,
        hasMore: false,
      };
    }

    const exclusiveStartKey = cursor ? this.decodeCursor(cursor) : undefined;

    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      ExpressionAttributeValues: {
        ':gsi1pk': `POST#${postId}`,
      },
      ScanIndexForward: false, // Sort by creation time descending
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey,
    });

    const result = await this.client.send(command);

    const items = (result.Items || []).map(item => {
      const likeItem = item as DynamoDBLikeItem;
      return {
        userId: likeItem.userId,
        displayName: '', // Will be populated by controller
        username: '', // Will be populated by controller
        avatarUrl: '', // Will be populated by controller
        likedAt: likeItem.createdAt,
      };
    });

    return {
      items,
      nextCursor: result.LastEvaluatedKey
        ? this.encodeCursor(result.LastEvaluatedKey)
        : undefined,
      hasMore: !!result.LastEvaluatedKey,
    };
  }

  // ===== FOLLOW OPERATIONS =====

  /**
   * Follow user
   */
  async followUser(followerId: string, followingId: string): Promise<void> {
    if (!this.client) {
      // For local development, check if already following
      const followKey = `${followerId}:${followingId}`;
      if (this.mockFollows.has(followKey)) {
        console.log('Mock followUser: Already following, skipping', {
          followerId,
          followingId,
        });
        return;
      }

      // Add to mock data
      this.mockFollows.add(followKey);
      console.log('Mock followUser:', { followerId, followingId });
      return;
    }

    const now = new Date().toISOString();
    const item: DynamoDBFollowItem = {
      PK: `USER#${followerId}`,
      SK: `FOLLOW#${followingId}`,
      GSI1PK: `USER#${followerId}`,
      GSI1SK: `FOLLOW#${now}#${followingId}`,
      GSI2PK: `USER#${followingId}`,
      GSI2SK: `FOLLOWER#${now}#${followerId}`,
      followerId,
      followingId,
      createdAt: now,
      ttl: this.getTTL(),
    };

    // Use ConditionalWrite to prevent duplicates
    const command = new PutCommand({
      TableName: this.tableName,
      Item: item,
      ConditionExpression:
        'attribute_not_exists(PK) AND attribute_not_exists(SK)',
    });

    try {
      await this.client.send(command);
      // Only update counts if the follow was successful (not a duplicate)
      await this.updateUserFollowCounts(followerId, followingId, 1);
    } catch (error: any) {
      // If it's a conditional check failure, the follow already exists
      if (error.name === 'ConditionalCheckFailedException') {
        console.log(
          'Follow relationship already exists, skipping count update'
        );
        return;
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Unfollow user
   */
  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    if (!this.client) {
      // For local development, check if following exists
      const followKey = `${followerId}:${followingId}`;
      if (!this.mockFollows.has(followKey)) {
        console.log('Mock unfollowUser: Not following, skipping', {
          followerId,
          followingId,
        });
        return;
      }

      // Remove from mock data
      this.mockFollows.delete(followKey);
      console.log('Mock unfollowUser:', { followerId, followingId });
      return;
    }

    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: {
        PK: `USER#${followerId}`,
        SK: `FOLLOW#${followingId}`,
      },
    });

    await this.client.send(command);

    // Update follower/following counts
    await this.updateUserFollowCounts(followerId, followingId, -1);
  }

  /**
   * Check if user is following another user
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    if (!this.client) {
      // For local development, check mock data
      const followKey = `${followerId}:${followingId}`;
      return this.mockFollows.has(followKey);
    }

    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: `USER#${followerId}`,
        SK: `FOLLOW#${followingId}`,
      },
    });

    const result = await this.client.send(command);
    return !!result.Item;
  }

  /**
   * Get user followers with pagination
   */
  async getUserFollowers(
    userId: string,
    limit: number = 20,
    cursor?: string
  ): Promise<PaginatedData<FollowData>> {
    if (!this.client) {
      // Return mock data for local development
      const mockFollowers: FollowData[] = [
        {
          userId: 'mock-follower-1',
          displayName: 'Mock Follower 1',
          username: 'mockfollower1',
          avatarUrl: 'https://example.com/avatar1.jpg',
          followedAt: new Date().toISOString(),
          isFollowingBack: false,
        },
      ];

      return {
        items: mockFollowers.slice(0, limit),
        nextCursor: undefined,
        hasMore: false,
      };
    }

    const exclusiveStartKey = cursor ? this.decodeCursor(cursor) : undefined;

    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :gsi2pk',
      ExpressionAttributeValues: {
        ':gsi2pk': `USER#${userId}`,
      },
      ScanIndexForward: false, // Sort by creation time descending
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey,
    });

    const result = await this.client.send(command);

    const items = (result.Items || []).map(item => {
      const followItem = item as DynamoDBFollowItem;
      return {
        userId: followItem.followerId,
        displayName: '', // Will be populated by controller
        username: '', // Will be populated by controller
        avatarUrl: '', // Will be populated by controller
        bio: '', // Will be populated by controller
        isFollowingBack: false, // Will be populated by controller
        followedAt: followItem.createdAt,
      };
    });

    return {
      items,
      nextCursor: result.LastEvaluatedKey
        ? this.encodeCursor(result.LastEvaluatedKey)
        : undefined,
      hasMore: !!result.LastEvaluatedKey,
    };
  }

  /**
   * Get user following with pagination
   */
  async getUserFollowing(
    userId: string,
    limit: number = 20,
    cursor?: string
  ): Promise<PaginatedData<FollowData>> {
    if (!this.client) {
      // Return mock data for local development
      const mockFollowing: FollowData[] = [
        {
          userId: 'mock-following-1',
          displayName: 'Mock Following 1',
          username: 'mockfollowing1',
          avatarUrl: 'https://example.com/avatar1.jpg',
          followedAt: new Date().toISOString(),
          isFollowingBack: false,
        },
      ];

      return {
        items: mockFollowing.slice(0, limit),
        nextCursor: undefined,
        hasMore: false,
      };
    }

    const exclusiveStartKey = cursor ? this.decodeCursor(cursor) : undefined;

    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      ExpressionAttributeValues: {
        ':gsi1pk': `USER#${userId}`,
      },
      ScanIndexForward: false, // Sort by creation time descending
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey,
    });

    const result = await this.client.send(command);

    const items = (result.Items || []).map(item => {
      const followItem = item as DynamoDBFollowItem;
      return {
        userId: followItem.followingId,
        displayName: '', // Will be populated by controller
        username: '', // Will be populated by controller
        avatarUrl: '', // Will be populated by controller
        bio: '', // Will be populated by controller
        isFollowingBack: false, // Will be populated by controller
        followedAt: followItem.createdAt,
      };
    });

    return {
      items,
      nextCursor: result.LastEvaluatedKey
        ? this.encodeCursor(result.LastEvaluatedKey)
        : undefined,
      hasMore: !!result.LastEvaluatedKey,
    };
  }

  // ===== HELPER METHODS =====

  /**
   * Update post comment count
   */
  private async updatePostCommentCount(
    postId: string,
    delta: number
  ): Promise<void> {
    if (!this.client) {
      // For local development, just log the operation
      console.log('Mock updatePostCommentCount:', { postId, delta });
      return;
    }

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: `POST#${postId}`,
        SK: 'META',
      },
      UpdateExpression: 'ADD commentCount :delta',
      ExpressionAttributeValues: {
        ':delta': delta,
      },
    });

    await this.client.send(command);
  }

  /**
   * Update post like count
   */
  private async updatePostLikeCount(
    postId: string,
    delta: number
  ): Promise<void> {
    if (!this.client) {
      // For local development, just log the operation
      console.log('Mock updatePostLikeCount:', { postId, delta });
      return;
    }

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: `POST#${postId}`,
        SK: 'META',
      },
      UpdateExpression: 'ADD likeCount :delta',
      ExpressionAttributeValues: {
        ':delta': delta,
      },
    });

    await this.client.send(command);
  }

  /**
   * Get post like count (AppView pattern)
   *
   * @description Calculates the number of likes for a post by querying like items.
   * This follows the AT Protocol AppView pattern where aggregated data is computed
   * rather than stored directly in the repository.
   *
   * @param postUri - Post AT URI
   * @returns Promise resolving to like count
   */
  private async getPostLikeCount(postUri: string): Promise<number> {
    if (!this.client) {
      return 0;
    }

    try {
      // Extract rkey from URI
      const rkey = extractRkeyFromUri(postUri);
      if (!rkey) return 0;

      // Query likes for this post
      // Note: This uses the old LIKE structure. In AT Protocol, likes would be
      // stored differently, but for now we use the existing structure.
      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `POST#${rkey}`, // Simplified: use rkey as postId for now
          ':sk': 'LIKE#',
        },
        Select: 'COUNT',
      });

      const result = await this.client.send(command);
      return result.Count || 0;
    } catch (error) {
      console.error('Error getting post like count:', error);
      return 0;
    }
  }

  /**
   * Get post comment count (AppView pattern)
   *
   * @description Calculates the number of comments (reply posts) for a post by querying
   * reply posts using GSI13. This follows the AT Protocol AppView pattern where
   * aggregated data is computed rather than stored directly in the repository.
   *
   * @param postUri - Post AT URI
   * @returns Promise resolving to comment count
   */
  private async getPostCommentCount(postUri: string): Promise<number> {
    if (!this.client) {
      return 0;
    }

    try {
      // Query reply posts for this post using GSI13
      // GSI13PK: REPLY#ROOT#{rootPostUri}
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI13',
        KeyConditionExpression: 'GSI13PK = :gsi13pk',
        ExpressionAttributeValues: {
          ':gsi13pk': `REPLY#ROOT#${postUri}`,
        },
        Select: 'COUNT',
      });

      const result = await this.client.send(command);
      return result.Count || 0;
    } catch (error) {
      console.error('Error getting post comment count:', error);
      return 0;
    }
  }

  /**
   * Update user follow counts
   */
  private async updateUserFollowCounts(
    followerId: string,
    followingId: string,
    delta: number
  ): Promise<void> {
    if (!this.client) {
      // For local development, just log the operation
      console.log('Mock updateUserFollowCounts:', {
        followerId,
        followingId,
        delta,
      });
      return;
    }

    // Update follower's following count
    await this.client.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `USER#${followerId}`,
          SK: 'PROFILE',
        },
        UpdateExpression: 'ADD followingCount :delta',
        ExpressionAttributeValues: {
          ':delta': delta,
        },
      })
    );

    // Update following user's follower count
    await this.client.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `USER#${followingId}`,
          SK: 'PROFILE',
        },
        UpdateExpression: 'ADD followerCount :delta',
        ExpressionAttributeValues: {
          ':delta': delta,
        },
      })
    );
  }

  /**
   * Search users by username or display name
   */
  async searchUsers(
    query: string,
    limit: number = 20,
    cursor?: string,
    currentUserId?: string
  ): Promise<{
    success: boolean;
    data?: PaginatedData<SearchUserData>;
    error?: string;
  }> {
    try {
      if (!this.client) {
        // Return mock data for local development
        const mockUsers: SearchUserData[] = [
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
            followerCount: 300,
            followingCount: 150,
            createdAt: '2024-01-01T00:00:00.000Z',
            email: 'jane.smith@example.com',
            walletAddress: '0xabcdef1234567890',
            postCount: 78,
            updatedAt: '2024-01-01T00:00:00.000Z',
            isFollowing: true,
          },
        ];

        // Filter mock data based on query
        const filteredUsers = mockUsers.filter(
          user =>
            user.handle.toLowerCase().includes(query.toLowerCase()) ||
            user.displayName.toLowerCase().includes(query.toLowerCase())
        );

        return {
          success: true,
          data: {
            items: filteredUsers.slice(0, limit),
            hasMore: false,
            nextCursor: undefined,
          },
        };
      }

      // Use Scan with FilterExpression for partial matching
      // Since DynamoDB Query only supports exact match on HASH key,
      // we'll use Scan with FilterExpression for partial matching on username, displayName, and email
      // Note: GSI Query is only useful for exact matches, so we use Scan for partial matching
      const normalizedQuery = query.toLowerCase().trim();
      const exclusiveStartKey = cursor ? this.decodeCursor(cursor) : undefined;

      // Use Scan with FilterExpression for partial matching
      // We search username, displayName, email, handle, and primaryEmail for backward compatibility
      // Note: We use contains() which is case-sensitive, so we normalize the query to lowercase
      // and ensure DynamoDB items also store lowercase values for searchable fields
      // Also filter out deleted accounts at the DynamoDB level for better performance
      const scanCommand = new ScanCommand({
        TableName: this.tableName,
        FilterExpression:
          'begins_with(PK, :userPrefix) AND SK = :profile AND ' +
          '(attribute_not_exists(accountStatus) OR accountStatus <> :deleted) AND (' +
          'contains(displayName, :query) OR ' +
          'contains(handle, :query) OR ' +
          '(attribute_exists(username) AND contains(username, :query)) OR ' +
          '(attribute_exists(email) AND contains(email, :query)) OR ' +
          '(attribute_exists(primaryEmail) AND contains(primaryEmail, :query))' +
          ')',
        ExpressionAttributeValues: {
          ':userPrefix': 'USER#',
          ':profile': 'PROFILE',
          ':deleted': 'deleted',
          ':query': normalizedQuery,
        },
        Limit: limit * 10, // Get more items to filter by emailVerified, accountStatus, and domain
        ExclusiveStartKey: exclusiveStartKey,
      });

      const scanResult = await this.client.send(scanCommand);

      // Process results
      const allItems: DynamoDBUserProfileItem[] = [];
      if (scanResult.Items) {
        for (const item of scanResult.Items) {
          const userItem = item as DynamoDBUserProfileItem;
          if (userItem.SK === 'PROFILE') {
            allItems.push(userItem);
          }
        }
      }

      const users: SearchUserData[] = [];
      for (const userItem of allItems) {
        // Filter out deleted accounts
        // Deleted accounts should not appear in search results
        if (userItem.accountStatus === 'deleted') {
          continue;
        }

        // Filter out suspended accounts (optional - uncomment if needed)
        // if (userItem.accountStatus === 'suspended') {
        //   continue;
        // }

        // Get username (extract from handle if not set)
        const username =
          userItem.username || this.extractUsername(userItem.handle);

        // Filter by username (only username part, not domain)
        // If query matches domain part only (not username part), exclude it
        if (userItem.handle && userItem.handle.includes('.')) {
          const handleParts = userItem.handle.split('.');
          const usernamePart = handleParts[0]?.toLowerCase() || '';
          const domainPart = handleParts.slice(1).join('.').toLowerCase();

          // Check if query matches domain part but not username part
          const matchesDomain = domainPart.includes(normalizedQuery);
          const matchesUsername = usernamePart.includes(normalizedQuery);

          // If query matches domain part but not username part, skip this user
          if (matchesDomain && !matchesUsername) {
            continue;
          }
        }

        // Get email and wallet address from identity links
        const identityLinks = await this.queryIdentityLinks(
          userItem.primaryDid
        );
        const emailLink = identityLinks.find(
          link => link.linkedId.startsWith('email:') && link.email
        );

        // Filter out users with unverified email addresses
        // Only include users with verified email addresses in search results
        if (emailLink && emailLink.emailVerified === false) {
          // Skip users with unverified email addresses
          continue;
        }

        const email =
          emailLink?.email || userItem.email || userItem.primaryEmail || '';

        // Additional filtering: check if query matches username, displayName, or email
        const matchesUsername = username
          .toLowerCase()
          .includes(normalizedQuery);
        const matchesDisplayName = (userItem.displayName || '')
          .toLowerCase()
          .includes(normalizedQuery);
        const matchesEmail = email.toLowerCase().includes(normalizedQuery);

        if (!matchesUsername && !matchesDisplayName && !matchesEmail) {
          continue;
        }
        const walletLink = identityLinks.find(
          link =>
            (link.linkedId.startsWith('flow:') ||
              link.linkedId.startsWith('eip155:')) &&
            link.linkedId
        );
        const walletAddress = walletLink?.linkedId || '';

        // Check if current user is following this user
        let isFollowing = false;
        if (currentUserId && currentUserId !== userItem.primaryDid) {
          // TODO: Implement follow status check
          // For now, we'll set it to false
          isFollowing = false;
        }

        // Extract username from handle (remove domain part)
        const handleValue = userItem.handle || userItem.primaryDid;
        const extractedHandle = handleValue.includes('.')
          ? this.extractUsername(handleValue)
          : handleValue;

        users.push({
          did: userItem.primaryDid, // AT Protocol standard: did
          displayName: userItem.displayName, // AT Protocol standard
          handle: extractedHandle, // AT Protocol standard: handle (domain removed)
          description: userItem.bio || undefined, // AT Protocol standard: description (previously bio)
          avatar: userItem.avatarUrl || undefined, // AT Protocol standard: avatar (previously avatarUrl)
          banner: userItem.bannerUrl || undefined, // AT Protocol standard: banner (previously backgroundImageUrl)
          followerCount: userItem.followerCount, // AT Protocol standard
          followingCount: userItem.followingCount, // AT Protocol standard
          createdAt: userItem.createdAt, // AT Protocol standard
          // Custom extensions
          email,
          walletAddress,
          postCount: userItem.postCount,
          updatedAt: userItem.updatedAt,
          isFollowing,
        });
      }

      // Sort by handle for consistent results (AT Protocol standard: handle)
      users.sort((a, b) => a.handle.localeCompare(b.handle));

      // Limit results to requested limit
      const limitedUsers = users.slice(0, limit);

      // Determine next cursor (use scan result's LastEvaluatedKey)
      const nextCursor = scanResult.LastEvaluatedKey
        ? this.encodeCursor(scanResult.LastEvaluatedKey)
        : undefined;

      return {
        success: true,
        data: {
          items: limitedUsers,
          nextCursor,
          hasMore: !!scanResult.LastEvaluatedKey,
        },
      };
    } catch (error) {
      console.error('Error searching users:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to search users',
      };
    }
  }

  // ===== AT PROTOCOL USER PROFILE OPERATIONS =====

  /**
   * Create or update AT Protocol user profile
   *
   * @description Creates or updates a user profile using AT Protocol data model.
   *
   * @param primaryDid - User's primary DID
   * @param profile - Profile data
   */
  async createUserProfileItem(
    primaryDid: string,
    profile: Omit<
      DynamoDBUserProfileItem,
      'PK' | 'SK' | 'primaryDid' | 'createdAt' | 'updatedAt'
    >
  ): Promise<void> {
    if (!this.client) {
      console.log('Mock createUserProfileItem:', { primaryDid, profile });
      return;
    }

    // Extract username from handle if not provided
    const username =
      profile.username ||
      (profile.handle ? this.extractUsername(profile.handle) : undefined);

    // Set email from primaryEmail if not provided
    const email = profile.email || profile.primaryEmailNormalized || undefined;

    const item: Partial<DynamoDBUserProfileItem> = {
      PK: `USER#${primaryDid}`,
      SK: 'PROFILE',
      primaryDid,
      ...profile,
      ...(username && { username }),
      ...(email && { email }),
      // GSI keys for search
      ...(username && {
        GSI6PK: `USER_SEARCH#${username.toLowerCase()}`,
        GSI6SK: primaryDid,
      }),
      ...(profile.displayName && {
        GSI7PK: `USER_SEARCH#${profile.displayName.toLowerCase()}`,
        GSI7SK: primaryDid,
      }),
      ...(email && {
        GSI8PK: `USER_SEARCH#${email.toLowerCase()}`,
        GSI8SK: primaryDid,
      }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ttl: this.getTTL(),
    };

    const command = new PutCommand({
      TableName: this.tableName,
      Item: item as DynamoDBUserProfileItem,
    });

    await this.client.send(command);
  }

  /**
   * Get AT Protocol user profile
   *
   * @description Retrieves a user profile by primary DID.
   *
   * @param primaryDid - User's primary DID
   * @returns User profile or null if not found
   */
  async getUserProfileItem(
    primaryDid: string
  ): Promise<DynamoDBUserProfileItem | null> {
    if (!this.client) {
      console.log('Mock getUserProfileItem:', { primaryDid });
      return null;
    }

    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: `USER#${primaryDid}`,
        SK: 'PROFILE',
      },
    });

    const response = await this.client.send(command);
    return (response.Item as DynamoDBUserProfileItem) || null;
  }

  // ===== AT PROTOCOL IDENTITY LINK OPERATIONS =====

  /**
   * Create identity link
   *
   * @description Creates an identity link between primary DID and linked ID.
   *
   * @param primaryDid - User's primary DID
   * @param link - Identity link data
   */
  async createIdentityLink(
    primaryDid: string,
    link: Omit<
      DynamoDBIdentityLinkItem,
      'PK' | 'SK' | 'primaryDid' | 'createdAt'
    >
  ): Promise<void> {
    if (!this.client) {
      console.log('Mock createIdentityLink:', { primaryDid, link });
      return;
    }

    const item: DynamoDBIdentityLinkItem = {
      PK: `USER#${primaryDid}`,
      SK: `LINK#${link.linkedId}`,
      primaryDid,
      ...link,
      createdAt: new Date().toISOString(),
    };

    const command = new PutCommand({
      TableName: this.tableName,
      Item: item,
    });

    await this.client.send(command);
  }

  /**
   * Get identity link
   *
   * @description Retrieves an identity link by primary DID and linked ID.
   *
   * @param primaryDid - User's primary DID
   * @param linkedId - Linked ID
   * @returns Identity link or null if not found
   */
  async getIdentityLink(
    primaryDid: string,
    linkedId: string
  ): Promise<DynamoDBIdentityLinkItem | null> {
    if (!this.client) {
      console.log('Mock getIdentityLink:', { primaryDid, linkedId });
      return null;
    }

    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: `USER#${primaryDid}`,
        SK: `LINK#${linkedId}`,
      },
    });

    const response = await this.client.send(command);
    return (response.Item as DynamoDBIdentityLinkItem) || null;
  }

  /**
   * Update identity link
   *
   * @description Updates an existing identity link.
   *
   * @param primaryDid - User's primary DID
   * @param linkedId - Linked ID
   * @param updates - Fields to update
   */
  async updateIdentityLink(
    primaryDid: string,
    linkedId: string,
    updates: Partial<DynamoDBIdentityLinkItem>,
    removeFields?: string[]
  ): Promise<void> {
    if (!this.client) {
      console.log('Mock updateIdentityLink:', {
        primaryDid,
        linkedId,
        updates,
        removeFields,
      });
      return;
    }

    // Build update expression
    const setExpressions: string[] = [];
    const removeExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    // Handle SET expressions
    Object.keys(updates).forEach((key, index) => {
      if (key !== 'PK' && key !== 'SK' && key !== 'primaryDid') {
        const value = (updates as any)[key];
        // Skip undefined values
        if (value !== undefined) {
          const attrName = `#attr${index}`;
          const attrValue = `:val${index}`;
          setExpressions.push(`${attrName} = ${attrValue}`);
          expressionAttributeNames[attrName] = key;
          expressionAttributeValues[attrValue] = value;
        }
      }
    });

    // Handle REMOVE expressions
    if (removeFields && removeFields.length > 0) {
      removeFields.forEach((key, index) => {
        const attrName = `#remove${index}`;
        removeExpressions.push(attrName);
        expressionAttributeNames[attrName] = key;
      });
    }

    // Always update updatedAt
    if (setExpressions.length > 0 || removeExpressions.length > 0) {
      setExpressions.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();
    }

    // Build UpdateExpression
    const updateParts: string[] = [];
    if (setExpressions.length > 0) {
      updateParts.push(`SET ${setExpressions.join(', ')}`);
    }
    if (removeExpressions.length > 0) {
      updateParts.push(`REMOVE ${removeExpressions.join(', ')}`);
    }

    if (updateParts.length === 0) {
      // Nothing to update
      return;
    }

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: `USER#${primaryDid}`,
        SK: `LINK#${linkedId}`,
      },
      UpdateExpression: updateParts.join(' '),
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues:
        Object.keys(expressionAttributeValues).length > 0
          ? expressionAttributeValues
          : undefined,
    });

    await this.client.send(command);
  }

  // ===== AT PROTOCOL IDENTITY LOOKUP OPERATIONS =====

  /**
   * Create identity lookup
   *
   * @description Creates an identity lookup for reverse lookup from linked ID to primary DID.
   * Used for email lookup and other identity resolution.
   *
   * @param linkedId - Linked ID (e.g., email:alice@example.com)
   * @param lookup - Lookup data
   */
  async createIdentityLookup(
    linkedId: string,
    lookup: Omit<
      DynamoDBIdentityLookupItem,
      'PK' | 'SK' | 'linkedId' | 'createdAt'
    >
  ): Promise<void> {
    if (!this.client) {
      console.log('Mock createIdentityLookup:', { linkedId, lookup });
      return;
    }

    const item: DynamoDBIdentityLookupItem = {
      PK: `LINK#${linkedId}`,
      SK: 'PRIMARY',
      linkedId,
      ...lookup,
      createdAt: new Date().toISOString(),
    };

    const command = new PutCommand({
      TableName: this.tableName,
      Item: item,
      // Prevent duplicate emails
      ConditionExpression: 'attribute_not_exists(PK)',
    });

    try {
      await this.client.send(command);
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new Error('Email already registered');
      }
      throw error;
    }
  }

  /**
   * Get identity lookup
   *
   * @description Retrieves primary DID from linked ID.
   *
   * @param linkedId - Linked ID (e.g., email:alice@example.com)
   * @returns Identity lookup or null if not found
   */
  async getIdentityLookup(
    linkedId: string
  ): Promise<DynamoDBIdentityLookupItem | null> {
    if (!this.client) {
      console.log('Mock getIdentityLookup:', { linkedId });
      return null;
    }

    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: `LINK#${linkedId}`,
        SK: 'PRIMARY',
      },
    });

    const response = await this.client.send(command);
    return (response.Item as DynamoDBIdentityLookupItem) || null;
  }

  /**
   * Update identity lookup
   *
   * @description Updates an existing identity lookup with new primary DID.
   * Used when re-registering a deleted account with a new DID.
   *
   * @param linkedId - Linked ID (e.g., email:alice@example.com)
   * @param updates - Update data
   */
  async updateIdentityLookup(
    linkedId: string,
    updates: Partial<
      Omit<DynamoDBIdentityLookupItem, 'PK' | 'SK' | 'linkedId' | 'createdAt'>
    >
  ): Promise<void> {
    if (!this.client) {
      console.log('Mock updateIdentityLookup:', { linkedId, updates });
      return;
    }

    const updateParts: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value], index) => {
      const nameKey = `#${key}`;
      const valueKey = `:${key}${index}`;
      expressionAttributeNames[nameKey] = key;
      expressionAttributeValues[valueKey] = value;
      updateParts.push(`${nameKey} = ${valueKey}`);
    });

    if (updateParts.length === 0) {
      // Nothing to update
      return;
    }

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: `LINK#${linkedId}`,
        SK: 'PRIMARY',
      },
      UpdateExpression: `SET ${updateParts.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    });

    await this.client.send(command);
  }

  /**
   * Query identity links by primary DID
   *
   * @description Retrieves all identity links for a primary DID.
   *
   * @param primaryDid - User's primary DID
   * @returns Array of identity links
   */
  async queryIdentityLinks(
    primaryDid: string
  ): Promise<DynamoDBIdentityLinkItem[]> {
    if (!this.client) {
      console.log('Mock queryIdentityLinks:', { primaryDid });
      return [];
    }

    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${primaryDid}`,
        ':sk': 'LINK#',
      },
    });

    const response = await this.client.send(command);
    return (response.Items as DynamoDBIdentityLinkItem[]) || [];
  }
}
