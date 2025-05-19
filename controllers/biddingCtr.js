const asyncHandler = require("express-async-handler");
const Product = require("../model/productModel");
const BiddingProduct = require("../model/biddingProductModel");
const sendEmail = require("../utils/sendEmail");
const User = require("../model/userModel");
const Notification = require("../model/notificationModel");

// Helper function to check and update auction status
const checkAndUpdateAuctionStatus = async (product) => {
  const currentTime = new Date();
  const endTime = new Date(product.endDate);
  
  // If auction has ended and product is not marked as sold out
  if (currentTime > endTime && !product.isSoldout) {
    // Find the highest bid
    const highestBid = await BiddingProduct.findOne({ product: product._id })
      .sort({ price: -1 })
      .populate("user");
      
    if (highestBid) {
      // If there was at least one bid, mark as sold to highest bidder
      product.isSoldout = true;
      product.soldTo = highestBid.user._id;
      await product.save();
      
      // Deduct the winning bid amount from buyer's balance
      const buyer = await User.findById(highestBid.user._id);
      if (buyer) {
        buyer.balance -= highestBid.price;
        await buyer.save();
      }
      
      // Notify the winner
      try {
        await sendEmail({
          email: highestBid.user.email,
          subject: "Congratulations! You won the auction!",
          text: `You have won the auction for "${product.title}" with a bid of $${highestBid.price}. The amount has been deducted from your balance.`,
        });
      } catch (error) {
        console.error("Error sending winner email:", error);
      }
      
      return { status: "ended", winner: highestBid.user._id };
    } else {
      // If no bids were placed, mark as unsold
      product.isUnsold = true;
      await product.save();
      return { status: "ended", winner: null };
    }
  }
  
  return { status: "active" };
};

const placeBid = asyncHandler(async (req, res) => {
  const { productId, price, currency } = req.body;
  const userId = req.user.id;

  // Debug log to trace the issue
  console.log("Received bid request:", { productId, price, currency });
  
  if (!productId || price === undefined) {
    res.status(400);
    throw new Error("Product ID and price are required");
  }

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  if (!product.isverify) {
    res.status(400);
    throw new Error("Bidding is not verified for these products.");
  }

  if (product.isSoldout === true) {
    res.status(400);
    throw new Error("Bidding is closed");
  }

  // Ensure the currency matches the product's currency
  if (currency && product.currency && currency !== product.currency) {
    res.status(400);
    throw new Error(`Bid must be in product currency: ${product.currency}`);
  }

  // Check if auction has started
  const currentTime = new Date();
  if (currentTime < new Date(product.startDate)) {
    res.status(400);
    throw new Error("Auction has not started yet");
  }

  // Check if auction has ended
  if (currentTime > new Date(product.endDate)) {
    // Check and update the auction status
    const auctionStatus = await checkAndUpdateAuctionStatus(product);
    
    if (auctionStatus.status === "ended") {
      res.status(400);
      throw new Error("Auction has ended");
    }
  }

  // Check if bid meets minimum increment
  const latestBid = await BiddingProduct.findOne({ product: productId }).sort({ price: -1 });
  const minimumBid = latestBid 
    ? latestBid.price + product.biddingIncrement 
    : product.price + product.biddingIncrement;

  if (price < minimumBid) {
    res.status(400);
    throw new Error(`Your bid must be at least ${product.biddingIncrement} higher than the current bid`);
  }

  // Check if buy now price is met
  if (product.buyNowPrice && price >= product.buyNowPrice) {
    product.isSoldout = true;
    product.soldTo = userId;
    await product.save();

    // Deduct the buy now price from buyer's balance
    const buyer = await User.findById(userId);
    if (buyer) {
      buyer.balance -= product.buyNowPrice;
      await buyer.save();
    }

    return res.status(200).json({ 
      message: "Product purchased at Buy Now price",
      biddingProduct: { user: userId, product: productId, price: product.buyNowPrice }
    });
  }

  // Check if bid is below starting price
  if (price < product.price) {
    res.status(400);
    throw new Error("Your bid is below the starting price");
  }

  const existingUserBid = await BiddingProduct.findOne({ user: userId, product: productId });

  if (existingUserBid) {
    if (price <= existingUserBid.price) {
      res.status(400);
      throw new Error("Your bid must be higher than your previous bid");
    }
    existingUserBid.price = price;
    await existingUserBid.save();
    return res.status(200).json({ biddingProduct: existingUserBid });
  } else {
    const highestBid = await BiddingProduct.findOne({ product: productId }).sort({ price: -1 });
    if (highestBid && price <= highestBid.price) {
      res.status(400);
      throw new Error("Your bid must be higher than the current highest bid");
    }

    const biddingProduct = await BiddingProduct.create({
      user: userId,
      product: productId,
      price,
    });

    res.status(201).json(biddingProduct);
  }
});

