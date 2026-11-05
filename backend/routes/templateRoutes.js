
const express = require("express");
const router = express.Router();

const {
    getTemplates,
    getTemplateById,
    createTemplate,
    updateTemplate,
    updateTemplateStatus
} = require("../controllers/templateController");

const {
    protect,
    adminOnly
} = require("../middleware/authMiddleware");

// All template APIs require authentication
router.use(protect);

// Worker and Admin
router.get("/", getTemplates);
router.get("/:id", getTemplateById);

// Admin only
router.post("/", adminOnly, createTemplate);
router.put("/:id", adminOnly, updateTemplate);
router.patch("/:id/status", adminOnly, updateTemplateStatus);

module.exports = router;
