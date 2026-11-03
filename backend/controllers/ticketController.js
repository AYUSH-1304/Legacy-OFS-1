const pool = require("../db");

// =====================================
// 1. CREATE NEW TICKET
// =====================================
const createTicket = async (req, res) => {
    const client = await pool.connect();

    try {
        const {
            template_key,
            customer_name,
            work_start_date,
            work_end_date,
            custom_fields,
            line_items
        } = req.body;

        // Basic validation
        if (!template_key || !customer_name) {
            return res.status(400).json({
                message: "Template and customer name are required."
            });
        }

        if (!Array.isArray(line_items || [])) {
            return res.status(400).json({
                message: "line_items must be an array."
            });
        }

        // Find template
        const templateResult = await client.query(
            `SELECT id FROM ticket_templates
             WHERE template_key = $1 AND is_active = TRUE`,
            [template_key]
        );

        if (templateResult.rows.length === 0) {
            return res.status(404).json({
                message: "Active ticket template not found."
            });
        }

        const templateId = templateResult.rows[0].id;

        await client.query("BEGIN");

        // Generate ticket number
        const ticketNumber =
            `OFS-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

        // Insert ticket
        const ticketResult = await client.query(
            `INSERT INTO tickets
            (
                ticket_number,
                template_id,
                created_by,
                customer_name,
                work_start_date,
                work_end_date,
                custom_fields,
                status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'Draft')
            RETURNING *`,
            [
                ticketNumber,
                templateId,
                req.user.id,
                customer_name,
                work_start_date || null,
                work_end_date || null,
                JSON.stringify(custom_fields || {})
            ]
        );

        const ticket = ticketResult.rows[0];

        // Insert ticket line items
        for (const item of line_items || []) {
            if (
                !["service", "material"].includes(item.item_type) ||
                !item.description ||
                !Number.isFinite(Number(item.quantity)) ||
                Number(item.quantity) <= 0 ||
                !Number.isFinite(Number(item.unit_price)) ||
                Number(item.unit_price) < 0
            ) {
                throw new Error("Invalid ticket line item.");
            }

            await client.query(
                `INSERT INTO ticket_line_items
                (
                    ticket_id,
                    item_type,
                    description,
                    quantity,
                    unit_price
                )
                VALUES ($1, $2, $3, $4, $5)`,
                [
                    ticket.id,
                    item.item_type,
                    item.description,
                    item.quantity,
                    item.unit_price
                ]
            );
        }

        await client.query("COMMIT");

        res.status(201).json({
            message: "Ticket created successfully.",
            ticket
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Create ticket error:", error.message);

        res.status(500).json({
            message: "Unable to create ticket.",
            error: error.message
        });

    } finally {
        client.release();
    }
};


// =====================================
// 2. GET ALL TICKETS
// =====================================
const getAllTickets = async (req, res) => {
    try {
        let query;
        let values = [];

        // Admin can see all tickets
        if (req.user.role === "admin") {
            query = `
                SELECT
                    t.*,
                    tt.name AS template_name,
                    u.name AS created_by_name
                FROM tickets t
                LEFT JOIN ticket_templates tt
                    ON t.template_id = tt.id
                LEFT JOIN users u
                    ON t.created_by = u.id
                ORDER BY t.id DESC
            `;
        } else {
            // Field Worker can see only their tickets
            query = `
                SELECT
                    t.*,
                    tt.name AS template_name,
                    u.name AS created_by_name
                FROM tickets t
                LEFT JOIN ticket_templates tt
                    ON t.template_id = tt.id
                LEFT JOIN users u
                    ON t.created_by = u.id
                WHERE t.created_by = $1
                ORDER BY t.id DESC
            `;

            values = [req.user.id];
        }

        const result = await pool.query(query, values);

        res.status(200).json({
            count: result.rows.length,
            tickets: result.rows
        });

    } catch (error) {
        console.error("Get tickets error:", error.message);

        res.status(500).json({
            message: "Unable to fetch tickets."
        });
    }
};


// =====================================
// 3. GET TICKET BY ID
// =====================================
const getTicketById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!/^\d+$/.test(id)) {
            return res.status(400).json({
                message: "Invalid ticket ID."
            });
        }

        const result = await pool.query(
            `SELECT
                t.*,
                tt.name AS template_name,
                u.name AS created_by_name
             FROM tickets t
             LEFT JOIN ticket_templates tt
                ON t.template_id = tt.id
             LEFT JOIN users u
                ON t.created_by = u.id
             WHERE t.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Ticket not found."
            });
        }

        const ticket = result.rows[0];

        // Field Worker cannot access another worker's ticket
        if (
            req.user.role !== "admin" &&
            ticket.created_by !== req.user.id
        ) {
            return res.status(403).json({
                message: "You cannot access this ticket."
            });
        }

        const lineItems = await pool.query(
            `SELECT *
             FROM ticket_line_items
             WHERE ticket_id = $1
             ORDER BY id ASC`,
            [id]
        );

        res.status(200).json({
            ticket,
            line_items: lineItems.rows
        });

    } catch (error) {
        console.error("Get ticket error:", error.message);

        res.status(500).json({
            message: "Unable to fetch ticket."
        });
    }
};


