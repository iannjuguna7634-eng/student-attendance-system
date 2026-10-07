const express = require("express");
const { all, get, run } = require("../db/database");
const { requireAuth } = require("./auth");

const router = express.Router();

// Get all students
router.get("/", requireAuth, async (req, res) => {
  try {
    const q = (req.query.q || "").toLowerCase();
    let students;

    if (q) {
      students = await all(
        `SELECT * FROM students
         WHERE LOWER(name) LIKE ? OR LOWER(reg_no) LIKE ? OR LOWER(course) LIKE ?
         ORDER BY name`,
        [`%${q}%`, `%${q}%`, `%${q}%`]
      );
    } else {
      students = await all("SELECT * FROM students ORDER BY name");
    }

    res.json(students);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

// Get single student
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const student = await get("SELECT * FROM students WHERE id = ?", [req.params.id]);
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch student" });
  }
});

// Create student
router.post("/", requireAuth, async (req, res) => {
  try {
    const { name, reg_no, course } = req.body;
    if (!name || !reg_no || !course) {
      return res.status(400).json({ error: "Name, registration number and course are required" });
    }

    const result = await run(
      "INSERT INTO students (name, reg_no, course) VALUES (?, ?, ?)",
      [name.trim(), reg_no.trim().toUpperCase(), course.trim()]
    );

    const student = await get("SELECT * FROM students WHERE id = ?", [result.lastID]);
    res.status(201).json(student);
  } catch (err) {
    if (err.message && err.message.includes("UNIQUE")) {
      return res.status(400).json({ error: "Registration number already exists" });
    }
    res.status(500).json({ error: "Failed to create student" });
  }
});

// Update student
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { name, reg_no, course } = req.body;
    if (!name || !reg_no || !course) {
      return res.status(400).json({ error: "Name, registration number and course are required" });
    }

    const result = await run(
      "UPDATE students SET name = ?, reg_no = ?, course = ? WHERE id = ?",
      [name.trim(), reg_no.trim().toUpperCase(), course.trim(), req.params.id]
    );

    if (result.changes === 0) return res.status(404).json({ error: "Student not found" });

    const student = await get("SELECT * FROM students WHERE id = ?", [req.params.id]);
    res.json(student);
  } catch (err) {
    if (err.message && err.message.includes("UNIQUE")) {
      return res.status(400).json({ error: "Registration number already exists" });
    }
    res.status(500).json({ error: "Failed to update student" });
  }
});

// Delete student
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const result = await run("DELETE FROM students WHERE id = ?", [req.params.id]);
    if (result.changes === 0) return res.status(404).json({ error: "Student not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete student" });
  }
});

module.exports = router;
