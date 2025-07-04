# Flow Heart Token Control API

TypeScript-based Serverless API for Flow Heart Token Contract interaction using AWS Lambda, Serverless Framework, and tsoa for OpenAPI documentation.

## 🚀 Features

- **TypeScript**: Full type safety with strict mode enabled
- **Serverless Framework**: AWS Lambda deployment with infrastructure as code
- **Flow Blockchain**: Integration with Flow network using @onflow/fcl
- **OpenAPI**: Auto-generated API documentation with tsoa
- **JWT Authentication**: Secure authentication for protected endpoints
- **Tax System**: Built-in tax calculation for Heart token transfers
- **Comprehensive Testing**: Unit and integration tests with 80%+ coverage
- **Code Quality**: ESLint, Prettier, and TSDoc for maintainable code

## 📋 Prerequisites

- Node.js 22.x (Latest LTS)
- pnpm (Fast, disk space efficient package manager)
- AWS CLI configured with appropriate credentials
- Serverless Framework CLI

## 🔧 Installation

1. **Clone the repository**

   ```bash
   cd heartland-contract-cadence-api
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Environment Setup**
   Create a `.env` file based on the following template:

   ```bash
   # Flow Network Configuration
   FLOW_ACCESS_NODE=https://rest-testnet.onflow.org
   HEART_CONTRACT_ADDRESS=0x58f9e6153690c852
   FLOW_DISCOVERY_WALLET=https://fcl-discovery.onflow.org/testnet/authn
   FLOW_NETWORK=testnet
   FLOW_GAS_LIMIT=1000
   FLOW_REQUEST_TIMEOUT=30000

   # Authentication & Security
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRATION=24h

   # AWS Configuration
   AWS_REGION=ap-northeast-1
   STAGE=dev

   # Application Configuration
   NODE_ENV=development
   PORT=3000
   DEBUG=true
   ```

4. **AWS Credentials**
   Configure AWS credentials for deployment:
   ```bash
   aws configure
   ```

## 🏗️ Project Structure

```
heartland-contract-cadence-api/
├── src/
│   ├── controllers/       # tsoa Controllers with decorators
│   │   ├── queries/       # Read-only operations (@Get)
│   │   ├── transactions/  # State-changing operations (@Post)
│   │   └── auth/          # Authentication endpoints
│   ├── models/            # TypeScript interfaces & types
│   │   ├── requests/      # Request DTOs
│   │   ├── responses/     # Response DTOs
│   │   └── flow/          # Flow-specific types
│   ├── services/          # Business logic services
│   ├── utils/             # Utility functions
│   ├── config/            # Configuration files
│   ├── middleware/        # Express-like middleware for Lambda
│   └── handlers/          # Lambda function handlers
├── tests/                 # Unit and integration tests
├── scripts/              # Flow scripts (read operations)
├── transactions/         # Flow transactions (write operations)
├── build/                # tsoa generated files
├── docs/                 # API documentation
└── dist/                 # Compiled JavaScript output
```

## 🛠️ Development Commands

```bash
# Development
pnpm run dev                    # Start development server with hot reload
pnpm run build                  # Compile TypeScript to JavaScript
pnpm run start                  # Run compiled application

# Code Quality
pnpm run type-check            # TypeScript compilation check
pnpm run lint                  # ESLint code analysis
pnpm run lint:fix             # ESLint auto-fix
pnpm run format               # Prettier code formatting

# Testing
pnpm run test                 # Run all tests with coverage
pnpm run test:watch          # Run tests in watch mode

# API Documentation
pnpm run tsoa:spec           # Generate OpenAPI specification
pnpm run tsoa:routes         # Generate API routes
pnpm run tsoa:spec-and-routes # Generate both spec and routes

