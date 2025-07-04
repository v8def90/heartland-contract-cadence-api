/**
 * Entry point for the Flow Heart Token Control API
 *
 * @description This file serves as the main entry point for the serverless application.
 * It exports the Lambda handler functions for AWS Lambda execution.
 *
 * @author Heart Token API Team
 * @since 1.0.0
 */

import { app } from './app';
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';

/**
 * AWS Lambda handler for HTTP API Gateway events
 *
 * @description Main Lambda handler that processes HTTP requests through API Gateway.
 * Uses the Express app configured with tsoa for routing and request handling.
 *
 * @param event - API Gateway proxy event
 * @param context - Lambda execution context
 * @returns Promise resolving to API Gateway proxy result
 *
 * @example
 * ```typescript
 * // This handler is called automatically by AWS Lambda
 * const result = await handler(event, context);
 * ```
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    // TODO: Implement Lambda handler with Express app
    // This will be implemented after creating the app.ts file

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      },
      body: JSON.stringify({
        success: true,
        message: 'Flow Heart Token API is running',
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Lambda handler error:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error occurred',
        },
        timestamp: new Date().toISOString(),
      }),
    };
  }
};

/**
 * Swagger UI handler for API documentation
 *
 * @description Serves the Swagger UI interface for interactive API documentation.
 *
 * @param event - API Gateway proxy event
 * @param context - Lambda execution context
 * @returns Promise resolving to API Gateway proxy result with Swagger UI
 */
export const swaggerHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    // TODO: Implement Swagger UI handler
    // This will serve the generated OpenAPI documentation

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
      },
      body: `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Flow Heart Token API Documentation</title>
          </head>
          <body>
            <h1>API Documentation</h1>
            <p>Swagger UI will be available here after tsoa generation.</p>
            <p>Run: pnpm run tsoa:spec-and-routes</p>
          </body>
        </html>
      `,
    };
  } catch (error) {
    console.error('Swagger handler error:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: {
          code: 'SWAGGER_ERROR',
          message: 'Failed to serve API documentation',
        },
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
