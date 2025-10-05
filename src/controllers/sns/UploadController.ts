/**
 * Upload Controller
 *
 * @description Handles image upload operations including presigned URL generation
 * and upload status tracking for avatar and background images
 */

import {
  Controller,
  Post,
  Get,
  Route,
  Security,
  Body,
  Path,
  Request,
  Tags,
  Example,
  SuccessResponse,
  Response,
} from 'tsoa';
import type { ApiResponse } from '../../models/responses/ApiResponse';
import type {
  PresignedUrlResponse,
  UploadStatusResponse,
  RateLimitError,
} from '../../models/responses/UploadResponses';
import type {
  PresignedUrlRequest,
  UploadStatusRequest,
  ImageType,
} from '../../models/requests/UploadRequests';
import {
  SUPPORTED_FILE_TYPES,
  MAX_FILE_SIZE,
} from '../../models/requests/UploadRequests';
import { S3Service } from '../../services/S3Service';
import { RateLimitService } from '../../services/RateLimitService';

/**
 * Upload Controller
 *
 * @description Handles image upload operations for user profiles
 * including presigned URL generation and upload status tracking
 */
@Route('sns/users')
@Tags('SNS Upload')
export class UploadController extends Controller {
  private s3Service: S3Service;
  private rateLimitService: RateLimitService;

  constructor() {
    super();
    this.s3Service = new S3Service();
    this.rateLimitService = new RateLimitService();
  }

