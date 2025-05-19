const express = require("express");
const router = express.Router();
const {
  createBalanceRequest,
  getUserBalanceRequests,
  getAllBalanceRequests,
  getBalanceRequestById,
  processBalanceRequest,
} = require("../controllers/balanceController");
const { protect, isAdmin } = require("../middleWare/authMiddleWare");
const { upload } = require("../utils/fileUpload");

// User routes
router.post("/request", protect, upload.single("proofImage"), createBalanceRequest);
router.get("/requests", protect, getUserBalanceRequests);
router.get("/requests/:id", protect, getBalanceRequestById);

// Admin routes
router.get("/admin/requests", protect, isAdmin, getAllBalanceRequests);
router.put("/admin/requests/:id", protect, isAdmin, processBalanceRequest);

module.exports = router; 