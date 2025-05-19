const expressAsyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const User = require("../model/userModel");
const asyncHandler = require("express-async-handler");

const protect = asyncHandler(async (req, res, next) => {
  try {
  
    // Allow cron job access with secret key
    const cronKey = req.headers["x-cron-key"];
    if (cronKey && cronKey === process.env.CRON_SECRET_KEY) {
      // For cron jobs, set a system admin user
      const adminUser = await User.findOne({ role: "admin" });
      if (adminUser) {
        req.user = adminUser;
        return next();
      }
    }

    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
      res.status(401);
      throw new Error("Not authorized, Please Login");
    }

    // Verify token
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    // Get user id from token
    const user = await User.findById(verified.id).select("-password");

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    if (user.role === "suspended") {
      res.status(400);
      throw new Error("User suspended, please contact support");
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401);
    throw new Error("Not authorized, Please Login");
  }
});

const isAdmin = asyncHandler(async (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(401);
    throw new Error("Not authorized as an admin");
  }
});

const isSeller = asyncHandler(async (req, res, next) => {
  if (req.user && (req.user.role === "seller" || req.user.role === "admin")) {
    next();
  } else {
    res.status(401);
    throw new Error("Not authorized as a seller");
  }
});

module.exports = { protect, isAdmin, isSeller };
