const express = require("express");
const {
  createProduct,
  getAllProducts,
  deleteProduct,
  updateProduct,
  getProductBySlug,
  getAllProductsByAmdin,
  deleteProductsByAmdin,
  getAllSoldProducts,
  verifyAndAddCommissionProductByAmdin,
  getAllProductsofUser,
  getWonProducts,
} = require("../controllers/productCtr");
const { checkAuctionStatus, notifyEndingSoonAuctions } = require("../controllers/biddingCtr");
const { upload } = require("../utils/fileUpload");
const { protect, isSeller, isAdmin } = require("../middleWare/authMiddleWare");
const router = express.Router();

router.post("/", protect, isSeller, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 5 }
]), createProduct);
router.delete("/:id", protect, isSeller, deleteProduct);
router.put("/:id", protect, isSeller, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 5 }
]), updateProduct);

router.get("/", getAllProducts);
router.get("/user", protect, getAllProductsofUser);
router.get("/won-products", protect, getWonProducts);
router.get("/sold", getAllSoldProducts);
router.get("/:id", getProductBySlug);

// Only access for admin users
router.patch("/admin/product-verified/:id", protect, isAdmin, verifyAndAddCommissionProductByAmdin);
router.get("/admin/products", protect, isAdmin, getAllProductsByAmdin);
router.delete("/admin/products", protect, isAdmin, deleteProductsByAmdin);

// Add route to check and update auction statuses
router.get("/admin/check-auctions", protect, isAdmin, checkAuctionStatus);
router.get("/admin/check-ending-soon", protect, isAdmin, notifyEndingSoonAuctions);

module.exports = router;
