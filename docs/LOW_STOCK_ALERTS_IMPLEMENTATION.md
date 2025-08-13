# Low Stock Alerts API Implementation

## Overview

This implementation provides a comprehensive low-stock alerts system that follows the specified business rules and handles various edge cases. The API is built using Node.js, Express, and Sequelize ORM.

## Business Rules Implementation

### 1. Low Stock Threshold Varies by Product Type

- **Implementation**: Uses a hierarchical threshold system:
  - Product-specific threshold (highest priority)
  - Category-level threshold (fallback)
  - Default threshold of 10 (safety net)
- **Code Location**: `product_thresholds` CTE in the main query
- **Logic**: `COALESCE(p.low_stock_threshold, pc.low_stock_threshold, 10)`

### 2. Only Alert for Products with Recent Sales Activity

- **Implementation**: Uses a 30-day rolling window (configurable via `days_threshold` parameter)
- **Code Location**: `product_sales_velocity` CTE with `HAVING COUNT(*) >= 1`
- **Logic**: Only includes products that have at least one sale in the recent period

### 3. Handle Multiple Warehouses per Company

- **Implementation**:
  - Joins with warehouses table and filters by company_id
  - Optional warehouse filtering via query parameter
  - Returns warehouse-specific alerts
- **Code Location**: Main query with warehouse joins and filtering

### 4. Include Supplier Information for Reordering

- **Implementation**:
  - Joins with product_suppliers and suppliers tables
  - Prioritizes primary suppliers (`is_primary = true`)
  - Includes lead time and supplier SKU information
- **Code Location**: Supplier joins in main query

## API Endpoints

### Primary Endpoint

```
GET /api/companies/{company_id}/alerts/low-stock
```

**Query Parameters:**

- `warehouse_id` (optional): Filter alerts by specific warehouse
- `days_threshold` (optional, default: 30): Days to look back for sales activity

**Response Format:**

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

### Summary Endpoint

```
GET /api/companies/{company_id}/alerts/low-stock/summary
```

**Response Format:**

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

## Technical Implementation Details

### Database Query Strategy

The implementation uses a complex SQL query with Common Table Expressions (CTEs) for optimal performance:

1. **product_sales_velocity CTE**: Calculates average daily sales for products with recent activity
2. **product_thresholds CTE**: Determines the appropriate threshold for each product
3. **Main Query**: Joins all necessary tables and applies business logic

### Performance Optimizations

1. **Indexed Columns**: All joins use indexed columns (product_id, warehouse_id, company_id)
2. **Efficient Filtering**: Early filtering by company_id and status
3. **Minimal Data Transfer**: Only selects required columns
4. **Query Optimization**: Uses CTEs to avoid repeated subqueries

### Security Measures

1. **Input Validation**: All parameters are validated and sanitized
2. **Authorization**: Checks user access to company before processing
3. **SQL Injection Prevention**: Uses parameterized queries
4. **Error Handling**: Graceful error responses without exposing internals

## Edge Cases Handled

### 1. Data Validation Edge Cases

- **Invalid company_id**: Returns 400 with clear error message
- **Invalid warehouse_id**: Returns 400 with clear error message
- **Non-existent company**: Returns 404
- **Negative or zero IDs**: Validated and rejected

### 2. Business Logic Edge Cases

- **Products without recent sales**: Excluded from alerts (business rule)
- **Products without suppliers**: Supplier field set to null
- **Zero stock products**: Included in alerts with days_until_stockout = 0
- **Products with no sales velocity**: days_until_stockout set to null

### 3. Database Edge Cases

- **Connection errors**: Returns 503 Service Unavailable
- **Query timeouts**: Returns 408 Request Timeout
- **Missing data**: Graceful handling with null values
- **Inactive products/warehouses**: Excluded from results

### 4. Authorization Edge Cases

- **Unauthorized access**: Returns 403 Forbidden
- **Missing user context**: Handled by auth middleware
- **Cross-company access**: Prevented by company_id filtering

## Error Handling Strategy

### HTTP Status Codes

- **200**: Success
- **400**: Bad Request (validation errors)
- **403**: Forbidden (authorization errors)
- **404**: Not Found (company doesn't exist)
- **408**: Request Timeout (query timeout)
- **503**: Service Unavailable (database connection issues)
- **500**: Internal Server Error (unexpected errors)

### Error Response Format

```json
{
  "error": "Error type",
  "message": "Human-readable error description"
}
```

## Testing Strategy

### Unit Tests Coverage

1. **Happy Path**: Basic functionality with valid data
2. **Edge Cases**: Products without sales, suppliers, etc.
3. **Validation**: Invalid parameters and error responses
4. **Authorization**: Access control scenarios
5. **Database Errors**: Connection and timeout scenarios
6. **Filtering**: Warehouse and date threshold filtering

### Test Data Setup

- Creates realistic test scenarios
- Tests multiple warehouses and products
- Validates business rule enforcement
- Ensures proper error handling

## Scalability Considerations

### Database Performance

1. **Indexing Strategy**: All frequently queried columns are indexed
2. **Query Optimization**: Uses efficient joins and CTEs
3. **Pagination Ready**: Query structure supports future pagination
4. **Caching Potential**: Results can be cached for dashboard views

### Application Performance

1. **Async/Await**: Non-blocking database operations
2. **Error Boundaries**: Graceful degradation under load
3. **Resource Management**: Proper connection handling
4. **Monitoring Ready**: Structured logging for performance tracking

## Future Enhancements

### Potential Improvements

1. **Caching**: Redis cache for frequently accessed alerts
2. **Pagination**: Handle large result sets
3. **Real-time Updates**: WebSocket integration for live alerts
4. **Advanced Filtering**: Date ranges, product categories, etc.
5. **Alert History**: Track alert generation and resolution
6. **Email Notifications**: Automatic alert notifications
7. **Dashboard Integration**: Real-time dashboard updates

### Configuration Options

1. **Threshold Overrides**: Company-level threshold customization
2. **Alert Frequency**: Configurable alert generation schedules
3. **Notification Preferences**: User-specific alert preferences
4. **Integration Hooks**: Webhook support for external systems

## Deployment Considerations

### Environment Variables

- Database connection strings
- Authentication secrets
- Logging configuration
- Performance tuning parameters

### Monitoring

- Query performance metrics
- Error rate tracking
- Response time monitoring
- Alert generation frequency

### Security

- API rate limiting
- Input sanitization
- SQL injection prevention
- Authorization enforcement
