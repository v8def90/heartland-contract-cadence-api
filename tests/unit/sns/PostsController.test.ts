/**
 * SNS Posts Controller Unit Tests
 *
 * @description Unit tests for PostsController
 * @author Heart Token API Team
 * @since 1.0.0
 */

import { PostsController } from '../../../src/controllers/sns/PostsController';
import { SnsService } from '../../../src/services/SnsService';

// Mock SnsService
jest.mock('../../../src/services/SnsService');
const MockedSnsService = SnsService as jest.MockedClass<typeof SnsService>;

describe('PostsController', () => {
  let postsController: PostsController;
  let mockSnsService: jest.Mocked<SnsService>;

  beforeEach(() => {
    jest.clearAllMocks();
    postsController = new PostsController();
    mockSnsService = new MockedSnsService() as jest.Mocked<SnsService>;
    (postsController as any).snsService = mockSnsService;
  });

  describe('createPost', () => {
    it('should create post successfully', async () => {
      const mockUserProfile = {
        userId: 'user-123',
        displayName: 'John Doe',
        username: 'johndoe',
        bio: 'Software developer',
        avatarUrl: 'https://example.com/avatar.jpg',
        followerCount: 0,
        followingCount: 0,
        postCount: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const mockPost = {
        postId: 'post-123',
        authorId: 'user-123',
        authorName: '',
        authorUsername: '',
        content: 'Hello, world!',
        images: ['https://example.com/image.jpg'],
        tags: ['hello', 'world'],
        likeCount: 0,
        commentCount: 0,
        isLiked: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockSnsService.createPost.mockResolvedValueOnce(undefined);
      mockSnsService.getUserProfile.mockResolvedValueOnce(mockUserProfile);
      mockSnsService.getPost.mockResolvedValueOnce(mockPost);

      const request = {
        content: 'Hello, world!',
        images: ['https://example.com/image.jpg'],
        tags: ['hello', 'world'],
      };

      const result = await postsController.createPost(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          ...mockPost,
          authorName: 'John Doe',
          authorUsername: 'johndoe',
        });
      }
      expect(mockSnsService.createPost).toHaveBeenCalledWith(
        expect.stringMatching(/^post-/),
        'temp-user-id',
        'Hello, world!',
        ['https://example.com/image.jpg'],
        ['hello', 'world']
      );
    });

    it('should return error for content too long', async () => {
      const longContent = 'a'.repeat(1001);
      const request = { content: longContent };

      const result = await postsController.createPost(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error?.code).toBe('CONTENT_TOO_LONG');
      }
    });

    it('should return error when user profile not found', async () => {
      mockSnsService.createPost.mockResolvedValueOnce(undefined);
      mockSnsService.getUserProfile.mockResolvedValueOnce(null);

      const request = { content: 'Hello, world!' };

      const result = await postsController.createPost(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error?.code).toBe('USER_NOT_FOUND');
      }
    });

    it('should return error when post creation fails', async () => {
      const mockUserProfile = {
        userId: 'user-123',
        displayName: 'John Doe',
        username: 'johndoe',
        bio: 'Software developer',
        avatarUrl: 'https://example.com/avatar.jpg',
        followerCount: 0,
        followingCount: 0,
        postCount: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockSnsService.createPost.mockResolvedValueOnce(undefined);
      mockSnsService.getUserProfile.mockResolvedValueOnce(mockUserProfile);
      mockSnsService.getPost.mockResolvedValueOnce(null);

      const request = { content: 'Hello, world!' };

      const result = await postsController.createPost(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error?.code).toBe('POST_CREATION_FAILED');
      }
    });
  });

  describe('getPost', () => {
    it('should get post successfully', async () => {
      const mockPost = {
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
      };

      const mockUserProfile = {
        userId: 'user-456',
        displayName: 'Jane Smith',
        username: 'janesmith',
        bio: 'Designer',
        avatarUrl: 'https://example.com/avatar2.jpg',
        followerCount: 10,
        followingCount: 5,
        postCount: 3,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockSnsService.getPost.mockResolvedValueOnce(mockPost);
      mockSnsService.getUserProfile.mockResolvedValueOnce(mockUserProfile);

      const result = await postsController.getPost('post-123');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          ...mockPost,
          authorName: 'Jane Smith',
          authorUsername: 'janesmith',
        });
      }
    });

    it('should return error for non-existent post', async () => {
      mockSnsService.getPost.mockResolvedValueOnce(null);

      const result = await postsController.getPost('non-existent');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error?.code).toBe('POST_NOT_FOUND');
      }
    });

    it('should return error when author profile not found', async () => {
      const mockPost = {
        postId: 'post-123',
        authorId: 'user-456',
        authorName: '',
        authorUsername: '',
        content: 'Hello, world!',
        likeCount: 5,
        commentCount: 2,
        isLiked: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockSnsService.getPost.mockResolvedValueOnce(mockPost);
      mockSnsService.getUserProfile.mockResolvedValueOnce(null);

      const result = await postsController.getPost('post-123');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error?.code).toBe('AUTHOR_NOT_FOUND');
      }
    });
  });

  describe('deletePost', () => {
    it('should delete post successfully', async () => {
      const mockPost = {
        postId: 'post-123',
        authorId: 'temp-user-id',
        authorName: '',
        authorUsername: '',
        content: 'Hello, world!',
        likeCount: 5,
        commentCount: 2,
        isLiked: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockSnsService.getPost.mockResolvedValueOnce(mockPost);
      mockSnsService.deletePost.mockResolvedValueOnce(undefined);

      const result = await postsController.deletePost('post-123');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
      expect(mockSnsService.deletePost).toHaveBeenCalledWith('post-123');
    });

    it('should return error for non-existent post', async () => {
      mockSnsService.getPost.mockResolvedValueOnce(null);

      const result = await postsController.deletePost('non-existent');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error?.code).toBe('POST_NOT_FOUND');
      }
    });

    it('should return error for unauthorized deletion', async () => {
      const mockPost = {
        postId: 'post-123',
        authorId: 'different-user-id',
        authorName: '',
        authorUsername: '',
        content: 'Hello, world!',
        likeCount: 5,
        commentCount: 2,
        isLiked: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockSnsService.getPost.mockResolvedValueOnce(mockPost);

      const result = await postsController.deletePost('post-123');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error?.code).toBe('UNAUTHORIZED');
      }
    });
  });

  describe('getUserPosts', () => {
    it('should get user posts successfully', async () => {
      const mockPosts = [
        {
          postId: 'post-123',
          authorId: 'user-456',
          authorName: '',
          authorUsername: '',
          content: 'Hello, world!',
          likeCount: 5,
          commentCount: 2,
          isLiked: false,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      const mockUserProfile = {
        userId: 'user-456',
        displayName: 'Jane Smith',
        username: 'janesmith',
        bio: 'Designer',
        avatarUrl: 'https://example.com/avatar2.jpg',
        followerCount: 10,
        followingCount: 5,
        postCount: 3,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockSnsService.getUserPosts.mockResolvedValueOnce({
        items: mockPosts,
        nextCursor: 'encoded-cursor',
        hasMore: true,
      });
      mockSnsService.getUserProfile.mockResolvedValueOnce(mockUserProfile);

      const result = await postsController.getUserPosts('user-456', 20);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.items).toHaveLength(1);
        expect(result.data.items[0]).toEqual({
          ...mockPosts[0],
          authorName: 'Jane Smith',
          authorUsername: 'janesmith',
        });
        expect(result.data.hasMore).toBe(true);
        expect(result.data.nextCursor).toBe('encoded-cursor');
      }
    });

    it('should return error for invalid limit', async () => {
      const result = await postsController.getUserPosts('user-456', 100);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error?.code).toBe('INVALID_LIMIT');
      }
    });
  });
});
