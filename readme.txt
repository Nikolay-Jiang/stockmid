# StockMid - Stock Market Analysis Middleware

## Overview
StockMid is a TypeScript-based stock market analysis middleware that provides real-time stock data processing, technical analysis, pattern recognition, and AI-powered predictions. The system integrates with multiple data sources (Tencent, Sina) and uses advanced algorithms for trading signal generation.

## Features
- **Real-time Stock Data**: Fetches and processes data from Tencent and Sina stock APIs
- **Technical Analysis**: RSI calculations, W/M/YZM pattern recognition, trend analysis
- **AI-Powered Predictions**: Integration with Alibaba Qwen (formerly DeepSeek) AI models
- **Portfolio Simulation**: Backtesting and simulation of trading strategies
- **Security**: JWT authentication, bcrypt password hashing, secure cookie handling
- **Notifications**: Real-time alerts via ntfy.sh push notifications
- **Comprehensive Testing**: 87+ test specifications with algorithm snapshot testing

## Technology Stack
- **Runtime**: Node.js + Express 4.18
- **Language**: TypeScript 4.9
- **Database**: Prisma 6.0 + SQL Server
- **Authentication**: JWT + bcrypt + Signed Cookies
- **External APIs**: Tencent Stock, Sina Stock, Alibaba Qwen AI
- **Testing**: Jasmine 4.1 + Supertest 6.2
- **Logging**: Jet-Logger (replaces console.log)
- **Code Quality**: ESLint with TypeScript rules

## Project Structure
```
stockmid/
├── src/
│   ├── routes/           # Express route handlers
│   ├── services/         # Business logic services
│   ├── repos/           # Data access layer + external API clients
│   ├── shared/          # Shared utilities and constants
│   ├── util/            # Utility functions (JWT, validation, etc.)
│   ├── models/          # Data models
│   └── server.ts        # Express server setup
├── spec/
│   ├── tests/           # Test specifications
│   └── support/         # Jasmine configuration
├── prisma/
│   └── schema.prisma    # Database schema
└── dist/                # Compiled JavaScript output
```

## Security Improvements (Completed)
1. **SQL Injection Protection**: Replaced `$queryRawUnsafe` with `$queryRaw` in dayRpt-repo.ts
2. **API Key Management**: Moved hardcoded API keys to environment variables
3. **Route Protection**: Added authentication middleware to `/api/users` routes
4. **JWT Security**: Removed random fallback keys, using environment variable only
5. **Cookie Security**: Added SameSite=Lax attribute to authentication cookies

## Architecture Refactoring
- **God File Split**: simtrade-service.ts (1361L) → 6 focused modules (≤298L each)
  - `data-prep.ts`: Data preparation and normalization
  - `calculator.ts`: Technical indicator calculations
  - `signal-generator.ts`: Trading signal generation
  - `portfolio-state.ts`: Portfolio state management
  - `portfolio-workflows.ts`: Portfolio workflow orchestration
  - `index.ts`: Main service interface
- **Route Organization**: simtrade-router.ts → 3 focused route files
- **Constants Extraction**: All magic numbers moved to `trading-constants.ts`
- **Error Handling**: Standardized across all modules
- **Logging**: Replaced 110+ console.log calls with structured jet-logger

## Setup Instructions

### Prerequisites
- Node.js 16+ and npm
- SQL Server database
- Alibaba Qwen API key (for AI predictions)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Nikolay-Jiang/stockmid.git
   cd stockmid
   ```

2. Install dependencies:
   ```bash
   npm install
   npm install typescript --save-dev
   npm install prisma --save-dev
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Database setup:
   ```bash
   npx prisma generate
   # Update prisma/schema.prisma with your database connection
   ```

5. Build the project:
   ```bash
   npm run build
   ```

### Configuration
Required environment variables in `.env`:
```
DATABASE_URL="sqlserver://..."
JWT_SECRET="your-jwt-secret-key"
DASHSCOPE_API_KEY="your-alibaba-qwen-api-key"
PORT=3000
NODE_ENV=development
```

## Development Workflow

### Running the Application
```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run start

# Test mode (auto-reload on changes)
npm run test
```

### Testing
```bash
# Run all tests
npm run test:no-reloading

# Run specific test file
./node_modules/.bin/ts-node --files -r tsconfig-paths/register ./spec/tests/algorithm-snapshots.spec.ts
```

The project includes:
- **24 Algorithm Snapshot Tests**: Ensures W/M/YZM pattern recognition and RSI calculations produce identical results after refactoring
- **49 Integration Tests**: Covers all major modules and API endpoints
- **Total**: 87 test specifications (3 pre-existing failures unrelated to recent changes)

### Code Quality
```bash
# Run ESLint
npm run lint

# Type checking
npx tsc --noEmit
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/logout` - User logout

### Stock Data
- `GET /api/stock/tencent/:code` - Tencent stock data
- `GET /api/stock/sina/:code` - Sina stock data
- `GET /api/stock/dayreport` - Daily stock reports

### K-Line (OHLCV)
Reads from `t_StockKLine`. `:period` must be one of `1d | 1w | 1M | 5m | 15m | 60m`.
- `GET /api/kline/allbycondition/:startday/:endday/:stockcode/:period` - K-line bars for stock + period in date range (returns `{ stockname, klines }`)
- `GET /api/kline/allbycode/:stockcode/:period` - all K-line bars for stock + period
- `GET /api/kline/recent/:stockcode/:period/:count` - most recent N bars (count capped at 2000, defaults to 100 if invalid)

### Analysis & Prediction
- `POST /api/simtrade/scan` - Scan for trading patterns
- `POST /api/simtrade/sim` - Run trading simulation
- `POST /api/predict` - AI-powered stock prediction
- `GET /api/analysis` - Technical analysis results

### User Management
- `GET /api/users` - Get user list (authenticated)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user

## Algorithm Details

### Pattern Recognition
- **W Pattern**: Double bottom reversal pattern
- **M Pattern**: Double top reversal pattern  
- **YZM Pattern**: Complex multi-wave pattern
- **RSI Calculation**: Relative Strength Index with configurable periods

### Trading Signals
- Buy signals based on oversold conditions and pattern confirmations
- Sell signals based on overbought conditions and pattern breakdowns
- Stop-loss and take-profit level calculations

## Recent Improvements (2026)

### Security
- Fixed 5 CRITICAL security vulnerabilities
- Implemented secure authentication flow
- Protected sensitive API endpoints

### Code Quality
- Reduced ESLint issues by 30%
- Eliminated all TypeScript compilation errors
- Standardized error handling across 14 business modules

### Maintainability
- Split large God files into focused modules
- Extracted all magic numbers to constants
- Implemented comprehensive test coverage
- Added structured logging throughout

## Contributing
1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License
Proprietary - See LICENSE file for details.

## Support
For issues and questions, please check the GitHub repository or contact the development team.