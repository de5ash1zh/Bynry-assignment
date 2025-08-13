# Examples

## 📋 Overview

This directory contains practical examples and client libraries for using the StockFlow B2B inventory management platform APIs. The examples demonstrate real-world usage patterns and integration scenarios.

## 📁 Files

### `example_usage.js`
Comprehensive client library and usage examples for the low-stock alerts API.

**Features:**
- ✅ Client library for easy API integration
- ✅ Dashboard integration examples
- ✅ Automated monitoring scenarios
- ✅ Error handling patterns
- ✅ Real-world usage patterns

## 🚀 Quick Start

### Installation
```bash
npm install axios
```

### Basic Usage
```javascript
const { LowStockAlertsClient } = require('./examples/example_usage');

const client = new LowStockAlertsClient('https://api.example.com', 'your-auth-token');
const alerts = await client.getLowStockAlerts(123);
```

## 💡 Usage Examples

### 1. Basic API Integration

#### Get Low Stock Alerts
```javascript
const client = new LowStockAlertsClient('https://api.example.com', 'token');

// Get all alerts for a company
const alerts = await client.getLowStockAlerts(companyId);
console.log(`Found ${alerts.total_alerts} alerts`);

// Filter by warehouse
const warehouseAlerts = await client.getLowStockAlerts(companyId, {
  warehouseId: 456
});

// Custom date threshold
const customAlerts = await client.getLowStockAlerts(companyId, {
  daysThreshold: 60
});
```

#### Get Summary Statistics
```javascript
const summary = await client.getLowStockSummary(companyId);
console.log('Summary:', {
  totalLowStockProducts: summary.summary.total_low_stock_products,
  warehousesWithAlerts: summary.summary.warehouses_with_alerts,
  outOfStockCount: summary.summary.out_of_stock_count
});
```

### 2. Dashboard Integration

#### Complete Dashboard Data
```javascript
async function getDashboardData(companyId) {
  const [alerts, summary] = await Promise.all([
    client.getLowStockAlerts(companyId),
    client.getLowStockSummary(companyId)
  ]);

  return {
    overview: {
      totalAlerts: alerts.total_alerts,
      totalLowStockProducts: summary.summary.total_low_stock_products,
      warehousesWithAlerts: summary.summary.warehouses_with_alerts,
      outOfStockCount: summary.summary.out_of_stock_count,
      averageStock: summary.summary.avg_current_stock
    },
    criticalAlerts: alerts.alerts.filter(alert => 
      alert.days_until_stockout !== null && alert.days_until_stockout <= 7
    ),
    allAlerts: alerts.alerts,
    lastUpdated: alerts.generated_at
  };
}
```

#### Real-time Dashboard Updates
```javascript
class DashboardManager {
  constructor(companyId, updateInterval = 30000) {
    this.companyId = companyId;
    this.updateInterval = updateInterval;
    this.currentData = null;
  }

  async start() {
    await this.updateData();
    this.interval = setInterval(() => this.updateData(), this.updateInterval);
  }

  async updateData() {
    try {
      this.currentData = await getDashboardData(this.companyId);
      this.onDataUpdate(this.currentData);
    } catch (error) {
      console.error('Dashboard update failed:', error.message);
    }
  }

  onDataUpdate(data) {
    // Implement dashboard update logic
    console.log('Dashboard updated:', data.overview);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}
```

### 3. Automated Monitoring

#### Critical Alert Monitoring
```javascript
async function monitorCriticalAlerts(companyId) {
  const alerts = await client.getLowStockAlerts(companyId);
  
  // Check for critical alerts (stockout within 7 days)
  const criticalAlerts = alerts.alerts.filter(alert => 
    alert.days_until_stockout !== null && alert.days_until_stockout <= 7
  );

  if (criticalAlerts.length > 0) {
    console.log(`🚨 CRITICAL: ${criticalAlerts.length} products at risk of stockout within 7 days!`);
    
    criticalAlerts.forEach(alert => {
      console.log(`  - ${alert.product_name} (${alert.sku})`);
      console.log(`    Warehouse: ${alert.warehouse_name}`);
      console.log(`    Current Stock: ${alert.current_stock}`);
      console.log(`    Days until stockout: ${alert.days_until_stockout}`);
      if (alert.supplier) {
        console.log(`    Contact: ${alert.supplier.contact_email}`);
      }
    });

    // Send notifications
    await sendNotifications(criticalAlerts);
    
    // Create purchase orders
    await createPurchaseOrders(criticalAlerts);
  } else {
    console.log('✅ No critical alerts - inventory levels are healthy');
  }

  // Check for out-of-stock items
  const outOfStockItems = alerts.alerts.filter(alert => alert.current_stock === 0);
  if (outOfStockItems.length > 0) {
    console.log(`⚠️  WARNING: ${outOfStockItems.length} products are completely out of stock`);
  }
}
```

