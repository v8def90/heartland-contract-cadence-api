/**
 * SNS Service Unit Tests
 *
 * @description Unit tests for SnsService DynamoDB operations
 * @author Heart Token API Team
 * @since 1.0.0
 */

import { SnsService } from '../../../src/services/SnsService';

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

const mockSend = jest.fn();

// Mock DynamoDBDocumentClient
jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn(() => ({
      send: mockSend,
    })),
  },
  PutCommand: jest.fn(),
  GetCommand: jest.fn(),
  QueryCommand: jest.fn(),
  UpdateCommand: jest.fn(),
  DeleteCommand: jest.fn(),
  BatchWriteCommand: jest.fn(),
}));

describe('SnsService', () => {
  let snsService: SnsService;

  beforeEach(() => {
    jest.clearAllMocks();
    snsService = new SnsService();
    process.env.SNS_TABLE_NAME = 'test-sns-table';
  });

  describe('User Operations', () => {
    it('should create user profile', async () => {
      mockSend.mockResolvedValueOnce({});

      await snsService.createUserProfile('user-123', {
        displayName: 'John Doe',
        username: 'johndoe',
        bio: 'Software developer',
        avatarUrl: 'https://example.com/avatar.jpg',
        followerCount: 0,
        followingCount: 0,
        postCount: 0,
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-sns-table',
            Item: expect.objectContaining({
              PK: 'USER#user-123',
              SK: 'PROFILE',
              userId: 'user-123',
              displayName: 'John Doe',
              username: 'johndoe',
            }),
          }),
        })
      );
    });

    it('should get user profile', async () => {
      const mockUser = {
        PK: 'USER#user-123',
        SK: 'PROFILE',
        userId: 'user-123',
        displayName: 'John Doe',
        username: 'johndoe',
        bio: 'Software developer',
        avatarUrl: 'https://example.com/avatar.jpg',
        followerCount: 10,
        followingCount: 5,
        postCount: 3,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockSend.mockResolvedValueOnce({ Item: mockUser });

      const result = await snsService.getUserProfile('user-123');

      expect(result).toEqual({
        userId: 'user-123',
        displayName: 'John Doe',
        username: 'johndoe',
        bio: 'Software developer',
        avatarUrl: 'https://example.com/avatar.jpg',
        followerCount: 10,
        followingCount: 5,
        postCount: 3,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
    });

    it('should return null for non-existent user', async () => {
      mockSend.mockResolvedValueOnce({});

      const result = await snsService.getUserProfile('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('Post Operations', () => {
    it('should create post', async () => {
      mockSend.mockResolvedValueOnce({});

      await snsService.createPost(
        'post-123',
        'user-456',
        'John Doe',
        'johndoe',
        'Hello, world!',
        ['https://example.com/image.jpg'],
        ['hello', 'world']
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-sns-table',
            Item: expect.objectContaining({
              PK: 'POST#post-123',
              SK: 'META',
              postId: 'post-123',
              authorId: 'user-456',
              content: 'Hello, world!',
              images: ['https://example.com/image.jpg'],
              tags: ['hello', 'world'],
              likeCount: 0,
              commentCount: 0,
            }),
          }),
        })
      );
    });

    it('should get post', async () => {
      const mockPost = {
        PK: 'POST#post-123',
        SK: 'META',
        postId: 'post-123',
        authorId: 'user-456',
        content: 'Hello, world!',
        images: ['https://example.com/image.jpg'],
        tags: ['hello', 'world'],
        likeCount: 5,
        commentCount: 2,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockSend.mockResolvedValueOnce({ Item: mockPost });

      const result = await snsService.getPost('post-123');

      expect(result).toEqual({
        postId: 'post-123',
        authorId: 'user-456',
        authorName: '',
        authorUsername: '',
        content: 'Hello, world!',
        images: ['https://example.com/image.jpg'],
        tags: ['hello', 'world'],
        likeCount: 5,
        commentCount: 2,
        isLiked: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
    });

    it('should get user posts with pagination', async () => {
      const mockPosts = [
        {
          PK: 'POST#post-123',
          SK: 'META',
          GSI1PK: 'USER#user-456',
          GSI1SK: 'POST#2024-01-01T00:00:00.000Z#post-123',
          postId: 'post-123',
          authorId: 'user-456',
          content: 'Hello, world!',
          likeCount: 5,
          commentCount: 2,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockSend.mockResolvedValueOnce({
        Items: mockPosts,
        LastEvaluatedKey: {
          PK: 'USER#user-456',
          SK: 'POST#2024-01-01T00:00:00.000Z#post-123',
        },
      });

      const result = await snsService.getUserPosts('user-456', 20);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.postId).toBe('post-123');
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBeDefined();
    });
  });

  describe('Comment Operations', () => {
    it('should create comment', async () => {
      mockSend.mockResolvedValueOnce({}); // For comment creation
      mockSend.mockResolvedValueOnce({}); // For post comment count update

      await snsService.createComment(
        'comment-123',
        'post-456',
        'user-789',
        'Great post!'
      );

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-sns-table',
            Item: expect.objectContaining({
              PK: 'POST#post-456',
              SK: 'COMMENT#comment-123',
              commentId: 'comment-123',
              postId: 'post-456',
              authorId: 'user-789',
              content: 'Great post!',
              likeCount: 0,
            }),
          }),
        })
      );
    });

    it('should get post comments with pagination', async () => {
      const mockComments = [
        {
          PK: 'POST#post-456',
          SK: 'COMMENT#comment-123',
          GSI1PK: 'POST#post-456',
          GSI1SK: 'COMMENT#2024-01-01T00:00:00.000Z#comment-123',
          commentId: 'comment-123',
          postId: 'post-456',
          authorId: 'user-789',
          content: 'Great post!',
          likeCount: 3,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockSend.mockResolvedValueOnce({
        Items: mockComments,
        LastEvaluatedKey: {
          PK: 'POST#post-456',
          SK: 'COMMENT#2024-01-01T00:00:00.000Z#comment-123',
        },
      });

      const result = await snsService.getPostComments('post-456', 20);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.commentId).toBe('comment-123');
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBeDefined();
    });
  });

  describe('Like Operations', () => {
    it('should like post', async () => {
      mockSend.mockResolvedValueOnce({}); // For like creation
      mockSend.mockResolvedValueOnce({}); // For post like count update

      await snsService.likePost('post-123', 'user-456');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-sns-table',
            Item: expect.objectContaining({
              PK: 'POST#post-123',
              SK: 'LIKE#user-456',
              postId: 'post-123',
              userId: 'user-456',
            }),
          }),
        })
      );
    });

    it('should check if post is liked', async () => {
      mockSend.mockResolvedValueOnce({
        Item: { PK: 'POST#post-123', SK: 'LIKE#user-456' },
      });

      const result = await snsService.isPostLiked('post-123', 'user-456');

      expect(result).toBe(true);
    });

    it('should return false for non-liked post', async () => {
      mockSend.mockResolvedValueOnce({});

      const result = await snsService.isPostLiked('post-123', 'user-456');

      expect(result).toBe(false);
    });
  });

  describe('Follow Operations', () => {
    it('should follow user', async () => {
      mockSend.mockResolvedValueOnce({}); // For follow creation
      mockSend.mockResolvedValueOnce({}); // For follower count update
      mockSend.mockResolvedValueOnce({}); // For following count update

      await snsService.followUser('user-123', 'user-456');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-sns-table',
            Item: expect.objectContaining({
              PK: 'USER#user-123',
              SK: 'FOLLOW#user-456',
              followerId: 'user-123',
              followingId: 'user-456',
            }),
          }),
        })
      );
    });

    it('should check if user is following', async () => {
      mockSend.mockResolvedValueOnce({
        Item: { PK: 'USER#user-123', SK: 'FOLLOW#user-456' },
      });

      const result = await snsService.isFollowing('user-123', 'user-456');

      expect(result).toBe(true);
    });

    it('should return false for non-following relationship', async () => {
      mockSend.mockResolvedValueOnce({});

      const result = await snsService.isFollowing('user-123', 'user-456');

      expect(result).toBe(false);
    });
  });

  describe('Pagination', () => {
    it('should encode and decode cursor correctly', async () => {
      const testData = { PK: 'USER#user-123', SK: 'PROFILE' };

      // Test encoding
      const encoded = Buffer.from(JSON.stringify(testData)).toString('base64');

      // Test decoding through getUserPosts
      mockSend.mockResolvedValueOnce({ Items: [] });

      await snsService.getUserPosts('user-123', 20, encoded);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            ExclusiveStartKey: testData,
          }),
        })
      );
    });
  });
});
