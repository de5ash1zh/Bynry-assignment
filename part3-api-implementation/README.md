# Part 3: API Implementation

## Overview

This directory contains the production-ready implementation of the low-stock alerts API for the StockFlow B2B inventory management platform. The implementation includes comprehensive business logic, error handling, and performance optimization.

## Business Requirements

### Core Business Rules

1. **Low stock threshold varies by product type** - Hierarchical threshold system
2. **Only alert for products with recent sales activity** - 30-day configurable window
3. **Must handle multiple warehouses per company** - Warehouse-specific filtering
4. **Include supplier information for reordering** - Primary supplier details

### API Endpoints

#### Primary Endpoint

```
GET /api/companies/{company_id}/alerts/low-stock
```

**Query Parameters**:

- `warehouse_id` (optional): Filter alerts by specific warehouse
- `days_threshold` (optional, default: 30): Days to look back for sales activity

**Response Format**:

```json
{
  "alerts": [
    {
      "product_id": 123,
      "product_name": "Widget A",
      "sku": "WID-001",
      "warehouse_id": 456,
      "warehouse_name": "Main Warehouse",
      "current_stock": 5,
      "threshold": 20,
      "days_until_stockout": 12,
      "supplier": {
        "id": 789,
        "name": "Supplier Corp",
        "contact_email": "orders@supplier.com",
        "supplier_sku": "SUP-001",
        "lead_time_days": 7
      }
    }
  ],
  "total_alerts": 1,
  "company_id": 1,
  "company_name": "Test Company",
  "generated_at": "2024-01-15T10:30:00.000Z",
  "filters_applied": {
    "days_threshold": 30,
    "warehouse_id": null
  }
}
```

#### Summary Endpoint

```
GET /api/companies/{company_id}/alerts/low-stock/summary
```

**Response Format**:

```json
{
  "summary": {
    "total_low_stock_products": 5,
    "warehouses_with_alerts": 3,
    "out_of_stock_count": 2,
    "avg_current_stock": 3.2
  },
  "company_id": 1
}
```

## Implementation Details

### File Structure

- **`low_stock_alerts.js`** - Main API implementation
- **`tests/low_stock_alerts.test.js`** - Comprehensive test suite
- **`examples/example_usage.js`** - Client library and usage examples
- **`docs/LOW_STOCK_ALERTS_IMPLEMENTATION.md`** - Technical documentation

### Core Implementation Features

#### 1. Business Logic Implementation

```javascript
// Hierarchical threshold system
COALESCE(p.low_stock_threshold, pc.low_stock_threshold, 10) as final_threshold

// Recent sales activity filter
WHERE st.sale_date >= :recentSalesDate
HAVING COUNT(*) >= 1

// Days until stockout calculation
CASE
  WHEN COALESCE(psv.avg_daily_sales, 0) > 0
  THEN FLOOR(i.quantity / psv.avg_daily_sales)
  ELSE NULL
END as days_until_stockout
```

#### 2. Complex SQL Query with CTEs

```sql
WITH product_sales_velocity AS (
  SELECT
    st.product_id,
    st.warehouse_id,
    AVG(st.quantity_sold) as avg_daily_sales,
    COUNT(*) as sales_count
  FROM sales_transactions st
  WHERE st.sale_date >= :recentSalesDate
  GROUP BY st.product_id, st.warehouse_id
  HAVING COUNT(*) >= 1
),
product_thresholds AS (
  SELECT
    p.id as product_id,
    p.name as product_name,
    p.sku,
    COALESCE(p.low_stock_threshold, pc.low_stock_threshold, 10) as final_threshold
  FROM products p
  LEFT JOIN product_categories pc ON p.category_id = pc.id
  WHERE p.company_id = :companyId AND p.status = 'active'
)
-- Main query with joins
```

#### 3. Security Implementation

```javascript
// Input validation
const companyId = parseInt(company_id);
if (isNaN(companyId) || companyId <= 0) {
  return res.status(400).json({
    error: "Invalid company_id",
    message: "Company ID must be a positive integer",
  });
}

// Authorization check
if (!userHasCompanyAccess(req.currentUser.id, companyId)) {
  return res.status(403).json({
    error: "Unauthorized",
    message: "You don't have access to this company",
  });
}

// SQL injection prevention
const alerts = await sequelize.query(alertsQuery, {
  replacements: queryParams,
  type: sequelize.QueryTypes.SELECT,
});
```

#### 4. Error Handling

