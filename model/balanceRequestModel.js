const mongoose = require("mongoose");

const balanceRequestSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [1, "Amount must be at least 1"],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      required: [true, "Payment method is required"],
      enum: ["credit_card", "bank_transfer", "paypal", "other"],
    },
    transactionId: {
      type: String,
      required: [true, "Transaction ID or reference is required"],
    },
    notes: {
      type: String,
      default: "",
    },
    adminNotes: {
      type: String,
      default: "",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    proofOfPayment: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

const BalanceRequest = mongoose.model("BalanceRequest", balanceRequestSchema);
module.exports = BalanceRequest; 