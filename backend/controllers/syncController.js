
const pool = require("../db");

const syncOfflineData = async (req, res) => {
    const client = await pool.connect();

    try {
        const { actions } = req.body;

        if (!Array.isArray(actions)) {
            return res.status(400).json({
                message: "Actions must be an array."
            });
        }

        await client.query("BEGIN");

        const results = [];

        for (const action of actions) {
            try {

                // =================================
                // 1. OFFLINE COMMENT SYNC
                // =================================

                if (action.type === "add_comment") {
                    const {
                        ticket_id,
                        comment
                    } = action.data || {};

                    const offlineId = action.local_id;

                    if (!offlineId || !ticket_id || !comment) {
                        results.push({
                            local_id: offlineId || null,
                            status: "failed",
                            message: "Local ID, ticket ID and comment are required."
                        });
                        continue;
                    }

                    // Verify ticket ownership
                    const ticketCheck = await client.query(
                        `SELECT id
                         FROM tickets
                         WHERE id = $1
                           AND created_by = $2`,
                        [ticket_id, req.user.id]
                    );

                    if (ticketCheck.rows.length === 0) {
                        results.push({
                            local_id: offlineId,
                            status: "failed",
                            message: "Ticket not found or access denied."
                        });
                        continue;
                    }

                    // Check duplicate comment
                    const existingComment = await client.query(
                        `SELECT *
                         FROM ticket_comments
                         WHERE user_id = $1
                           AND offline_id = $2`,
                        [req.user.id, offlineId]
                    );

                    if (existingComment.rows.length > 0) {
                        results.push({
                            local_id: offlineId,
                            status: "already_synced",
                            comment: existingComment.rows[0]
                        });
                        continue;
                    }

                    // Insert comment
                    const newComment = await client.query(
                        `INSERT INTO ticket_comments
                         (ticket_id, user_id, comment, offline_id)
                         VALUES ($1, $2, $3, $4)
                         ON CONFLICT (user_id, offline_id)
                         WHERE offline_id IS NOT NULL
                         DO NOTHING
                         RETURNING *`,
                        [
                            ticket_id,
                            req.user.id,
                            comment,
                            offlineId
                        ]
                    );

                    if (newComment.rows.length === 0) {
                        const duplicate = await client.query(
                            `SELECT *
                             FROM ticket_comments
                             WHERE user_id = $1
                               AND offline_id = $2`,
                            [req.user.id, offlineId]
                        );

                        results.push({
                            local_id: offlineId,
                            status: "already_synced",
                            comment: duplicate.rows[0] || null
                        });
                    } else {
                        results.push({
                            local_id: offlineId,
                            status: "synced",
                            comment: newComment.rows[0]
                        });
                    }

                    continue;
                }

                // =================================
                // 2. OFFLINE TICKET UPDATE
                // =================================

                if (action.type === "update_ticket") {
                    const {
                        ticket_id,
                        customer_name,
                        work_start_date,
                        work_end_date,
                        custom_fields
                    } = action.data || {};

                    if (!ticket_id) {
                        results.push({
                            local_id: action.local_id,
                            status: "failed",
                            message: "Ticket ID is required for update."
                        });
                        continue;
                    }

                    const updatedTicket = await client.query(
                        `UPDATE tickets
                         SET
                            customer_name = COALESCE($1, customer_name),
                            work_start_date = COALESCE($2, work_start_date),
                            work_end_date = COALESCE($3, work_end_date),
                            custom_fields = COALESCE($4::jsonb, custom_fields),
                            updated_at = NOW()
                         WHERE id = $5
                           AND created_by = $6
                           AND status IN ('Draft', 'Rejected')
                         RETURNING *`,
                        [
                            customer_name || null,
                            work_start_date || null,
                            work_end_date || null,
                            custom_fields === undefined
                                ? null
                                : JSON.stringify(custom_fields),
                            ticket_id,
                            req.user.id
                        ]
                    );

                    if (updatedTicket.rows.length === 0) {
                        results.push({
                            local_id: action.local_id,
                            status: "failed",
                            message: "Ticket not found, not owned by you, or cannot be edited."
                        });
                    } else {
                        results.push({
                            local_id: action.local_id,
                            status: "updated",
                            ticket: updatedTicket.rows[0]
                        });
                    }

                    continue;
                }

                // =================================
                // 3. OFFLINE TICKET SUBMISSION
                // =================================

                if (action.type === "submit_ticket") {
                    const {
                        ticket_id
                    } = action.data || {};

                    if (!ticket_id) {
                        results.push({
                            local_id: action.local_id,
                            status: "failed",
                            message: "Ticket ID is required for submission."
                        });
                        continue;
                    }

                    // Check ownership and current status
                    const ticketCheck = await client.query(
                        `SELECT id, status
                         FROM tickets
                         WHERE id = $1
                           AND created_by = $2
                         FOR UPDATE`,
                        [ticket_id, req.user.id]
                    );

                    if (
                        ticketCheck.rows.length === 0 ||
                        !["Draft", "Rejected"].includes(ticketCheck.rows[0].status)
                    ) {
                        results.push({
                            local_id: action.local_id,
                            status: "failed",
                            message: "Ticket not found, not owned by you, or cannot be submitted."
                        });
                        continue;
                    }

                    const oldStatus = ticketCheck.rows[0].status;

                    // Update ticket status
                    const submittedTicket = await client.query(
                        `UPDATE tickets
                         SET
                            status = 'Submitted',
                            updated_at = NOW()
                         WHERE id = $1
                           AND created_by = $2
                         RETURNING *`,
                        [ticket_id, req.user.id]
                    );

                    // Insert ticket history
                    await client.query(
                        `INSERT INTO ticket_history
                         (ticket_id, changed_by, old_status, new_status, remarks)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [
                            ticket_id,
                            req.user.id,
                            oldStatus,
                            "Submitted",
                            "Ticket submitted through offline sync"
                        ]
                    );

                    results.push({
                        local_id: action.local_id,
                        status: "submitted",
                        ticket: submittedTicket.rows[0]
                    });

                    continue;
                }

                // =================================
                // 4. OFFLINE TICKET CREATE
                // =================================

                if (action.type === "create_ticket") {
                    const {
                        customer_name,
                        template_id,
                        work_start_date,
                        work_end_date,
                        custom_fields
                    } = action.data || {};

                    const offlineId = action.local_id;

                    if (!offlineId || !customer_name) {
                        results.push({
                            local_id: offlineId || null,
                            status: "failed",
                            message: "Local ID and customer name are required."
                        });
                        continue;
                    }

                    // Check existing offline ticket
                    const existing = await client.query(
                        `SELECT *
                         FROM tickets
                         WHERE created_by = $1
                           AND offline_id = $2`,
                        [req.user.id, offlineId]
                    );

                    if (existing.rows.length > 0) {
                        results.push({
                            local_id: offlineId,
                            status: "already_synced",
                            ticket: existing.rows[0]
                        });
                        continue;
                    }

                    const ticketNumber =
                        `OFS-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

                    const ticket = await client.query(
                        `INSERT INTO tickets
                        (
                            ticket_number,
                            offline_id,
                            template_id,
                            created_by,
                            customer_name,
                            work_start_date,
                            work_end_date,
                            custom_fields,
                            status
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Draft')
                        ON CONFLICT (created_by, offline_id)
                        WHERE offline_id IS NOT NULL
                        DO NOTHING
                        RETURNING *`,
                        [
                            ticketNumber,
                            offlineId,
                            template_id || null,
                            req.user.id,
                            customer_name,
                            work_start_date || null,
                            work_end_date || null,
                            JSON.stringify(custom_fields || {})
                        ]
                    );

                    if (ticket.rows.length === 0) {
                        const duplicate = await client.query(
                            `SELECT *
                             FROM tickets
                             WHERE created_by = $1
                               AND offline_id = $2`,
                            [req.user.id, offlineId]
                        );

                        results.push({
                            local_id: offlineId,
                            status: "already_synced",
                            ticket: duplicate.rows[0] || null
                        });
                    } else {
                        results.push({
                            local_id: offlineId,
                            status: "synced",
                            ticket: ticket.rows[0]
                        });
                    }

                    continue;
                }

                // =================================
                // 5. UNSUPPORTED ACTION
                // =================================

                results.push({
                    local_id: action.local_id,
                    status: "failed",
                    message: "Unsupported action type."
                });

            } catch (actionError) {
                results.push({
                    local_id: action.local_id || null,
                    status: "failed",
                    message: actionError.message
                });
            }
        }

        await client.query("COMMIT");

        return res.status(200).json({
            message: "Offline sync completed.",
            total: actions.length,
            results
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Offline sync error:", error.message);

        return res.status(500).json({
            message: "Offline sync failed.",
            error: error.message
        });

    } finally {
        client.release();
    }
};

module.exports = {
    syncOfflineData
};
