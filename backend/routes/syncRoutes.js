
const express = require("express");
const router = express.Router();

const {
    syncOfflineData
} = require("../controllers/syncController");

const {
    protect
} = require("../middleware/authMiddleware");

router.use(protect);

router.post("/", syncOfflineData);

module.exports = router;
