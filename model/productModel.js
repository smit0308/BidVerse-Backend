const mongoose = require("mongoose");

const productSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      require: true,
      ref: "User",
    },
    title: {
      type: String,
      require: [true, "Please add a title"],
      trime: true,
    },
    slug: {
      type: String,
      unique: true,
    },
    description: {
      type: String,
      required: [true, "Please add a description"],
      trime: true,
    },
    image: {
      type: Object,
      default: {},
    },
    images: {
      type: Array,
      default: [],
    },
    category: {
      type: String,
      required: [true, "Post category is required"],
      default: "All",
    },
    commission: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      require: [true, "Please add a Price"],
    },
    currency: {
      type: String,
      default: "USD",
      enum: ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "INR", "CNY", "SGD", "CHF"],
    },
    // Auction Settings
    startDate: {
      type: Date,
      required: [true, "Please add a start date"],
    },
    endDate: {
      type: Date,
      required: [true, "Please add an end date"],
    },
    buyNowPrice: {
      type: Number,
      default: null,
    },
    reservePrice: {
      type: Number,
      default: null,
    },
    biddingIncrement: {
      type: Number,
      required: [true, "Please add a bidding increment"],
    },
    condition: {
      type: String,
      required: [true, "Please specify the product condition"],
      enum: ["new", "used", "refurbished"],
      default: "new",
    },
    // Product Details
    height: {
      type: Number,
    },
    lengthpic: {
      type: Number,
    },
    width: {
      type: Number,
    },
    mediumused: {
      type: String,
    },
    weigth: {
      type: Number,
    },
    isverify: {
      type: Boolean,
      default: false,
    },
    isSoldout: {
      type: Boolean,
      default: false,
    },
    isUnsold: {
      type: Boolean,
      default: false,
    },
    soldTo: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    },
    endingSoonNotificationSent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const product = mongoose.model("Product", productSchema);
module.exports = product;
