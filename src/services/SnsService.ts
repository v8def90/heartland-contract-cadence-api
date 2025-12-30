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
  emailLoginEnabled?: boolean;
  authProviders?: {
    emailPassword?: boolean;
    atproto?: boolean;
    eip155?: boolean;
    flow?: boolean;
  };
  accountStatus?: 'active' | 'suspended' | 'deleted';
  suspendedAt?: string;
  deletedAt?: string;
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
   */
  async createUserProfile(
    userId: string,
    profile: Omit<UserProfile, 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    if (!this.client) {
      // For local development, just log the operation
      console.log('Mock createUserProfile:', { userId, profile });
      return;
    }

    const item: DynamoDBUserItem = {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
      GSI1PK: `USER#${userId}`,
      GSI1SK: 'PROFILE',
      userId,
      ...profile,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ttl: this.getTTL(),
    };

    const command = new PutCommand({
      TableName: this.tableName,
      Item: item,
    });

    await this.client.send(command);
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    if (!this.client) {
      // Return mock data for local development
      return {
        userId,
        displayName: 'Mock User',
        username: 'mockuser',
        bio: 'This is a mock user for local development',
        avatarUrl: 'https://example.com/avatar.jpg',
        backgroundImageUrl: 'https://example.com/background.jpg',
        email: 'mock@example.com',
        walletAddress: '0x1234567890abcdef',
        followerCount: 0,
        followingCount: 0,
        postCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PROFILE',
      },
    });

    const result = await this.client.send(command);
    if (!result.Item) return null;

    const item = result.Item as DynamoDBUserItem;
    return {
      userId: item.userId,
      displayName: item.displayName,
      username: item.username,
      bio: item.bio,
      avatarUrl: item.avatarUrl,
      backgroundImageUrl: item.backgroundImageUrl,
      email: item.email || '',
      walletAddress: item.walletAddress || '',
      followerCount: item.followerCount,
      followingCount: item.followingCount,
      postCount: item.postCount,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    userId: string,
    updates: Partial<Omit<UserProfile, 'userId' | 'createdAt' | 'updatedAt'>>
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

    // Build update expression dynamically
    if (updates.displayName !== undefined) {
      updateExpression.push('#displayName = :displayName');
      expressionAttributeNames['#displayName'] = 'displayName';
      expressionAttributeValues[':displayName'] = updates.displayName;
    }
    if (updates.username !== undefined) {
      updateExpression.push('#username = :username');
      expressionAttributeNames['#username'] = 'username';
      expressionAttributeValues[':username'] = updates.username;
    }
    if (updates.bio !== undefined) {
      updateExpression.push('#bio = :bio');
      expressionAttributeNames['#bio'] = 'bio';
      expressionAttributeValues[':bio'] = updates.bio;
    }
    if (updates.avatarUrl !== undefined) {
      updateExpression.push('#avatarUrl = :avatarUrl');
      expressionAttributeNames['#avatarUrl'] = 'avatarUrl';
      expressionAttributeValues[':avatarUrl'] = updates.avatarUrl;
    }
    if (updates.backgroundImageUrl !== undefined) {
      updateExpression.push('#backgroundImageUrl = :backgroundImageUrl');
      expressionAttributeNames['#backgroundImageUrl'] = 'backgroundImageUrl';
      expressionAttributeValues[':backgroundImageUrl'] =
        updates.backgroundImageUrl;
    }
    if (updates.email !== undefined) {
      updateExpression.push('#email = :email');
      expressionAttributeNames['#email'] = 'email';
      expressionAttributeValues[':email'] = updates.email;
    }
    if (updates.walletAddress !== undefined) {
      updateExpression.push('#walletAddress = :walletAddress');
      expressionAttributeNames['#walletAddress'] = 'walletAddress';
      expressionAttributeValues[':walletAddress'] = updates.walletAddress;
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
    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = now;

    if (updateExpression.length === 0) {
      return; // No updates to perform
    }

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

  /**
   * Delete user profile
   */
  async deleteUserProfile(userId: string): Promise<void> {
    if (!this.client) {
      // For local development, just log the operation
      console.log('Mock deleteUserProfile:', { userId });
      return;
    }

    // Delete the user profile
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PROFILE',
      },
    });

    await this.client.send(command);
  }

  // ===== POST OPERATIONS =====

  /**
   * Create post
   */
  async createPost(
    postId: string,
    authorId: string,
    authorName: string,
    authorUsername: string,
    content: string,
    images?: string[],
    tags?: string[]
  ): Promise<void> {
    if (!this.client) {
      // For local development, just log the operation
      console.log('Mock createPost:', {
        postId,
        authorId,
        authorName,
        authorUsername,
        content,
        images,
        tags,
      });
      return;
    }

    const now = new Date().toISOString();
    const item: DynamoDBPostItem = {
      PK: `POST#${postId}`,
      SK: 'META',
      GSI1PK: `USER#${authorId}`,
      GSI1SK: `POST#${now}#${postId}`,
      GSI2PK: `POST#${postId}`,
      GSI2SK: 'META',
      postId,
      authorId,
      authorName,
      authorUsername,
      content,
      images,
      tags,
      likeCount: 0,
      commentCount: 0,
      createdAt: now,
      updatedAt: now,
      ttl: this.getTTL(),
    };

    const command = new PutCommand({
      TableName: this.tableName,
      Item: item,
    });

    await this.client.send(command);
  }

  /**
   * Get post by ID
   */
  async getPost(postId: string): Promise<PostData | null> {
    if (!this.client) {
      // Return mock data for local development
      return {
        postId,
        authorId: 'mock-author',
        authorName: 'Mock Author',
        authorUsername: 'mockauthor',
        content: 'This is a mock post for local development',
        images: [],
        tags: [],
        likeCount: 0,
        commentCount: 0,
        isLiked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: `POST#${postId}`,
        SK: 'META',
      },
    });

    const result = await this.client.send(command);
    if (!result.Item) return null;

    const item = result.Item as DynamoDBPostItem;
    return {
      postId: item.postId,
      authorId: item.authorId,
      authorName: '', // Will be populated by controller
      authorUsername: '', // Will be populated by controller
      content: item.content,
      images: item.images,
      tags: item.tags,
      likeCount: item.likeCount,
      commentCount: item.commentCount,
      isLiked: false, // Will be populated by controller
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  /**
   * Get all posts (global feed)
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
      // For local development, return mock data
      console.log('NODE_ENV:', process.env.NODE_ENV);
      console.log('AWS_REGION:', process.env.AWS_REGION);
      console.log(
        'Should use mock data:',
        process.env.NODE_ENV === 'development' || !process.env.AWS_REGION
      );
      console.log('Client is null:', this.client === null);
      if (
        this.client === null ||
        process.env.NODE_ENV === 'development' ||
        !process.env.AWS_REGION
      ) {
        const mockPosts: PostData[] = [
          {
            postId: 'post-1',
            authorId: 'user-1',
            authorName: 'John Doe',
            authorUsername: 'johndoe',
            content: 'Hello, world! This is a test post.',
            images: ['https://example.com/image1.jpg'],
            tags: ['hello', 'world', 'test'],
            likeCount: 5,
            commentCount: 2,
            isLiked: false,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
          {
            postId: 'post-2',
            authorId: 'user-2',
            authorName: 'Jane Smith',
            authorUsername: 'janesmith',
            content: 'Another test post for the SNS API.',
            images: [],
            tags: ['test', 'api'],
            likeCount: 3,
            commentCount: 1,
            isLiked: false,
            createdAt: '2024-01-01T01:00:00.000Z',
            updatedAt: '2024-01-01T01:00:00.000Z',
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

      // Use Scan to get all posts from the main table
      const command = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'begins_with(PK, :postPrefix) AND SK = :metaSuffix',
        ExpressionAttributeValues: {
          ':postPrefix': 'POST#',
          ':metaSuffix': 'META',
        },
        Limit: limit,
        ExclusiveStartKey: exclusiveStartKey,
      });

      const result = await this.client.send(command);

      const posts: PostData[] = [];
      if (result.Items) {
        for (const item of result.Items) {
          const postItem = item as DynamoDBPostItem;
          posts.push({
            postId: postItem.postId,
            authorId: postItem.authorId,
            authorName: postItem.authorName,
            authorUsername: postItem.authorUsername,
            content: postItem.content,
            images: postItem.images,
            tags: postItem.tags,
            likeCount: postItem.likeCount,
            commentCount: postItem.commentCount,
            isLiked: false, // TODO: Check if current user liked this post
            createdAt: postItem.createdAt,
            updatedAt: postItem.updatedAt,
          });
        }
      }

      // Sort posts by creation time descending (newest first)
      posts.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const nextCursor = result.LastEvaluatedKey
        ? this.encodeCursor(result.LastEvaluatedKey)
        : undefined;

      return {
        success: true,
        data: {
          items: posts,
          nextCursor,
          hasMore: !!result.LastEvaluatedKey,
          // totalCount is optional and not provided by DynamoDB efficiently
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
   * Get user posts with pagination
   */
  async getUserPosts(
    userId: string,
    limit: number = 20,
    cursor?: string
  ): Promise<PaginatedData<PostData>> {
    if (!this.client) {
      // Return mock data for local development
      const mockPosts: PostData[] = [
        {
          postId: 'mock-post-1',
          authorId: userId,
          authorName: 'Mock User',
          authorUsername: 'mockuser',
          content: 'This is a mock post for local development',
          images: [],
          tags: [],
          likeCount: 0,
          commentCount: 0,
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
      const postItem = item as DynamoDBPostItem;
      return {
        postId: postItem.postId,
        authorId: postItem.authorId,
        authorName: '', // Will be populated by controller
        authorUsername: '', // Will be populated by controller
        content: postItem.content,
        images: postItem.images,
        tags: postItem.tags,
        likeCount: postItem.likeCount,
        commentCount: postItem.commentCount,
        isLiked: false, // Will be populated by controller
        createdAt: postItem.createdAt,
        updatedAt: postItem.updatedAt,
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
   * Delete post
   */
  async deletePost(postId: string): Promise<void> {
    if (!this.client) {
      // For local development, just log the operation
      console.log('Mock deletePost:', { postId });
      return;
    }

    // First, get all related items (comments, likes)
    const commentsResult = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `POST#${postId}`,
          ':sk': 'COMMENT#',
        },
      })
    );

    const likesResult = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `POST#${postId}`,
          ':sk': 'LIKE#',
        },
      })
    );

    // Delete all related items
    const deleteRequests = [
      { DeleteRequest: { Key: { PK: `POST#${postId}`, SK: 'META' } } },
      ...(commentsResult.Items || []).map(item => ({
        DeleteRequest: { Key: { PK: item.PK, SK: item.SK } },
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

  // ===== COMMENT OPERATIONS =====

  /**
   * Create comment
   */
  async createComment(
    commentId: string,
    postId: string,
    authorId: string,
    content: string
  ): Promise<void> {
    if (!this.client) {
      // For local development, just log the operation
      console.log('Mock createComment:', {
        commentId,
        postId,
        authorId,
        content,
      });
      return;
    }

    const now = new Date().toISOString();
    const item: DynamoDBCommentItem = {
      PK: `POST#${postId}`,
      SK: `COMMENT#${commentId}`,
      GSI1PK: `POST#${postId}`,
      GSI1SK: `COMMENT#${now}#${commentId}`,
      GSI2PK: `USER#${authorId}`,
      GSI2SK: `COMMENT#${now}#${commentId}`,
      commentId,
      postId,
      authorId,
      content,
      likeCount: 0,
      createdAt: now,
      updatedAt: now,
      ttl: this.getTTL(),
    };

    const command = new PutCommand({
      TableName: this.tableName,
      Item: item,
    });

    await this.client.send(command);

    // Update post comment count
    await this.updatePostCommentCount(postId, 1);
  }

  /**
   * Get post comments with pagination
   */
  async getPostComments(
    postId: string,
    limit: number = 20,
    cursor?: string
  ): Promise<PaginatedData<CommentData>> {
    if (!this.client) {
      // Return mock data for local development
      const mockComments: CommentData[] = [
        {
          commentId: 'mock-comment-1',
          postId,
          authorId: 'mock-author',
          authorName: 'Mock Author',
          authorUsername: 'mockauthor',
          content: 'This is a mock comment for local development',
          likeCount: 0,
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
      const commentItem = item as DynamoDBCommentItem;
      return {
        commentId: commentItem.commentId,
        postId: commentItem.postId,
        authorId: commentItem.authorId,
        authorName: '', // Will be populated by controller
        authorUsername: '', // Will be populated by controller
        content: commentItem.content,
        likeCount: commentItem.likeCount,
        isLiked: false, // Will be populated by controller
        createdAt: commentItem.createdAt,
        updatedAt: commentItem.updatedAt,
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
   * Delete comment
   */
  async deleteComment(postId: string, commentId: string): Promise<void> {
    if (!this.client) {
      // For local development, just log the operation
      console.log('Mock deleteComment:', { postId, commentId });
      return;
    }

    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: {
        PK: `POST#${postId}`,
        SK: `COMMENT#${commentId}`,
      },
    });

    await this.client.send(command);

    // Update post comment count
    await this.updatePostCommentCount(postId, -1);
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
            userId: 'user-123',
            displayName: 'John Doe',
            username: 'johndoe',
            bio: 'Software developer',
            avatarUrl: 'https://example.com/avatar1.jpg',
            backgroundImageUrl: 'https://example.com/background1.jpg',
            email: 'john.doe@example.com',
            walletAddress: '0x1234567890abcdef',
            followerCount: 150,
            followingCount: 200,
            postCount: 45,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            isFollowing: false,
          },
          {
            userId: 'user-456',
            displayName: 'Jane Smith',
            username: 'janesmith',
            bio: 'Designer',
            avatarUrl: 'https://example.com/avatar2.jpg',
            backgroundImageUrl: 'https://example.com/background2.jpg',
            email: 'jane.smith@example.com',
            walletAddress: '0xabcdef1234567890',
            followerCount: 300,
            followingCount: 150,
            postCount: 78,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            isFollowing: true,
          },
        ];

        // Filter mock data based on query
        const filteredUsers = mockUsers.filter(
          user =>
            user.username.toLowerCase().includes(query.toLowerCase()) ||
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

      // Use Scan to search for users
      const exclusiveStartKey = cursor ? this.decodeCursor(cursor) : undefined;

      const command = new ScanCommand({
        TableName: this.tableName,
        FilterExpression:
          'begins_with(PK, :userPrefix) AND (contains(username, :query) OR contains(displayName, :query))',
        ExpressionAttributeValues: {
          ':userPrefix': 'USER#',
          ':query': query,
        },
        Limit: limit,
        ExclusiveStartKey: exclusiveStartKey,
      });

      const result = await this.client.send(command);

      const users: SearchUserData[] = [];
      if (result.Items) {
        for (const item of result.Items) {
          const userItem = item as DynamoDBUserItem;

          // Check if current user is following this user
          let isFollowing = false;
          if (currentUserId && currentUserId !== userItem.userId) {
            // TODO: Implement follow status check
            // For now, we'll set it to false
            isFollowing = false;
          }

          users.push({
            userId: userItem.userId,
            displayName: userItem.displayName,
            username: userItem.username,
            bio: userItem.bio || undefined,
            avatarUrl: userItem.avatarUrl || undefined,
            backgroundImageUrl: userItem.backgroundImageUrl || undefined,
            email: userItem.email || '',
            walletAddress: userItem.walletAddress || '',
            followerCount: userItem.followerCount,
            followingCount: userItem.followingCount,
            postCount: userItem.postCount,
            createdAt: userItem.createdAt,
            updatedAt: userItem.updatedAt,
            isFollowing,
          });
        }
      }

      // Sort by username for consistent results
      users.sort((a, b) => a.username.localeCompare(b.username));

      const nextCursor = result.LastEvaluatedKey
        ? this.encodeCursor(result.LastEvaluatedKey)
        : undefined;

      return {
        success: true,
        data: {
          items: users,
          nextCursor,
          hasMore: !!result.LastEvaluatedKey,
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

    const item: DynamoDBUserProfileItem = {
      PK: `USER#${primaryDid}`,
      SK: 'PROFILE',
      primaryDid,
      ...profile,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ttl: this.getTTL(),
    };

    const command = new PutCommand({
      TableName: this.tableName,
      Item: item,
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
    updates: Partial<DynamoDBIdentityLinkItem>
  ): Promise<void> {
    if (!this.client) {
      console.log('Mock updateIdentityLink:', { primaryDid, linkedId, updates });
      return;
    }

    // Build update expression
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.keys(updates).forEach((key, index) => {
      if (key !== 'PK' && key !== 'SK' && key !== 'primaryDid') {
        const attrName = `#attr${index}`;
        const attrValue = `:val${index}`;
        updateExpressions.push(`${attrName} = ${attrValue}`);
        expressionAttributeNames[attrName] = key;
        expressionAttributeValues[attrValue] = (updates as any)[key];
      }
    });

    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: `USER#${primaryDid}`,
        SK: `LINK#${linkedId}`,
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
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
