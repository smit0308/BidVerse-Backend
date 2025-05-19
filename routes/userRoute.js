const express = require("express");
const router = express.Router();
const { registerUser, loginUser, loginStatus, logoutUser, loginAsSeller, estimateIncome, getUser, getUserBalance, getAllUser, verifyEmail } = require("../controllers/userCtr");
const { protect, isAdmin } = require("../middleWare/authMiddleWare");
const upload = require("../middleWare/fileUpload");

router.post("/register", upload.single('photo'), registerUser);
router.post("/login", loginUser);
router.get("/loggedin", loginStatus);
router.get("/logout", logoutUser);
router.post("/seller", loginAsSeller);
router.get("/getuser", protect, getUser);
router.get("/sell-amount", protect, getUserBalance);
router.post("/verify-email/:token", verifyEmail);

router.get("/estimate-income", protect, isAdmin, estimateIncome);
router.get("/users", protect, isAdmin, getAllUser);

module.exports = router;
