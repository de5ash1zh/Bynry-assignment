# Inventory Management System for B2B SaaS - Assignment

## Assignment Overview

This repository contains a complete implementation of the StockFlow B2B inventory management platform assignment. The assignment is organized into three main parts, each addressing specific technical challenges in building a production-ready inventory management system.

## Project Structure

```
Bynry-assignment/
├── README.md                           # This overview file
├── part1-code-review/                  # Part 1: Code Review & Debugging
│   └── corrected_implementation.js     # Fixed product creation endpoint
├── part2-database-design/              # Part 2: Database Design
│   └── db_design.js                    # Complete database schema
├── part3-api-implementation/           # Part 3: API Implementation
│   └── low_stock_alerts.js            # Low stock alerts API
├── tests/                              # Test files
│   └── low_stock_alerts.test.js       # Comprehensive test suite
├── examples/                           # Usage examples
│   └── example_usage.js               # Client library and examples
└── docs/                               # Documentation
    ├── COMPLETE_ASSIGNMENT_SUMMARY.md  # Complete assignment summary
    └── LOW_STOCK_ALERTS_IMPLEMENTATION.md # Technical implementation guide
```

## Assignment Parts

### Part 1: Code Review & Debugging (30 minutes)

**Location**: `part1-code-review/`

**Task**: Identify and fix issues in a broken product creation API endpoint.

**Deliverables**:

- Issues identified and documented
- Production impact analysis
- Corrected implementation in Node.js

**Key Issues Found**:

- No input validation
- Missing error handling
- Security vulnerabilities
- Data integrity problems

### Part 2: Database Design (25 minutes)

**Location**: `part2-database-design/`

**Task**: Design a comprehensive database schema for the inventory management system.

**Deliverables**:

- Complete database schema with 11 tables
- Proper relationships and constraints
- Indexing strategy
- Missing requirements identified

**Tables Designed**:

- Companies, Users, Warehouses
- Products, Categories, Bundles
- Suppliers, Inventory, Sales
- Audit trails and movements

### Part 3: API Implementation (35 minutes)

**Location**: `part3-api-implementation/`

**Task**: Implement low-stock alerts API with specific business rules.

**Deliverables**:

- Production-ready API endpoints
- Business rules implementation
- Comprehensive error handling
- Performance optimization

**Endpoints**:

- `GET /api/companies/{company_id}/alerts/low-stock`
- `GET /api/companies/{company_id}/alerts/low-stock/summary`

## Quick Start

### Prerequisites

- Node.js (v14+)
- PostgreSQL database
- npm or yarn

### Installation

```bash
# Install dependencies
npm install express sequelize joi supertest jest

# Set up database (see db_design.js for schema)
# Configure environment variables
# Run tests
npm test
```

### Running the API

```bash
# Start the server
node part3-api-implementation/low_stock_alerts.js

# Test the endpoints
curl http://localhost:3000/api/companies/1/alerts/low-stock
```

## Documentation

### Complete Assignment Summary

**File**: `docs/COMPLETE_ASSIGNMENT_SUMMARY.md`

Comprehensive overview of all three parts, including:

- Implementation status
- Key decisions and reasoning
- Assumptions made
- Evaluation criteria coverage
- Live session preparation

### Technical Implementation Guide

**File**: `docs/LOW_STOCK_ALERTS_IMPLEMENTATION.md`

Detailed technical documentation covering:

- Business rules implementation
- Database query strategy
- Performance optimizations
- Security measures
- Edge case handling
- Future enhancements

## Testing

### Test Suite

**File**: `tests/low_stock_alerts.test.js`

Comprehensive test coverage including:

- Happy path scenarios
- Edge cases and error conditions
- Business rule validation
- Performance testing
- Security testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test tests/low_stock_alerts.test.js
```

## Examples

### Usage Examples

**File**: `examples/example_usage.js`

Client library and usage examples including:

- Basic API usage
- Dashboard integration
- Automated monitoring
- Error handling patterns

### Example Usage

```javascript
const { LowStockAlertsClient } = require("./examples/example_usage");

const client = new LowStockAlertsClient("https://api.example.com", "token");
const alerts = await client.getLowStockAlerts(123);
```

## Evaluation Criteria Coverage

### Technical Skills

- **Code Quality**: Production-ready implementations
- **Database Design**: Comprehensive schema with proper relationships
- **API Design**: RESTful endpoints with proper error handling
- **Problem-Solving**: Systematic approach to edge cases

### Communication

- **Ambiguity Identification**: Clear questions about missing requirements
- **Technical Decisions**: Well-documented reasoning
- **Professional Style**: Clear, structured documentation

### Business Understanding

- **Real-world Constraints**: Security, performance, scalability
- **User Experience**: Proper error messages and response formats
- **Scalability**: Database indexing, query optimization

## Key Features Implemented

### Security

- Input validation and sanitization
- Authentication and authorization
- SQL injection prevention
- Error handling without information leakage

### Performance

- Database query optimization
- Proper indexing strategy
- Efficient joins and CTEs
- Caching considerations

### Scalability

- Multi-tenant architecture
- Horizontal scaling support
- Database performance optimization
- Monitoring and alerting ready

### Maintainability

- Clear code structure
- Comprehensive documentation
- Extensive test coverage
- Error handling patterns

## Live Session Preparation

The implementation is ready for live discussion covering:

- Debugging approach and thought process
- Database design trade-offs
- Edge case handling strategies
- Alternative approaches considered
- Questions about missing requirements

## Notes

- All implementations use Node.js with Express (as requested)
- Database schema supports PostgreSQL
- Comprehensive error handling throughout
- Production-ready code quality
- Extensive documentation and examples

---

**Assignment Status**: COMPLETE  
**Ready for Evaluation**: YES  
**Live Session Ready**: YES
