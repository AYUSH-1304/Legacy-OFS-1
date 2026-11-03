const pool = require("../db");

// 1. Register Device
const registerDevice = async (req, res) => {
    try {
        const { device_name, device_identifier } = req.body;

        if (!device_name || !device_identifier) {
            return res.status(400).json({
                message: "Device name and identifier are required."
            });
        }

        // Check if device already exists
        const existingDevice = await pool.query(
            `SELECT * FROM devices
             WHERE device_identifier = $1
             AND user_id = $2`,
            [device_identifier, req.user.id]
        );

        if (existingDevice.rows.length > 0) {
            const device = existingDevice.rows[0];

            if (!device.is_active) {
                return res.status(403).json({
                    message: "This device has been revoked."
                });
            }

            await pool.query(
                `UPDATE devices
                 SET last_active_at = NOW()
                 WHERE id = $1`,
                [device.id]
            );

            return res.status(200).json({
                message: "Device already registered.",
                device
            });
        }

        // Maximum 5 active devices
        const activeDevices = await pool.query(
            `SELECT COUNT(*) AS total
             FROM devices
             WHERE user_id = $1 AND is_active = TRUE`,
            [req.user.id]
        );

        if (Number(activeDevices.rows[0].total) >= 5) {
            return res.status(403).json({
                message: "Maximum 5 active devices allowed."
            });
        }

        const result = await pool.query(
            `INSERT INTO devices
             (user_id, device_name, device_identifier,
              is_active, last_active_at)
             VALUES ($1, $2, $3, TRUE, NOW())
             RETURNING *`,
            [req.user.id, device_name, device_identifier]
        );

        res.status(201).json({
            message: "Device registered successfully.",
            device: result.rows[0]
        });

    } catch (error) {
        console.error("Register device error:", error.message);
        res.status(500).json({
            message: "Unable to register device."
        });
    }
};


// 2. Get My Devices
const getMyDevices = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, device_name, device_identifier,
                    is_active, revoked_at, last_active_at, created_at
             FROM devices
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [req.user.id]
        );

        res.json({
            total: result.rows.length,
            devices: result.rows
        });

    } catch (error) {
        console.error("Get devices error:", error.message);
        res.status(500).json({
            message: "Unable to fetch devices."
        });
    }
};


// 3. Admin: Get All Devices
const getAllDevices = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT d.id, d.user_id, u.name AS user_name,
                    u.email, d.device_name, d.device_identifier,
                    d.is_active, d.revoked_at, d.last_active_at,
                    d.created_at
             FROM devices d
             JOIN users u ON u.id = d.user_id
             ORDER BY d.created_at DESC`
        );

        res.json({
            total: result.rows.length,
            devices: result.rows
        });

    } catch (error) {
        console.error("Get all devices error:", error.message);
        res.status(500).json({
            message: "Unable to fetch all devices."
        });
    }
};


// 4. Admin: Revoke Device
const revokeDevice = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `UPDATE devices
             SET is_active = FALSE,
                 revoked_at = NOW()
             WHERE id = $1 AND is_active = TRUE
             RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Active device not found."
            });
        }

        res.json({
            message: "Device revoked successfully.",
            device: result.rows[0]
        });

    } catch (error) {
        console.error("Revoke device error:", error.message);
        res.status(500).json({
            message: "Unable to revoke device."
        });
    }
};


module.exports = {
    registerDevice,
    getMyDevices,
    getAllDevices,
    revokeDevice
};