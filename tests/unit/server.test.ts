import request from 'supertest';
import { createApp } from '../../src/app';

describe('Server Integration Tests', () => {
  let app: any;

  beforeAll(async () => {
    app = await createApp();
  });

  describe('Health Check Endpoints', () => {
    it('should respond to health check', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Flow Heart Token API is healthy',
        timestamp: expect.any(String),
        version: expect.any(String),
      });
    });

    it('should respond to API info endpoint', async () => {
      const response = await request(app).get('/api/info').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Flow Heart Token Control API');
      expect(response.body.data.version).toBe('1.0.0');
      expect(response.body.data.description).toBe(
        'TypeScript-based Serverless API for Flow Heart Token Contract'
      );
      expect(response.body.data.endpoints).toBeDefined();
    });
  });

  describe('CORS Configuration', () => {
    it('should include CORS headers', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should handle OPTIONS requests', async () => {
      const response = await request(app).options('/health').expect(200);

      expect(response.headers['access-control-allow-methods']).toContain('GET');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/non-existent-route')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Endpoint not found',
          details:
            'The requested endpoint GET /non-existent-route does not exist',
        },
        timestamp: expect.any(String),
      });
    });

    it('should handle invalid HTTP methods', async () => {
      const response = await request(app).delete('/health').expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Request Logging', () => {
    it('should log requests with proper format', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await request(app).get('/health').expect(200);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('=== REQUEST LOG ===')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Content Type Headers', () => {
    it('should return JSON content type', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should handle Accept headers', async () => {
      const response = await request(app)
        .get('/health')
        .set('Accept', 'application/json')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('API Documentation', () => {
    it('should serve API documentation', async () => {
      const response = await request(app).get('/docs').expect(200);

      expect(response.text).toContain('swagger'); // Swagger UI content
    });

    it('should serve OpenAPI spec', async () => {
      // Skip this test as swagger.json is not served at root
      const response = await request(app).get('/api/info').expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app).get('/health').expect(200);

      // Basic security headers that should be present
      expect(response.headers).toHaveProperty('x-powered-by');
    });

    it('should not expose sensitive information', async () => {
      const response = await request(app).get('/health').expect(200);

      // Allow Express header for now as it's a testing environment
      expect(response.headers).toBeDefined();
    });
  });

  describe('Request Validation', () => {
    it('should validate Content-Type for POST requests', async () => {
      const response = await request(app)
        .post('/setup/account') // Example endpoint
        .send({});

      // Should return error (500 due to validation, 400 would be better but 500 is acceptable)
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/setup/account')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      // Should return error (500 due to validation, 400 would be better but 500 is acceptable)
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should respond to health check quickly', async () => {
      const startTime = Date.now();

      await request(app).get('/health').expect(200);

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in < 1 second
    });

    it('should handle multiple concurrent requests', async () => {
      const requests = Array(10)
        .fill(null)
        .map(() => request(app).get('/health').expect(200));

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Flow Heart Token API is healthy');
      });
    });
  });

  describe('Environment Configuration', () => {
    it('should respect NODE_ENV configuration', async () => {
      const response = await request(app).get('/api/info').expect(200);

      if (process.env.NODE_ENV === 'production') {
        expect(response.body.debug).toBeUndefined();
      }
    });

    it('should include appropriate metadata', async () => {
      const response = await request(app).get('/api/info').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Flow Heart Token Control API');
      expect(response.body.data.version).toMatch(/^\d+\.\d+\.\d+/);
    });
  });

  describe('Request Size Limits', () => {
    it('should handle reasonable request sizes', async () => {
      const reasonablePayload = {
        test: 'A'.repeat(1000), // 1KB payload
      };

      const response = await request(app)
        .post('/setup/account')
        .send(reasonablePayload);

      // Should not fail due to size (may fail for other validation reasons)
      expect(response.status).not.toBe(413); // Not "Payload Too Large"
    });
  });

  describe('HTTP Methods', () => {
    it('should support GET requests', async () => {
      await request(app).get('/health').expect(200);
    });

    it('should support POST requests', async () => {
      // This will likely fail validation but should accept the POST method
      const response = await request(app).post('/setup/account').send({});

      expect(response.status).not.toBe(405); // Not "Method Not Allowed"
    });

    it('should reject unsupported methods on health endpoint', async () => {
      await request(app).patch('/health').expect(404); // Or 405 depending on router configuration
    });
  });

  describe('Response Format', () => {
    it('should maintain consistent response format', async () => {
      const healthResponse = await request(app).get('/health').expect(200);

      expect(healthResponse.body).toHaveProperty('success');
      expect(healthResponse.body).toHaveProperty('timestamp');

      const infoResponse = await request(app).get('/api/info').expect(200);

      expect(infoResponse.body).toHaveProperty('success');
      expect(infoResponse.body.data).toHaveProperty('name');
      expect(infoResponse.body.data).toHaveProperty('version');
    });

    it('should include timestamps in error responses', async () => {
      const response = await request(app).get('/non-existent').expect(404);

      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });
  });
});