// =====================================
// 4. UPDATE TICKET
// =====================================
const updateTicket = async (req, res) => {
    const client = await pool.connect();

    try {
        const { id } = req.params;

        const {
            customer_name,
            work_start_date,
            work_end_date,
            custom_fields,
            line_items
        } = req.body;

        if (!/^\d+$/.test(id)) {
            return res.status(400).json({
                message: "Invalid ticket ID."
            });
        }

        await client.query("BEGIN");

        const ticketResult = await client.query(
            "SELECT * FROM tickets WHERE id = $1 FOR UPDATE",
            [id]
        );

        if (ticketResult.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                message: "Ticket not found."
            });
        }

        const ticket = ticketResult.rows[0];

        if (
            req.user.role !== "admin" &&
            ticket.created_by !== req.user.id
        ) {
            await client.query("ROLLBACK");

            return res.status(403).json({
                message: "You cannot update this ticket."
            });
        }

        // Only Draft tickets can be edited
        if (ticket.status !== "Draft") {
            await client.query("ROLLBACK");

            return res.status(400).json({
                message: "Only Draft tickets can be updated."
            });
        }

        const updatedTicket = await client.query(
            `UPDATE tickets
             SET
                customer_name = COALESCE($1, customer_name),
                work_start_date = COALESCE($2, work_start_date),
                work_end_date = COALESCE($3, work_end_date),
                custom_fields = COALESCE($4, custom_fields),
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $5
             RETURNING *`,
            [
                customer_name ?? null,
                work_start_date ?? null,
                work_end_date ?? null,
                custom_fields === undefined
                    ? null
                    : JSON.stringify(custom_fields),
                id
            ]
        );

        // Replace line items if supplied
        if (line_items !== undefined) {
            if (!Array.isArray(line_items)) {
                throw new Error("line_items must be an array.");
            }

            await client.query(
                "DELETE FROM ticket_line_items WHERE ticket_id = $1",
                [id]
            );

            for (const item of line_items) {
                if (
                    !["service", "material"].includes(item.item_type) ||
                    !item.description ||
                    !Number.isFinite(Number(item.quantity)) ||
                    Number(item.quantity) <= 0 ||
                    !Number.isFinite(Number(item.unit_price)) ||
                    Number(item.unit_price) < 0
                ) {
                    throw new Error("Invalid ticket line item.");
                }

                await client.query(
                    `INSERT INTO ticket_line_items
                    (
                        ticket_id,
                        item_type,
                        description,
                        quantity,
                        unit_price
                    )
                    VALUES ($1, $2, $3, $4, $5)`,
                    [
                        id,
                        item.item_type,
                        item.description,
                        item.quantity,
                        item.unit_price
                    ]
                );
            }
        }

        await client.query("COMMIT");

        res.status(200).json({
            message: "Ticket updated successfully.",
            ticket: updatedTicket.rows[0]
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Update ticket error:", error.message);

        res.status(500).json({
            message: "Unable to update ticket.",
            error: error.message
        });

    } finally {
        client.release();
    }
};


// =====================================
// 5. DELETE TICKET
// =====================================
const deleteTicket = async (req, res) => {
    const client = await pool.connect();

    try {
        const { id } = req.params;

        if (!/^\d+$/.test(id)) {
            return res.status(400).json({
                message: "Invalid ticket ID."
            });
        }

        await client.query("BEGIN");

        const result = await client.query(
            "SELECT * FROM tickets WHERE id = $1 FOR UPDATE",
            [id]
        );

        if (result.rows.length === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                message: "Ticket not found."
            });
        }

        const ticket = result.rows[0];

        if (
            req.user.role !== "admin" &&
            ticket.created_by !== req.user.id
        ) {
            await client.query("ROLLBACK");

            return res.status(403).json({
                message: "You cannot delete this ticket."
            });
        }

        if (ticket.status !== "Draft") {
            await client.query("ROLLBACK");

            return res.status(400).json({
                message: "Only Draft tickets can be deleted."
            });
        }

        // Delete related records first
        await client.query(
            "DELETE FROM ticket_line_items WHERE ticket_id = $1",
            [id]
        );

        await client.query(
            "DELETE FROM ticket_comments WHERE ticket_id = $1",
            [id]
        );

        await client.query(
            "DELETE FROM ticket_history WHERE ticket_id = $1",
            [id]
        );

        await client.query(
            "DELETE FROM tickets WHERE id = $1",
            [id]
        );

        await client.query("COMMIT");

        res.status(200).json({
            message: "Ticket deleted successfully."
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Delete ticket error:", error.message);

        res.status(500).json({
            message: "Unable to delete ticket.",
            error: error.message
        });

    } finally {
        client.release();
    }
};

