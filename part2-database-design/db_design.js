//  Companies table
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    INDEX idx_companies_status (status)
);

//  Users table (for authentication/authorization)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    INDEX idx_users_company (company_id),
    INDEX idx_users_email (email)
);

//  Warehouses table
CREATE TABLE warehouses (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    FOREIGN KEY (company_id) REFERENCES companies(id),
    INDEX idx_warehouses_company (company_id)
);

//  Product categories/types
CREATE TABLE product_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    low_stock_threshold INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

//  Products table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category_id INTEGER,
    low_stock_threshold INTEGER, -- Override category default
    is_bundle BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (category_id) REFERENCES product_categories(id),
    UNIQUE KEY uk_company_sku (company_id, sku),
    INDEX idx_products_company (company_id),
    INDEX idx_products_sku (sku),
    INDEX idx_products_status (status)
);

//  Bundle components (for product bundles)
CREATE TABLE bundle_components (
    id SERIAL PRIMARY KEY,
    bundle_product_id INTEGER NOT NULL,
    component_product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (bundle_product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (component_product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY uk_bundle_component (bundle_product_id, component_product_id)
);

//  Suppliers table
CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    INDEX idx_suppliers_company (company_id)
);

//  Product suppliers mapping
CREATE TABLE product_suppliers (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    supplier_id INTEGER NOT NULL,
    supplier_sku VARCHAR(100),
    cost DECIMAL(10,2),
    lead_time_days INTEGER,
    minimum_order_quantity INTEGER DEFAULT 1,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
    UNIQUE KEY uk_product_supplier (product_id, supplier_id)
);

//  Inventory table
CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    warehouse_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER NOT NULL DEFAULT 0, -- For pending orders
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
    UNIQUE KEY uk_product_warehouse (product_id, warehouse_id),
    INDEX idx_inventory_product (product_id),
    INDEX idx_inventory_warehouse (warehouse_id),
    INDEX idx_inventory_quantity (quantity)
);

// Inventory movements/audit trail
CREATE TABLE inventory_movements (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    warehouse_id INTEGER NOT NULL,
    movement_type ENUM('in', 'out', 'adjustment', 'transfer') NOT NULL,
    quantity_change INTEGER NOT NULL, -- Can be negative
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    reference_type VARCHAR(50), -- 'order', 'receipt', 'adjustment', etc.
    reference_id INTEGER,
    notes TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_movements_product_warehouse (product_id, warehouse_id),
    INDEX idx_movements_created_at (created_at),
    INDEX idx_movements_type (movement_type)
);

// Sales data for calculating stock velocity
CREATE TABLE sales_transactions (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    warehouse_id INTEGER NOT NULL,
    quantity_sold INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    INDEX idx_sales_product_date (product_id, sale_date),
    INDEX idx_sales_warehouse_date (warehouse_id, sale_date)
);