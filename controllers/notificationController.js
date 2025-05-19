const Notification = require("../model/notificationModel");
const asyncHandler = require("express-async-handler");
const User = require("../model/userModel");

// @desc    Create a notification
// @route   POST /api/notifications
// @access  Private
const createNotification = asyncHandler(async (req, res) => {
  const { recipient, sender, title, message, link, product } = req.body;

  // Validate required fields
  if (!message || !link) {
    res.status(400);
    throw new Error("Message and link are required fields");
  }
  
  let recipientId;
  
  // Handle notification for admin
  if (recipient === "admin") {
    // Find admin users
    const adminUsers = await User.find({ role: "admin" });
    
    if (adminUsers.length === 0) {
      res.status(404);
      throw new Error("No admin users found");
    }
    
    // Create notifications for all admins
    const notifications = [];
    
    for (const admin of adminUsers) {
      const notification = await Notification.create({
        user: admin._id,
        sender: sender,
        title: title || "New Notification",
        product: product || null,
        type: "PRODUCT_ADDED",
        message,
        link,
        isRead: false,
      });
      
      notifications.push(notification);
    }
    
    return res.status(201).json(notifications);
  } 
  // Handle regular notifications
  else {
    recipientId = recipient;
    
    if (!recipientId) {
      res.status(400);
      throw new Error("Recipient ID is required");
    }
    
    const notification = await Notification.create({
      user: recipientId,
      sender: sender || req.user._id,
      title: title || "New Notification",
      product: product || null,
      type: req.body.type || "GENERAL",
      message,
      link,
      isRead: false,
    });
    
    res.status(201).json(notification);
  }
});

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .populate("sender", "name")
    .limit(10);
  res.status(200).json(notifications);
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id
// @access  Private
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);
  if (!notification) {
    res.status(404);
    throw new Error("Notification not found");
  }

  if (notification.user.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error("Not authorized");
  }

  notification.isRead = true;
  await notification.save();
  res.status(200).json(notification);
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { user: req.user._id, isRead: false },
    { isRead: true }
  );
  res.status(200).json({ message: "All notifications marked as read" });
});

// @desc    Get unread notifications count
// @route   GET /api/notifications/unread-count
// @access  Private
const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ 
    user: req.user._id, 
    isRead: false 
  });
  res.status(200).json({ count });
});

module.exports = {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
}; 