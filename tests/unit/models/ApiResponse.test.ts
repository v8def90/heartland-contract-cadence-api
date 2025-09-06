import {
  createSuccessResponse,
  createErrorResponse,
  API_ERROR_CODES,
} from '../../../src/models/responses/ApiResponse';

describe('ApiResponse', () => {
  describe('createSuccessResponse', () => {
    it('should create a success response with data', () => {
      const testData = { message: 'Hello World' };
      const response = createSuccessResponse(testData);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(testData);
      expect(response.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });

    it('should handle null data', () => {
      const response = createSuccessResponse(null);

      expect(response.success).toBe(true);
      expect(response.data).toBe(null);
      expect(response.timestamp).toBeDefined();
    });

    it('should handle undefined data', () => {
      const response = createSuccessResponse(undefined);

      expect(response.success).toBe(true);
      expect(response.data).toBe(undefined);
      expect(response.timestamp).toBeDefined();
    });

    it('should handle complex data objects', () => {
      const complexData = {
        balance: '1000.00000000',
        address: '0x58f9e6153690c852',
        metadata: {
          decimals: 8,
          symbol: 'HEART',
          nested: {
            value: 'test',
          },
        },
        array: [1, 2, 3],
      };

      const response = createSuccessResponse(complexData);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(complexData);
      expect(response.timestamp).toBeDefined();
    });
  });

  describe('createErrorResponse', () => {
    it('should create an error response with error object', () => {
      const errorObject = {
        code: 'TEST_ERROR',
        message: 'This is a test error',
        details: 'Additional error details',
      };

      const response = createErrorResponse(errorObject);

      expect(response.success).toBe(false);
      expect(response.error).toEqual(errorObject);
      expect(response.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });

    it('should handle error without details', () => {
      const errorObject = {
        code: 'SIMPLE_ERROR',
        message: 'Simple error message',
      };

      const response = createErrorResponse(errorObject);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('SIMPLE_ERROR');
      expect(response.error.message).toBe('Simple error message');
      expect(response.error.details).toBeUndefined();
      expect(response.timestamp).toBeDefined();
    });

    it('should handle empty message', () => {
      const errorObject = {
        code: 'EMPTY_MESSAGE_ERROR',
        message: '',
      };

      const response = createErrorResponse(errorObject);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('EMPTY_MESSAGE_ERROR');
      expect(response.error.message).toBe('');
      expect(response.timestamp).toBeDefined();
    });
  });

  describe('API_ERROR_CODES', () => {
    it('should contain expected error codes', () => {
      expect(API_ERROR_CODES.INVALID_ADDRESS).toBe('INVALID_ADDRESS');
      expect(API_ERROR_CODES.INVALID_AMOUNT).toBe('INVALID_AMOUNT');
      expect(API_ERROR_CODES.FLOW_NETWORK_ERROR).toBe('FLOW_NETWORK_ERROR');
      expect(API_ERROR_CODES.FLOW_SCRIPT_ERROR).toBe('FLOW_SCRIPT_ERROR');
      expect(API_ERROR_CODES.FLOW_TRANSACTION_ERROR).toBe(
        'FLOW_TRANSACTION_ERROR'
      );
      expect(API_ERROR_CODES.FLOW_ACCOUNT_ERROR).toBe('FLOW_ACCOUNT_ERROR');
      expect(API_ERROR_CODES.CONTRACT_ERROR).toBe('CONTRACT_ERROR');
      expect(API_ERROR_CODES.MISSING_REQUIRED_FIELD).toBe(
        'MISSING_REQUIRED_FIELD'
      );
      expect(API_ERROR_CODES.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR');
    });

    it('should have all error codes as strings', () => {
      Object.values(API_ERROR_CODES).forEach(code => {
        expect(typeof code).toBe('string');
        expect(code.length).toBeGreaterThan(0);
        expect(code).toMatch(/^[A-Z_]+$/); // Should be UPPER_SNAKE_CASE
      });
    });

    it('should have consistent naming convention', () => {
      const errorCodes = Object.keys(API_ERROR_CODES);

      errorCodes.forEach(key => {
        expect(key).toMatch(/^[A-Z_]+$/); // Keys should be UPPER_SNAKE_CASE
        expect(API_ERROR_CODES[key as keyof typeof API_ERROR_CODES]).toBe(key); // Value should match key
      });
    });
  });

  describe('Response Type Guards', () => {
    it('should distinguish success from error responses', () => {
      const successResponse = createSuccessResponse({ test: 'data' });
      const errorResponse = createErrorResponse({
        code: 'TEST_ERROR',
        message: 'Test error',
      });

      // Type narrowing tests
      if (successResponse.success) {
        expect(successResponse.data).toBeDefined();
        expect((successResponse as any).error).toBeUndefined();
      }

      if (!errorResponse.success) {
        expect(errorResponse.error).toBeDefined();
        expect((errorResponse as any).data).toBeUndefined();
      }
    });

    it('should have proper timestamp format', () => {
      const successResponse = createSuccessResponse('test');
      const errorResponse = createErrorResponse({
        code: 'TEST_ERROR',
        message: 'Test',
      });

      const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

      expect(successResponse.timestamp).toMatch(timestampRegex);
      expect(errorResponse.timestamp).toMatch(timestampRegex);

      // Should be valid ISO strings
      expect(new Date(successResponse.timestamp)).toBeInstanceOf(Date);
      expect(new Date(errorResponse.timestamp)).toBeInstanceOf(Date);
      expect(isNaN(new Date(successResponse.timestamp).getTime())).toBe(false);
      expect(isNaN(new Date(errorResponse.timestamp).getTime())).toBe(false);
    });

    it('should create timestamps close to current time', () => {
      const before = new Date();
      const response = createSuccessResponse('test');
      const after = new Date();

      const responseTime = new Date(response.timestamp);

      expect(responseTime.getTime()).toBeGreaterThanOrEqual(
        before.getTime() - 1000
      ); // 1 second tolerance
      expect(responseTime.getTime()).toBeLessThanOrEqual(
        after.getTime() + 1000
      ); // 1 second tolerance
    });
  });

  describe('Edge Cases', () => {
    it('should handle circular reference objects', () => {
      const circularObj: any = { name: 'circular' };
      circularObj.self = circularObj;

      // This should not throw an error during JSON serialization
      expect(() => {
        const response = createSuccessResponse(circularObj);
        // The actual serialization happens when the response is sent
        expect(response.success).toBe(true);
      }).not.toThrow();
    });

    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(10000);
      const errorObject = {
        code: 'LONG_MESSAGE_ERROR',
        message: longMessage,
      };

      const response = createErrorResponse(errorObject);

      expect(response.success).toBe(false);
      expect(response.error.message).toBe(longMessage);
      expect(response.error.message.length).toBe(10000);
    });

    it('should handle special characters in error messages', () => {
      const specialMessage =
        '特殊文字 🚀 <script>alert("test")</script> \\n\\t\\r';
      const errorObject = {
        code: 'SPECIAL_CHARS_ERROR',
        message: specialMessage,
      };

      const response = createErrorResponse(errorObject);

      expect(response.success).toBe(false);
      expect(response.error.message).toBe(specialMessage);
    });
  });
});