# Serverless Deployment
pnpm run deploy:dev          # Deploy to development stage
pnpm run deploy:prod         # Deploy to production stage
pnpm run offline             # Run serverless offline for local testing
```

## 📚 API Documentation

After running `pnpm run tsoa:spec-and-routes`, the API documentation will be available at:

- **Local Development**: http://localhost:3000/docs
- **Deployed API**: https://your-api-gateway-url/docs

## 🔑 API Endpoints

### Public Endpoints (No Authentication Required)

#### Balance & Information Queries

- `GET /heart-tokens/balance/{address}` - Get HEART token balance
- `GET /heart-tokens/total-supply` - Get total token supply
- `GET /heart-tokens/tax-rate` - Get current tax rate
- `GET /heart-tokens/treasury-account` - Get treasury account address
- `GET /heart-tokens/pause-status` - Check if contract is paused
- `GET /heart-tokens/tax-calculation/{amount}` - Calculate tax for amount

#### Health & Info

- `GET /health` - API health check
- `GET /api/info` - API information

### Protected Endpoints (JWT Authentication Required)

#### Token Operations

- `POST /heart-tokens/transfer` - Transfer tokens with tax
- `POST /heart-tokens/batch-transfer` - Batch transfer to multiple recipients
- `POST /heart-tokens/setup-account` - Setup HEART vault for address

#### Administrative Operations (Admin Only)

- `POST /heart-tokens/mint-tokens` - Mint new tokens
- `POST /heart-tokens/burn-tokens` - Burn tokens
- `POST /heart-tokens/pause` - Pause contract
- `POST /heart-tokens/unpause` - Unpause contract
- `POST /heart-tokens/set-tax-rate` - Update tax rate
- `POST /heart-tokens/set-treasury` - Update treasury account

#### Authentication

- `POST /auth/login` - Generate JWT token
- `POST /auth/verify` - Verify JWT token

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. To access protected endpoints:

1. **Login**: Send a POST request to `/auth/login` with your Flow address and signature
2. **Get Token**: Receive a JWT token in the response
3. **Use Token**: Include the token in the Authorization header: `Authorization: Bearer <your-jwt-token>`

## 🌊 Flow Integration

### Contract Information

- **Network**: Flow Testnet
- **Contract Address**: `0x58f9e6153690c852`
- **Contract Name**: Heart
- **Token Symbol**: HEART
- **Decimals**: 8

### Key Features

- **Tax System**: 5% tax on all transfers (configurable by admin)
- **Treasury**: Tax collected goes to designated treasury account
- **Pause Functionality**: Contract can be paused for maintenance
- **Role-based Access**: Admin, Minter, and Pauser roles

## 🧪 Testing

```bash
# Run all tests
pnpm run test

# Run tests with coverage report
pnpm run test -- --coverage

# Run specific test file
pnpm run test src/services/flowService.test.ts

# Run tests in watch mode
pnpm run test:watch
```

### Testing Requirements

- Minimum 80% test coverage (enforced)
- Unit tests for all services and utilities
- Integration tests for API endpoints
- Mock Flow responses for consistent testing

## 🚀 Deployment

### Development Deployment

```bash
pnpm run deploy:dev
```

### Production Deployment

```bash
pnpm run deploy:prod
```

### Environment-specific Configuration

- Development: `dev` stage with debug logging enabled
- Production: `prod` stage with optimized performance settings

## 📊 Monitoring & Logging

- **CloudWatch**: AWS CloudWatch for Lambda monitoring
- **Structured Logging**: JSON-formatted logs for easy parsing
- **Error Tracking**: Comprehensive error handling with context
- **Performance Metrics**: API response times and success rates

## 🔧 Configuration

### Flow Network

- Testnet: `https://rest-testnet.onflow.org`
- Mainnet: `https://rest-mainnet.onflow.org`

### AWS Settings

- Region: `ap-northeast-1` (Tokyo)
- Runtime: Node.js 22.x
- Memory: 512MB
- Timeout: 30 seconds

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `pnpm run test`
5. Check code quality: `pnpm run lint && pnpm run type-check`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Code Standards

- TypeScript strict mode (no `any` types)
- ESLint and Prettier for code formatting
- TSDoc comments for all public APIs
- 80%+ test coverage required
- All commits must pass CI checks

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Flow Documentation](https://developers.flow.com/)
- [FCL Documentation](https://docs.onflow.org/fcl/)
- [Serverless Framework](https://www.serverless.com/framework/docs/)
- [tsoa Documentation](https://tsoa-community.github.io/docs/)

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [API Documentation](http://localhost:3000/docs) for endpoint details
2. Review the TypeScript types in `src/models/` for request/response formats
3. Check the logs in CloudWatch for deployed applications
4. Create an issue in the repository for bugs or feature requests

---

**Built with ❤️ for the Flow ecosystem**
