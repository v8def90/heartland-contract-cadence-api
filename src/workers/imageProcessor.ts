/**
 * Image Processor Worker
 *
 * @description Lambda function for processing uploaded images
 * Handles image resizing, compression, format conversion, and metadata processing
 */

import { S3Event, S3EventRecord } from 'aws-lambda';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { JobService } from '../services/JobService';

interface ImageMetadata {
  userId: string;
  imageType: 'avatar' | 'background';
  uploadId: string;
  originalFileType: string;
}

interface ProcessedImage {
  size: 'small' | 'medium' | 'large';
  width: number;
  height: number;
  buffer: Buffer;
  key: string;
}

export const handler = async (event: S3Event): Promise<void> => {
  console.log('Image processor event:', JSON.stringify(event, null, 2));

  const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-northeast-1',
  });
  const dynamoClient = DynamoDBDocumentClient.from(
    new DynamoDBClient({
      region: process.env.AWS_REGION || 'ap-northeast-1',
    })
  );
  const jobService = new JobService();

  const bucketName = process.env.S3_BUCKET_NAME || '';
  const tableName = process.env.SNS_TABLE_NAME || '';

  for (const record of event.Records) {
    let jobId: string | null = null;
    try {
      // Create job for tracking
      const metadata = await getImageMetadata(
        s3Client,
        bucketName,
        record.s3.object.key
      );
      if (metadata) {
        const job = await jobService.createJob({
          userId: metadata.userId,
          jobType: 'image_processing',
          metadata: {
            imageType: metadata.imageType,
            uploadId: metadata.uploadId,
            originalFileName: metadata.originalFileType,
          },
        });
        jobId = job.jobId;

        // Update job status to processing
        await jobService.updateJob(jobId, {
          status: 'processing',
          progress: 10,
          message: 'Starting image processing',
        });
      }

      await processImage(
        record,
        s3Client,
        dynamoClient,
        bucketName,
        tableName,
        jobService,
        jobId
      );
    } catch (error) {
      console.error('Error processing image:', error);

      // Update job status to failed if job exists
      if (jobId) {
        try {
          await jobService.updateJob(jobId, {
            status: 'failed',
            progress: 0,
            error:
              error instanceof Error ? error.message : 'Unknown error occurred',
          });
        } catch (jobError) {
          console.error('Error updating job status:', jobError);
        }
      }

      // Continue processing other images even if one fails
    }
  }
};

async function processImage(
  record: S3EventRecord,
  s3Client: S3Client,
  dynamoClient: DynamoDBDocumentClient,
  bucketName: string,
  tableName: string,
  jobService: JobService,
  jobId: string | null
): Promise<void> {
  const objectKey = record.s3.object.key;
  console.log('Processing image:', objectKey);

  // Extract metadata from S3 object
  const metadata = await getImageMetadata(s3Client, bucketName, objectKey);
  if (!metadata) {
    console.error('Failed to extract metadata from object:', objectKey);
    return;
  }

  console.log('Image metadata:', metadata);

  // Download original image
  const originalImage = await downloadImage(s3Client, bucketName, objectKey);
  if (!originalImage) {
    console.error('Failed to download image:', objectKey);
    return;
  }

  // Update job progress
  if (jobId) {
    await jobService.updateJob(jobId, {
      status: 'processing',
      progress: 30,
      message: 'Processing image with Sharp',
    });
  }

  // Process image with Sharp
  const processedImages = await processImageWithSharp(originalImage, metadata);

  // Update job progress
  if (jobId) {
    await jobService.updateJob(jobId, {
      status: 'processing',
      progress: 60,
      message: 'Uploading processed images',
    });
  }

  // Upload processed images to S3
  const version = generateVersion();
  const uploadedUrls = await uploadProcessedImages(
    s3Client,
    bucketName,
    processedImages,
    metadata,
    version
  );

  // Update job progress
  if (jobId) {
    await jobService.updateJob(jobId, {
      status: 'processing',
      progress: 80,
      message: 'Updating user profile',
    });
  }

  // Update user profile with new image URLs
  await updateUserProfile(dynamoClient, tableName, metadata, uploadedUrls);

  // Delete original uploaded file
  await deleteOriginalFile(s3Client, bucketName, objectKey);

  // Update job to completed
  if (jobId) {
    await jobService.updateJob(jobId, {
      status: 'completed',
      progress: 100,
      message: 'Image processing completed successfully',
      metadata: {
        imageType: metadata.imageType,
        uploadId: metadata.uploadId,
        originalFileName: metadata.originalFileType,
        processedSizes: Object.keys(uploadedUrls),
        imageUrls: uploadedUrls,
      },
    });
  }

  console.log('Image processing completed:', {
    uploadId: metadata.uploadId,
    userId: metadata.userId,
    imageType: metadata.imageType,
    uploadedUrls,
    jobId,
  });
}

async function getImageMetadata(
  s3Client: S3Client,
  bucketName: string,
  objectKey: string
): Promise<ImageMetadata | null> {
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    });

    const response = await s3Client.send(command);
    const metadata = response.Metadata;

    if (!metadata) {
      return null;
    }

    return {
      userId: metadata.userid || '',
      imageType: (metadata.imagetype as 'avatar' | 'background') || 'avatar',
      uploadId: metadata.uploadid || '',
      originalFileType: metadata.originalfiletype || 'png',
    };
  } catch (error) {
    console.error('Error getting image metadata:', error);
    return null;
  }
}

