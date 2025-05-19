const express = require("express");
const router = express.Router();
const { registerUser, loginUser, loginStatus, logout, getUser, updateUser, changePassword, forgotPassword, resetPassword, verifyEmail, deleteUser } = require("../controllers/userCtr");
const { protect, isAdmin } = require("../middleware/authMiddleware");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/logout", logout);
router.get("/loggedin", loginStatus);
router.get("/getuser", protect, getUser);
router.patch("/updateuser", protect, updateUser);
router.patch("/changepassword", protect, changePassword);
router.post("/forgotpassword", forgotPassword);
router.put("/resetpassword/:resetToken", resetPassword);
router.post("/verify-email/:token", verifyEmail);
router.delete("/users/:id", protect, isAdmin, deleteUser);

module.exports = router; 