const request = require('supertest');
const express = require('express');
const { sequelize } = require('../models');

// Mock the auth helper for testing
jest.mock('../utils/authHelpers', () => ({
  userHasCompanyAccess: jest.fn().mockReturnValue(true)
}));

const app = express();
app.use('/api', require('./low_stock_alerts'));

describe('Low Stock Alerts API', () => {
  beforeAll(async () => {
    // Setup test database
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clear all tables before each test
    await sequelize.truncate({ cascade: true });
  });

  describe('GET /api/companies/:company_id/alerts/low-stock', () => {
    it('should return low stock alerts for a company', async () => {
      // Setup test data
      const company = await sequelize.models.Company.create({
        name: 'Test Company',
        status: 'active'
      });

      const warehouse = await sequelize.models.Warehouse.create({
        company_id: company.id,
        name: 'Main Warehouse',
        status: 'active'
      });

      const category = await sequelize.models.ProductCategory.create({
        name: 'Electronics',
        low_stock_threshold: 15
      });

      const product = await sequelize.models.Product.create({
        company_id: company.id,
        name: 'Widget A',
        sku: 'WID-001',
        category_id: category.id,
        price: 29.99,
        status: 'active'
      });

      const supplier = await sequelize.models.Supplier.create({
        company_id: company.id,
        name: 'Supplier Corp',
        contact_email: 'orders@supplier.com',
        status: 'active'
      });

      await sequelize.models.ProductSupplier.create({
        product_id: product.id,
        supplier_id: supplier.id,
        is_primary: true,
        lead_time_days: 7
      });

      await sequelize.models.Inventory.create({
        product_id: product.id,
        warehouse_id: warehouse.id,
        quantity: 5 // Below threshold of 15
      });

      // Add recent sales activity
      await sequelize.models.SalesTransaction.create({
        product_id: product.id,
        warehouse_id: warehouse.id,
        quantity_sold: 2,
        unit_price: 29.99,
        sale_date: new Date()
      });

      const response = await request(app)
        .get(`/api/companies/${company.id}/alerts/low-stock`)
        .expect(200);

      expect(response.body).toMatchObject({
        alerts: [{
          product_id: product.id,
          product_name: 'Widget A',
          sku: 'WID-001',
          warehouse_id: warehouse.id,
          warehouse_name: 'Main Warehouse',
          current_stock: 5,
          threshold: 15,
          days_until_stockout: 2, // 5 stock / 2 avg daily sales = 2 days
          supplier: {
            id: supplier.id,
            name: 'Supplier Corp',
            contact_email: 'orders@supplier.com',
            lead_time_days: 7
          }
        }],
        total_alerts: 1,
        company_id: company.id,
        company_name: 'Test Company'
      });
    });

    it('should handle products without recent sales activity', async () => {
      const company = await sequelize.models.Company.create({
        name: 'Test Company',
        status: 'active'
      });

      const warehouse = await sequelize.models.Warehouse.create({
        company_id: company.id,
        name: 'Main Warehouse',
        status: 'active'
      });

      const product = await sequelize.models.Product.create({
        company_id: company.id,
        name: 'Slow Moving Product',
        sku: 'SLOW-001',
        low_stock_threshold: 10,
        price: 19.99,
        status: 'active'
      });

      await sequelize.models.Inventory.create({
        product_id: product.id,
        warehouse_id: warehouse.id,
        quantity: 3 // Below threshold but no recent sales
      });

      const response = await request(app)
        .get(`/api/companies/${company.id}/alerts/low-stock`)
        .expect(200);

      // Should not include products without recent sales activity
      expect(response.body.alerts).toHaveLength(0);
      expect(response.body.total_alerts).toBe(0);
    });

    it('should filter by warehouse when warehouse_id is provided', async () => {
      const company = await sequelize.models.Company.create({
        name: 'Test Company',
        status: 'active'
      });

      const warehouse1 = await sequelize.models.Warehouse.create({
        company_id: company.id,
        name: 'Warehouse 1',
        status: 'active'
      });

      const warehouse2 = await sequelize.models.Warehouse.create({
        company_id: company.id,
        name: 'Warehouse 2',
        status: 'active'
      });

      const product = await sequelize.models.Product.create({
        company_id: company.id,
        name: 'Test Product',
        sku: 'TEST-001',
        low_stock_threshold: 10,
        price: 19.99,
        status: 'active'
      });

      // Create inventory in both warehouses
      await sequelize.models.Inventory.create({
        product_id: product.id,
        warehouse_id: warehouse1.id,
        quantity: 5
      });

      await sequelize.models.Inventory.create({
        product_id: product.id,
        warehouse_id: warehouse2.id,
        quantity: 3
      });

      // Add sales activity for both warehouses
      await sequelize.models.SalesTransaction.create({
        product_id: product.id,
        warehouse_id: warehouse1.id,
        quantity_sold: 1,
        unit_price: 19.99,
        sale_date: new Date()
      });

      await sequelize.models.SalesTransaction.create({
        product_id: product.id,
        warehouse_id: warehouse2.id,
        quantity_sold: 1,
        unit_price: 19.99,
        sale_date: new Date()
      });

      // Filter by warehouse1
      const response = await request(app)
        .get(`/api/companies/${company.id}/alerts/low-stock?warehouse_id=${warehouse1.id}`)
        .expect(200);

      expect(response.body.alerts).toHaveLength(1);
      expect(response.body.alerts[0].warehouse_id).toBe(warehouse1.id);
    });

    it('should handle products without suppliers gracefully', async () => {
      const company = await sequelize.models.Company.create({
        name: 'Test Company',
        status: 'active'
      });

      const warehouse = await sequelize.models.Warehouse.create({
        company_id: company.id,
        name: 'Main Warehouse',
        status: 'active'
      });

      const product = await sequelize.models.Product.create({
        company_id: company.id,
        name: 'Product Without Supplier',
        sku: 'NOSUP-001',
        low_stock_threshold: 10,
        price: 19.99,
        status: 'active'
      });

      await sequelize.models.Inventory.create({
        product_id: product.id,
        warehouse_id: warehouse.id,
        quantity: 5
      });

      await sequelize.models.SalesTransaction.create({
        product_id: product.id,
        warehouse_id: warehouse.id,
        quantity_sold: 1,
        unit_price: 19.99,
        sale_date: new Date()
      });

      const response = await request(app)
        .get(`/api/companies/${company.id}/alerts/low-stock`)
        .expect(200);

      expect(response.body.alerts[0].supplier).toBeNull();
    });

    it('should validate company_id parameter', async () => {
      const response = await request(app)
        .get('/api/companies/invalid/alerts/low-stock')
        .expect(400);

      expect(response.body.error).toBe('Invalid company_id');
    });

    it('should validate warehouse_id query parameter', async () => {
      const company = await sequelize.models.Company.create({
        name: 'Test Company',
        status: 'active'
      });

      const response = await request(app)
        .get(`/api/companies/${company.id}/alerts/low-stock?warehouse_id=invalid`)
        .expect(400);

      expect(response.body.error).toBe('Invalid warehouse_id');
    });

    it('should return 404 for non-existent company', async () => {
      const response = await request(app)
        .get('/api/companies/99999/alerts/low-stock')
        .expect(404);

      expect(response.body.error).toBe('Company not found');
    });

    it('should handle database connection errors gracefully', async () => {
      // Mock database error
      jest.spyOn(sequelize, 'query').mockRejectedValueOnce({
        name: 'SequelizeConnectionError',
        message: 'Connection failed'
      });

      const company = await sequelize.models.Company.create({
        name: 'Test Company',
        status: 'active'
      });

      const response = await request(app)
        .get(`/api/companies/${company.id}/alerts/low-stock`)
        .expect(503);

      expect(response.body.error).toBe('Database connection error');
    });

    it('should handle query timeout errors', async () => {
      // Mock timeout error
      jest.spyOn(sequelize, 'query').mockRejectedValueOnce({
        name: 'SequelizeTimeoutError',
        message: 'Query timeout'
      });

      const company = await sequelize.models.Company.create({
        name: 'Test Company',
        status: 'active'
      });

      const response = await request(app)
        .get(`/api/companies/${company.id}/alerts/low-stock`)
        .expect(408);

      expect(response.body.error).toBe('Request timeout');
    });
  });

  describe('GET /api/companies/:company_id/alerts/low-stock/summary', () => {
    it('should return summary statistics', async () => {
      const company = await sequelize.models.Company.create({
        name: 'Test Company',
        status: 'active'
      });

      const warehouse = await sequelize.models.Warehouse.create({
        company_id: company.id,
        name: 'Main Warehouse',
        status: 'active'
      });

      const product1 = await sequelize.models.Product.create({
        company_id: company.id,
        name: 'Product 1',
        sku: 'PROD-001',
        low_stock_threshold: 10,
        price: 19.99,
        status: 'active'
      });

      const product2 = await sequelize.models.Product.create({
        company_id: company.id,
        name: 'Product 2',
        sku: 'PROD-002',
        low_stock_threshold: 5,
        price: 29.99,
        status: 'active'
      });

      // Product 1: low stock
      await sequelize.models.Inventory.create({
        product_id: product1.id,
        warehouse_id: warehouse.id,
        quantity: 5
      });

      // Product 2: out of stock
      await sequelize.models.Inventory.create({
        product_id: product2.id,
        warehouse_id: warehouse.id,
        quantity: 0
      });

      const response = await request(app)
        .get(`/api/companies/${company.id}/alerts/low-stock/summary`)
        .expect(200);

      expect(response.body.summary).toMatchObject({
        total_low_stock_products: 2,
        warehouses_with_alerts: 1,
        out_of_stock_count: 1,
        avg_current_stock: 2.5
      });
    });
  });
});
