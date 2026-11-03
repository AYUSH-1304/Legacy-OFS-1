const pool = require("../db");

// Check ticket access
const checkTicketAccess = async (ticketId, user) => {
    const result = await pool.query(
        `SELECT id, created_by
         FROM tickets
         WHERE id = $1`,
        [ticketId]
    );

    if (result.rows.length === 0) {
        return { exists: false, allowed: false };
    }

    const ticket = result.rows[0];

    const isAdmin = user.role === "admin";
    const isOwner = Number(ticket.created_by) === Number(user.id);

    return {
        exists: true,
        allowed: isAdmin || isOwner
    };
};


// Add comment
const addComment = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { comment } = req.body;

        if (!comment || typeof comment !== "string" || !comment.trim()) {
            return res.status(400).json({
                message: "Comment is required."
            });
        }

        const access = await checkTicketAccess(ticketId, req.user);

        if (!access.exists) {
            return res.status(404).json({
                message: "Ticket not found."
            });
        }

        if (!access.allowed) {
            return res.status(403).json({
                message: "You are not allowed to access this ticket."
            });
        }

        const result = await pool.query(
            `INSERT INTO ticket_comments
                (ticket_id, user_id, comment)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [ticketId, req.user.id, comment.trim()]
        );

        res.status(201).json({
            message: "Comment added successfully.",
            comment: result.rows[0]
        });

    } catch (error) {
        console.error("Add comment error:", error.message);

        res.status(500).json({
            message: "Unable to add comment."
        });
    }
};


// Get comments
const getComments = async (req, res) => {
    try {
        const { ticketId } = req.params;

        const access = await checkTicketAccess(ticketId, req.user);

        if (!access.exists) {
            return res.status(404).json({
                message: "Ticket not found."
            });
        }

        if (!access.allowed) {
            return res.status(403).json({
                message: "You are not allowed to access this ticket."
            });
        }

        const result = await pool.query(
            `SELECT
                tc.id,
                tc.ticket_id,
                tc.user_id,
                u.name AS user_name,
                u.role AS user_role,
                tc.comment,
                tc.created_at
             FROM ticket_comments tc
             JOIN users u ON u.id = tc.user_id
             WHERE tc.ticket_id = $1
             ORDER BY tc.created_at ASC, tc.id ASC`,
            [ticketId]
        );

        res.status(200).json({
            ticket_id: Number(ticketId),
            total: result.rows.length,
            comments: result.rows
        });

    } catch (error) {
        console.error("Get comments error:", error.message);

        res.status(500).json({
            message: "Unable to fetch comments."
        });
    }
};


// Get ticket history
const getTicketHistory = async (req, res) => {
    try {
        const { ticketId } = req.params;

        const access = await checkTicketAccess(ticketId, req.user);

        if (!access.exists) {
            return res.status(404).json({
                message: "Ticket not found."
            });
        }

        if (!access.allowed) {
            return res.status(403).json({
                message: "You are not allowed to access this ticket."
            });
        }

        const result = await pool.query(
            `SELECT
                th.id,
                th.ticket_id,
                th.changed_by,
                u.name AS changed_by_name,
                th.old_status,
                th.new_status,
                th.remarks,
                th.created_at
             FROM ticket_history th
             LEFT JOIN users u ON u.id = th.changed_by
             WHERE th.ticket_id = $1
             ORDER BY th.created_at ASC, th.id ASC`,
            [ticketId]
        );

        res.status(200).json({
            ticket_id: Number(ticketId),
            total: result.rows.length,
            history: result.rows
        });

    } catch (error) {
        console.error("Get history error:", error.message);

        res.status(500).json({
            message: "Unable to fetch ticket history."
        });
    }
};


module.exports = {
    addComment,
    getComments,
    getTicketHistory
};