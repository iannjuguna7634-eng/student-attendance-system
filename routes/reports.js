const express = require("express");
const { all, get } = require("../db/database");
const { requireAuth } = require("./auth");

const router = express.Router();

// Overall reports
router.get("/", requireAuth, async (req, res) => {
  try {
    const q = (req.query.q || "").toLowerCase();

    let students = await all("SELECT * FROM students ORDER BY name");
    if (q) {
      students = students.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.reg_no.toLowerCase().includes(q) ||
        s.course.toLowerCase().includes(q)
      );
    }

    const performance = [];
    for (const s of students) {
      const stats = await get(`
        SELECT
          SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present,
          SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent,
          SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) as late
        FROM attendance WHERE student_id = ?
      `, [s.id]);

      const p = stats.present || 0;
      const a = stats.absent || 0;
      const l = stats.late || 0;
      const total = p + a + l;
      const rate = total ? Math.round(((p + l) / total) * 100) : 0;

      performance.push({
        id: s.id,
        name: s.name,
        reg_no: s.reg_no,
        course: s.course,
        present: p,
        absent: a,
        late: l,
        rate
      });
    }

    const dates = await all(`
      SELECT date,
        SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) as late
      FROM attendance
      GROUP BY date
      ORDER BY date DESC
    `);

    const dateSummary = dates.map(d => {
      const total = d.present + d.absent + d.late;
      return {
        date: d.date,
        present: d.present,
        absent: d.absent,
        late: d.late,
        total,
        rate: total ? Math.round(((d.present + d.late) / total) * 100) : 0
      };
    });

    const overall = await get(`
      SELECT
        COUNT(DISTINCT date) as dates,
        SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) as late
      FROM attendance
    `);

    const totalRecords = (overall.present || 0) + (overall.absent || 0) + (overall.late || 0);
    const overallRate = totalRecords
      ? Math.round((((overall.present || 0) + (overall.late || 0)) / totalRecords) * 100)
      : 0;

    res.json({
      performance,
      dateSummary,
      summary: {
        dates: overall.dates || 0,
        present: overall.present || 0,
        rate: overallRate
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate reports" });
  }
});

module.exports = router;
