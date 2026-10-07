const express = require("express");
const bcrypt = require("bcryptjs");
const { get } = require("../db/database");

const router = express.Router();

// Login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const user = await get("SELECT * FROM users WHERE username = ?", [username]);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.fullName = user.full_name;

    res.json({
      success: true,
      user: { id: user.id, username: user.username, fullName: user.full_name }
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Logout
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// Check current session
router.get("/me", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  res.json({
    id: req.session.userId,
    username: req.session.username,
    fullName: req.session.fullName
  });
});

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

module.exports = router;
module.exports.requireAuth = requireAuth;
