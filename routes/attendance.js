const express = require("express");
const { all, get, run } = require("../db/database");
const { requireAuth } = require("./auth");

const router = express.Router();

// Get attendance for a specific date
router.get("/", requireAuth, async (req, res) => {
  try {
    const date = req.query.date;
    if (!date) return res.status(400).json({ error: "Date is required" });

    const records = await all(`
      SELECT a.student_id, a.status, s.name, s.reg_no, s.course
      FROM attendance a
      JOIN students s ON s.id = a.student_id
      WHERE a.date = ?
    `, [date]);

    const students = await all("SELECT * FROM students ORDER BY name");

    res.json({ date, records, students });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
});

// Save / update attendance for a date
router.post("/", requireAuth, async (req, res) => {
  try {
    const { date, records } = req.body;

    if (!date || !Array.isArray(records)) {
      return res.status(400).json({ error: "Date and records array are required" });
    }

    for (const item of records) {
      if (["Present", "Absent", "Late"].includes(item.status)) {
        await run(`
          INSERT INTO attendance (student_id, date, status)
          VALUES (?, ?, ?)
          ON CONFLICT(student_id, date) DO UPDATE SET status = excluded.status
        `, [item.student_id, date, item.status]);
      }
    }

    res.json({ success: true, message: `Attendance saved for ${date}` });
  } catch (err) {
    res.status(500).json({ error: "Failed to save attendance" });
  }
});

// Get attendance summary for today (dashboard)
router.get("/today", requireAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const totalRow = await get("SELECT COUNT(*) as c FROM students");
    const total = totalRow.c;

    const presentRow = await get(
      "SELECT COUNT(*) as c FROM attendance WHERE date = ? AND status = 'Present'",
      [today]
    );
    const lateRow = await get(
      "SELECT COUNT(*) as c FROM attendance WHERE date = ? AND status = 'Late'",
      [today]
    );

    const present = presentRow.c;
    const late = lateRow.c;
    const absent = Math.max(0, total - present - late);
    const rate = total ? Math.round(((present + late) / total) * 100) : 0;

    const list = await all(`
      SELECT s.id, s.name, s.reg_no, s.course,
             COALESCE(a.status, 'Absent') as status
      FROM students s
      LEFT JOIN attendance a ON a.student_id = s.id AND a.date = ?
      ORDER BY s.name
    `, [today]);

    res.json({ date: today, total, present, late, absent, rate, list });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch today's attendance" });
  }
});

module.exports = router;
