/**
 * Express Application Unit Tests
 */

import request from 'supertest';
import { app } from '../../src/app';

// Mock swagger-ui-express
jest.mock('swagger-ui-express', () => ({
  serve: jest.fn(),
  setup: jest.fn(
    () => (req: unknown, res: { send: (data: string) => void }) =>
      res.send('Mock Swagger UI')
  ),
}));

process.env.HEART_CONTRACT_ADDRESS = '0x58f9e6153690c852';
process.env.NODE_ENV = 'test';

describe('Express Application', () => {
  describe('Health Check Endpoint', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('heartland-contract-cadence-api');
      expect(response.body.version).toBe('1.0.0');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('API Info Endpoint', () => {
    it('should return API information', async () => {
      const response = await request(app).get('/api/info');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Flow Heart Token Control API');
      expect(response.body.data.version).toBe('1.0.0');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app).get('/non-existent-route');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Application Configuration', () => {
    it('should have Express app instance', () => {
      expect(app).toBeDefined();
      expect(typeof app).toBe('function');
    });
  });
});
