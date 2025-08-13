const express = require("express");
const { Op } = require("sequelize");
const { 
  Product, 
  Warehouse, 
  Inventory, 
  Supplier, 
  ProductSupplier, 
  SalesTransaction,
  ProductCategory,
  sequelize 
} = require("../models");
const { userHasCompanyAccess } = require("../utils/authHelpers");

const router = express.Router();

router.get("/api/companies/:company_id/alerts/low-stock", async (req, res) => {
  const { company_id } = req.params;
  const { warehouse_id, days_threshold = 30 } = req.query;

  try {
    const companyId = parseInt(company_id);
    if (isNaN(companyId) || companyId <= 0) {
      return res.status(400).json({
        error: "Invalid company_id",
        message: "Company ID must be a positive integer"
      });
    }

    let warehouseFilter = {};
    if (warehouse_id) {
      const warehouseId = parseInt(warehouse_id);
      if (isNaN(warehouseId) || warehouseId <= 0) {
        return res.status(400).json({
          error: "Invalid warehouse_id",
          message: "Warehouse ID must be a positive integer"
        });
      }
      warehouseFilter.id = warehouseId;
    }

    if (!userHasCompanyAccess(req.currentUser.id, companyId)) {
      return res.status(403).json({
        error: "Unauthorized",
        message: "You don't have access to this company"
      });
    }

    const company = await sequelize.models.Company.findByPk(companyId);
    if (!company) {
      return res.status(404).json({
        error: "Company not found",
        message: `Company with ID ${companyId} does not exist`
      });
    }

    const recentSalesDate = new Date();
    recentSalesDate.setDate(recentSalesDate.getDate() - parseInt(days_threshold));

    const alertsQuery = `
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
          p.low_stock_threshold as product_threshold,
          COALESCE(p.low_stock_threshold, pc.low_stock_threshold, 10) as final_threshold
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        WHERE p.company_id = :companyId
          AND p.status = 'active'
      )
      SELECT 
        pt.product_id,
        pt.product_name,
        pt.sku,
        w.id as warehouse_id,
        w.name as warehouse_name,
        i.quantity as current_stock,
        pt.final_threshold as threshold,
        COALESCE(psv.avg_daily_sales, 0) as avg_daily_sales,
        CASE 
          WHEN COALESCE(psv.avg_daily_sales, 0) > 0 
          THEN FLOOR(i.quantity / psv.avg_daily_sales)
          ELSE NULL 
        END as days_until_stockout,
        s.id as supplier_id,
        s.name as supplier_name,
        s.contact_email as supplier_contact_email,
        ps.supplier_sku,
        ps.lead_time_days
      FROM product_thresholds pt
      INNER JOIN inventory i ON pt.product_id = i.product_id
      INNER JOIN warehouses w ON i.warehouse_id = w.id
      LEFT JOIN product_sales_velocity psv ON pt.product_id = psv.product_id 
        AND i.warehouse_id = psv.warehouse_id
      LEFT JOIN product_suppliers ps ON pt.product_id = ps.product_id AND ps.is_primary = true
      LEFT JOIN suppliers s ON ps.supplier_id = s.id
      WHERE w.company_id = :companyId
        AND w.status = 'active'
        AND i.quantity <= pt.final_threshold
        ${warehouse_id ? 'AND w.id = :warehouseId' : ''}
      ORDER BY i.quantity ASC, pt.product_name ASC
    `;

    const queryParams = {
      companyId,
      recentSalesDate,
      ...(warehouse_id && { warehouseId: parseInt(warehouse_id) })
    };

    const alerts = await sequelize.query(alertsQuery, {
      replacements: queryParams,
      type: sequelize.QueryTypes.SELECT
    });

    const formattedAlerts = alerts.map(alert => ({
      product_id: alert.product_id,
      product_name: alert.product_name,
      sku: alert.sku,
      warehouse_id: alert.warehouse_id,
      warehouse_name: alert.warehouse_name,
      current_stock: alert.current_stock,
      threshold: alert.threshold,
      days_until_stockout: alert.days_until_stockout,
      supplier: alert.supplier_id ? {
        id: alert.supplier_id,
        name: alert.supplier_name,
        contact_email: alert.supplier_contact_email,
        supplier_sku: alert.supplier_sku,
        lead_time_days: alert.lead_time_days
      } : null
    }));

    const response = {
      alerts: formattedAlerts,
      total_alerts: formattedAlerts.length,
      company_id: companyId,
      company_name: company.name,
      generated_at: new Date().toISOString(),
      filters_applied: {
        days_threshold: parseInt(days_threshold),
        warehouse_id: warehouse_id ? parseInt(warehouse_id) : null
      }
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error("Error fetching low stock alerts:", error);
    
    if (error.name === 'SequelizeConnectionError') {
      return res.status(503).json({
        error: "Database connection error",
        message: "Unable to connect to database"
      });
    }
    
    if (error.name === 'SequelizeTimeoutError') {
      return res.status(408).json({
        error: "Request timeout",
        message: "Query took too long to execute"
      });
    }

    return res.status(500).json({
      error: "Internal server error",
      message: "An unexpected error occurred while fetching alerts"
    });
  }
});

router.get("/api/companies/:company_id/alerts/low-stock/summary", async (req, res) => {
  const { company_id } = req.params;

  try {
    const companyId = parseInt(company_id);
    if (isNaN(companyId) || companyId <= 0) {
      return res.status(400).json({
        error: "Invalid company_id"
      });
    }

    if (!userHasCompanyAccess(req.currentUser.id, companyId)) {
      return res.status(403).json({
        error: "Unauthorized"
      });
    }

    const summaryQuery = `
      SELECT 
        COUNT(DISTINCT i.product_id) as total_low_stock_products,
        COUNT(DISTINCT i.warehouse_id) as warehouses_with_alerts,
        SUM(CASE WHEN i.quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_count,
        AVG(i.quantity) as avg_current_stock
      FROM inventory i
      INNER JOIN products p ON i.product_id = p.id
      INNER JOIN warehouses w ON i.warehouse_id = w.id
      LEFT JOIN product_categories pc ON p.category_id = pc.id
      WHERE w.company_id = :companyId
        AND p.status = 'active'
        AND w.status = 'active'
        AND i.quantity <= COALESCE(p.low_stock_threshold, pc.low_stock_threshold, 10)
    `;

    const summary = await sequelize.query(summaryQuery, {
      replacements: { companyId },
      type: sequelize.QueryTypes.SELECT
    });

    return res.status(200).json({
      summary: summary[0],
      company_id: companyId
    });

  } catch (error) {
    console.error("Error fetching summary:", error);
    return res.status(500).json({
      error: "Internal server error"
    });
  }
});

module.exports = router;
