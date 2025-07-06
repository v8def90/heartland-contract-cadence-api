/**
 * Local Development Server
 *
 * @description HTTP server for local development and testing.
 * Starts the Express app on a specified port.
 */

import { app } from './app';

const PORT = process.env.PORT || 3000;

/**
 * Start the HTTP server
 *
 * @description Starts the Express application on the specified port.
 */
const startServer = (): void => {
  app.listen(PORT, () => {
    console.log('🚀 Flow Heart Token API Server Started');
    console.log(`📡 Server running on http://localhost:${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/docs`);
    console.log(`💚 Health Check: http://localhost:${PORT}/health`);
    console.log(`ℹ️  API Info: http://localhost:${PORT}/api/info`);
    console.log(`🔗 Test Endpoint: http://localhost:${PORT}/api/v1/test`);
    console.log('');
    console.log('Available API Endpoints:');
    console.log('  GET /balance/{address}');
    console.log('  GET /balance/{address}/setup-status');
    console.log('  GET /balance/batch?addresses=addr1,addr2');
    console.log('  GET /tax-rate');
    console.log('  GET /pause-status');
    console.log('  GET /tax-calculation/{amount}');
    console.log('  GET /total-supply');
    console.log('  GET /treasury-account');
    console.log('  GET /admin-capabilities/{address}');
    console.log('');
    console.log('Press Ctrl+C to stop the server');
  });
};

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n📴 Shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n📴 Shutting down server...');
  process.exit(0);
});

// Start the server
startServer();
