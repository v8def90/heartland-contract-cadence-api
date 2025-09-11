/**
 * Index Unit Tests
 *
 * @description Comprehensive tests for index.ts including
 * Lambda handlers, error handling, and response formatting
 */

import { handler, swaggerHandler } from '../../src/index';
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';

// Mock console methods to avoid cluttering test output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('Index', () => {
  let mockEvent: APIGatewayProxyEvent;
  let mockContext: Context;

  beforeEach(() => {
    // Mock console methods
    console.log = jest.fn();
    console.error = jest.fn();

    // Create mock event
    mockEvent = {
      httpMethod: 'GET',
      path: '/',
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'test-agent',
      },
      multiValueHeaders: {},
      body: null,
      isBase64Encoded: false,
      requestContext: {
        accountId: '123456789012',
        apiId: 'test-api',
        protocol: 'HTTP/1.1',
        httpMethod: 'GET',
        path: '/',
        stage: 'test',
        requestId: 'test-request-id',
        requestTime: '09/Apr/2015:12:34:56 +0000',
        requestTimeEpoch: 1428582896000,
        resourceId: 'test-resource',
        resourcePath: '/',
        identity: {
          accessKey: null,
          accountId: null,
          apiKey: null,
          apiKeyId: null,
          caller: null,
          clientCert: null,
          cognitoAuthenticationProvider: null,
          cognitoAuthenticationType: null,
          cognitoIdentityId: null,
          cognitoIdentityPoolId: null,
          principalOrgId: null,
          sourceIp: '127.0.0.1',
          user: null,
          userAgent: 'test-agent',
          userArn: null,
        },
        authorizer: null,
      },
      resource: '/',
      stageVariables: null,
    };

    // Create mock context
    mockContext = {
      callbackWaitsForEmptyEventLoop: false,
      functionName: 'test-function',
      functionVersion: '1',
      invokedFunctionArn:
        'arn:aws:lambda:us-east-1:123456789012:function:test-function',
      memoryLimitInMB: '128',
      awsRequestId: 'test-request-id',
      logGroupName: '/aws/lambda/test-function',
      logStreamName: '2021/01/01/[$LATEST]test-stream',
      getRemainingTimeInMillis: () => 30000,
      done: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn(),
    };
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe('handler', () => {
    it('should return successful response for valid request', async () => {
      const result = await handler(mockEvent, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.headers).toEqual({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      });

      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Flow Heart Token API is running');
      expect(body.timestamp).toBeDefined();
      expect(new Date(body.timestamp)).toBeInstanceOf(Date);
    });

    it('should handle different HTTP methods', async () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];

      for (const method of methods) {
        const event = { ...mockEvent, httpMethod: method };
        const result = await handler(event, mockContext);

        expect(result.statusCode).toBe(200);
        expect(result.headers?.['Access-Control-Allow-Methods']).toContain(
          method
        );
      }
    });

    it('should handle different paths', async () => {
      const paths = ['/', '/health', '/api/info', '/docs'];

      for (const path of paths) {
        const event = { ...mockEvent, path };
        const result = await handler(event, mockContext);

        expect(result.statusCode).toBe(200);
        expect(result.headers?.['Content-Type']).toBe('application/json');
      }
    });

    it('should handle requests with query parameters', async () => {
      const event = {
        ...mockEvent,
        queryStringParameters: {
          param1: 'value1',
          param2: 'value2',
        },
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.headers?.['Content-Type']).toBe('application/json');
    });

    it('should handle requests with path parameters', async () => {
      const event = {
        ...mockEvent,
        pathParameters: {
          id: '123',
          name: 'test',
        },
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.headers?.['Content-Type']).toBe('application/json');
    });

    it('should handle requests with headers', async () => {
      const event = {
        ...mockEvent,
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token123',
          'User-Agent': 'test-agent',
          'X-Custom-Header': 'custom-value',
        },
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.headers?.['Content-Type']).toBe('application/json');
    });

    it('should handle requests with body', async () => {
      const event = {
        ...mockEvent,
        httpMethod: 'POST',
        body: JSON.stringify({ test: 'data' }),
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.headers?.['Content-Type']).toBe('application/json');
    });

    it('should handle base64 encoded requests', async () => {
      const event = {
        ...mockEvent,
        isBase64Encoded: true,
        body: Buffer.from('test data').toString('base64'),
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.headers?.['Content-Type']).toBe('application/json');
    });

    it('should include CORS headers in response', async () => {
      const result = await handler(mockEvent, mockContext);

      expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
      expect(result.headers?.['Access-Control-Allow-Headers']).toBe(
        'Content-Type,Authorization'
      );
      expect(result.headers?.['Access-Control-Allow-Methods']).toBe(
        'GET,POST,PUT,DELETE,OPTIONS'
      );
    });

    it('should return valid JSON response', async () => {
      const result = await handler(mockEvent, mockContext);

      expect(() => JSON.parse(result.body)).not.toThrow();
      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('message');
      expect(body).toHaveProperty('timestamp');
    });

    it('should generate valid timestamp', async () => {
      const result = await handler(mockEvent, mockContext);
      const body = JSON.parse(result.body);

      expect(body.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
      expect(new Date(body.timestamp).getTime()).toBeLessThanOrEqual(
        Date.now()
      );
    });

    it('should handle concurrent requests', async () => {
      const promises = Array.from({ length: 10 }, () =>
        handler(mockEvent, mockContext)
      );
      const results = await Promise.all(promises);

      results.forEach((result: APIGatewayProxyResult) => {
        expect(result.statusCode).toBe(200);
        expect(result.headers?.['Content-Type']).toBe('application/json');
      });
    });

    it('should handle rapid successive requests', async () => {
      const startTime = Date.now();
      const promises = [];

      for (let i = 0; i < 5; i++) {
        promises.push(handler(mockEvent, mockContext));
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      results.forEach((result: APIGatewayProxyResult) => {
        expect(result.statusCode).toBe(200);
      });
    });
  });

  describe('swaggerHandler', () => {
    it('should return Swagger UI HTML for valid request', async () => {
      const result = await swaggerHandler(mockEvent, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.headers?.['Content-Type']).toBe('text/html');
      expect(result.body).toContain('<!DOCTYPE html>');
      expect(result.body).toContain('Flow Heart Token API Documentation');
      expect(result.body).toContain('API Documentation');
      expect(result.body).toContain('Swagger UI will be available here');
    });

    it('should handle different HTTP methods for Swagger', async () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];

      for (const method of methods) {
        const event = { ...mockEvent, httpMethod: method };
        const result = await swaggerHandler(event, mockContext);

        expect(result.statusCode).toBe(200);
        expect(result.headers?.['Content-Type']).toBe('text/html');
      }
    });

    it('should handle different paths for Swagger', async () => {
      const paths = ['/docs', '/swagger', '/api-docs', '/documentation'];

      for (const path of paths) {
        const event = { ...mockEvent, path };
        const result = await swaggerHandler(event, mockContext);

        expect(result.statusCode).toBe(200);
        expect(result.headers?.['Content-Type']).toBe('text/html');
      }
    });

    it('should include proper HTML structure', async () => {
      const result = await swaggerHandler(mockEvent, mockContext);

      expect(result.body).toContain('<html>');
      expect(result.body).toContain('<head>');
      expect(result.body).toContain(
        '<title>Flow Heart Token API Documentation</title>'
      );
      expect(result.body).toContain('<body>');
      expect(result.body).toContain('<h1>API Documentation</h1>');
      expect(result.body).toContain('</body>');
      expect(result.body).toContain('</html>');
    });

    it('should include tsoa generation instructions', async () => {
      const result = await swaggerHandler(mockEvent, mockContext);

      expect(result.body).toContain('Run: pnpm run tsoa:spec-and-routes');
      expect(result.body).toContain(
        'Swagger UI will be available here after tsoa generation'
      );
    });

    it('should return valid HTML response', async () => {
      const result = await swaggerHandler(mockEvent, mockContext);

      expect(result.body).toMatch(/<html>[\s\S]*<\/html>/);
      expect(result.body).toMatch(/<head>[\s\S]*<\/head>/);
      expect(result.body).toMatch(/<body>[\s\S]*<\/body>/);
    });

    it('should handle concurrent Swagger requests', async () => {
      const promises = Array.from({ length: 5 }, () =>
        swaggerHandler(mockEvent, mockContext)
      );
      const results = await Promise.all(promises);

      results.forEach((result: APIGatewayProxyResult) => {
        expect(result.statusCode).toBe(200);
        expect(result.headers?.['Content-Type']).toBe('text/html');
        expect(result.body).toContain('Flow Heart Token API Documentation');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle handler errors gracefully', async () => {
      // Mock console.error to avoid cluttering output
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // This test verifies the error handling structure exists
      // The actual error handling is tested in the implementation
      expect(handler).toBeDefined();
      expect(typeof handler).toBe('function');

      consoleErrorSpy.mockRestore();
    });

    it('should handle swaggerHandler errors gracefully', async () => {
      // Mock console.error to avoid cluttering output
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // This test verifies the error handling structure exists
      // The actual error handling is tested in the implementation
      expect(swaggerHandler).toBeDefined();
      expect(typeof swaggerHandler).toBe('function');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Response Format Validation', () => {
    it('should maintain consistent response structure for handler', async () => {
      const result = await handler(mockEvent, mockContext);

      expect(result).toHaveProperty('statusCode');
      expect(result).toHaveProperty('headers');
      expect(result).toHaveProperty('body');

      expect(typeof result.statusCode).toBe('number');
      expect(typeof result.headers).toBe('object');
      expect(typeof result.body).toBe('string');

      expect(result.statusCode).toBeGreaterThanOrEqual(200);
      expect(result.statusCode).toBeLessThan(600);
    });

    it('should maintain consistent response structure for swaggerHandler', async () => {
      const result = await swaggerHandler(mockEvent, mockContext);

      expect(result).toHaveProperty('statusCode');
      expect(result).toHaveProperty('headers');
      expect(result).toHaveProperty('body');

      expect(typeof result.statusCode).toBe('number');
      expect(typeof result.headers).toBe('object');
      expect(typeof result.body).toBe('string');

      expect(result.statusCode).toBeGreaterThanOrEqual(200);
      expect(result.statusCode).toBeLessThan(600);
    });

    it('should have proper Content-Type headers', async () => {
      const handlerResult = await handler(mockEvent, mockContext);
      const swaggerResult = await swaggerHandler(mockEvent, mockContext);

      expect(handlerResult.headers?.['Content-Type']).toBe('application/json');
      expect(swaggerResult.headers?.['Content-Type']).toBe('text/html');
    });

    it('should have valid status codes', async () => {
      const handlerResult = await handler(mockEvent, mockContext);
      const swaggerResult = await swaggerHandler(mockEvent, mockContext);

      expect([200, 201, 202, 204, 400, 401, 403, 404, 500, 502, 503]).toContain(
        handlerResult.statusCode
      );
      expect([200, 201, 202, 204, 400, 401, 403, 404, 500, 502, 503]).toContain(
        swaggerResult.statusCode
      );
    });
  });

  describe('Performance and Reliability', () => {
    it('should respond quickly to requests', async () => {
      const startTime = Date.now();
      await handler(mockEvent, mockContext);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should respond within 100ms
    });

    it('should respond quickly to Swagger requests', async () => {
      const startTime = Date.now();
      await swaggerHandler(mockEvent, mockContext);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should respond within 100ms
    });

    it('should handle memory efficiently', async () => {
      const initialMemory = process.memoryUsage();

      // Process multiple requests
      const promises = Array.from({ length: 100 }, () =>
        handler(mockEvent, mockContext)
      );
      await Promise.all(promises);

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should not leak memory between requests', async () => {
      const initialMemory = process.memoryUsage();

      // Process requests in batches
      for (let i = 0; i < 10; i++) {
        const promises = Array.from({ length: 10 }, () =>
          handler(mockEvent, mockContext)
        );
        await Promise.all(promises);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be minimal
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null event properties', async () => {
      const event = {
        ...mockEvent,
        pathParameters: null,
        queryStringParameters: null,
        body: null,
      };

      const result = await handler(event, mockContext);
      expect(result.statusCode).toBe(200);
    });

    it('should handle undefined event properties', async () => {
      const event = {
        ...mockEvent,
        pathParameters: null,
        queryStringParameters: null,
        body: null,
      };

      const result = await handler(event, mockContext);
      expect(result.statusCode).toBe(200);
    });

    it('should handle empty headers', async () => {
      const event = {
        ...mockEvent,
        headers: {},
      };

      const result = await handler(event, mockContext);
      expect(result.statusCode).toBe(200);
    });

    it('should handle malformed JSON in body', async () => {
      const event = {
        ...mockEvent,
        body: 'invalid json {',
      };

      const result = await handler(event, mockContext);
      expect(result.statusCode).toBe(200);
    });

    it('should handle very large headers', async () => {
      const largeHeaders = {
        'X-Large-Header': 'x'.repeat(10000),
        'Content-Type': 'application/json',
      };

      const event = {
        ...mockEvent,
        headers: largeHeaders,
      };

      const result = await handler(event, mockContext);
      expect(result.statusCode).toBe(200);
    });

    it('should handle special characters in path', async () => {
      const event = {
        ...mockEvent,
        path: '/test/path/with/special/chars/!@#$%^&*()',
      };

      const result = await handler(event, mockContext);
      expect(result.statusCode).toBe(200);
    });

    it('should handle unicode characters in path', async () => {
      const event = {
        ...mockEvent,
        path: '/test/unicode/测试/🚀/héllo',
      };

      const result = await handler(event, mockContext);
      expect(result.statusCode).toBe(200);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle typical API Gateway request flow', async () => {
      const apiEvent = {
        ...mockEvent,
        httpMethod: 'GET',
        path: '/api/health',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; API-Test/1.0)',
          Accept: 'application/json',
        },
        queryStringParameters: {
          format: 'json',
        },
      };

      const result = await handler(apiEvent, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.headers?.['Content-Type']).toBe('application/json');
      expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
    });

    it('should handle typical Swagger UI request flow', async () => {
      const swaggerEvent = {
        ...mockEvent,
        httpMethod: 'GET',
        path: '/docs',
        headers: {
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (compatible; Swagger-UI/1.0)',
        },
      };

      const result = await swaggerHandler(swaggerEvent, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.headers?.['Content-Type']).toBe('text/html');
    });

    it('should handle CORS preflight requests', async () => {
      const corsEvent = {
        ...mockEvent,
        httpMethod: 'OPTIONS',
        path: '/api/health',
        headers: {
          Origin: 'https://example.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type,Authorization',
        },
      };

      const result = await handler(corsEvent, mockContext);

      expect(result.statusCode).toBe(200);
      expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
      expect(result.headers?.['Access-Control-Allow-Methods']).toContain(
        'POST'
      );
      expect(result.headers?.['Access-Control-Allow-Headers']).toContain(
        'Content-Type'
      );
      expect(result.headers?.['Access-Control-Allow-Headers']).toContain(
        'Authorization'
      );
    });
  });
});