```javascript
try {
  // Main logic
} catch (error) {
  console.error("Error fetching low stock alerts:", error);

  if (error.name === "SequelizeConnectionError") {
    return res.status(503).json({
      error: "Database connection error",
      message: "Unable to connect to database",
    });
  }

  if (error.name === "SequelizeTimeoutError") {
    return res.status(408).json({
      error: "Request timeout",
      message: "Query took too long to execute",
    });
  }

  return res.status(500).json({
    error: "Internal server error",
    message: "An unexpected error occurred while fetching alerts",
  });
}
```

## Testing Strategy

### Test Coverage

- **Happy Path**: Basic functionality with valid data
- **Edge Cases**: Products without sales, suppliers, etc.
- **Validation**: Invalid parameters and error responses
- **Authorization**: Access control scenarios
- **Database Errors**: Connection and timeout scenarios
- **Filtering**: Warehouse and date threshold filtering

### Test Scenarios

```javascript
// Test low stock alerts for a company
it("should return low stock alerts for a company", async () => {
  // Setup test data with sales activity
  // Verify response format and business logic
});

// Test products without recent sales activity
it("should handle products without recent sales activity", async () => {
  // Products below threshold but no recent sales
  // Should be excluded from alerts
});

// Test warehouse filtering
it("should filter by warehouse when warehouse_id is provided", async () => {
  // Multiple warehouses with alerts
  // Filter by specific warehouse
});
```

## Performance Optimization

### Database Optimization

1. **Indexed Queries**: All joins use indexed columns
2. **Efficient Filtering**: Early filtering by company_id and status
3. **CTE Usage**: Avoid repeated subqueries
4. **Minimal Data Transfer**: Only select required columns

### Query Performance

- **Complex Query**: Uses CTEs for optimal performance
- **Indexing Strategy**: All frequently queried columns indexed
- **Join Optimization**: Efficient table joins
- **Parameter Binding**: Prevents SQL injection and improves performance

## Security Measures

### Input Validation

- **Parameter Validation**: All inputs validated and sanitized
- **Type Checking**: Proper data type validation
- **Range Validation**: Positive integers, valid dates
- **SQL Injection Prevention**: Parameterized queries

### Authorization

- **User Access Control**: Verify user has company access
- **Company Isolation**: Data scoped to user's company
- **Warehouse Filtering**: Optional warehouse-specific access

### Error Handling

- **Graceful Degradation**: Proper error responses
- **Information Security**: No internal details exposed
- **Logging**: Structured error logging for monitoring

## Edge Cases Handled

### 1. Data Validation

- Invalid company_id or warehouse_id
- Non-existent companies
- Negative or zero IDs
- Malformed parameters

### 2. Business Logic

- Products without recent sales activity
- Products without suppliers
- Zero stock products
- Products with no sales velocity

### 3. Database Issues

- Connection errors
- Query timeouts
- Missing data
- Inactive products/warehouses

### 4. Authorization

- Unauthorized access
- Missing user context
- Cross-company access attempts

## Usage Examples

### Basic Usage

```javascript
const { LowStockAlertsClient } = require("./examples/example_usage");

const client = new LowStockAlertsClient("https://api.example.com", "token");
const alerts = await client.getLowStockAlerts(123);
```

### Dashboard Integration

```javascript
const [alerts, summary] = await Promise.all([
  client.getLowStockAlerts(companyId),
  client.getLowStockSummary(companyId),
]);

const dashboardData = {
  overview: summary.summary,
  criticalAlerts: alerts.alerts.filter(
    (alert) =>
      alert.days_until_stockout !== null && alert.days_until_stockout <= 7
  ),
  allAlerts: alerts.alerts,
};
```

### Automated Monitoring

```javascript
const alerts = await client.getLowStockAlerts(companyId);
const criticalAlerts = alerts.alerts.filter(
  (alert) =>
    alert.days_until_stockout !== null && alert.days_until_stockout <= 7
);

if (criticalAlerts.length > 0) {
  // Send notifications, create purchase orders, etc.
}
```

## Future Enhancements

### Potential Improvements

1. **Caching**: Redis cache for frequently accessed alerts
2. **Pagination**: Handle large result sets
3. **Real-time Updates**: WebSocket integration
4. **Advanced Filtering**: Date ranges, product categories
5. **Alert History**: Track alert generation and resolution
6. **Email Notifications**: Automatic alert notifications
7. **Dashboard Integration**: Real-time dashboard updates

### Configuration Options

1. **Threshold Overrides**: Company-level customization
2. **Alert Frequency**: Configurable generation schedules
3. **Notification Preferences**: User-specific preferences
4. **Integration Hooks**: Webhook support

## Notes

- Production-ready implementation
- Comprehensive error handling
- Performance optimized
- Security focused
- Well documented
- Extensively tested
- Scalable architecture