// =====================================
// 6. SUBMIT TICKET
// =====================================
const submitTicket = async (req, res) => {
    const client = await pool.connect();

    try {
        const { id } = req.params;

        await client.query("BEGIN");

        const result = await client.query(
            `SELECT * FROM tickets
             WHERE id = $1
             FOR UPDATE`,
            [id]
        );

        if (result.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                message: "Ticket not found."
            });
        }

        const ticket = result.rows[0];

        if (
            req.user.role !== "admin" &&
            ticket.created_by !== req.user.id
        ) {
            await client.query("ROLLBACK");
            return res.status(403).json({
                message: "You cannot submit this ticket."
            });
        }

        if (ticket.status !== "Draft") {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: "Only Draft tickets can be submitted."
            });
        }

        await client.query(
            `UPDATE tickets
             SET status = 'Submitted',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [id]
        );

        await client.query(
            `INSERT INTO ticket_history
             (ticket_id, changed_by, old_status, new_status, remarks)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, req.user.id, "Draft", "Submitted", "Ticket submitted"]
        );

        await client.query("COMMIT");

        res.json({
            message: "Ticket submitted successfully."
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error(error.message);
        res.status(500).json({
            message: "Unable to submit ticket."
        });
    } finally {
        client.release();
    }
};


// =====================================
// 7. APPROVE TICKET (ADMIN ONLY)
// =====================================
const approveTicket = async (req, res) => {
    const client = await pool.connect();

    try {
        const { id } = req.params;

        await client.query("BEGIN");

        const result = await client.query(
            `SELECT * FROM tickets
             WHERE id = $1
             FOR UPDATE`,
            [id]
        );

        if (result.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                message: "Ticket not found."
            });
        }

        const ticket = result.rows[0];

        if (ticket.status !== "Submitted") {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: "Only Submitted tickets can be approved."
            });
        }

        await client.query(
            `UPDATE tickets
             SET status = 'Approved',
                 approved_by = $1,
                 approved_at = CURRENT_TIMESTAMP,
                 rejection_reason = NULL,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [req.user.id, id]
        );

        await client.query(
            `INSERT INTO ticket_history
             (ticket_id, changed_by, old_status, new_status, remarks)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, req.user.id, "Submitted", "Approved", "Ticket approved by admin"]
        );

        await client.query("COMMIT");

        res.json({
            message: "Ticket approved successfully."
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error(error.message);
        res.status(500).json({
            message: "Unable to approve ticket."
        });
    } finally {
        client.release();
    }
};


// =====================================
// 8. REJECT TICKET (ADMIN ONLY)
// =====================================
const rejectTicket = async (req, res) => {
    const client = await pool.connect();

    try {
        const { id } = req.params;
        const { rejection_reason } = req.body;

        if (!rejection_reason || !rejection_reason.trim()) {
            return res.status(400).json({
                message: "Rejection reason is required."
            });
        }

        await client.query("BEGIN");

        const result = await client.query(
            `SELECT * FROM tickets
             WHERE id = $1
             FOR UPDATE`,
            [id]
        );

        if (result.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                message: "Ticket not found."
            });
        }

        const ticket = result.rows[0];

        if (ticket.status !== "Submitted") {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: "Only Submitted tickets can be rejected."
            });
        }

        await client.query(
            `UPDATE tickets
             SET status = 'Rejected',
                 rejection_reason = $1,
                 approved_by = NULL,
                 approved_at = NULL,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [rejection_reason.trim(), id]
        );

        await client.query(
            `INSERT INTO ticket_history
             (ticket_id, changed_by, old_status, new_status, remarks)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, req.user.id, "Submitted", "Rejected", rejection_reason.trim()]
        );

        await client.query("COMMIT");

        res.json({
            message: "Ticket rejected successfully."
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error(error.message);
        res.status(500).json({
            message: "Unable to reject ticket."
        });
    } finally {
        client.release();
    }
};

module.exports = {
    createTicket,
    getAllTickets,
    getTicketById,
    updateTicket,
    deleteTicket,
    submitTicket,
    approveTicket,
    rejectTicket
};
