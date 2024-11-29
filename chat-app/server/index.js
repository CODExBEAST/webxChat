const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");
const socket = require("socket.io");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const mongoURL = process.env.MONGO || "mongodb://localhost:27017/chat-app"; // Fallback for local development

mongoose
  .connect(mongoURL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("DB Connection Successful");
  })
  .catch((err) => {
    console.error("MongoDB Connection Error:", err.message);
    console.error("Check your MongoDB URI or database status.");
    process.exit(1); // Exit the app if DB connection fails
  });

// Test Endpoint
app.get("/ping", (_req, res) => {
  return res.json({ msg: "Ping Successful" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// Start Server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () =>
  console.log(`Server started on port ${PORT}`)
);

// Socket.io Configuration
const io = socket(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000", // Update with your frontend URL
    credentials: true,
  },
});

global.onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  global.chatSocket = socket;

  // Add user to onlineUsers map
  socket.on("add-user", (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log(`User ${userId} added with socket ID: ${socket.id}`);
  });

  // Handle message sending
  socket.on("send-msg", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("msg-recieve", data.msg);
      console.log(`Message sent to user ${data.to}: ${data.msg}`);
    } else {
      console.log(`User ${data.to} is not online.`);
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    // Optionally remove disconnected user from onlineUsers
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        console.log(`User ${userId} removed from online users.`);
        break;
      }
    }
  });
});
