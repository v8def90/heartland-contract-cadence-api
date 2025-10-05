/**
 * Job Tracking Handler
 *
 * @description Lambda handler for job tracking endpoints
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { JobController } from '../controllers/sns/JobController';
import jwt from 'jsonwebtoken';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Job tracking handler event:', JSON.stringify(event, null, 2));

  try {
    // Extract path parameters and method
    const method = event.httpMethod || (event.requestContext as any)?.http?.method;
    const path = event.path || (event as any).rawPath;
    const pathParameters = event.pathParameters || {};

    // Authenticate JWT token for protected endpoints
    let authenticatedUser = null;
    if (method !== 'GET' || path.includes('/jobs/user/')) {
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

      const token = authHeader.substring(7);
      const JWT_SECRET =
        process.env.JWT_SECRET ||
        'your-super-secret-jwt-key-change-this-in-production';

      try {
        const payload = jwt.verify(token, JWT_SECRET, {
          algorithms: ['HS256'],
        }) as any;
        authenticatedUser = {
          id: payload.sub,
          address: payload.address,
          role: payload.role,
        };
      } catch (error) {
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
    }

    // Parse request body
    let requestBody = {};
    if (event.body) {
      try {
        requestBody = JSON.parse(event.body);
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
    }

    // Create controller instance
    const controller = new JobController();

    // Create request object for the controller
    const requestObj = {
      user: authenticatedUser,
      headers: event.headers,
      body: requestBody,
    };

    let result: any;

    // Route requests based on method and path
    if (method === 'POST' && path.endsWith('/jobs')) {
      // Create job
      result = await controller.createJob(requestBody as any, requestObj);
    } else if (
      method === 'GET' &&
      path.includes('/jobs/') &&
      pathParameters.jobId
    ) {
      // Get job by ID
      result = await controller.getJob(pathParameters.jobId);
    } else if (
      method === 'PUT' &&
      path.includes('/jobs/') &&
      pathParameters.jobId
    ) {
      // Update job
      result = await controller.updateJob(
        pathParameters.jobId,
        requestBody as any
      );
    } else if (
      method === 'GET' &&
      path.includes('/jobs/user/') &&
      pathParameters.userId
    ) {
      // Get user jobs
      const queryParams = event.queryStringParameters || {};
        result = await controller.getUserJobs(
          pathParameters.userId,
          requestObj,
          queryParams.jobType,
          queryParams.status,
          queryParams.limit ? parseInt(queryParams.limit) : undefined,
          queryParams.cursor
        );
    } else {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        },
        body: JSON.stringify({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Endpoint not found',
            details: `The requested endpoint ${method} ${path} does not exist`,
          },
          timestamp: new Date().toISOString(),
        }),
      };
    }

    // Determine status code from controller response
    let statusCode = 200;
    if (result.success === false) {
      if (result.error?.code === 'AUTHENTICATION_ERROR') statusCode = 401;
      else if (result.error?.code === 'AUTHORIZATION_ERROR') statusCode = 403;
      else if (result.error?.code === 'NOT_FOUND') statusCode = 404;
      else if (result.error?.code === 'VALIDATION_ERROR') statusCode = 400;
      else statusCode = 500;
    } else if (method === 'POST') {
      statusCode = 201;
    }

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
    console.error('Job tracking handler error:', error);

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
