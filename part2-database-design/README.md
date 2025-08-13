# Part 2: Database Design

## 📋 Overview

This directory contains the complete database schema design for the StockFlow B2B inventory management platform. The design supports multi-tenant architecture, complex inventory tracking, and scalable business operations.

## 🗄️ Database Schema

**File**: `db_design.js`

### Core Tables

#### 1. Companies
```sql
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    INDEX idx_companies_status (status)
);
```
**Purpose**: Multi-tenant isolation, company management

#### 2. Users
```sql
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
```
**Purpose**: Authentication, authorization, user management

#### 3. Warehouses
```sql
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
```
**Purpose**: Multi-warehouse support per company

#### 4. Product Categories
```sql
CREATE TABLE product_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    low_stock_threshold INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
**Purpose**: Product categorization with default thresholds

#### 5. Products
```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category_id INTEGER,
    low_stock_threshold INTEGER,
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
```
**Purpose**: Product management with hierarchical thresholds

### Inventory & Movement Tables

#### 6. Inventory
```sql
CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    warehouse_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
    UNIQUE KEY uk_product_warehouse (product_id, warehouse_id),
    INDEX idx_inventory_product (product_id),
    INDEX idx_inventory_warehouse (warehouse_id),
    INDEX idx_inventory_quantity (quantity)
);
```
**Purpose**: Real-time inventory tracking per warehouse

#### 7. Inventory Movements
```sql
CREATE TABLE inventory_movements (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    warehouse_id INTEGER NOT NULL,
    movement_type ENUM('in', 'out', 'adjustment', 'transfer') NOT NULL,
    quantity_change INTEGER NOT NULL,
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    reference_type VARCHAR(50),
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
```
**Purpose**: Complete audit trail for inventory changes

### Supplier & Sales Tables

#### 8. Suppliers
```sql
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
```
**Purpose**: Supplier management per company

#### 9. Product Suppliers
```sql
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
```
**Purpose**: Product-supplier relationships with ordering details

#### 10. Sales Transactions
```sql
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
```
**Purpose**: Sales data for velocity calculations

### Bundle Management

#### 11. Bundle Components
```sql
CREATE TABLE bundle_components (
    id SERIAL PRIMARY KEY,
    bundle_product_id INTEGER NOT NULL,
    component_product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (bundle_product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (component_product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY uk_bundle_component (bundle_product_id, component_product_id)
);
```
**Purpose**: Product bundle relationships

## 🎯 Design Decisions

### 1. Multi-Tenant Architecture
- **Company Isolation**: All data scoped to company_id
- **Security**: Users can only access their company's data
- **Scalability**: Horizontal scaling support

### 2. Indexing Strategy
- **Performance**: Indexed all frequently queried columns
- **Query Optimization**: Composite indexes for common joins
- **Maintenance**: Balanced performance vs. storage

### 3. Audit Trail
- **Compliance**: Complete inventory movement tracking
- **Debugging**: Full history of changes
- **Reporting**: Historical data for analytics

### 4. Flexible Thresholds
- **Hierarchical**: Product → Category → Default
- **Customization**: Company-specific overrides
- **Business Rules**: Supports varying thresholds by product type

### 5. Bundle Support
- **Complex Products**: Support for product bundles
- **Inventory Management**: Automatic component tracking
- **Flexibility**: Dynamic bundle composition

## ❓ Missing Requirements Identified

### 1. User Management
- **Authentication**: How are users logging in?
- **Authorization**: Role-based permissions structure?
- **Multi-Company**: Can users belong to multiple companies?

### 2. Pricing & Units
- **Pricing Rules**: Do prices vary by warehouse/customer?
- **Units**: How to track different units (pieces, kg, liters)?
- **Currency**: Multi-currency support needed?

### 3. Business Rules
- **Reorder Points**: Automatic reorder triggers?
- **Lead Times**: Supplier lead time management?
- **Minimum Orders**: Supplier minimum order quantities?

### 4. Integration
- **External Systems**: ERP/accounting system integration?
- **APIs**: Third-party supplier APIs?
- **Notifications**: Alert delivery mechanisms?

## 🔧 Technical Considerations

### Performance
- **Indexing**: Optimized for common query patterns
- **Partitioning**: Ready for large-scale data
- **Caching**: Query result caching support

### Scalability
- **Horizontal**: Multi-tenant architecture
- **Vertical**: Efficient query patterns
- **Future**: Pagination and filtering support

### Security
- **Data Isolation**: Company-level data separation
- **Access Control**: User authorization
- **Audit**: Complete change tracking

### Maintenance
- **Backup**: Point-in-time recovery support
- **Monitoring**: Performance metrics ready
- **Migration**: Schema evolution support

## 📊 Data Relationships

```
Companies (1) ←→ (N) Warehouses
Companies (1) ←→ (N) Users
Companies (1) ←→ (N) Suppliers
Companies (1) ←→ (N) Products

Products (1) ←→ (N) Inventory
Products (1) ←→ (N) Product_Suppliers
Products (1) ←→ (N) Sales_Transactions
Products (1) ←→ (N) Bundle_Components

Warehouses (1) ←→ (N) Inventory
Warehouses (1) ←→ (N) Sales_Transactions

Suppliers (1) ←→ (N) Product_Suppliers
```

## 🚀 Future Enhancements

### Potential Additions
- **Customer Management**: Customer accounts and orders
- **Purchase Orders**: Automated ordering system
- **Analytics**: Advanced reporting and insights
- **Mobile Support**: Mobile app data structure
- **Integration**: Third-party system connectors

### Scalability Features
- **Sharding**: Database sharding strategy
- **Caching**: Redis integration points
- **Queue**: Background job processing
- **Monitoring**: Performance tracking

## 📝 Notes

- Schema designed for PostgreSQL
- Supports complex business requirements
- Production-ready with proper constraints
- Extensible for future enhancements
- Performance-optimized with indexing
