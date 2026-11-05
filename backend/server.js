
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db");

const authRoutes = require("./routes/authRoutes");
const ticketRoutes = require("./routes/ticketRoutes");
const deviceRoutes = require("./routes/deviceRoutes");
const syncRoutes = require("./routes/syncRoutes");
const templateRoutes = require("./routes/templateRoutes");

const app = express();

app.use(cors({
    origin: "http://localhost:5173"
}));

app.use(express.json());

// Home API
app.get("/", (req, res) => {
    res.json({
        message: "Legacy OFS Backend is running!"
    });
});

// Database health API
app.get("/api/health", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT NOW() AS current_time, current_database() AS database_name"
        );

        res.json({
            server: "OK",
            database: "Connected",
            details: result.rows[0]
        });
    } catch (error) {
        console.error(error.message);

        res.status(500).json({
            server: "OK",
            database: "Disconnected"
        });
    }
});

// Authentication APIs
app.use("/api/auth", authRoutes);

// Ticket APIs
app.use("/api/tickets", ticketRoutes);

// Device APIs
app.use("/api/devices", deviceRoutes);

// Offline Sync APIs
app.use("/api/sync", syncRoutes);

// Template APIs
app.use("/api/templates", templateRoutes);

// Unknown route handler
app.use((req, res) => {
    res.status(404).json({
        message: "API route not found",
        path: req.originalUrl
    });
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Legacy OFS server running on port ${PORT}`);
});
