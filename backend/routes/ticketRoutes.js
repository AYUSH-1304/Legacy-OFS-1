
const express = require("express");
const router = express.Router();

const {
    createTicket,
    getAllTickets,
    getTicketById,
    updateTicket,
    deleteTicket,
    submitTicket,
    approveTicket,
    rejectTicket,
    updateFinalStatus
} = require("../controllers/ticketController");
const {
    addComment,
    getComments,
    getTicketHistory
} = require("../controllers/commentController");
const {
    getLineItems,
    addLineItem,
    updateLineItem,
    deleteLineItem
} = require("../controllers/lineItemController");

const { protect, adminOnly } = require("../middleware/authMiddleware");

router.use(protect);

// Ticket CRUD
router.post("/", createTicket);
router.get("/", getAllTickets);
router.get("/:id", getTicketById);
router.put("/:id", updateTicket);
router.delete("/:id", deleteTicket);

// Ticket workflow
router.patch("/:id/submit", submitTicket);
router.patch("/:id/approve", adminOnly, approveTicket);
router.patch("/:id/reject", adminOnly, rejectTicket);
router.patch("/:id/final-status", adminOnly, updateFinalStatus);

// Ticket Line Items
router.get("/:ticketId/line-items", getLineItems);
router.post("/:ticketId/line-items", addLineItem);
router.put("/:ticketId/line-items/:lineItemId", updateLineItem);
router.delete("/:ticketId/line-items/:lineItemId", deleteLineItem);

// Ticket Comments
router.post("/:ticketId/comments", addComment);
router.get("/:ticketId/comments", getComments);

// Ticket Status History
router.get("/:ticketId/history", getTicketHistory);
module.exports = router;