  /**
   * Generate presigned URL for image upload
   *
   * @description Generates a presigned URL for direct S3 upload of user images.
   * Supports avatar and background images with rate limiting and validation.
   *
   * @param userId - User ID for the upload
   * @param imageType - Type of image (avatar or background)
   * @param request - Upload request containing file details
   * @param requestObj - Express request object for authentication
   * @returns Promise resolving to presigned URL data
   *
   * @example imageType "avatar"
   * @example request {"fileType": "png", "fileSize": 1048576, "contentType": "image/png"}
   */
  @Post('{userId}/upload/{imageType}')
  @Security('jwt')
  @SuccessResponse('200', 'Presigned URL generated successfully')
  @Response<ApiResponse>('400', 'Invalid request parameters')
  @Response<ApiResponse>('401', 'Authentication required')
  @Response<ApiResponse>('403', 'Not authorized to upload for this user')
  @Response<ApiResponse>('429', 'Rate limit exceeded')
  @Response<ApiResponse>('500', 'Failed to generate presigned URL')
  @Example<PresignedUrlResponse>({
    success: true,
    data: {
      uploadId: '550e8400-e29b-41d4-a716-446655440000',
      presignedUrl:
        'https://s3.amazonaws.com/bucket/uploads/user123/avatar/550e8400-e29b-41d4-a716-446655440000.orig?X-Amz-Algorithm=...',
      bucketName: 'heartland-api-v3-app-assets-dev-v5',
      objectKey:
        'uploads/user123/avatar/550e8400-e29b-41d4-a716-446655440000.orig',
      expiresAt: '2024-01-01T00:05:00.000Z',
      fields: {
        'Content-Type': 'image/png',
      },
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  @Example<ApiResponse>({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Invalid file type. Supported types: png, jpg, jpeg, svg, webp',
      details: 'fileType must be one of: png, jpg, jpeg, svg, webp',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  @Example<ApiResponse>({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Upload rate limit exceeded. Please try again later.',
      details: 'Maximum 10 uploads per hour allowed',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async generatePresignedUrl(
    @Path() userId: string,
    @Path() imageType: ImageType,
    @Body() request: PresignedUrlRequest,
    @Request() requestObj: any
  ): Promise<PresignedUrlResponse> {
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
            details: 'Valid JWT token is required for this operation',
          },
          timestamp: new Date().toISOString(),
        };
      }

      const authenticatedUserId = user.id;

      // Check authorization - users can only upload for themselves
      if (authenticatedUserId !== userId) {
        this.setStatus(403);
        return {
          success: false,
          error: {
            code: 'AUTHORIZATION_ERROR',
            message: 'Not authorized to upload for this user',
            details: 'Users can only upload images for their own account',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Validate image type
      if (!['avatar', 'background'].includes(imageType)) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid image type',
            details: 'imageType must be either "avatar" or "background"',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Validate file type
      if (
        !SUPPORTED_FILE_TYPES.includes(request.fileType.toLowerCase() as any)
      ) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid file type',
            details: `fileType must be one of: ${SUPPORTED_FILE_TYPES.join(', ')}`,
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Validate file size
      if (request.fileSize > MAX_FILE_SIZE) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'File size too large',
            details: `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Check rate limit
      const canUpload = await this.rateLimitService.canUpload(
        userId,
        imageType
      );
      if (!canUpload) {
        this.setStatus(429);
        const rateLimitError =
          await this.rateLimitService.getRateLimitError(userId);
        return {
          success: false,
          error: {
            code: rateLimitError.code,
            message: rateLimitError.message,
            details: `Rate limit exceeded. Retry after ${rateLimitError.retryAfter} seconds`,
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Generate presigned URL
      const presignedUrlData = await this.s3Service.generatePresignedUrl(
        userId,
        imageType,
        request.fileType,
        request.contentType
      );

      // Record upload attempt for rate limiting
      await this.rateLimitService.recordUpload(
        userId,
        imageType,
        presignedUrlData.uploadId
      );

      this.setStatus(200);
      return {
        success: true,
        data: presignedUrlData,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Generate presigned URL error:', error);
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to generate presigned URL',
          details:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get upload status
   *
   * @description Retrieves the current status of an image upload operation.
   * Useful for tracking upload progress and handling completion.
   *
   * @param userId - User ID
   * @param uploadId - Upload ID to check status for
   * @param requestObj - Express request object for authentication
   * @returns Promise resolving to upload status data
   *
   * @example uploadId "550e8400-e29b-41d4-a716-446655440000"
   */
  @Get('{userId}/upload/status/{uploadId}')
  @Security('jwt')
  @SuccessResponse('200', 'Upload status retrieved successfully')
  @Response<ApiResponse>('401', 'Authentication required')
  @Response<ApiResponse>('403', 'Not authorized to check status for this user')
  @Response<ApiResponse>('404', 'Upload not found')
  @Response<ApiResponse>('500', 'Failed to retrieve upload status')
  @Example<UploadStatusResponse>({
    success: true,
    data: {
      uploadId: '550e8400-e29b-41d4-a716-446655440000',
      status: 'processing',
      imageType: 'avatar',
      userId: 'user123',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:01:00.000Z',
      processedUrls: {
        small:
          'https://cdn.example.com/public/users/user123/avatar/v20240101_000000@small.webp',
        medium:
          'https://cdn.example.com/public/users/user123/avatar/v20240101_000000@medium.webp',
        large:
          'https://cdn.example.com/public/users/user123/avatar/v20240101_000000@large.webp',
      },
    },
    timestamp: '2024-01-01T00:01:00.000Z',
  })
  public async getUploadStatus(
    @Path() userId: string,
    @Path() uploadId: string,
    @Request() requestObj: any
  ): Promise<UploadStatusResponse> {
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
            details: 'Valid JWT token is required for this operation',
          },
          timestamp: new Date().toISOString(),
        };
      }

      const authenticatedUserId = user.id;

      // Check authorization - users can only check their own uploads
      if (authenticatedUserId !== userId) {
        this.setStatus(403);
        return {
          success: false,
          error: {
            code: 'AUTHORIZATION_ERROR',
            message: 'Not authorized to check status for this user',
            details: 'Users can only check upload status for their own account',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // TODO: Implement upload status retrieval from DynamoDB
      // For now, return a mock response
      this.setStatus(200);
      return {
        success: true,
        data: {
          uploadId,
          status: 'pending',
          imageType: 'avatar',
          userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Get upload status error:', error);
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve upload status',
          details:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }
}
