const pool = require("../db");

// Validate ticket access and editable status
const checkTicketAccess = async (ticketId, user) => {
    const result = await pool.query(
        "SELECT id, created_by, status FROM tickets WHERE id = $1",
        [ticketId]
    );

    if (result.rows.length === 0) {
        return { error: "Ticket not found.", status: 404 };
    }

    const ticket = result.rows[0];

    if (
        user.role !== "admin" &&
        Number(ticket.created_by) !== Number(user.id)
    ) {
        return { error: "You cannot access this ticket.", status: 403 };
    }

    if (!["Draft", "Rejected"].includes(ticket.status)) {
        return {
            error: "Line items can only be changed on Draft or Rejected tickets.",
            status: 400
        };
    }

    return { ticket };
};

// Validate line item input
const validateLineItem = (body) => {
    const { item_type, description, quantity, unit_price } = body;

    if (!["service", "material"].includes(item_type)) {
        return "item_type must be service or material.";
    }

    if (typeof description !== "string" || !description.trim()) {
        return "Description is required.";
    }

    if (
        quantity === undefined ||
        !Number.isFinite(Number(quantity)) ||
        Number(quantity) <= 0
    ) {
        return "Quantity must be greater than zero.";
    }

    if (
        unit_price === undefined ||
        !Number.isFinite(Number(unit_price)) ||
        Number(unit_price) < 0
    ) {
        return "Unit price must be zero or greater.";
    }

    return null;
};

// GET all line items for a ticket
const getLineItems = async (req, res) => {
    try {
        const { ticketId } = req.params;

        if (!/^\d+$/.test(ticketId)) {
            return res.status(400).json({ message: "Invalid ticket ID." });
        }

        const result = await pool.query(
            "SELECT id, created_by, status FROM tickets WHERE id = $1",
            [ticketId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Ticket not found." });
        }

        const ticket = result.rows[0];

        if (
            req.user.role !== "admin" &&
            Number(ticket.created_by) !== Number(req.user.id)
        ) {
            return res.status(403).json({
                message: "You cannot access this ticket."
            });
        }

        const items = await pool.query(
            `SELECT *
             FROM ticket_line_items
             WHERE ticket_id = $1
             ORDER BY id ASC`,
            [ticketId]
        );

        const total = await pool.query(
            `SELECT COALESCE(SUM(line_total), 0) AS total_amount
             FROM ticket_line_items
             WHERE ticket_id = $1`,
            [ticketId]
        );

        return res.status(200).json({
            ticket_id: Number(ticketId),
            count: items.rows.length,
            total_amount: total.rows[0].total_amount,
            line_items: items.rows
        });
    } catch (error) {
        console.error("Get line items error:", error.message);
        return res.status(500).json({
            message: "Unable to fetch line items."
        });
    }
};

// ADD a line item
const addLineItem = async (req, res) => {
    try {
        const { ticketId } = req.params;

        if (!/^\d+$/.test(ticketId)) {
            return res.status(400).json({ message: "Invalid ticket ID." });
        }

        const validationError = validateLineItem(req.body);
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const access = await checkTicketAccess(ticketId, req.user);
        if (access.error) {
            return res.status(access.status).json({ message: access.error });
        }

        const { item_type, description, quantity, unit_price } = req.body;

        const result = await pool.query(
            `INSERT INTO ticket_line_items
                (ticket_id, item_type, description, quantity, unit_price)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
                ticketId,
                item_type,
                description.trim(),
                Number(quantity),
                Number(unit_price)
            ]
        );

        const total = await pool.query(
            `SELECT COALESCE(SUM(line_total), 0) AS total_amount
             FROM ticket_line_items
             WHERE ticket_id = $1`,
            [ticketId]
        );

        return res.status(201).json({
            message: "Line item added successfully.",
            line_item: result.rows[0],
            total_amount: total.rows[0].total_amount
        });
    } catch (error) {
        console.error("Add line item error:", error.message);
        return res.status(500).json({
            message: "Unable to add line item."
        });
    }
};

// UPDATE a line item
const updateLineItem = async (req, res) => {
    try {
        const { ticketId, lineItemId } = req.params;

        if (!/^\d+$/.test(ticketId) || !/^\d+$/.test(lineItemId)) {
            return res.status(400).json({
                message: "Invalid ticket ID or line item ID."
            });
        }

        const validationError = validateLineItem(req.body);
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const access = await checkTicketAccess(ticketId, req.user);
        if (access.error) {
            return res.status(access.status).json({ message: access.error });
        }

        const { item_type, description, quantity, unit_price } = req.body;

        const result = await pool.query(
            `UPDATE ticket_line_items
             SET item_type = $1,
                 description = $2,
                 quantity = $3,
                 unit_price = $4
             WHERE id = $5 AND ticket_id = $6
             RETURNING *`,
            [
                item_type,
                description.trim(),
                Number(quantity),
                Number(unit_price),
                lineItemId,
                ticketId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Line item not found for this ticket."
            });
        }

        const total = await pool.query(
            `SELECT COALESCE(SUM(line_total), 0) AS total_amount
             FROM ticket_line_items
             WHERE ticket_id = $1`,
            [ticketId]
        );

        return res.status(200).json({
            message: "Line item updated successfully.",
            line_item: result.rows[0],
            total_amount: total.rows[0].total_amount
        });
    } catch (error) {
        console.error("Update line item error:", error.message);
        return res.status(500).json({
            message: "Unable to update line item."
        });
    }
};

// DELETE a line item
const deleteLineItem = async (req, res) => {
    try {
        const { ticketId, lineItemId } = req.params;

        if (!/^\d+$/.test(ticketId) || !/^\d+$/.test(lineItemId)) {
            return res.status(400).json({
                message: "Invalid ticket ID or line item ID."
            });
        }

        const access = await checkTicketAccess(ticketId, req.user);
        if (access.error) {
            return res.status(access.status).json({ message: access.error });
        }

        const result = await pool.query(
            `DELETE FROM ticket_line_items
             WHERE id = $1 AND ticket_id = $2
             RETURNING *`,
            [lineItemId, ticketId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Line item not found for this ticket."
            });
        }

        const total = await pool.query(
            `SELECT COALESCE(SUM(line_total), 0) AS total_amount
             FROM ticket_line_items
             WHERE ticket_id = $1`,
            [ticketId]
        );

        return res.status(200).json({
            message: "Line item deleted successfully.",
            total_amount: total.rows[0].total_amount
        });
    } catch (error) {
        console.error("Delete line item error:", error.message);
        return res.status(500).json({
            message: "Unable to delete line item."
        });
    }
};

module.exports = {
    getLineItems,
    addLineItem,
    updateLineItem,
    deleteLineItem
};