# BidVerse - Backend

## 🚀 Overview
This is the backend for **BidVerse**, a real-time bidding platform. Built with **Node.js, Express, and MongoDB**, this server provides a robust and scalable foundation for the application, handling all business logic, data management, and real-time communication.

---

## 🛠 Tech Stack
- 🟩 **Node.js** - JavaScript runtime for server-side development
- 🚀 **Express.js** - Web application framework for Node.js
- 🍃 **MongoDB** - NoSQL database for storing application data
- 🐘 **Mongoose** - ODM library for MongoDB and Node.js
- 🔐 **JSON Web Tokens (JWT)** - For secure user authentication and authorization
- ☁️ **Cloudinary** - For cloud-based image and video management
- ✉️ **Nodemailer** - For sending emails
- 🔄 **Socket.io** - For enabling real-time, bidirectional communication

---

## ✨ Features
✅ **Secure RESTful APIs** 🛡️
✅ **User Authentication & Authorization** with JWT 🔑
✅ **Real-Time Bid Handling** with Socket.io 🔄
✅ **Product & Auction Management** 📦
✅ **Database Management** with Mongoose Schemas 🗃️
✅ **Image Upload and Management** with Multer and Cloudinary 🖼️
✅ **Automated Tasks** with Node-Cron (e.g., updating auction status) ⏰

---

## 📂 Project Structure
```
📂 Backend
├── 📁 controllers    # Request handling logic
├── 📁 middleWare     # Custom middleware (e.g., auth)
├── 📁 model          # Mongoose data models
├── 📁 node_modules   # Project dependencies
├── 📁 routes         # API routes
├── 📁 uploads        # Local file uploads (if any)
├── 📁 utils          # Utility functions
├── 📄 .env           # Environment variables
├── 📄 server.js      # Main server entry point
└── 📄 package.json   # Project metadata and dependencies
```

---

## 🛠 Installation & Setup
### 📌 Prerequisites
Ensure you have **Node.js** (v14 or higher), **npm**, and **MongoDB** installed on your system.

### 🔽 Clone the Repository
```bash
git clone https://github.com/smit0308/BidVerse-Backend
cd BidVerse-Backend
```

### 📦 Install Dependencies
```bash
npm install
```

### ⚙️ Environment Configuration
Create a `.env` file in the root directory and add the necessary environment variables. You can use `.env.example` as a template:
```
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### 🚀 Run the Application
```bash
npm start
```
The server will start on **http://localhost:5000/** 🌐

---

## 🤝 Contribution
Want to improve this project? Feel free to fork the repository and submit a PR! 🚀

---

## 📜 License
This project is **open-source** and available under the **MIT License**.

---

## 📧 Contact
For any queries, reach out to:

📩 smitdpatel0308@gmail.com  
📌 GitHub: [Smit Patel](https://github.com/smit0308/)
