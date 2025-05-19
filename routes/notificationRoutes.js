const express = require("express");
const router = express.Router();
const {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} = require("../controllers/notificationController");
const { protect } = require("../middleWare/authMiddleWare");

router.post("/", protect, createNotification);
router.get("/", protect, getNotifications);
router.put("/:id", protect, markAsRead);
router.put("/read-all", protect, markAllAsRead);
router.get("/unread-count", protect, getUnreadCount);

module.exports = router; 
