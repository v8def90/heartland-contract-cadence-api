/**
 * SNS Users Controller
 *
 * @description Handles user profile management operations for SNS functionality
 * @author Heart Token API Team
 * @since 1.0.0
 */

import {
  Controller,
  Get,
  Post,
  Put,
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
import type { ApiResponse } from '../../models/responses';
import type {
  UserProfile,
  CreateUserProfileRequest,
  UpdateUserProfileRequest,
  PostListResponse,
  FollowListResponse,
} from '../../models/responses/SnsResponses';
import { SnsService } from '../../services/SnsService';

/**
 * User Profile Response
 */
export interface UserProfileResponse {
  success: true;
  data: UserProfile;
  timestamp: string;
}

/**
 * User Posts Response
 */
export interface UserPostsResponse {
  success: true;
  data: {
    items: any[];
    hasMore: boolean;
    nextCursor?: string;
    totalCount?: number;
  };
  timestamp: string;
}

/**
 * SNS Users Controller
 *
 * @description Manages user profiles and user-related operations for the SNS system.
 * Provides CRUD operations for user profiles and user-specific data retrieval.
 *
 * @example
 * ```typescript
 * const controller = new UsersController();
 * const profile = await controller.getUserProfile("user-123");
 * ```
 */
@Route('sns/users')
@Tags('SNS Users')
export class UsersController extends Controller {
  private snsService: SnsService;

  constructor() {
    super();
    this.snsService = new SnsService();
  }

  /**
   * Get user profile by DID
   *
   * @description Retrieves the complete user profile information for the specified DID.
   * This includes display name, username, bio, avatar, follower/following counts, and post count.
   *
   * @param did - The user's primary DID (did:plc:...)
   * @returns Promise resolving to user profile data
   *
   * @example did "did:plc:lld5wgybmddzz32guiotcpce"
   */
  @Get('{did}')
  @SuccessResponse('200', 'User profile retrieved successfully')
  @Response<ApiResponse>('404', 'User not found')
  @Response<ApiResponse>('500', 'Failed to retrieve user profile')
  @Example<UserProfileResponse>({
    success: true,
    data: {
      did: 'did:plc:lld5wgybmddzz32guiotcpce',
      displayName: 'John Doe',
      handle: 'johndoe',
      description: 'Software developer passionate about blockchain technology',
      avatar: 'https://example.com/avatar.jpg',
      banner: 'https://example.com/background.jpg',
      followerCount: 150,
      followingCount: 75,
      createdAt: '2024-01-01T00:00:00.000Z',
      email: 'john.doe@example.com',
      walletAddress: '0x1234567890abcdef',
      postCount: 42,
      updatedAt: '2024-01-15T10:30:00.000Z',
    },
    timestamp: '2024-01-15T10:30:00.000Z',
  })
  public async getUserProfile(
    @Path() did: string
  ): Promise<ApiResponse<UserProfile>> {
    try {
      // Validate did
      if (!did || did.trim().length === 0) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'INVALID_DID',
            message: 'DID is required',
            details: 'The did parameter cannot be empty',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Get user profile
      const profile = await this.snsService.getUserProfile(did);

      if (!profile) {
        this.setStatus(404);
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            details: `No user found with DID: ${did}`,
          },
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: true,
        data: profile,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error getting user profile:', error);
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve user profile',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Create user profile
   *
   * @description Creates a new user profile with the provided information.
   * This endpoint requires authentication and can only be called by the user themselves.
   * 
   * NOTE: If the user was registered via `/auth/register`, the profile is already created
   * during registration. This endpoint is for users who registered via other methods
   * (e.g., Blocto wallet, Flow wallet) and need to create their profile separately.
   *
   * @param did - The user's primary DID (did:plc:...)
   * @param request - User profile creation data
   * @returns Promise resolving to created user profile
   *
   * @security JWT authentication required
   */
  @Post('{did}')
  @Security('jwt')
  @SuccessResponse('201', 'User profile created successfully')
  @Response<ApiResponse>('400', 'Invalid profile data')
  @Response<ApiResponse>('401', 'Authentication required')
  @Response<ApiResponse>('409', 'User profile already exists')
  @Response<ApiResponse>('500', 'Failed to create user profile')
  @Example<UserProfileResponse>({
    success: true,
    data: {
      did: 'did:plc:lld5wgybmddzz32guiotcpce',
      displayName: 'John Doe',
      handle: 'johndoe',
      description: 'Software developer passionate about blockchain technology',
      avatar: 'https://example.com/avatar.jpg',
      banner: 'https://example.com/background.jpg',
      followerCount: 0,
      followingCount: 0,
      createdAt: '2024-01-15T10:30:00.000Z',
      email: 'john.doe@example.com',
      walletAddress: '0x1234567890abcdef',
      postCount: 0,
      updatedAt: '2024-01-15T10:30:00.000Z',
    },
    timestamp: '2024-01-15T10:30:00.000Z',
  })
  @Example<ApiResponse>({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Display name, username, email, and wallet address are required',
      details:
        'displayName, username, email, and walletAddress fields are mandatory',
    },
    timestamp: '2024-01-15T10:30:00.000Z',
  })
  public async createUserProfile(
    @Path() did: string,
    @Body() request: CreateUserProfileRequest,
    @Request() requestObj: any
  ): Promise<ApiResponse<UserProfile>> {
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
            details: 'Valid JWT token is required to create user profile',
          },
          timestamp: new Date().toISOString(),
        };
      }

      const authenticatedDid = user.id;

      // Validate did
      if (!did || did.trim().length === 0) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'INVALID_DID',
            message: 'DID is required',
            details: 'The did parameter cannot be empty',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Validate that authenticated user can only create their own profile
      if (authenticatedDid !== did) {
        this.setStatus(403);
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot create profile for another user',
            details: `You can only create your own profile. Authenticated user: ${authenticatedDid}, Requested user: ${did}`,
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Validate request data
      if (
        !request.displayName ||
        !request.username ||
        !request.email ||
        !request.walletAddress
      ) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message:
              'Display name, username, email, and wallet address are required',
            details:
              'displayName, username, email, and walletAddress fields are mandatory',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Check if user profile already exists
      const existingProfile = await this.snsService.getUserProfile(did);
      if (existingProfile) {
        this.setStatus(409);
        return {
          success: false,
          error: {
            code: 'PROFILE_EXISTS',
            message: 'User profile already exists',
            details: `Profile for user ${did} already exists. Use PUT /sns/users/${did} to update the profile.`,
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Create user profile (map request fields to AT Protocol Lexicon compliant UserProfile)
      const profileData: Omit<
        UserProfile,
        'did' | 'createdAt' | 'updatedAt'
      > = {
        displayName: request.displayName,
        handle: request.username, // Map username to handle (AT Protocol standard)
        description: request.bio, // Map bio to description (AT Protocol standard)
        avatar: request.avatarUrl, // Map avatarUrl to avatar (AT Protocol standard)
        banner: request.backgroundImageUrl, // Map backgroundImageUrl to banner (AT Protocol standard)
        email: request.email,
        walletAddress: request.walletAddress,
        followerCount: 0,
        followingCount: 0,
        postCount: 0,
      };

      await this.snsService.createUserProfile(did, profileData);

      // Get the created profile
      const createdProfile = await this.snsService.getUserProfile(did);
      if (!createdProfile) {
        this.setStatus(500);
        return {
          success: false,
          error: {
            code: 'CREATION_FAILED',
            message: 'Failed to retrieve created profile',
            details: 'Profile was created but could not be retrieved',
          },
          timestamp: new Date().toISOString(),
        };
      }

      this.setStatus(201);
      return {
        success: true,
        data: createdProfile,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error creating user profile:', error);
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create user profile',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Update user profile
   *
   * @description Updates an existing user profile with the provided information.
   * This endpoint requires authentication and can only be called by the user themselves.
   * 
   * NOTE: This endpoint is for updating an existing profile. If the profile does not exist,
   * use POST /sns/users/{did} to create it first.
   *
   * @param did - The user's primary DID (did:plc:...)
   * @param request - User profile update data
   * @returns Promise resolving to updated user profile
   *
   * @security JWT authentication required
   */
  @Put('{did}')
  @Security('jwt')
  @SuccessResponse('200', 'User profile updated successfully')
  @Response<ApiResponse>('400', 'Invalid profile data')
  @Response<ApiResponse>('401', 'Authentication required')
  @Response<ApiResponse>('404', 'User profile not found')
  @Response<ApiResponse>('500', 'Failed to update user profile')
  @Example<UserProfileResponse>({
    success: true,
    data: {
      did: 'did:plc:lld5wgybmddzz32guiotcpce',
      displayName: 'John Doe Updated',
      handle: 'johndoe',
      description: 'Senior Software developer passionate about blockchain technology',
      avatar: 'https://example.com/new-avatar.jpg',
      banner: 'https://example.com/new-background.jpg',
      followerCount: 150,
      followingCount: 75,
      createdAt: '2024-01-01T00:00:00.000Z',
      email: 'john.doe.updated@example.com',
      walletAddress: '0x1234567890abcdef',
      postCount: 42,
      updatedAt: '2024-01-15T11:00:00.000Z',
    },
    timestamp: '2024-01-15T11:00:00.000Z',
  })
  public async updateUserProfile(
    @Path() did: string,
    @Body() request: UpdateUserProfileRequest,
    @Request() requestObj: any
  ): Promise<ApiResponse<UserProfile>> {
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
            details: 'Valid JWT token is required to update user profile',
          },
          timestamp: new Date().toISOString(),
        };
      }

      const authenticatedDid = user.id;

      // Validate did
      if (!did || did.trim().length === 0) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'INVALID_DID',
            message: 'DID is required',
            details: 'The did parameter cannot be empty',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Validate that authenticated user can only update their own profile
      if (authenticatedDid !== did) {
        this.setStatus(403);
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot update profile for another user',
            details: `You can only update your own profile. Authenticated user: ${authenticatedDid}, Requested user: ${did}`,
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Check if user profile exists
      const existingProfile = await this.snsService.getUserProfile(did);
      if (!existingProfile) {
        this.setStatus(404);
        return {
          success: false,
          error: {
            code: 'PROFILE_NOT_FOUND',
            message: 'User profile not found',
            details: `No profile found for user ${did}. Use POST /sns/users/${did} to create the profile first.`,
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Validate that at least one field is provided for update
      if (
        !request.displayName &&
        !request.username &&
        !request.bio &&
        !request.avatarUrl &&
        !request.backgroundImageUrl &&
        !request.email &&
        !request.walletAddress
      ) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'At least one field must be provided for update',
            details:
              'At least one of displayName, username, bio, avatarUrl, backgroundImageUrl, email, or walletAddress must be provided',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Update user profile (map request fields to AT Protocol Lexicon compliant UserProfile)
      const updateData: Partial<
        Omit<UserProfile, 'did' | 'createdAt' | 'updatedAt'>
      > = {};
      if (request.displayName !== undefined)
        updateData.displayName = request.displayName;
      if (request.username !== undefined)
        updateData.handle = request.username; // Map username to handle (AT Protocol standard)
      if (request.bio !== undefined)
        updateData.description = request.bio; // Map bio to description (AT Protocol standard)
      if (request.avatarUrl !== undefined)
        updateData.avatar = request.avatarUrl; // Map avatarUrl to avatar (AT Protocol standard)
      if (request.backgroundImageUrl !== undefined)
        updateData.banner = request.backgroundImageUrl; // Map backgroundImageUrl to banner (AT Protocol standard)
      if (request.email !== undefined) updateData.email = request.email;
      if (request.walletAddress !== undefined)
        updateData.walletAddress = request.walletAddress;

      await this.snsService.updateUserProfile(did, updateData);

      // Get the updated profile
      const updatedProfile = await this.snsService.getUserProfile(did);
      if (!updatedProfile) {
        this.setStatus(500);
        return {
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: 'Failed to retrieve updated profile',
            details: 'Profile was updated but could not be retrieved',
          },
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: true,
        data: updatedProfile,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error updating user profile:', error);
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update user profile',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Delete user profile
   *
   * @description Deletes the user profile and marks associated data as deleted.
   * This endpoint requires authentication and can only be called by the user themselves.
   * 
   * NOTE: This performs a soft delete (logical delete) rather than a hard delete.
   * The profile is marked as deleted, but related data (posts, comments, likes, follows)
   * may be anonymized or kept for data integrity, depending on the implementation.
   * 
   * WARNING: This action is irreversible and will delete all user data.
   *
   * @param did - The user's primary DID (did:plc:...)
   * @returns Promise resolving to deletion confirmation
   *
   * @security JWT authentication required
   */
  @Delete('{did}')
  @Security('jwt')
  @SuccessResponse('200', 'User profile deleted successfully')
  @Response<ApiResponse>('401', 'Authentication required')
  @Response<ApiResponse>('404', 'User profile not found')
  @Response<ApiResponse>('500', 'Failed to delete user profile')
  @Example<ApiResponse<null>>({
    success: true,
    data: null,
    timestamp: '2024-01-15T11:30:00.000Z',
  })
  public async deleteUserProfile(
    @Path() did: string,
    @Request() requestObj: any
  ): Promise<ApiResponse<null>> {
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
            details: 'Valid JWT token is required to delete user profile',
          },
          timestamp: new Date().toISOString(),
        };
      }

      const authenticatedDid = user.id;

      // Validate did
      if (!did || did.trim().length === 0) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'INVALID_DID',
            message: 'DID is required',
            details: 'The did parameter cannot be empty',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Validate that authenticated user can only delete their own profile
      if (authenticatedDid !== did) {
        this.setStatus(403);
        return {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot delete profile for another user',
            details: `You can only delete your own profile. Authenticated user: ${authenticatedDid}, Requested user: ${did}`,
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Check if user profile exists
      const existingProfile = await this.snsService.getUserProfile(did);
      if (!existingProfile) {
        this.setStatus(404);
        return {
          success: false,
          error: {
            code: 'PROFILE_NOT_FOUND',
            message: 'User profile not found',
            details: `No profile found for user ${did}`,
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Delete user profile (soft delete - marks as deleted but keeps related data)
      await this.snsService.deleteUserProfile(did);

      return {
        success: true,
        data: null,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error deleting user profile:', error);
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete user profile',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get user posts
   *
   * @description Retrieves posts created by the specified user with pagination.
   * This endpoint is public and does not require authentication.
   *
   * @param did - The user's primary DID (did:plc:...)
   * @param limit - Number of posts to return (max 50, default 20)
   * @param cursor - Pagination cursor for next page
   * @returns Promise resolving to paginated posts data
   *
   * @example did "did:plc:lld5wgybmddzz32guiotcpce"
   */
  @Get('{did}/posts')
  @SuccessResponse('200', 'User posts retrieved successfully')
  @Response<ApiResponse>('400', 'Invalid query parameters')
  @Response<ApiResponse>('404', 'User not found')
  @Response<ApiResponse>('500', 'Failed to retrieve user posts')
  @Example<PostListResponse>({
    success: true,
    data: {
      items: [
        {
          postId: 'post-123',
          authorId: 'user-123',
          authorName: 'John Doe',
          authorUsername: 'johndoe',
          content: 'Just finished a great workout! 💪',
          images: ['https://example.com/workout.jpg'],
          tags: ['fitness', 'motivation'],
          likeCount: 15,
          commentCount: 3,
          isLiked: false,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      hasMore: true,
      nextCursor:
        'eyJQSyI6IlVTRVIjdXNlci0xMjMiLCJTSyI6IlBPU1QjMjAyNC0wMS0wMVQwMDowMDowMC4wMDBaIiwicG9zdC0xMjMifQ==',
      totalCount: 42,
    },
    timestamp: '2024-01-15T10:30:00.000Z',
  })
  public async getUserPosts(
    @Path() did: string,
    @Query() limit: number = 20,
    @Query() cursor?: string
  ): Promise<PostListResponse> {
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

      // Check if user exists
      const user = await this.snsService.getUserProfile(did);
      if (!user) {
        this.setStatus(404);
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            details: `No user found with DID: ${did}`,
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Get user posts
      const result = await this.snsService.getUserPosts(did, limit, cursor);

      // Get author profiles for all posts
      const postsWithAuthorInfo: any[] = [];
      for (const post of result.items) {
        const userProfile = await this.snsService.getUserProfile(post.authorId);
        if (userProfile) {
          postsWithAuthorInfo.push({
            ...post,
            authorName: userProfile.displayName,
            authorUsername: userProfile.handle, // AT Protocol standard: handle (previously username)
            // TODO: Check if current user liked this post
            isLiked: false, // This should come from JWT middleware
          });
        }
      }

      return {
        success: true,
        data: {
          items: postsWithAuthorInfo,
          hasMore: result.hasMore,
          nextCursor: result.nextCursor,
          totalCount: result.totalCount || 0,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error getting user posts:', error);
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve user posts',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }
}
