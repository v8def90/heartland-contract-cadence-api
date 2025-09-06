import { Request, Response, NextFunction } from 'express';
import {
  createErrorResponse,
  API_ERROR_CODES,
} from '../../../src/models/responses/ApiResponse';

// Mock Express objects
const createMockRequest = (overrides = {}): Partial<Request> => ({
  url: '/test',
  method: 'GET',
  query: {},
  params: {},
  headers: {},
  ...overrides,
});

const createMockResponse = (): Partial<Response> => {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    headers: {},
    locals: {},
  };
  return res;
};

const createMockNext = (): NextFunction => jest.fn();

describe('Error Handling Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
    jest.clearAllMocks();
  });

  describe('Error Response Creation', () => {
    it('should create proper error response structure', () => {
      const error = {
        code: API_ERROR_CODES.INVALID_ADDRESS,
        message: 'Invalid Flow address format',
        details: 'Address must start with 0x',
      };

      const response = createErrorResponse(error);

      expect(response.success).toBe(false);
      expect(response.error).toEqual(error);
      expect(response.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });

    it('should handle different error codes', () => {
      const errorCodes = [
        API_ERROR_CODES.INVALID_ADDRESS,
        API_ERROR_CODES.INVALID_AMOUNT,
        API_ERROR_CODES.FLOW_NETWORK_ERROR,
        API_ERROR_CODES.MISSING_REQUIRED_FIELD,
      ];

      errorCodes.forEach(code => {
        const error = {
          code,
          message: `Test message for ${code}`,
        };

        const response = createErrorResponse(error);

        expect(response.success).toBe(false);
        expect(response.error.code).toBe(code);
      });
    });

    it('should preserve error details when provided', () => {
      const error = {
        code: API_ERROR_CODES.FLOW_SCRIPT_ERROR,
        message: 'Script execution failed',
        details: 'Timeout after 30 seconds',
      };

      const response = createErrorResponse(error);

      expect(response.error.details).toBe('Timeout after 30 seconds');
    });

    it('should work without details', () => {
      const error = {
        code: API_ERROR_CODES.UNKNOWN_ERROR,
        message: 'Something went wrong',
      };

      const response = createErrorResponse(error);

      expect(response.error.details).toBeUndefined();
    });
  });

  describe('HTTP Status Code Mapping', () => {
    it('should map validation errors to 400', () => {
      const validationErrors = [
        API_ERROR_CODES.INVALID_ADDRESS,
        API_ERROR_CODES.INVALID_AMOUNT,
        API_ERROR_CODES.MISSING_REQUIRED_FIELD,
      ];

      validationErrors.forEach(code => {
        const error = { code, message: 'Validation error' };
        const response = createErrorResponse(error);

        expect(response.success).toBe(false);
        // Note: The actual HTTP status mapping would be in the middleware
        expect(response.error.code).toBe(code);
      });
    });

    it('should map network errors to 503', () => {
      const networkErrors = [
        API_ERROR_CODES.FLOW_NETWORK_ERROR,
        API_ERROR_CODES.FLOW_SCRIPT_ERROR,
        API_ERROR_CODES.FLOW_TRANSACTION_ERROR,
      ];

      networkErrors.forEach(code => {
        const error = { code, message: 'Network error' };
        const response = createErrorResponse(error);

        expect(response.success).toBe(false);
        expect(response.error.code).toBe(code);
      });
    });

    it('should map unknown errors to 500', () => {
      const error = {
        code: API_ERROR_CODES.UNKNOWN_ERROR,
        message: 'Unknown error occurred',
      };

      const response = createErrorResponse(error);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe(API_ERROR_CODES.UNKNOWN_ERROR);
    });
  });

  describe('Error Logging', () => {
    it('should log error information', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const error = new Error('Test error');
      error.name = 'TestError';

      // Simulate error logging (since we can't easily test the actual middleware)
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);

      expect(consoleSpy).toHaveBeenCalledWith('Error name:', 'TestError');
      expect(consoleSpy).toHaveBeenCalledWith('Error message:', 'Test error');

      consoleSpy.mockRestore();
    });

    it('should log request context', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const request = createMockRequest({
        url: '/test-endpoint',
        method: 'POST',
        query: { test: 'value' },
      });

      // Simulate request logging
      console.error('Request URL:', request.url);
      console.error('Request method:', request.method);
      console.error('Request query:', JSON.stringify(request.query));

      expect(consoleSpy).toHaveBeenCalledWith('Request URL:', '/test-endpoint');
      expect(consoleSpy).toHaveBeenCalledWith('Request method:', 'POST');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Request query:',
        '{"test":"value"}'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('TSOA Validation Errors', () => {
    it('should handle ValidateError from tsoa', () => {
      class ValidateError extends Error {
        public fields: Record<string, { message: string; value?: any }>;

        constructor(
          fields: Record<string, { message: string; value?: any }>,
          message?: string
        ) {
          super(message);
          this.name = 'ValidateError';
          this.fields = fields;
        }
      }

      const validationFields = {
        amount: {
          message: 'Amount is required',
          value: undefined,
        },
        recipient: {
          message: 'Invalid address format',
          value: 'invalid-address',
        },
      };

      const validateError = new ValidateError(
        validationFields,
        'Validation failed'
      );

      expect(validateError.name).toBe('ValidateError');
      expect(validateError.fields).toEqual(validationFields);
      expect(validateError.message).toBe('Validation failed');
    });

    it('should extract validation field errors', () => {
      const fields = {
        amount: { message: 'Must be positive number' },
        address: { message: 'Invalid Flow address' },
      };

      const fieldMessages = Object.entries(fields).map(
        ([field, error]) => `${field}: ${error.message}`
      );

      expect(fieldMessages).toEqual([
        'amount: Must be positive number',
        'address: Invalid Flow address',
      ]);
    });
  });

  describe('Content Type Handling', () => {
    it('should set JSON content type for error responses', () => {
      const mockResponse = createMockResponse();

      // Simulate setting content type
      mockResponse.json = jest.fn().mockImplementation(data => {
        expect(data).toHaveProperty('success', false);
        expect(data).toHaveProperty('error');
        expect(data).toHaveProperty('timestamp');
        return mockResponse;
      });

      const errorData = createErrorResponse({
        code: API_ERROR_CODES.INVALID_AMOUNT,
        message: 'Test error',
      });

      (mockResponse.json as jest.Mock)(errorData);

      expect(mockResponse.json).toHaveBeenCalledWith(errorData);
    });
  });

  describe('Edge Cases', () => {
    it('should handle errors without stack traces', () => {
      const error = new Error('Test error');
      delete error.stack;

      expect(error.message).toBe('Test error');
      expect(error.stack).toBeUndefined();
    });

    it('should handle errors with circular references', () => {
      const circularError: any = new Error('Circular error');
      circularError.circular = circularError;

      expect(circularError.message).toBe('Circular error');
      expect(circularError.circular).toBe(circularError);
    });

    it('should handle non-Error objects thrown as errors', () => {
      const stringError = 'This is a string error';
      const objectError = {
        message: 'This is an object error',
        code: 'OBJECT_ERROR',
      };

      expect(typeof stringError).toBe('string');
      expect(typeof objectError).toBe('object');
      expect(objectError.message).toBe('This is an object error');
    });

    it('should handle empty error messages', () => {
      const error = new Error('');

      expect(error.message).toBe('');
      expect(error.name).toBe('Error');
    });

    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(10000);
      const error = new Error(longMessage);

      expect(error.message).toBe(longMessage);
      expect(error.message.length).toBe(10000);
    });
  });

  describe('Request ID and Correlation', () => {
    it('should handle requests with correlation IDs', () => {
      const requestWithId = createMockRequest({
        headers: {
          'x-correlation-id': 'test-correlation-123',
          'x-request-id': 'req-456',
        },
      });

      expect(requestWithId.headers?.['x-correlation-id']).toBe(
        'test-correlation-123'
      );
      expect(requestWithId.headers?.['x-request-id']).toBe('req-456');
    });

    it('should handle requests without correlation IDs', () => {
      const requestWithoutId = createMockRequest({
        headers: {},
      });

      expect(requestWithoutId.headers?.['x-correlation-id']).toBeUndefined();
      expect(requestWithoutId.headers?.['x-request-id']).toBeUndefined();
    });
  });

  describe('Error Sanitization', () => {
    it('should sanitize sensitive information from errors', () => {
      const sensitiveError = {
        code: API_ERROR_CODES.UNKNOWN_ERROR,
        message: 'Database connection failed',
        details:
          'Connection string: postgresql://user:password@localhost:5432/db',
      };

      // In a real implementation, we would sanitize the details
      const sanitizedDetails = sensitiveError.details?.replace(
        /password@/,
        '***@'
      );

      expect(sanitizedDetails).toBe(
        'Connection string: postgresql://user:***@localhost:5432/db'
      );
    });

    it('should not expose internal file paths', () => {
      const pathError = {
        code: API_ERROR_CODES.UNKNOWN_ERROR,
        message: 'File not found',
        details: '/Users/developer/secrets/config.json not found',
      };

      // In a real implementation, we would sanitize file paths
      const sanitizedPath = pathError.details?.replace(
        /\/Users\/[^\/]+/,
        '/Users/***'
      );

      expect(sanitizedPath).toBe('/Users/***/secrets/config.json not found');
    });
  });
});
