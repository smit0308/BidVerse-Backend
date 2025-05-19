const asyncHandler = require("express-async-handler");
const BalanceRequest = require("../model/balanceRequestModel");
const User = require("../model/userModel");
const cloudinary = require("cloudinary").v2;
const Notification = require("../model/notificationModel");

// @desc    Create a balance request
// @route   POST /api/balance/request
// @access  Private
const createBalanceRequest = asyncHandler(async (req, res) => {
  const { amount, paymentMethod, transactionId, notes } = req.body;
  const userId = req.user.id;

  if (!amount || !paymentMethod || !transactionId) {
    res.status(400);
    throw new Error("Please fill in all required fields");
  }

  // Check if amount is a positive number
  if (amount <= 0) {
    res.status(400);
    throw new Error("Amount must be greater than 0");
  }

  // Handle file upload if present
  let fileData = {};
  if (req.file) {
    try {
      const uploadedFile = await cloudinary.uploader.upload(req.file.path, {
        folder: "Bidding/Payments",
        resource_type: "image",
      });

      fileData = {
        fileName: req.file.originalname,
        filePath: uploadedFile.secure_url,
        fileType: req.file.mimetype,
        public_id: uploadedFile.public_id,
      };
    } catch (error) {
      res.status(500);
      throw new Error("Image could not be uploaded");
    }
  }

  // Create balance request
  const balanceRequest = await BalanceRequest.create({
    user: userId,
    amount,
    paymentMethod,
    transactionId,
    notes: notes || "",
    proofOfPayment: fileData,
  });

  // Notify admin about new balance request
  // Find admin users
  const adminUsers = await User.find({ role: "admin" });

  if (adminUsers.length > 0) {
    for (const admin of adminUsers) {
      await Notification.create({
        user: admin._id,
        sender: userId,
        title: "New Balance Request",
        message: `A new balance request of $${amount} has been submitted.`,
        link: `/admin/balance-requests/${balanceRequest._id}`,
        type: "BALANCE_REQUEST",
        isRead: false,
      });
    }
  }

  res.status(201).json({
    success: true,
    data: balanceRequest,
  });
});

// @desc    Get user's balance requests
// @route   GET /api/balance/requests
// @access  Private
const getUserBalanceRequests = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const balanceRequests = await BalanceRequest.find({ user: userId })
    .sort("-createdAt");

  res.status(200).json(balanceRequests);
});

// Admin Controllers

// @desc    Get all balance requests 
// @route   GET /api/balance/admin/requests
// @access  Private (Admin)
const getAllBalanceRequests = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const startIndex = (page - 1) * limit;
  
  const status = req.query.status || "pending";
  
  const query = status === "all" ? {} : { status };
  
  const count = await BalanceRequest.countDocuments(query);
  
  const balanceRequests = await BalanceRequest.find(query)
    .populate("user", "name email contactNumber photo")
    .populate("reviewedBy", "name")
    .sort("-createdAt")
    .skip(startIndex)
    .limit(limit);
    
  res.status(200).json({
    success: true,
    count,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
    balanceRequests,
  });
});

// @desc    Get balance request details
// @route   GET /api/balance/requests/:id
// @access  Private (User or Admin)
const getBalanceRequestById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const balanceRequest = await BalanceRequest.findById(id)
    .populate("user", "name email contactNumber photo")
    .populate("reviewedBy", "name");
  
  if (!balanceRequest) {
    res.status(404);
    throw new Error("Balance request not found");
  }
  
  // Check if the user is authorized (admin or the request owner)
  if (req.user.role !== "admin" && balanceRequest.user._id.toString() !== req.user.id) {
    res.status(401);
    throw new Error("Not authorized to view this request");
  }
  
  res.status(200).json(balanceRequest);
});

// @desc    Approve or reject balance request
// @route   PUT /api/balance/admin/requests/:id
// @access  Private (Admin)
const processBalanceRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, adminNotes } = req.body;
  
  if (!status || !["approved", "rejected"].includes(status)) {
    res.status(400);
    throw new Error("Invalid status provided");
  }
  
  const balanceRequest = await BalanceRequest.findById(id);
  
  if (!balanceRequest) {
    res.status(404);
    throw new Error("Balance request not found");
  }
  
  if (balanceRequest.status !== "pending") {
    res.status(400);
    throw new Error(`This request has already been ${balanceRequest.status}`);
  }
  
  // Update balance request
  balanceRequest.status = status;
  balanceRequest.adminNotes = adminNotes || "";
  balanceRequest.reviewedBy = req.user.id;
  
  // If approved, update user's balance
  if (status === "approved") {
    const user = await User.findById(balanceRequest.user);
    
    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }
    
    user.balance += balanceRequest.amount;
    await user.save();
  }
  
  await balanceRequest.save();
  
  // Create notification for the user
  await Notification.create({
    user: balanceRequest.user,
    sender: req.user.id,
    title: status === "approved" ? "Balance Request Approved" : "Balance Request Rejected",
    message: status === "approved" 
      ? `Your balance request for $${balanceRequest.amount} has been approved and added to your account.` 
      : `Your balance request for $${balanceRequest.amount} has been rejected. Reason: ${adminNotes || "No reason provided"}`,
    link: `/account/balance-requests/${balanceRequest._id}`,
    type: "BALANCE_UPDATE",
    isRead: false,
  });
  
  res.status(200).json({
    success: true,
    data: balanceRequest,
  });
});

module.exports = {
  createBalanceRequest,
  getUserBalanceRequests,
  getAllBalanceRequests,
  getBalanceRequestById,
  processBalanceRequest,
}; 