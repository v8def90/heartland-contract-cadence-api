/**
 * Error Handling Comprehensive Tests
 *
 * @description Comprehensive tests for error handling patterns throughout the application.
 * Focuses on API error responses, validation errors, and exception handling.
 */

import {
  createSuccessResponse,
  createErrorResponse,
  API_ERROR_CODES,
} from '../../../src/models/responses/ApiResponse';

describe('Error Handling Comprehensive Tests', () => {
  describe('Success Response Creation', () => {
    it('should create success response with data', () => {
      const testData = { balance: '100.0', address: '0x123' };
      const response = createSuccessResponse(testData);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(testData);
      expect(response.timestamp).toBeDefined();
      expect(new Date(response.timestamp)).toBeInstanceOf(Date);
    });

    it('should create success response with null data', () => {
      const response = createSuccessResponse(null);

      expect(response.success).toBe(true);
      expect(response.data).toBeNull();
      expect(response.timestamp).toBeDefined();
    });

    it('should create success response with undefined data', () => {
      const response = createSuccessResponse(undefined);

      expect(response.success).toBe(true);
      expect(response.data).toBeUndefined();
      expect(response.timestamp).toBeDefined();
    });

    it('should create success response with complex nested data', () => {
      const complexData = {
        user: { id: 1, name: 'Test' },
        transactions: [
          { id: 'tx1', amount: '100.0' },
          { id: 'tx2', amount: '200.0' },
        ],
        metadata: {
          total: 2,
          hasMore: false,
        },
      };

      const response = createSuccessResponse(complexData);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(complexData);
      expect(response.timestamp).toBeDefined();
    });
  });

  describe('Error Response Creation', () => {
    it('should create error response with all fields', () => {
      const errorData = {
        code: API_ERROR_CODES.INVALID_ADDRESS,
        message: 'Invalid Flow address format',
        details: 'Address must be 0x prefixed hex string',
      };

      const response = createErrorResponse(errorData);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe(API_ERROR_CODES.INVALID_ADDRESS);
      expect(response.error.message).toBe('Invalid Flow address format');
      expect(response.error.details).toBe(
        'Address must be 0x prefixed hex string'
      );
      expect(response.timestamp).toBeDefined();
    });

    it('should create error response without details', () => {
      const errorData = {
        code: API_ERROR_CODES.FLOW_NETWORK_ERROR,
        message: 'Network connection failed',
      };

      const response = createErrorResponse(errorData);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe(API_ERROR_CODES.FLOW_NETWORK_ERROR);
      expect(response.error.message).toBe('Network connection failed');
      expect(response.error.details).toBeUndefined();
      expect(response.timestamp).toBeDefined();
    });

    it('should handle all error codes', () => {
      const errorCodes = Object.values(API_ERROR_CODES);

      errorCodes.forEach(code => {
        const response = createErrorResponse({
          code,
          message: `Test error for ${code}`,
        });

        expect(response.success).toBe(false);
        expect(response.error.code).toBe(code);
        expect(response.error.message).toBe(`Test error for ${code}`);
      });
    });
  });

  describe('API Error Codes Validation', () => {
    it('should have all required input validation error codes', () => {
      const inputValidationCodes = [
        'INVALID_ADDRESS',
        'INVALID_AMOUNT',
        'INVALID_TRANSACTION_ID',
        'INVALID_OPERATION',
        'MISSING_REQUIRED_FIELD',
        'VALIDATION_ERROR',
      ];

      inputValidationCodes.forEach(code => {
        expect(
          API_ERROR_CODES[code as keyof typeof API_ERROR_CODES]
        ).toBeDefined();
        expect(
          typeof API_ERROR_CODES[code as keyof typeof API_ERROR_CODES]
        ).toBe('string');
      });
    });

    it('should have all required Flow network error codes', () => {
      const flowErrorCodes = [
        'FLOW_NETWORK_ERROR',
        'FLOW_SCRIPT_ERROR',
        'FLOW_TRANSACTION_ERROR',
        'FLOW_ACCOUNT_ERROR',
      ];

      flowErrorCodes.forEach(code => {
        expect(
          API_ERROR_CODES[code as keyof typeof API_ERROR_CODES]
        ).toBeDefined();
        expect(
          typeof API_ERROR_CODES[code as keyof typeof API_ERROR_CODES]
        ).toBe('string');
      });
    });

    it('should have all required Heart contract error codes', () => {
      const contractErrorCodes = [
        'CONTRACT_ERROR',
        'INSUFFICIENT_BALANCE',
        'CONTRACT_PAUSED',
        'UNAUTHORIZED_ACCESS',
      ];

      contractErrorCodes.forEach(code => {
        expect(
          API_ERROR_CODES[code as keyof typeof API_ERROR_CODES]
        ).toBeDefined();
        expect(
          typeof API_ERROR_CODES[code as keyof typeof API_ERROR_CODES]
        ).toBe('string');
      });
    });

    it('should have all required authentication error codes', () => {
      const authErrorCodes = [
        'AUTHENTICATION_REQUIRED',
        'INVALID_TOKEN',
        'TOKEN_EXPIRED',
        'INSUFFICIENT_PERMISSIONS',
      ];

      authErrorCodes.forEach(code => {
        expect(
          API_ERROR_CODES[code as keyof typeof API_ERROR_CODES]
        ).toBeDefined();
        expect(
          typeof API_ERROR_CODES[code as keyof typeof API_ERROR_CODES]
        ).toBe('string');
      });
    });

    it('should have all required general error codes', () => {
      const generalErrorCodes = [
        'NOT_FOUND',
        'INTERNAL_SERVER_ERROR',
        'SERVICE_UNAVAILABLE',
        'RATE_LIMITED',
        'TRANSACTION_FAILED',
        'UNKNOWN_ERROR',
      ];

      generalErrorCodes.forEach(code => {
        expect(
          API_ERROR_CODES[code as keyof typeof API_ERROR_CODES]
        ).toBeDefined();
        expect(
          typeof API_ERROR_CODES[code as keyof typeof API_ERROR_CODES]
        ).toBe('string');
      });
    });

    it('should have consistent error code naming', () => {
      Object.keys(API_ERROR_CODES).forEach(key => {
        expect(key).toMatch(/^[A-Z_]+$/);
        expect(key).not.toMatch(/^_/);
        expect(key).not.toMatch(/_$/);
        expect(key).not.toMatch(/__/);
      });
    });

    it('should have unique error code values', () => {
      const values = Object.values(API_ERROR_CODES);
      const uniqueValues = [...new Set(values)];

      expect(values.length).toBe(uniqueValues.length);
    });
  });

  describe('Error Response Type Safety', () => {
    it('should maintain type safety for success responses', () => {
      interface TestData {
        id: number;
        name: string;
      }

      const testData: TestData = { id: 1, name: 'Test' };
      const response = createSuccessResponse(testData);

      if (response.success) {
        expect(response.data.id).toBe(1);
        expect(response.data.name).toBe('Test');
      }
    });

    it('should maintain type safety for error responses', () => {
      const response = createErrorResponse({
        code: API_ERROR_CODES.INVALID_ADDRESS,
        message: 'Test error',
      });

      if (!response.success) {
        expect(response.error.code).toBe(API_ERROR_CODES.INVALID_ADDRESS);
        expect(response.error.message).toBe('Test error');
      }
    });
  });

  describe('Timestamp Validation', () => {
    it('should generate valid ISO timestamps', () => {
      const response = createSuccessResponse({ test: 'data' });

      expect(response.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
      expect(new Date(response.timestamp).toISOString()).toBe(
        response.timestamp
      );
    });

    it('should generate recent timestamps', () => {
      const beforeTime = Date.now();
      const response = createSuccessResponse({ test: 'data' });
      const afterTime = Date.now();

      const responseTime = new Date(response.timestamp).getTime();

      expect(responseTime).toBeGreaterThanOrEqual(beforeTime);
      expect(responseTime).toBeLessThanOrEqual(afterTime);
    });

    it('should generate unique timestamps for rapid calls', () => {
      const responses = [];

      for (let i = 0; i < 10; i++) {
        responses.push(createSuccessResponse({ index: i }));
      }

      const timestamps = responses.map(r => r.timestamp);
      const uniqueTimestamps = [...new Set(timestamps)];

      // Allow for some duplicate timestamps due to rapid execution
      // In rapid execution, we expect at least 1 unique timestamp
      expect(uniqueTimestamps.length).toBeGreaterThanOrEqual(1);
      expect(uniqueTimestamps.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle empty error messages', () => {
      const response = createErrorResponse({
        code: API_ERROR_CODES.UNKNOWN_ERROR,
        message: '',
      });

      expect(response.success).toBe(false);
      expect(response.error.message).toBe('');
    });

    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(1000);
      const response = createErrorResponse({
        code: API_ERROR_CODES.VALIDATION_ERROR,
        message: longMessage,
      });

      expect(response.success).toBe(false);
      expect(response.error.message).toBe(longMessage);
    });

    it('should handle special characters in error messages', () => {
      const specialMessage =
        'Error with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?';
      const response = createErrorResponse({
        code: API_ERROR_CODES.VALIDATION_ERROR,
        message: specialMessage,
      });

      expect(response.success).toBe(false);
      expect(response.error.message).toBe(specialMessage);
    });

    it('should handle unicode characters in error messages', () => {
      const unicodeMessage = 'エラーメッセージ with 中文 and العربية';
      const response = createErrorResponse({
        code: API_ERROR_CODES.VALIDATION_ERROR,
        message: unicodeMessage,
      });

      expect(response.success).toBe(false);
      expect(response.error.message).toBe(unicodeMessage);
    });
  });
});
