require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI);

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { exec } = require("child_process");
const fs = require("fs");
const bodyParser = require("body-parser");
const cors = require("cors");
const sanitizeHtml = require('sanitize-html');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const AIService = require('./aiService');
const aiService = new AIService();
const User = require('./models/User');
const Code = require('./models/Code'); // <-- Add this line
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = express();
app.use(bodyParser.json());
app.use(express.json());
app.use(cors({ 
  origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

mongoose.connection.on('connected', () => {
  console.log('MongoDB connected');
});
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

const chatSchema = new mongoose.Schema({
  roomId: String,
  user: String,
  msg: String,
  timestamp: { type: Date, default: Date.now }
});
const ChatMessage = mongoose.model('ChatMessage', chatSchema);

let savedSessions = {};

app.post("/api/save-session", (req, res) => {
  const { sessionId, files } = req.body;
  savedSessions[sessionId] = { files };
  res.json({ success: true });
});

app.get("/api/load-session/:sessionId", (req, res) => {
  const session = savedSessions[req.params.sessionId];
  if (session) {
    res.json(session);
  } else {
    res.status(404).json({ error: "Session not found" });
  }
});

const langMap = {
  c: 50, cpp: 54, csharp: 51, java: 62, javascript: 63, python: 71, ruby: 72, go: 60, swift: 83,
  kotlin: 78, rust: 73, typescript: 74, php: 68, perl: 85, scala: 81, r: 80, dart: 94, pascal: 67,
  fortran: 59, lua: 64, bash: 46, sql: 82, nodejs: 63, objectivec: 79, groovy: 69, ocaml: 65,
  vbnet: 84, haskell: 61, clojure: 86, erlang: 56, elixir: 57, cobol: 77, julia: 70, crystal: 87,
  nim: 91, lisp: 32, prolog: 19, scheme: 85,
};

app.post("/run", async (req, res) => {
  const { language, code } = req.body;
  const language_id = langMap[language];
  if (!language_id) return res.json({ output: "Language not supported." });

  const response = await fetch("https://ce.judge0.com/submissions?base64_encoded=false&wait=true", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_code: code, language_id })
  });
  const result = await response.json();
  res.json({ output: result.stdout || result.stderr || "No output." });
});

// AI Endpoints (unchanged)
app.post("/api/ai/ask", async (req, res) => {
  try {
    const { roomId, prompt, selectedCode, filePath, language } = req.body;
    const room = rooms[roomId] || { files: {}, users: [] };
    const files = Object.entries(room.files).map(([name, content]) => ({ name, content }));
    const recentChat = await ChatMessage.find({ roomId }).sort({ timestamp: -1 }).limit(5).lean();
    const context = {
      files,
      language: language || 'javascript',
      activeFile: filePath,
      recentChat: recentChat.reverse()
    };
    const result = await aiService.askAI(roomId, prompt, context);
    res.json(result);
  } catch (error) {
    console.error('AI Ask Error:', error);
    res.status(500).json({ message: 'Error processing AI request', success: false });
  }
});
app.post("/api/ai/explain", async (req, res) => {
  try {
    const { code, language } = req.body;
    const result = await aiService.explainCode(code, language);
    res.json(result);
  } catch (error) {
    res.status(500).json({ explanation: 'Error explaining code', success: false });
  }
});
app.post("/api/ai/improve", async (req, res) => {
  try {
    const { code, language } = req.body;
    const result = await aiService.suggestImprovements(code, language);
    res.json(result);
  } catch (error) {
    res.status(500).json({ suggestions: 'Error analyzing code', success: false });
  }
});
app.post("/api/ai/generate", async (req, res) => {
  try {
    const { prompt, language, context } = req.body;
    const result = await aiService.generateCodeSuggestion(prompt, language, context);
    res.json(result);
  } catch (error) {
    res.status(500).json({ code: 'Error generating code', success: false });
  }
});

// --- AUTH & OTP FLOW ---

// Send OTP for signup (step 1)
app.post('/api/auth/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ error: "Email already registered." });
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  if (!global.signupOtps) global.signupOtps = {};
  global.signupOtps[email] = { otp, expires: Date.now() + 10 * 60 * 1000 };
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Verify your email',
    text: `Your OTP code is ${otp}`
  });
  res.json({ success: true, message: "OTP sent to your email." });
});

// Verify OTP and create user (step 2)
app.post('/api/auth/verify-otp', async (req, res) => {
  const { name, email, password, otp } = req.body;
  if (!global.signupOtps || !global.signupOtps[email])
    return res.status(400).json({ error: "No OTP sent to this email." });
  const { otp: realOtp, expires } = global.signupOtps[email];
  if (realOtp !== otp || Date.now() > expires)
    return res.status(400).json({ error: "Invalid or expired OTP." });
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ error: "Email already registered." });
  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ name, email, password: hashed, verified: true });
  await user.save();
  delete global.signupOtps[email];
  res.json({ success: true, message: "Signup successful. You can now login." });
});

