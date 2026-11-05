
const pool = require("../db");

// GET all templates
// Workers see only active templates; admins see all.
const getTemplates = async (req, res) => {
    try {
        let query = `
            SELECT id, template_key, name, description,
                   fields, is_active, created_at
            FROM ticket_templates
        `;

        if (req.user.role !== "admin") {
            query += " WHERE is_active = true";
        }

        query += " ORDER BY id ASC";

        const result = await pool.query(query);

        res.status(200).json({
            total: result.rows.length,
            templates: result.rows
        });
    } catch (error) {
        console.error("Get templates error:", error.message);
        res.status(500).json({ message: "Failed to fetch templates." });
    }
};

// GET one template by ID
const getTemplateById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!/^\d+$/.test(id)) {
            return res.status(400).json({ message: "Invalid template ID." });
        }

        let query = `
            SELECT id, template_key, name, description,
                   fields, is_active, created_at
            FROM ticket_templates
            WHERE id = $1
        `;

        const params = [id];

        if (req.user.role !== "admin") {
            query += " AND is_active = true";
        }

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Template not found." });
        }

        res.status(200).json({ template: result.rows[0] });
    } catch (error) {
        console.error("Get template error:", error.message);
        res.status(500).json({ message: "Failed to fetch template." });
    }
};

// CREATE template (Admin only)
const createTemplate = async (req, res) => {
    try {
        const { template_key, name, description, fields, is_active } = req.body;

        if (
            typeof template_key !== "string" ||
            !template_key.trim() ||
            typeof name !== "string" ||
            !name.trim() ||
            !Array.isArray(fields)
        ) {
            return res.status(400).json({
                message: "template_key, name and fields array are required."
            });
        }

        if (
            fields.some(field =>
                !field ||
                typeof field !== "object" ||
                Array.isArray(field) ||
                typeof field.name !== "string" ||
                !field.name.trim() ||
                typeof field.type !== "string" ||
                typeof field.required !== "boolean"
            )
        ) {
            return res.status(400).json({
                message: "Each field must have name, type and required properties."
            });
        }

        const result = await pool.query(
            `INSERT INTO ticket_templates
                (template_key, name, description, fields, is_active)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
                template_key.trim(),
                name.trim(),
                description || null,
                JSON.stringify(fields),
                is_active === undefined ? true : is_active
            ]
        );

        res.status(201).json({
            message: "Template created successfully.",
            template: result.rows[0]
        });
    } catch (error) {
        console.error("Create template error:", error.message);

        if (error.code === "23505") {
            return res.status(409).json({
                message: "Template key already exists."
            });
        }

        res.status(500).json({ message: "Failed to create template." });
    }
};

// UPDATE template (Admin only)
const updateTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const { template_key, name, description, fields, is_active } = req.body;

        if (!/^\d+$/.test(id)) {
            return res.status(400).json({ message: "Invalid template ID." });
        }

        if (
            template_key === undefined &&
            name === undefined &&
            description === undefined &&
            fields === undefined &&
            is_active === undefined
        ) {
            return res.status(400).json({
                message: "Provide at least one field to update."
            });
        }

        if (template_key !== undefined &&
            (typeof template_key !== "string" || !template_key.trim())) {
            return res.status(400).json({ message: "Invalid template_key." });
        }

        if (name !== undefined &&
            (typeof name !== "string" || !name.trim())) {
            return res.status(400).json({ message: "Invalid template name." });
        }

        if (fields !== undefined) {
            if (!Array.isArray(fields) || fields.some(field =>
                !field ||
                typeof field !== "object" ||
                Array.isArray(field) ||
                typeof field.name !== "string" ||
                !field.name.trim() ||
                typeof field.type !== "string" ||
                typeof field.required !== "boolean"
            )) {
                return res.status(400).json({
                    message: "Invalid fields array."
                });
            }
        }

        if (is_active !== undefined && typeof is_active !== "boolean") {
            return res.status(400).json({
                message: "is_active must be true or false."
            });
        }

        const result = await pool.query(
            `UPDATE ticket_templates
             SET template_key = COALESCE($1, template_key),
                 name = COALESCE($2, name),
                 description = CASE WHEN $3 THEN $4 ELSE description END,
                 fields = COALESCE($5::jsonb, fields),
                 is_active = COALESCE($6, is_active)
             WHERE id = $7
             RETURNING *`,
            [
                template_key === undefined ? null : template_key.trim(),
                name === undefined ? null : name.trim(),
                description !== undefined,
                description === undefined ? null : description,
                fields === undefined ? null : JSON.stringify(fields),
                is_active === undefined ? null : is_active,
                id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Template not found." });
        }

        res.status(200).json({
            message: "Template updated successfully.",
            template: result.rows[0]
        });
    } catch (error) {
        console.error("Update template error:", error.message);

        if (error.code === "23505") {
            return res.status(409).json({
                message: "Template key already exists."
            });
        }

        res.status(500).json({ message: "Failed to update template." });
    }
};

// ACTIVATE / DEACTIVATE template (Admin only)
const updateTemplateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        if (!/^\d+$/.test(id)) {
            return res.status(400).json({ message: "Invalid template ID." });
        }

        if (typeof is_active !== "boolean") {
            return res.status(400).json({
                message: "is_active must be true or false."
            });
        }

        const result = await pool.query(
            `UPDATE ticket_templates
             SET is_active = $1
             WHERE id = $2
             RETURNING *`,
            [is_active, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Template not found." });
        }

        res.status(200).json({
            message: is_active
                ? "Template activated successfully."
                : "Template deactivated successfully.",
            template: result.rows[0]
        });
    } catch (error) {
        console.error("Template status error:", error.message);
        res.status(500).json({ message: "Failed to update template status." });
    }
};

module.exports = {
    getTemplates,
    getTemplateById,
    createTemplate,
    updateTemplate,
    updateTemplateStatus
};