const dotenv = require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
// const connectDB = require("./config/connectDB");
const userRoute = require("./routes/userRoute");
const productRoute = require("./routes/productRoute");
const biddingRoute = require("./routes/biddingRoute");
const categoryRoute = require("./routes/categoryRoute");
const notificationRoute = require("./routes/notificationRoutes");
const errorHandler = require("./middleWare/errorMiddleWare");
const User = require("./model/userModel");
const cron = require("node-cron");
const axios = require("axios");
const bidRoute = require("./routes/biddingRoute");
const balanceRoute = require("./routes/balanceRoutes");
const { saveDailyRates } = require('./controllers/currencyCtr');

// Connect to MongoDB
// connectDB();

const app = express();

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(
  express.urlencoded({
    extended: false,
  })
);
app.use(bodyParser.json());

app.use(cors({
  origin: "https://frontend-finalfnew.onrender.com/",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  maxAge: 3600
}));

// Configure cookie settings for cross-domain requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Origin', 'https://frontend-finalfnew.onrender.com/');
  next();
});

const PORT = process.env.PORT || 5000;

//Routes Middleware
app.use("/api/users", userRoute);
app.use("/api/product", productRoute);
// app.use("/api/products", productRoute);
app.use("/api/bidding", biddingRoute);
app.use("/api/category", categoryRoute);
app.use("/api/notifications", notificationRoute);
app.use("/api/bid", bidRoute);
app.use("/api/balance", balanceRoute);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Save daily currency data when server starts
saveDailyRates();

// Error Middleware
// app.use(errorHandler);
// Schedule tasks to be run on the server
// Check auctions status every hour
cron.schedule("0 * * * *", async function() {
  try {
    console.log("Running scheduled task: Checking auction statuses");
    const response = await axios.get(`${process.env.BACKEND_URL}/api/products/admin/check-auctions`, {
      headers: {
        "x-cron-key": process.env.CRON_SECRET_KEY
      }
    });
    console.log("Auction status check completed:", response.data);
  } catch (error) {
    console.error("Error checking auction statuses:", error.message);
  }
});

// Routes
app.get("/", (req, res) => {
  res.send("Home Pages");
});

// Check for auctions ending soon every 15 minutes
cron.schedule("*/15 * * * *", async function() {
  try {
    console.log("Running scheduled task: Checking auctions ending soon");
    const response = await axios.get(`${process.env.BACKEND_URL}/api/products/admin/check-ending-soon`, {
      headers: {
        "x-cron-key": process.env.CRON_SECRET_KEY
      }
    });
    console.log("Ending soon notifications sent:", response.data);
  } catch (error) {
    console.error("Error sending ending soon notifications:", error.message);
  }
});

// Error handler
app.use(errorHandler);

const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

//connect to mongoose
mongoose
  .connect(process.env.MONGO_URI, {
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server Running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log(err);
  });
  // mongoose.connection.once("open", () => {
  //   console.log("Connected to MongoDB");
  //   app.listen(PORT, () => {
  //     console.log(`Server is running on port ${PORT}`);
  //   });
  // });

// DATABASE_CLOUD = "mongodb+srv://smit01:<smit123>@cluster0.b9v8i.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
