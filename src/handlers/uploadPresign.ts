/**
 * Upload Presign Handler
 *
 * @description Lambda handler for presigned URL generation
 * This handler processes requests for image upload presigned URLs
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UploadController } from '../controllers/sns/UploadController';

/**
 * Lambda handler for presigned URL generation
 *
 * @param event - API Gateway event
 * @returns API Gateway response
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Upload presign handler event:', JSON.stringify(event, null, 2));

  try {
    // Extract path parameters
    const userId = event.pathParameters?.userId;
    const imageType = event.pathParameters?.imageType;

    if (!userId || !imageType) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        },
        body: JSON.stringify({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required path parameters',
            details: 'userId and imageType are required',
          },
          timestamp: new Date().toISOString(),
        }),
      };
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = event.body ? JSON.parse(event.body) : {};
    } catch (error) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        },
        body: JSON.stringify({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid JSON in request body',
            details: 'Request body must be valid JSON',
          },
          timestamp: new Date().toISOString(),
        }),
      };
    }

    // Create controller instance
    const controller = new UploadController();

    // Mock the request object for the controller
    const mockRequest = {
      user: { id: 'mock-user-id' }, // Mock user for now
      headers: event.headers,
      body: requestBody,
    };

    // Call the controller method
    const result = await controller.generatePresignedUrl(
      userId,
      imageType as 'avatar' | 'background',
      requestBody,
      mockRequest
    );

    // Determine status code from controller response
    const statusCode = result.success ? 200 : 400;

    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Upload presign handler error:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      },
      body: JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          details:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
