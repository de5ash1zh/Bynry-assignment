const express = require("express");
const Joi = require("joi");
const { Op } = require("sequelize");
const { Product, Warehouse, Inventory, sequelize } = require("../models");
const { userHasWarehouseAccess } = require("../utils/authHelpers");

const router = express.Router();

const productSchema = Joi.object({
  name: Joi.string().trim().min(1).required(),
  sku: Joi.string().trim().min(1).required(),
  price: Joi.number().precision(2).min(0).required(),
  warehouse_id: Joi.number().integer().required(),
  initial_quantity: Joi.number().integer().min(0).required(),
  company_id: Joi.number().integer().required(),
});

router.post("/api/products", async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { error, value: data } = productSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.details.map((d) => d.message),
      });
    }

    if (!userHasWarehouseAccess(req.currentUser.id, data.warehouse_id)) {
      return res.status(403).json({ error: "Unauthorized warehouse access" });
    }

    const warehouse = await Warehouse.findOne({
      where: {
        id: data.warehouse_id,
        company_id: data.company_id,
      },
    });
    if (!warehouse) {
      return res.status(404).json({ error: "Warehouse not found" });
    }

    const existingProduct = await Product.findOne({ where: { sku: data.sku } });
    if (existingProduct) {
      return res.status(409).json({ error: `SKU ${data.sku} already exists` });
    }

    const product = await Product.create(
      {
        name: data.name.trim(),
        sku: data.sku.trim().toUpperCase(),
        price: data.price,
        company_id: data.company_id,
        created_at: new Date(),
        status: "active",
      },
      { transaction: t }
    );

    await Inventory.create(
      {
        product_id: product.id,
        warehouse_id: data.warehouse_id,
        quantity: data.initial_quantity,
        created_at: new Date(),
      },
      { transaction: t }
    );

    await t.commit();

    return res.status(201).json({
      message: "Product created successfully",
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price.toString(),
        initial_quantity: data.initial_quantity,
        warehouse_name: warehouse.name,
      },
    });
  } catch (err) {
    await t.rollback();

    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ error: "Database constraint violation" });
    }

    console.error("Error creating product:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
