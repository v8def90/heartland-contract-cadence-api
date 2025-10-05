/**
 * S3 Service
 *
 * @description Service for S3 operations including presigned URL generation,
 * file upload, and file management for image processing
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import type { PresignedUrlData } from '../models/responses/UploadResponses';
import type { ImageType } from '../models/requests/UploadRequests';

export class S3Service {
  private client: S3Client | null;
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.S3_BUCKET_NAME || '';
    this.client =
      process.env.NODE_ENV === 'test'
        ? null
        : new S3Client({
            region: process.env.AWS_REGION || 'ap-northeast-1',
          });
  }

  /**
   * Generate presigned URL for image upload
   *
   * @param userId - User ID
   * @param imageType - Type of image (avatar or background)
   * @param fileType - File extension
   * @param contentType - MIME type
   * @returns Presigned URL data
   */
  async generatePresignedUrl(
    userId: string,
    imageType: ImageType,
    fileType: string,
    contentType: string
  ): Promise<PresignedUrlData> {
    if (!this.client) {
      // Mock response for local development
      return {
        uploadId: `mock-${uuidv4()}`,
        presignedUrl: 'https://mock-presigned-url.com',
        bucketName: this.bucketName,
        objectKey: `uploads/${userId}/${imageType}/${uuidv4()}.orig`,
        expiresAt: new Date(Date.now() + 300000).toISOString(),
        fields: {
          'Content-Type': contentType,
        },
      };
    }

    const uploadId = uuidv4();
    const objectKey = `uploads/${userId}/${imageType}/${uploadId}.orig`;
    const expiresIn = 300; // 5 minutes

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
      ContentType: contentType,
      Metadata: {
        userId,
        imageType,
        uploadId,
        originalFileType: fileType,
      },
    });

    const presignedUrl = await getSignedUrl(this.client, command, {
      expiresIn,
    });

    return {
      uploadId,
      presignedUrl,
      bucketName: this.bucketName,
      objectKey,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      fields: {
        'Content-Type': contentType,
      },
    };
  }

  /**
   * Delete file from S3
   *
   * @param objectKey - S3 object key
   */
  async deleteFile(objectKey: string): Promise<void> {
    if (!this.client) {
      console.log('Mock deleteFile:', { objectKey });
      return;
    }

    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
    });

    await this.client.send(command);
  }

  /**
   * Get file from S3
   *
   * @param objectKey - S3 object key
   * @returns File stream
   */
  async getFile(objectKey: string): Promise<NodeJS.ReadableStream | null> {
    if (!this.client) {
      console.log('Mock getFile:', { objectKey });
      return null;
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey,
      });

      const response = await this.client.send(command);
      return response.Body as NodeJS.ReadableStream;
    } catch (error) {
      console.error('Error getting file from S3:', error);
      return null;
    }
  }

  /**
   * Generate public URL for processed image
   *
   * @param userId - User ID
   * @param imageType - Type of image
   * @param version - Version string
   * @param size - Image size (small, medium, large)
   * @returns Public URL
   */
  generatePublicUrl(
    userId: string,
    imageType: ImageType,
    version: string,
    size: 'small' | 'medium' | 'large'
  ): string {
    const cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN;
    if (cloudfrontDomain) {
      return `https://${cloudfrontDomain}/public/users/${userId}/${imageType}/${version}@${size}.webp`;
    }

    // Fallback to S3 direct URL
    return `https://${this.bucketName}.s3.ap-northeast-1.amazonaws.com/public/users/${userId}/${imageType}/${version}@${size}.webp`;
  }

  /**
   * Generate default image URL
   *
   * @param imageType - Type of image
   * @returns Default image URL
   */
  generateDefaultUrl(imageType: ImageType): string {
    const cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN;
    if (cloudfrontDomain) {
      return `https://${cloudfrontDomain}/public/users/default/${imageType}/placeholder.svg`;
    }

    // Fallback to S3 direct URL
    return `https://${this.bucketName}.s3.ap-northeast-1.amazonaws.com/public/users/default/${imageType}/placeholder.svg`;
  }
}
