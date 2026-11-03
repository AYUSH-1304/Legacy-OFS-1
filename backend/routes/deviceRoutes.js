const express = require("express");
const router = express.Router();

const {
    registerDevice,
    getMyDevices,
    getAllDevices,
    revokeDevice
} = require("../controllers/deviceController");

const {
    protect,
    adminOnly
} = require("../middleware/authMiddleware");

// All routes require login
router.use(protect);

// User device APIs
router.post("/register", registerDevice);
router.get("/my-devices", getMyDevices);

// Admin device APIs
router.get("/", adminOnly, getAllDevices);
router.patch("/:id/revoke", adminOnly, revokeDevice);

module.exports = router;