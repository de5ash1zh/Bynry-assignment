# Tests

## Overview

This directory contains comprehensive test suites for the StockFlow B2B inventory management platform. The tests cover all three parts of the assignment with a focus on production-ready quality assurance.

## Test Files

### `low_stock_alerts.test.js`
Comprehensive test suite for the low-stock alerts API implementation.

**Test Coverage:**
- Happy path scenarios
- Edge cases and error conditions
- Business rule validation
- Performance testing
- Security testing

## Testing Strategy

### Test Categories

#### 1. Unit Tests
- **Function Testing**: Individual function behavior
- **Input Validation**: Parameter validation and sanitization
- **Error Handling**: Exception scenarios and error responses
- **Business Logic**: Core business rule implementation

#### 2. Integration Tests
- **API Endpoints**: Full request-response cycle
- **Database Integration**: Database operations and queries
- **Authentication**: User access and authorization
- **Data Flow**: End-to-end data processing

#### 3. Edge Case Tests
- **Invalid Inputs**: Malformed requests and parameters
- **Boundary Conditions**: Edge values and limits
- **Error Scenarios**: Database failures, timeouts
- **Security Cases**: Unauthorized access attempts

## Test Scenarios

### Low Stock Alerts API Tests

#### Happy Path Scenarios
```javascript
it('should return low stock alerts for a company', async () => {
  // Setup test data with sales activity
  // Verify response format and business logic
  // Check supplier information inclusion
});
```

#### Business Rule Validation
```javascript
it('should handle products without recent sales activity', async () => {
  // Products below threshold but no recent sales
  // Should be excluded from alerts (business rule)
});

it('should use hierarchical threshold system', async () => {
  // Test product-specific vs category vs default thresholds
});
```

#### Edge Cases
```javascript
it('should handle products without suppliers gracefully', async () => {
  // Products with no supplier information
  // Supplier field should be null
});

it('should validate company_id parameter', async () => {
  // Invalid company IDs
  // Proper error responses
});
```

#### Security Tests
```javascript
it('should handle unauthorized access', async () => {
  // Users without company access
  // Proper 403 responses
});

it('should prevent SQL injection', async () => {
  // Malicious input attempts
  // Parameterized query validation
});
```

#### Performance Tests
```javascript
it('should handle database connection errors gracefully', async () => {
  // Database connection failures
  // Proper error responses
});

it('should handle query timeout errors', async () => {
  // Long-running queries
  // Timeout handling
});
```

## Test Setup

### Prerequisites
```bash
npm install --save-dev jest supertest
```

### Test Configuration
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
};
```

### Database Setup
```javascript
// Test database configuration
beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

beforeEach(async () => {
  await sequelize.truncate({ cascade: true });
});
```

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test File
```bash
npm test tests/low_stock_alerts.test.js
```

### With Coverage
```bash
npm test -- --coverage
```

### Watch Mode
```bash
npm test -- --watch
```

## Test Metrics

### Coverage Goals
- **Line Coverage**: > 90%
- **Branch Coverage**: > 85%
- **Function Coverage**: > 95%

### Performance Benchmarks
- **Response Time**: < 500ms for standard queries
- **Memory Usage**: < 100MB for test suite
- **Database Queries**: Optimized query count

## Test Data Management

### Test Data Creation
```javascript
// Helper functions for test data
const createTestCompany = async () => {
  return await sequelize.models.Company.create({
    name: 'Test Company',
    status: 'active'
  });
};

const createTestProduct = async (companyId) => {
  return await sequelize.models.Product.create({
    company_id: companyId,
    name: 'Test Product',
    sku: 'TEST-001',
    price: 19.99,
    status: 'active'
  });
};
```

### Data Cleanup
```javascript
// Automatic cleanup after each test
afterEach(async () => {
  await sequelize.truncate({ cascade: true });
});
```

## Security Testing

### Authentication Tests
- Valid token validation
- Invalid token rejection
- Expired token handling
- Missing token scenarios

### Authorization Tests
- Company access validation
- Warehouse access control
- Cross-company access prevention
- Role-based permissions

### Input Validation Tests
- SQL injection attempts
- XSS prevention
- Parameter tampering
- Malformed JSON handling

## Performance Testing

### Load Testing
- Concurrent request handling
- Database connection pooling
- Memory usage monitoring
- Response time consistency

### Stress Testing
- Large dataset handling
- High-frequency requests
- Database timeout scenarios
- Resource exhaustion

## Test Utilities

### Mock Helpers
```javascript
// Mock authentication
jest.mock('../utils/authHelpers', () => ({
  userHasCompanyAccess: jest.fn().mockReturnValue(true)
}));

// Mock database errors
jest.spyOn(sequelize, 'query').mockRejectedValueOnce({
  name: 'SequelizeConnectionError',
  message: 'Connection failed'
});
```

### Assertion Helpers
```javascript
// Custom assertions for API responses
expect(response.body).toHaveProperty('alerts');
expect(response.body.alerts).toBeInstanceOf(Array);
expect(response.body.total_alerts).toBeGreaterThanOrEqual(0);
```

## Test Documentation

### Test Naming Convention
- **Feature**: `should [expected behavior]`
- **Edge Case**: `should handle [scenario]`
- **Error**: `should return [error] when [condition]`

### Test Structure
```javascript
describe('Feature Name', () => {
  describe('when condition is met', () => {
    it('should behave as expected', async () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

## Quality Assurance

### Code Quality
- **Linting**: ESLint configuration for test files
- **Formatting**: Prettier for consistent code style
- **Type Checking**: JSDoc comments for type safety

### Test Quality
- **Maintainability**: Clear test structure and naming
- **Reliability**: Deterministic test results
- **Performance**: Fast test execution
- **Coverage**: Comprehensive scenario coverage

## Continuous Integration

### CI/CD Integration
- **Automated Testing**: Run tests on every commit
- **Coverage Reporting**: Track coverage trends
- **Performance Monitoring**: Track test performance
- **Quality Gates**: Block deployment on test failures

### Test Environment
- **Isolation**: Separate test database
- **Consistency**: Deterministic test environment
- **Speed**: Optimized for fast feedback
- **Reliability**: Stable test infrastructure

## Notes

- Tests use Jest as the testing framework
- Supertest for HTTP endpoint testing
- Comprehensive mock strategy for external dependencies
- Production-like test data and scenarios
- Performance and security testing included
- Continuous integration ready