#### Scheduled Monitoring
```javascript
class InventoryMonitor {
  constructor(companyId, checkInterval = 3600000) { // 1 hour
    this.companyId = companyId;
    this.checkInterval = checkInterval;
    this.isRunning = false;
  }

  async start() {
    this.isRunning = true;
    console.log('Starting inventory monitoring...');
    
    while (this.isRunning) {
      try {
        await monitorCriticalAlerts(this.companyId);
      } catch (error) {
        console.error('Monitoring check failed:', error.message);
      }
      
      await this.sleep(this.checkInterval);
    }
  }

  stop() {
    this.isRunning = false;
    console.log('Stopping inventory monitoring...');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 4. Error Handling

#### Robust Error Handling
```javascript
class LowStockAlertsClient {
  handleError(error) {
    if (error.response) {
      const { status, data } = error.response;
      console.error(`API Error ${status}:`, data);
      
      switch (status) {
        case 400:
          throw new Error(`Validation Error: ${data.message}`);
        case 403:
          throw new Error('Unauthorized: You don\'t have access to this company');
        case 404:
          throw new Error('Company not found');
        case 408:
          throw new Error('Request timeout - please try again');
        case 503:
          throw new Error('Service temporarily unavailable');
        default:
          throw new Error(`Unexpected error: ${data.message || 'Unknown error'}`);
      }
    } else if (error.request) {
      throw new Error('Network error - unable to reach the server');
    } else {
      throw new Error(`Request error: ${error.message}`);
    }
  }
}
```

#### Retry Logic
```javascript
async function withRetry(fn, maxRetries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
}

// Usage
const alerts = await withRetry(() => 
  client.getLowStockAlerts(companyId)
);
```

### 5. Integration Examples

#### Email Notifications
```javascript
async function sendEmailNotifications(alerts) {
  const criticalAlerts = alerts.filter(alert => 
    alert.days_until_stockout !== null && alert.days_until_stockout <= 7
  );

  if (criticalAlerts.length === 0) return;

  const emailContent = `
    Critical Inventory Alert
    
    ${criticalAlerts.length} products are at risk of stockout:
    
    ${criticalAlerts.map(alert => `
      - ${alert.product_name} (${alert.sku})
        Warehouse: ${alert.warehouse_name}
        Current Stock: ${alert.current_stock}
        Days until stockout: ${alert.days_until_stockout}
        ${alert.supplier ? `Supplier: ${alert.supplier.name} (${alert.supplier.contact_email})` : 'No supplier information'}
    `).join('\n')}
    
    Please take immediate action to reorder these items.
  `;

  // Send email using your preferred email service
  await sendEmail('inventory-alerts@company.com', 'Critical Inventory Alert', emailContent);
}
```

#### Purchase Order Creation
```javascript
async function createPurchaseOrders(alerts) {
  const alertsWithSuppliers = alerts.filter(alert => alert.supplier);

  for (const alert of alertsWithSuppliers) {
    const orderQuantity = Math.max(
      alert.threshold * 2, // Order 2x threshold
      alert.supplier.minimum_order_quantity || 1
    );

    const purchaseOrder = {
      supplier_id: alert.supplier.id,
      product_id: alert.product_id,
      quantity: orderQuantity,
      expected_delivery: new Date(Date.now() + (alert.supplier.lead_time_days * 24 * 60 * 60 * 1000)),
      priority: alert.days_until_stockout <= 3 ? 'urgent' : 'normal'
    };

    // Create purchase order in your system
    await createPurchaseOrder(purchaseOrder);
  }
}
```

## 🔧 Configuration

### Environment Variables
```bash
# API Configuration
API_BASE_URL=https://api.example.com
API_AUTH_TOKEN=your-auth-token

# Monitoring Configuration
MONITORING_INTERVAL=3600000  # 1 hour
CRITICAL_ALERT_THRESHOLD=7   # days

# Notification Configuration
EMAIL_ENABLED=true
EMAIL_RECIPIENTS=inventory-alerts@company.com
```

### Client Configuration
```javascript
const client = new LowStockAlertsClient(
  process.env.API_BASE_URL,
  process.env.API_AUTH_TOKEN,
  {
    timeout: 30000,
    retries: 3,
    retryDelay: 1000
  }
);
```

## 📊 Best Practices

### 1. Error Handling
- Always implement proper error handling
- Use retry logic for transient failures
- Log errors for debugging
- Provide user-friendly error messages

### 2. Performance
- Use Promise.all for parallel requests
- Implement caching where appropriate
- Monitor API response times
- Handle large datasets efficiently

### 3. Security
- Store API tokens securely
- Validate all inputs
- Use HTTPS for all communications
- Implement proper authentication

### 4. Monitoring
- Set up automated monitoring
- Configure appropriate alert thresholds
- Monitor API usage and limits
- Track error rates and performance

## 🚀 Deployment

### Production Setup
```javascript
// Production configuration
const productionClient = new LowStockAlertsClient(
  'https://api.stockflow.com',
  process.env.PRODUCTION_API_TOKEN,
  {
    timeout: 60000,
    retries: 5,
    retryDelay: 2000,
    logging: true
  }
);

// Start monitoring
const monitor = new InventoryMonitor(companyId, 1800000); // 30 minutes
monitor.start();
```

### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY examples/ ./examples/
CMD ["node", "examples/monitor.js"]
```

## 📝 Notes

- Examples use modern JavaScript (ES6+)
- Comprehensive error handling included
- Production-ready patterns demonstrated
- Scalable architecture examples
- Security best practices followed
- Performance optimization examples