// Login with password
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: "User not found." });
  if (!user.verified) return res.status(400).json({ error: "Email not verified." });
  if (!user.password) return res.status(400).json({ error: "No password set for this user." });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: "Invalid password." });
  const token = jwt.sign({ userId: user._id, name: user.name, email: user.email }, 'your_jwt_secret');
  res.json({ token, name: user.name });
});

// Send OTP for login
app.post('/api/auth/login-send-otp', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!user.verified) return res.status(400).json({ error: "Account not verified" });
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.otp = otp;
  user.otpExpires = Date.now() + 10 * 60 * 1000;
  await user.save();
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your Login OTP',
    text: `Your OTP is ${otp}`
  });
  res.json({ success: true, message: "OTP sent" });
});

// Verify OTP for login
app.post('/api/auth/login-otp', async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: "User not found" });
  if (!user.verified) return res.status(400).json({ error: "Account not verified" });
  if (user.otp !== otp || user.otpExpires < Date.now()) {
    return res.status(400).json({ error: "Invalid or expired OTP" });
  }
  user.otp = null;
  user.otpExpires = null;
  await user.save();
  const token = jwt.sign({ userId: user._id, name: user.name, email: user.email }, 'your_jwt_secret');
  res.json({ token, name: user.name });
});

// Forgot password route
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: "User not found" });
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.otp = otp;
  user.otpExpires = Date.now() + 10 * 60 * 1000;
  await user.save();
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset OTP',
    text: `Your OTP is ${otp}`
  });
  res.json({ success: true, message: "OTP sent" });
});

// Resend OTP
app.post('/api/auth/resend-otp', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: "User not found." });
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.otp = otp;
  user.otpExpires = Date.now() + 10 * 60 * 1000;
  await user.save();
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP code is ${otp}`
  });
  res.json({ success: true, message: "OTP resent." });
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
});

let rooms = {};

io.on("connection", (socket) => {
  console.log("a user connected");

  // Join room and send code from DB
  socket.on("joinRoom", async ({ roomId, userName }) => {
    socket.join(roomId);
    socket.to(roomId).emit("userJoined", { user: userName });
    socket.emit("userJoined", { user: userName });

    // Load code from DB and send to the user
    const codes = await Code.find({ roomId });
    codes.forEach(({ fileName, code }) => {
      socket.emit("codeChange", { roomId, code, fileName });
    });
  });

  // Collaborative code: update in memory and DB
  socket.on("codeChange", async ({ roomId, code, fileName }) => {
    if (!rooms[roomId]) rooms[roomId] = { files: {}, users: [] };
    rooms[roomId].files[fileName] = code;
    socket.to(roomId).emit("codeChange", { roomId, code, fileName });

    // Save only the latest code for this room and file
    await Code.findOneAndUpdate(
      { roomId, fileName },
      { code, updatedAt: new Date() },
      { upsert: true }
    );
  });

  socket.on("cursorChange", ({ roomId, userId, cursor, selection }) => {
    socket.to(roomId).emit("remoteCursor", { userId, cursor, selection });
  });

  socket.on("chatMessage", async (msg) => {
    const cleanMsg = {
      roomId: msg.roomId,
      user: sanitizeHtml(msg.user),
      msg: sanitizeHtml(msg.msg)
    };
    const chat = new ChatMessage(cleanMsg);
    await chat.save();
    io.to(msg.roomId).emit("chatMessage", cleanMsg);
  });

  socket.on("languageChange", ({ roomId, language }) => {
    socket.to(roomId).emit("languageChange", { roomId, language });
  });

  socket.on("askAI", async ({ roomId, prompt, selectedCode, filePath, language }) => {
    try {
      socket.emit("aiThinking", { roomId });
      const room = rooms[roomId] || { files: {}, users: [] };
      const files = Object.entries(room.files).map(([name, content]) => ({ name, content }));
      const recentChat = await ChatMessage.find({ roomId }).sort({ timestamp: -1 }).limit(5).lean();
      const context = {
        files,
        language: language || 'javascript',
        activeFile: filePath,
        recentChat: recentChat.reverse()
      };
      const result = await aiService.askAI(roomId, prompt, context);
      if (result.success) {
        const aiMsg = {
          roomId,
          user: "AI",
          msg: result.message,
          timestamp: new Date()
        };
        const chat = new ChatMessage(aiMsg);
        await chat.save();
        io.to(roomId).emit("chatMessage", aiMsg);
        socket.emit("aiResponse", { success: true, message: result.message });
      } else {
        socket.emit("aiResponse", { success: false, message: result.message });
      }
    } catch (error) {
      console.error('AI Socket Error:', error);
      socket.emit("aiResponse", { success: false, message: "Sorry, I encountered an error. Please try again." });
    }
  });

  socket.on("disconnect", () => {
    Object.keys(rooms).forEach(roomId => {
      if (rooms[roomId] && rooms[roomId].users) {
        rooms[roomId].users = rooms[roomId].users.filter(user => user !== socket.username);
        io.to(roomId).emit("userList", rooms[roomId].users);
      }
    });
    console.log("user disconnected:", socket.username);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});