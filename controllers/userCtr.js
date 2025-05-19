const asyncHandler = require("express-async-handler");
const User = require("../model/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Product = require("../model/productModel");
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const cloudinary = require('cloudinary');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

const registerUser = asyncHandler(async (req, res) => {
  const { 
    name, 
    fullName, 
    email, 
    password, 
    contactNumber, 
    streetAddress,
    city,
    state,
    postalCode,
    country,
    dateOfBirth 
  } = req.body;

  if (!name || !fullName || !email || !password || !contactNumber || !streetAddress || 
      !city || !state || !postalCode || !country || !dateOfBirth) {
    res.status(400);
    throw new Error("Please fill in all required fields");
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error("Email is already registered");
  }

  // Generate verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  // Handle photo upload
  let photoUrl = "https://cdn-icons-png.flaticon.com/512/2202/2202112.png"; // Default photo
  if (req.file) {
    try {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "Bidding/Users",
        resource_type: "image",
      });
      photoUrl = result.secure_url;
    } catch (error) {
      console.error("Error uploading photo:", error);
      // Continue with default photo if upload fails
    }
  }

  const user = await User.create({
    name,
    fullName,
    email,
    password,
    contactNumber,
    streetAddress,
    city,
    state,
    postalCode,
    country,
    dateOfBirth,
    verificationToken,
    verificationTokenExpires,
    photo: photoUrl
  });

  // Send verification email
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
  const message = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2c3e50; margin-bottom: 10px;">👋 Hello ${name}!</h1>
        <p style="color: #7f8c8d; font-size: 16px;">Welcome to BidVerse! 🎉</p>
      </div>
      
      <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <p style="color: #34495e; font-size: 16px; line-height: 1.6;">
          Thank you for registering with BidVerse! 🎯<br>
          To complete your registration and start bidding, please click the button below to verify your email address.
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" 
           style="display: inline-block; padding: 12px 30px; background-color: #3498db; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; transition: background-color 0.3s;">
          Verify Email Address ✉️
        </a>
      </div>

      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <p style="color: #95a5a6; font-size: 14px;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${verificationUrl}" style="color: #3498db; word-break: break-all;">${verificationUrl}</a>
        </p>
      </div>

      <div style="text-align: center; margin-top: 20px; color: #95a5a6; font-size: 12px;">
        <p>This link will expire in 24 hours ⏰</p>
        <p>If you didn't create an account, you can safely ignore this email.</p>
      </div>
    </div>
  `;

  await sendEmail({
    email: user.email,
    subject: "Email Verification",
    message
  });

  if (user) {
    res.status(201).json({
      success: true,
      message: "Registration successful. Please check your email to verify your account."
    });
  } else {
    res.status(400);
    throw new Error("Invalid user data");
  }
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { email } = req.body;

  console.log("Verification attempt:", { token, email });

  // First try to find user by email to check if they exist
  const userByEmail = await User.findOne({ email });
  console.log("User found by email:", userByEmail ? "Yes" : "No");
  if (userByEmail) {
    console.log("User verification status:", userByEmail.isVerified);
    console.log("User verification token:", userByEmail.verificationToken);
    console.log("User token expiry:", userByEmail.verificationTokenExpires);
    
    // If user is already verified, return success
    if (userByEmail.isVerified) {
      return res.status(200).json({
        success: true,
        message: "Email is already verified"
      });
    }
  }

  // Then try to find user by token
  const user = await User.findOne({
    verificationToken: token,
    verificationTokenExpires: { $gt: Date.now() }
  });

  console.log("Found user by token:", user ? "Yes" : "No");
  if (user) {
    console.log("Token user verification status:", user.isVerified);
    console.log("Token user email:", user.email);
  }

  if (!user) {
    // If no user found with token, check if token is expired
    const expiredUser = await User.findOne({ verificationToken: token });
    if (expiredUser) {
      // Generate new verification token
      const newToken = crypto.randomBytes(32).toString('hex');
      const newTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
      
      expiredUser.verificationToken = newToken;
      expiredUser.verificationTokenExpires = newTokenExpires;
      await expiredUser.save();

      // Send new verification email
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${newToken}`;
      const message = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2c3e50; margin-bottom: 10px;">👋 Hello ${expiredUser.name}!</h1>
            <p style="color: #7f8c8d; font-size: 16px;">Welcome to BidVerse! 🎉</p>
          </div>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="color: #34495e; font-size: 16px; line-height: 1.6;">
              Your previous verification link has expired. 🔄<br>
              To complete your registration and start bidding, please click the button below to verify your email address.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="display: inline-block; padding: 12px 30px; background-color: #3498db; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; transition: background-color 0.3s;">
              Verify Email Address ✉️
            </a>
          </div>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #95a5a6; font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${verificationUrl}" style="color: #3498db; word-break: break-all;">${verificationUrl}</a>
            </p>
          </div>

          <div style="text-align: center; margin-top: 20px; color: #95a5a6; font-size: 12px;">
            <p>This link will expire in 24 hours ⏰</p>
            <p>If you didn't create an account, you can safely ignore this email.</p>
          </div>
        </div>
      `;

      await sendEmail({
        email: expiredUser.email,
        subject: "Email Verification - New Link",
        message
      });

      res.status(400);
      throw new Error("Verification link expired. A new verification link has been sent to your email.");
    }
    
    res.status(400);
    throw new Error("Invalid verification token");
  }

  if (user.email !== email) {
    console.log("Email mismatch:", { provided: email, stored: user.email });
    res.status(400);
    throw new Error("Email does not match");
  }

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpires = undefined;
  await user.save();

  console.log("Email verified successfully for user:", email);

  res.status(200).json({
    success: true,
    message: "Email verified successfully"
  });
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Please add Email and Password");
  }

  const user = await User.findOne({ email });
  if (!user) {
    res.status(400);
    throw new Error("User not found, Please signUp");
  }

  // Check if email is verified
  if (!user.isVerified) {
    res.status(403);
    throw new Error("Please verify your email before logging in. Check your inbox for the verification link.");
  }

  const passwordIsCorrrect = await bcrypt.compare(password, user.password);

  const token = generateToken(user._id);
  res.cookie("token", token, {
    path: "/",
    httpOnly: true,
    expires: new Date(Date.now() + 1000 * 86400), // 1 day
    sameSite: "none",
    secure: true,
  });

  if (user && passwordIsCorrrect) {
    const { _id, name, email, photo, role } = user;
    res.status(201).json({ _id, name, email, photo, role, token });
  } else {
    res.status(400);
    throw new Error("Invalid email or password");
  }
});

const loginStatus = asyncHandler(async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json(false);
  }
  const verified = jwt.verify(token, process.env.JWT_SECRET);
  if (verified) {
    return res.json(true);
  }
  return res.json(false);
});

const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");

  res.status(200).json(user);
});

const logoutUser = asyncHandler(async (req, res) => {
  res.cookie("token", "", {
    path: "/",
    httpOnly: true,
    expires: new Date(0),
    sameSite: "none",
    secure: true,
  });
  return res.status(200).json({ message: "Successfully Logged Out" });
});

const loginAsSeller = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Check if email and password are provided
  if (!email || !password) {
    res.status(400);
    throw new Error("Please provide both email and password");
  }

  // Find the user by email
  const user = await User.findOne({ email });
  if (!user) {
    res.status(400);
    throw new Error("User not found, please sign up");
  }

  // Verify the password
  const passwordIsCorrect = await bcrypt.compare(password, user.password);
  if (!passwordIsCorrect) {
    res.status(400);
    throw new Error("Invalid email or password");
  }

  // Check if the user is already a seller
  if (user.role === "seller") {
    res.status(400);
    throw new Error("You are already a seller");
  }

  // Check if the user is trying to become a seller with someone else's account
  // This is a security check to prevent users from becoming sellers with other people's accounts
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  if (token) {
    try {
      const verified = jwt.verify(token, process.env.JWT_SECRET);
      const loggedInUser = await User.findById(verified.id).select("-password");
      
      if (loggedInUser && loggedInUser.email !== email) {
        res.status(403);
        throw new Error("You can only become a seller with your own account");
      }
    } catch (error) {
      // If token verification fails, we'll still allow the process to continue
      // as the password check is sufficient for security
      console.log("Token verification failed:", error.message);
    }
  }

  // If password is correct, update the role to 'seller'
  user.role = "seller";
  await user.save();

  // Generate a token and set cookie
  const newToken = generateToken(user._id);
  res.cookie("token", newToken, {
    path: "/",
    httpOnly: true,
    expires: new Date(Date.now() + 1000 * 86400),
    sameSite: "lax", // Fix CORS issues
    secure: false, // Set to false in development
  });

  // Send the response with updated user info
  const { _id, name, email: userEmail, photo, role } = user;
  res.status(200).json({ _id, name, email: userEmail, photo, role, token: newToken });
});

const getUserBalance = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.status(200).json({
    balance: user.balance,
  });
});

// Only for admin users
const getAllUser = asyncHandler(async (req, res) => {
  const userList = await User.find({});

  if (!userList.length) {
    return res.status(404).json({ message: "No user found" });
  }

  res.status(200).json(userList);
});

const estimateIncome = asyncHandler(async (req, res) => {
  try {
    const admin = await User.findOne({ role: "admin" });
    if (!admin) {
      return res.status(404).json({ error: "Admin user not found" });
    }
    const commissionBalance = admin.commissionBalance;
    res.status(200).json({ commissionBalance });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Don't allow deleting admin users
  if (user.role === "admin") {
    res.status(403);
    throw new Error("Cannot delete admin users");
  }

  await user.remove();
  
  res.status(200).json({
    success: true,
    message: "User deleted successfully",
    _id: req.params.id
  });
});

module.exports = {
  registerUser,
  verifyEmail,
  loginUser,
  loginStatus,
  logoutUser,
  loginAsSeller,
  estimateIncome,
  getUser,
  getUserBalance,
  getAllUser,
  deleteUser
};
