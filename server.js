const express = require("express");
const session = require("express-session");
const path = require("path");
const cors = require("cors");
const { initDb } = require("./db/database");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || "attendance-secret-key-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // set to true if using HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/students", require("./routes/students"));
app.use("/api/attendance", require("./routes/attendance"));
app.use("/api/reports", require("./routes/reports"));

// Fallback to index for SPA-like navigation
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Initialize database then start server
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n✅ Student Attendance System is running!`);
      console.log(`   → http://localhost:${PORT}`);
      console.log(`\n   Demo login: admin / 1234\n`);
    });
  })
  .catch(err => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
