/**
 * Image Cleanup Worker
 *
 * @description Lambda function for cleaning up user images when profile is deleted
 * Handles deletion of all user-related images from S3
 */

import { DynamoDBStreamEvent, DynamoDBRecord } from 'aws-lambda';
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

interface UserProfileRecord {
  PK: string;
  SK: string;
  userId: string;
  avatarUrl?: string;
  backgroundImageUrl?: string;
}

export const handler = async (event: DynamoDBStreamEvent): Promise<void> => {
  console.log('Image cleanup event:', JSON.stringify(event, null, 2));

  const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-northeast-1',
  });
  const bucketName = process.env.S3_BUCKET_NAME || '';

  for (const record of event.Records) {
    try {
      await processProfileDeletion(record, s3Client, bucketName);
    } catch (error) {
      console.error('Error processing profile deletion:', error);
      // Continue processing other records even if one fails
    }
  }
};

async function processProfileDeletion(
  record: DynamoDBRecord,
  s3Client: S3Client,
  bucketName: string
): Promise<void> {
  // Only process DELETE events
  if (record.eventName !== 'REMOVE') {
    return;
  }

  // Only process PROFILE records
  if (record.dynamodb?.OldImage?.SK?.S !== 'PROFILE') {
    return;
  }

  const oldImage = record.dynamodb.OldImage;
  if (!oldImage) {
    return;
  }

  const userId = oldImage.PK?.S?.replace('USER#', '');
  if (!userId) {
    console.error('No userId found in deleted record');
    return;
  }

  console.log('Processing profile deletion for user:', userId);

  // Delete all user images
  await deleteUserImages(s3Client, bucketName, userId);

  console.log('Image cleanup completed for user:', userId);
}

async function deleteUserImages(
  s3Client: S3Client,
  bucketName: string,
  userId: string
): Promise<void> {
  try {
    // Delete images from public folder
    await deleteImagesFromFolder(
      s3Client,
      bucketName,
      `public/users/${userId}/`
    );

    // Delete images from private folder
    await deleteImagesFromFolder(
      s3Client,
      bucketName,
      `private/users/${userId}/`
    );

    // Delete images from uploads folder
    await deleteImagesFromFolder(s3Client, bucketName, `uploads/${userId}/`);

    console.log('All images deleted for user:', userId);
  } catch (error) {
    console.error('Error deleting user images:', error);
    throw error;
  }
}

async function deleteImagesFromFolder(
  s3Client: S3Client,
  bucketName: string,
  folderPrefix: string
): Promise<void> {
  try {
    let continuationToken: string | undefined;
    let deletedCount = 0;

    do {
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: folderPrefix,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      });

      const response = await s3Client.send(command);
      const objects = response.Contents || [];

      if (objects.length === 0) {
        break;
      }

      // Delete objects in parallel
      const deletePromises = objects.map(async object => {
        if (object.Key) {
          try {
            const deleteCommand = new DeleteObjectCommand({
              Bucket: bucketName,
              Key: object.Key,
            });
            await s3Client.send(deleteCommand);
            console.log('Deleted object:', object.Key);
            return true;
          } catch (error) {
            console.error('Error deleting object:', object.Key, error);
            return false;
          }
        }
        return false;
      });

      const results = await Promise.all(deletePromises);
      deletedCount += results.filter(Boolean).length;

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    console.log(`Deleted ${deletedCount} objects from folder: ${folderPrefix}`);
  } catch (error) {
    console.error(
      'Error listing/deleting objects from folder:',
      folderPrefix,
      error
    );
    throw error;
  }
}
