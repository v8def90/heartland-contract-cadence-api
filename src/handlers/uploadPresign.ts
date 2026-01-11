/**
 * Upload Presign Handler
 *
 * @description Lambda handler for presigned URL generation
 * This handler processes requests for image upload presigned URLs
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UploadController } from '../controllers/sns/UploadController';
import jwt from 'jsonwebtoken';

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
    const did = event.pathParameters?.did;
    const imageType = event.pathParameters?.imageType;

    if (!did || !imageType) {
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
            details: 'did and imageType are required',
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

    // Authenticate JWT token
    const authHeader =
      event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        },
        body: JSON.stringify({
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: 'Authentication required',
            details: 'Authorization header with Bearer token is required',
          },
          timestamp: new Date().toISOString(),
        }),
      };
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token directly
    const JWT_SECRET =
      process.env.JWT_SECRET ||
      'your-super-secret-jwt-key-change-this-in-production';
    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;
    } catch (error) {
      payload = null;
    }

    if (!payload) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        },
        body: JSON.stringify({
          success: false,
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: 'Invalid or expired token',
            details: 'JWT token verification failed',
          },
          timestamp: new Date().toISOString(),
        }),
      };
    }

    // Create controller instance
    const controller = new UploadController();

    // Create authenticated request object for the controller
    const authenticatedRequest = {
      user: {
        id: payload.sub,
        address: payload.address,
        role: payload.role,
      },
      headers: event.headers,
      body: requestBody,
    };

    // Call the controller method
    const result = await controller.generatePresignedUrl(
      did,
      imageType as 'avatar' | 'background' | 'post',
      requestBody,
      authenticatedRequest
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
