
-- ==========================================
-- LEGACY OFS DATABASE SCHEMA
-- Database: legacy_ofs_db
-- ==========================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL
        CHECK (role IN ('field_worker', 'admin')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. TICKET TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS ticket_templates (
    id SERIAL PRIMARY KEY,
    template_key VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. TICKETS TABLE
CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    template_id INTEGER REFERENCES ticket_templates(id),
    created_by INTEGER NOT NULL REFERENCES users(id),
    customer_name VARCHAR(150) NOT NULL,
    work_start_date DATE,
    work_end_date DATE,
    custom_fields JSONB DEFAULT '{}'::jsonb,

    status VARCHAR(20) NOT NULL DEFAULT 'Draft'
        CHECK (
            status IN (
                'Draft',
                'Submitted',
                'Approved',
                'Rejected',
                'Invoiced',
                'Void'
            )
        ),

    rejection_reason TEXT,
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CHECK (
        work_end_date IS NULL
        OR work_start_date IS NULL
        OR work_end_date >= work_start_date
    )
);

-- 4. TICKET LINE ITEMS TABLE
CREATE TABLE IF NOT EXISTS ticket_line_items (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL
        REFERENCES tickets(id) ON DELETE CASCADE,

    item_type VARCHAR(20) NOT NULL
        CHECK (item_type IN ('service', 'material')),

    description TEXT NOT NULL,
    quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),

    line_total NUMERIC(14,2)
        GENERATED ALWAYS AS (quantity * unit_price) STORED,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. TICKET COMMENTS TABLE
CREATE TABLE IF NOT EXISTS ticket_comments (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL
        REFERENCES tickets(id) ON DELETE CASCADE,

    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. DEVICES TABLE
CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    device_name VARCHAR(100) NOT NULL,
    device_identifier VARCHAR(255) UNIQUE NOT NULL,

    is_active BOOLEAN DEFAULT TRUE,
    revoked_at TIMESTAMP,
    last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. TICKET HISTORY TABLE
CREATE TABLE IF NOT EXISTS ticket_history (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER NOT NULL
        REFERENCES tickets(id) ON DELETE CASCADE,

    changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,

    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    remarks TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- INDEXES FOR FASTER SEARCH
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_tickets_status
ON tickets(status);

CREATE INDEX IF NOT EXISTS idx_tickets_created_by
ON tickets(created_by);

CREATE INDEX IF NOT EXISTS idx_tickets_customer
ON tickets(customer_name);

CREATE INDEX IF NOT EXISTS idx_comments_ticket
ON ticket_comments(ticket_id);

CREATE INDEX IF NOT EXISTS idx_line_items_ticket
ON ticket_line_items(ticket_id);

CREATE INDEX IF NOT EXISTS idx_history_ticket
ON ticket_history(ticket_id);

CREATE INDEX IF NOT EXISTS idx_devices_user_active
ON devices(user_id, is_active);

-- ==========================================
-- INSERT FIVE DEFAULT TEMPLATES
-- ==========================================

INSERT INTO ticket_templates
(template_key, name, description, fields)
VALUES
(
    'service_ticket',
    'Service Ticket',
    'General field service work',
    '[{"name":"job_description","type":"text","required":true},{"name":"location","type":"text","required":true}]'
),
(
    'inspection_report',
    'Inspection Report',
    'Field inspection details',
    '[{"name":"inspection_type","type":"text","required":true},{"name":"inspection_result","type":"text","required":true}]'
),
(
    'maintenance_report',
    'Maintenance Report',
    'Equipment maintenance details',
    '[{"name":"equipment_name","type":"text","required":true},{"name":"maintenance_details","type":"textarea","required":true}]'
),
(
    'equipment_checklist',
    'Equipment Checklist',
    'Equipment condition checklist',
    '[{"name":"equipment_id","type":"text","required":true},{"name":"condition","type":"select","required":true}]'
),
(
    'material_usage',
    'Material Usage Report',
    'Materials used during field work',
    '[{"name":"material_name","type":"text","required":true},{"name":"used_quantity","type":"number","required":true}]'
)
ON CONFLICT (template_key) DO NOTHING;

-- ==========================================
-- DATABASE SETUP COMPLETED
-- ==========================================

SELECT 'Legacy OFS database schema created successfully!' AS message;
