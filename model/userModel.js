const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      require: [true, "Please add a name"],
    },
    fullName: {
      type: String,
      require: [true, "Please add a full name"],
    },
    email: {
      type: String,
      require: [true, "Please add a email"],
      unique: true,
      trim: true,
      match: [/^\s*[\w\-\+_]+(\.[\w\-\+_]+)*\@[\w\-\+_]+\.[\w\-\+_]+(\.[\w\-\+_]+)*\s*$/, "Please enter a valid email"],
    },
    contactNumber: {
      type: String,
      require: [true, "Please add your contact number"],
      match: [/^[0-9]{10}$/, "Please enter a valid 10-digit contact number"]
    },
    streetAddress: {
      type: String,
      require: [true, "Please add your street address"]
    },
    city: {
      type: String,
      require: [true, "Please add your city"]
    },
    state: {
      type: String,
      require: [true, "Please add your state"]
    },
    postalCode: {
      type: String,
      require: [true, "Please add your postal code"],
      match: [/^[0-9]{6}$/, "Please enter a valid 6-digit postal code"]
    },
    country: {
      type: String,
      require: [true, "Please add your country"]
    },
    dateOfBirth: {
      type: Date,
      require: [true, "Please add your date of birth"]
    },
    password: {
      type: String,
      require: [true, "Please add a password"],
      minLength: [8, "Password must be up to 8 characters"],
    },
    photo: {
      type: String,
      require: [true, "Please add a photo"],
      default: "https://cdn-icons-png.flaticon.com/512/2202/2202112.png",
    },
    role: {
      type: String,
      default: "buyer",
      enum: ["buyer", "seller", "admin", "suspended"],
    },
    commissionBalance: {
      type: Number,
      default: 0,
    },
    balance: {
      type: Number,
      default: 0,
    },
    pendingBalance: {
      type: Number,
      default: 0,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    verificationTokenExpires: Date
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(this.password, salt);
  this.password = hashedPassword;
  next();
});
const User = mongoose.model("User", userSchema);
module.exports = User;