const getBiddingHistory = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const biddingHistory = await BiddingProduct.find({ product: productId }).sort("-createdAt").populate("user").populate("product");

  res.status(200).json(biddingHistory);
});

const sellProduct = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const userId = req.user.id;

  // Find the product
  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  //   /* const currentTime = new Date();
  //   const tenMinutesAgo = new Date(currentTime - 2 * 60 * 1000); // 10 minutes ago

  //     if (!product.isSoldout || product.updatedAt < tenMinutesAgo || product.createdAt < tenMinutesAgo) {
  //     return res.status(400).json({ error: "Product cannot be sold at this time" });
  //   } */

  // Check if the user is authorized to sell the product
  if (product.user.toString() !== userId) {
    return res.status(403).json({ error: "You do not have permission to sell this product" });
  }

  // Find the highest bid
  const highestBid = await BiddingProduct.findOne({ product: productId }).sort({ price: -1 }).populate("user");
  if (!highestBid) {
    return res.status(400).json({ error: "No winning bid found for the product" });
  }

  // Calculate commission and final price
  const commissionRate = product.commission;
  const commissionAmount = (commissionRate / 100) * highestBid.price;
  const finalPrice = highestBid.price - commissionAmount;

  // Update product details
  product.isSoldout = true;
  product.soldTo = highestBid.user;
  product.soldPrice = finalPrice;

  // Update admin's commission balance
  const admin = await User.findOne({ role: "admin" });
  if (admin) {
    admin.commissionBalance += commissionAmount;
    await admin.save();
  }

  // Update seller's balance
  const seller = await User.findById(product.user);
  if (seller) {
    seller.balance += finalPrice; // Add the remaining amount to the seller's balance
    await seller.save();
  } else {
    return res.status(404).json({ error: "Seller not found" });
  }

  // Save product
  await product.save();

  // Send email notification to the highest bidder
  await sendEmail({
    email: highestBid.user.email,
    subject: "Congratulations! You won the auction!",
    text: `You have won the auction for "${product.title}" with a bid of $${highestBid.price}.`,
  });

  res.status(200).json({ message: "Product has been successfully sold!" });
});

// Add a new endpoint to check auction statuses
const checkAuctionStatus = asyncHandler(async (req, res) => {
  // Find products with ended auctions that are not marked as sold
  const currentTime = new Date();
  const endedAuctions = await Product.find({
    endDate: { $lt: currentTime },
    isSoldout: false,
    isUnsold: { $ne: true }
  });
  
  // Update each auction's status
  const results = [];
  for (const product of endedAuctions) {
    const result = await checkAndUpdateAuctionStatus(product);
    results.push({
      productId: product._id,
      title: product.title,
      ...result
    });
  }
  
  res.status(200).json({
    message: `${results.length} auctions processed`,
    results
  });
});

// @desc    Check for auctions ending soon and notify bidders
// @route   GET /api/products/check-ending-soon
// @access  Private (Admin)
const notifyEndingSoonAuctions = asyncHandler(async (req, res) => {
  const currentTime = new Date();
  const oneHourLater = new Date(currentTime.getTime() + 60 * 60 * 1000);
  
  // Find products ending within the next hour that haven't sent notifications yet
  const endingSoonProducts = await Product.find({
    endDate: { $gt: currentTime, $lt: oneHourLater },
    endingSoonNotificationSent: { $ne: true },
    isSoldout: false
  });

  const notificationResults = [];

  for (const product of endingSoonProducts) {
    try {
      // Find all unique bidders for this product
      const bidders = await BiddingProduct.distinct('user', { product: product._id });
      
      if (bidders.length > 0) {
        // Send notification to each bidder
        for (const bidderId of bidders) {
          const notification = await Notification.create({
            user: bidderId,
            sender: product.user, // Product owner is the sender
            title: "Auction Ending Soon",
            product: product._id,
            type: "AUCTION_ENDING",
            message: `The auction for "${product.title}" will end in less than 1 hour!`,
            link: `/details/${product._id}`,
            isRead: false,
          });
          
          notificationResults.push(notification);
        }
        
        // Mark product as having sent ending soon notification
        product.endingSoonNotificationSent = true;
        await product.save();
      }
    } catch (error) {
      console.error(`Error sending notification for product ${product._id}:`, error);
    }
  }

  res.status(200).json({
    success: true,
    count: notificationResults.length,
    message: `Sent ${notificationResults.length} ending soon notifications`
  });
});

module.exports = {
  placeBid,
  getBiddingHistory,
  sellProduct,
  checkAuctionStatus,
  notifyEndingSoonAuctions,
};