async function downloadImage(
  s3Client: S3Client,
  bucketName: string,
  objectKey: string
): Promise<Buffer | null> {
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    });

    const response = await s3Client.send(command);
    const chunks: Uint8Array[] = [];

    if (response.Body) {
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }
    }

    return Buffer.concat(chunks);
  } catch (error) {
    console.error('Error downloading image:', error);
    return null;
  }
}

async function processImageWithSharp(
  imageBuffer: Buffer,
  metadata: ImageMetadata
): Promise<ProcessedImage[]> {
  const processedImages: ProcessedImage[] = [];

  try {
    // Validate image format
    const imageInfo = await sharp(imageBuffer).metadata();
    console.log('Original image info:', imageInfo);

    // Check file size (max 10MB)
    if (imageBuffer.length > 10 * 1024 * 1024) {
      throw new Error('Image size exceeds 10MB limit');
    }

    // Check dimensions
    if (!imageInfo.width || !imageInfo.height) {
      throw new Error('Invalid image dimensions');
    }

    // Process based on image type
    const sizes = getImageSizes(metadata.imageType);
    const version = generateVersion();

    for (const sizeConfig of sizes) {
      const processedBuffer = await sharp(imageBuffer)
        .resize(sizeConfig.width, sizeConfig.height, {
          fit: 'cover',
          position: 'center',
        })
        .withMetadata({}) // Remove EXIF data
        .toFormat('webp', {
          quality: 80,
          effort: 6,
        })
        .toBuffer();

      processedImages.push({
        size: sizeConfig.size,
        width: sizeConfig.width,
        height: sizeConfig.height,
        buffer: processedBuffer,
        key: `public/users/${metadata.userId}/${metadata.imageType}/${version}@${sizeConfig.size}.webp`,
      });
    }

    return processedImages;
  } catch (error) {
    console.error('Error processing image with Sharp:', error);
    throw error;
  }
}

function getImageSizes(imageType: 'avatar' | 'background') {
  if (imageType === 'avatar') {
    return [
      { size: 'small' as const, width: 64, height: 64 },
      { size: 'medium' as const, width: 128, height: 128 },
      { size: 'large' as const, width: 256, height: 256 },
    ];
  } else {
    return [
      { size: 'small' as const, width: 1280, height: 256 },
      { size: 'medium' as const, width: 1920, height: 384 },
      { size: 'large' as const, width: 2560, height: 512 },
    ];
  }
}

function generateVersion(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `v${year}${month}${day}_${hours}${minutes}${seconds}`;
}

async function uploadProcessedImages(
  s3Client: S3Client,
  bucketName: string,
  processedImages: ProcessedImage[],
  metadata: ImageMetadata,
  version: string
): Promise<Record<string, string>> {
  const uploadedUrls: Record<string, string> = {};

  for (const processedImage of processedImages) {
    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: processedImage.key,
        Body: processedImage.buffer,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
        Metadata: {
          userId: metadata.userId,
          imageType: metadata.imageType,
          size: processedImage.size,
          version,
          processedAt: new Date().toISOString(),
        },
      });

      await s3Client.send(command);

      // Generate public URL
      const cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN;
      if (cloudfrontDomain) {
        uploadedUrls[processedImage.size] =
          `https://${cloudfrontDomain}/${processedImage.key}`;
      } else {
        uploadedUrls[processedImage.size] =
          `https://${bucketName}.s3.ap-northeast-1.amazonaws.com/${processedImage.key}`;
      }

      console.log('Uploaded processed image:', processedImage.key);
    } catch (error) {
      console.error('Error uploading processed image:', error);
      throw error;
    }
  }

  return uploadedUrls;
}

async function updateUserProfile(
  dynamoClient: DynamoDBDocumentClient,
  tableName: string,
  metadata: ImageMetadata,
  uploadedUrls: Record<string, string>
): Promise<void> {
  try {
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (metadata.imageType === 'avatar') {
      updateData.avatarUrl =
        uploadedUrls.large || uploadedUrls.medium || uploadedUrls.small;
    } else {
      updateData.backgroundImageUrl =
        uploadedUrls.large || uploadedUrls.medium || uploadedUrls.small;
    }

    const command = new UpdateCommand({
      TableName: tableName,
      Key: {
        PK: `USER#${metadata.userId}`,
        SK: 'PROFILE',
      },
      UpdateExpression: 'SET #updatedAt = :updatedAt, #imageUrl = :imageUrl',
      ExpressionAttributeNames: {
        '#updatedAt': 'updatedAt',
        '#imageUrl':
          metadata.imageType === 'avatar' ? 'avatarUrl' : 'backgroundImageUrl',
      },
      ExpressionAttributeValues: {
        ':updatedAt': updateData.updatedAt,
        ':imageUrl':
          updateData[
            metadata.imageType === 'avatar' ? 'avatarUrl' : 'backgroundImageUrl'
          ],
      },
    });

    await dynamoClient.send(command);
    console.log('Updated user profile:', metadata.userId);
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

async function deleteOriginalFile(
  s3Client: S3Client,
  bucketName: string,
  objectKey: string
): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    });

    await s3Client.send(command);
    console.log('Deleted original file:', objectKey);
  } catch (error) {
    console.error('Error deleting original file:', error);
    // Don't throw error for cleanup failure
  }
}
