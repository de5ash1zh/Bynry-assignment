const axios = require('axios');

// Example usage of the Low Stock Alerts API
class LowStockAlertsClient {
  constructor(baseURL, authToken) {
    this.baseURL = baseURL;
    this.authToken = authToken;
    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Get low stock alerts for a company
   * @param {number} companyId - The company ID
   * @param {Object} options - Optional parameters
   * @param {number} options.warehouseId - Filter by specific warehouse
   * @param {number} options.daysThreshold - Days to look back for sales activity (default: 30)
   */
  async getLowStockAlerts(companyId, options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.warehouseId) params.append('warehouse_id', options.warehouseId);
      if (options.daysThreshold) params.append('days_threshold', options.daysThreshold);

      const response = await this.client.get(
        `/api/companies/${companyId}/alerts/low-stock?${params.toString()}`
      );
      
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Get summary statistics for low stock alerts
   * @param {number} companyId - The company ID
   */
  async getLowStockSummary(companyId) {
    try {
      const response = await this.client.get(
        `/api/companies/${companyId}/alerts/low-stock/summary`
      );
      
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Handle API errors gracefully
   */
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

// Example usage scenarios
async function demonstrateUsage() {
  const client = new LowStockAlertsClient('https://api.example.com', 'your-auth-token');
  const companyId = 123;

  console.log('=== Low Stock Alerts API Examples ===\n');

  // Example 1: Get all low stock alerts for a company
  console.log('1. Getting all low stock alerts...');
  try {
    const alerts = await client.getLowStockAlerts(companyId);
    console.log(`Found ${alerts.total_alerts} alerts:`);
    alerts.alerts.forEach(alert => {
      console.log(`  - ${alert.product_name} (${alert.sku}): ${alert.current_stock}/${alert.threshold} units`);
      if (alert.days_until_stockout !== null) {
        console.log(`    Days until stockout: ${alert.days_until_stockout}`);
      }
      if (alert.supplier) {
        console.log(`    Supplier: ${alert.supplier.name} (${alert.supplier.contact_email})`);
      }
    });
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Example 2: Filter by specific warehouse
  console.log('2. Getting alerts for specific warehouse...');
  try {
    const warehouseAlerts = await client.getLowStockAlerts(companyId, {
      warehouseId: 456
    });
    console.log(`Found ${warehouseAlerts.total_alerts} alerts in warehouse ${456}`);
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Example 3: Use custom days threshold
  console.log('3. Getting alerts with 60-day sales activity window...');
  try {
    const customAlerts = await client.getLowStockAlerts(companyId, {
      daysThreshold: 60
    });
    console.log(`Found ${customAlerts.total_alerts} alerts with 60-day activity window`);
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Example 4: Get summary statistics
  console.log('4. Getting summary statistics...');
  try {
    const summary = await client.getLowStockSummary(companyId);
    console.log('Summary:', {
      totalLowStockProducts: summary.summary.total_low_stock_products,
      warehousesWithAlerts: summary.summary.warehouses_with_alerts,
      outOfStockCount: summary.summary.out_of_stock_count,
      averageCurrentStock: summary.summary.avg_current_stock
    });
  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Example 5: Error handling demonstration
  console.log('5. Demonstrating error handling...');
  try {
    await client.getLowStockAlerts('invalid-id');
  } catch (error) {
    console.log('Expected error caught:', error.message);
  }

  try {
    await client.getLowStockAlerts(99999); // Non-existent company
  } catch (error) {
    console.log('Expected error caught:', error.message);
  }
}

// Example dashboard integration
async function dashboardIntegration() {
  const client = new LowStockAlertsClient('https://api.example.com', 'your-auth-token');
  const companyId = 123;

  console.log('=== Dashboard Integration Example ===\n');

  try {
    // Get both alerts and summary for dashboard
    const [alerts, summary] = await Promise.all([
      client.getLowStockAlerts(companyId),
      client.getLowStockSummary(companyId)
    ]);

    // Dashboard data structure
    const dashboardData = {
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

    console.log('Dashboard Data:', JSON.stringify(dashboardData, null, 2));
  } catch (error) {
    console.error('Dashboard error:', error.message);
  }
}

// Example automated monitoring script
async function automatedMonitoring() {
  const client = new LowStockAlertsClient('https://api.example.com', 'your-auth-token');
  const companyId = 123;

  console.log('=== Automated Monitoring Example ===\n');

  try {
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
        console.log('');
      });

      // In a real implementation, you might:
      // - Send email notifications
      // - Create purchase orders
      // - Update dashboard
      // - Log to monitoring system
    } else {
      console.log('✅ No critical alerts - inventory levels are healthy');
    }

    // Check for out-of-stock items
    const outOfStockItems = alerts.alerts.filter(alert => alert.current_stock === 0);
    if (outOfStockItems.length > 0) {
      console.log(`⚠️  WARNING: ${outOfStockItems.length} products are completely out of stock`);
    }

  } catch (error) {
    console.error('Monitoring error:', error.message);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  (async () => {
    await demonstrateUsage();
    console.log('\n');
    await dashboardIntegration();
    console.log('\n');
    await automatedMonitoring();
  })();
}

module.exports = { LowStockAlertsClient };
