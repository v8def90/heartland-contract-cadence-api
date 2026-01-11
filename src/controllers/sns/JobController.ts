/**
 * Job Tracking Controller
 *
 * @description Handles job tracking and status management endpoints
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Route,
  Path,
  Body,
  Query,
  Request,
  Tags,
  Example,
  SuccessResponse,
  Response,
} from 'tsoa';
import type { ApiResponse } from '../../models/responses/ApiResponse';
import type {
  JobResponse,
  JobListResponse,
  JobCreateRequest,
  JobUpdateRequest,
  JobData,
  JobListData,
} from '../../models/responses/JobResponses';
import { JobService } from '../../services/JobService';

@Route('sns/jobs')
@Tags('SNS - Job Tracking')
export class JobController extends Controller {
  private jobService: JobService;

  constructor() {
    super();
    this.jobService = new JobService();
  }

  /**
   * Create a new job
   *
   * @description Creates a new job for tracking asynchronous operations such as image uploads.
   * The userId in the request must be the user's primary DID (did:plc:...).
   *
   * @param request - Job creation request containing userId (primaryDid), jobType, and metadata
   * @param requestObj - Express request object for authentication
   * @returns Promise resolving to created job data
   */
  @Post()
  @SuccessResponse(201, 'Job created successfully')
  @Response<ApiResponse>('400', 'Invalid request data')
  @Response<ApiResponse>('401', 'Authentication required')
  @Response<ApiResponse>('403', 'Not authorized to create job for this user')
  @Response<ApiResponse>('500', 'Failed to create job')
  @Example<JobResponse>({
    success: true,
    data: {
      jobId: '550e8400-e29b-41d4-a716-446655440000',
      userId: 'user-123',
      jobType: 'image_upload',
      status: 'pending',
      progress: 0,
      metadata: {
        imageType: 'avatar',
        uploadId: 'upload-123',
        originalFileName: 'avatar.png',
        fileSize: 1024000,
        contentType: 'image/png',
      },
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      expiresAt: '2024-01-02T00:00:00.000Z',
    },
    timestamp: '2024-01-01T00:00:00.000Z',
  })
  public async createJob(
    @Body() request: JobCreateRequest,
    @Request() requestObj: any
  ): Promise<JobResponse> {
    try {
      // Extract primaryDid from JWT token
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

      const authenticatedPrimaryDid = user.id; // JWT payloadのsubフィールドにprimaryDidが含まれる

      // Check authorization - users can only create jobs for themselves
      // request.userIdはprimaryDid（did:plc:...形式）である必要がある
      if (authenticatedPrimaryDid !== request.userId) {
        this.setStatus(403);
        return {
          success: false,
          error: {
            code: 'AUTHORIZATION_ERROR',
            message: 'Not authorized to create job for this user',
            details: 'Users can only create jobs for their own account',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Validate request data
      if (!request.userId || !request.jobType) {
        this.setStatus(400);
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: 'userId and jobType are required',
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Create job
      const jobData = await this.jobService.createJob(request);

      this.setStatus(201);
      return {
        success: true,
        data: jobData,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('Create job error:', error);
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create job',
          details: error.message || 'Unknown error occurred',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get job by ID
   *
   * @description Retrieves a job by its unique identifier.
   * This endpoint does not require authentication as job IDs are UUIDs.
   *
   * @param jobId - Unique job identifier (UUID)
   * @returns Promise resolving to job data
   */
  @Get('{jobId}')
  @SuccessResponse(200, 'Job retrieved successfully')
  @Response<ApiResponse>('404', 'Job not found')
  @Response<ApiResponse>('500', 'Failed to retrieve job')
  @Example<JobResponse>({
    success: true,
    data: {
      jobId: '550e8400-e29b-41d4-a716-446655440000',
      userId: 'user-123',
      jobType: 'image_upload',
      status: 'completed',
      progress: 100,
      message: 'Image processing completed successfully',
      metadata: {
        imageType: 'avatar',
        uploadId: 'upload-123',
        originalFileName: 'avatar.png',
        fileSize: 1024000,
        contentType: 'image/png',
        processedSizes: ['small', 'medium', 'large'],
        imageUrls: {
          small: 'https://example.com/avatar-small.webp',
          medium: 'https://example.com/avatar-medium.webp',
          large: 'https://example.com/avatar-large.webp',
        },
      },
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:05:00.000Z',
      completedAt: '2024-01-01T00:05:00.000Z',
      expiresAt: '2024-01-02T00:00:00.000Z',
    },
    timestamp: '2024-01-01T00:05:00.000Z',
  })
  public async getJob(@Path() jobId: string): Promise<JobResponse> {
    try {
      const job = await this.jobService.getJob(jobId);

      if (!job) {
        this.setStatus(404);
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Job not found',
            details: `Job with ID ${jobId} does not exist`,
          },
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: true,
        data: job,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('Get job error:', error);
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve job',
          details: error.message || 'Unknown error occurred',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Update job status
   *
   * @description Updates the status and progress of a job.
   * Typically used by background workers to update job progress.
   *
   * @param jobId - Unique job identifier (UUID)
   * @param request - Job update request containing status, progress, and optional message/error
   * @returns Promise resolving to updated job data
   */
  @Put('{jobId}')
  @SuccessResponse(200, 'Job updated successfully')
  @Response<ApiResponse>('404', 'Job not found')
  @Response<ApiResponse>('500', 'Failed to update job')
  @Example<JobResponse>({
    success: true,
    data: {
      jobId: '550e8400-e29b-41d4-a716-446655440000',
      userId: 'user-123',
      jobType: 'image_upload',
      status: 'processing',
      progress: 50,
      message: 'Image processing in progress',
      metadata: {
        imageType: 'avatar',
        uploadId: 'upload-123',
      },
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:02:30.000Z',
      expiresAt: '2024-01-02T00:00:00.000Z',
    },
    timestamp: '2024-01-01T00:02:30.000Z',
  })
  public async updateJob(
    @Path() jobId: string,
    @Body() request: JobUpdateRequest
  ): Promise<JobResponse> {
    try {
      const job = await this.jobService.updateJob(jobId, request);

      if (!job) {
        this.setStatus(404);
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Job not found',
            details: `Job with ID ${jobId} does not exist`,
          },
          timestamp: new Date().toISOString(),
        };
      }

      return {
        success: true,
        data: job,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('Update job error:', error);
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update job',
          details: error.message || 'Unknown error occurred',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get user's jobs
   *
   * @description Retrieves a list of jobs for a specific user.
   * Supports filtering by jobType and status, with pagination support.
   *
   * @param did - User's primary DID (did:plc:...)
   * @param requestObj - Express request object for authentication
   * @param jobType - Optional filter by job type
   * @param status - Optional filter by job status
   * @param limit - Number of jobs to return (default: 20)
   * @param cursor - Pagination cursor for next page
   * @returns Promise resolving to paginated job list
   */
  @Get('user/{did}')
  @SuccessResponse(200, 'User jobs retrieved successfully')
  @Response<ApiResponse>('400', 'Invalid request parameters')
  @Response<ApiResponse>('401', 'Authentication required')
  @Response<ApiResponse>('403', 'Not authorized to view jobs for this user')
  @Response<ApiResponse>('500', 'Failed to retrieve user jobs')
  @Example<JobListResponse>({
    success: true,
    data: {
      items: [
        {
          jobId: '550e8400-e29b-41d4-a716-446655440000',
          userId: 'user-123',
          jobType: 'image_upload',
          status: 'completed',
          progress: 100,
          metadata: { imageType: 'avatar' },
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:05:00.000Z',
          completedAt: '2024-01-01T00:05:00.000Z',
          expiresAt: '2024-01-02T00:00:00.000Z',
        },
      ],
      nextCursor: undefined,
      hasMore: false,
      totalCount: 1,
    },
    timestamp: '2024-01-01T00:05:00.000Z',
  })
  public async getUserJobs(
    @Path() did: string,
    @Request() requestObj: any,
    @Query() jobType?: string,
    @Query() status?: string,
    @Query() limit?: number,
    @Query() cursor?: string
  ): Promise<JobListResponse> {
    try {
      // Extract primaryDid from JWT token
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

      const authenticatedPrimaryDid = user.id; // JWT payloadのsubフィールドにprimaryDidが含まれる

      // Check authorization - users can only view their own jobs
      // didパラメータはprimaryDid（did:plc:...形式）である必要がある
      if (authenticatedPrimaryDid !== did) {
        this.setStatus(403);
        return {
          success: false,
          error: {
            code: 'AUTHORIZATION_ERROR',
            message: 'Not authorized to view jobs for this user',
            details: 'Users can only view their own jobs',
          },
          timestamp: new Date().toISOString(),
        };
      }

      const result = await this.jobService.getUserJobs(did, {
        jobType: jobType || undefined,
        status: status || undefined,
        limit: limit || 20,
        cursor: cursor || undefined,
      });

      return {
        success: true,
        data: {
          items: result.items,
          nextCursor: result.nextCursor,
          hasMore: result.hasMore,
          totalCount: result.items.length,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('Get user jobs error:', error);
      this.setStatus(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve user jobs',
          details: error.message || 'Unknown error occurred',
        },
        timestamp: new Date().toISOString(),
      };
    }
  }
}
