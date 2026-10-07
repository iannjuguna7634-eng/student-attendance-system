const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bcrypt = require("bcryptjs");

const dbPath = path.join(__dirname, "attendance.db");
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function initDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      reg_no TEXT UNIQUE NOT NULL,
      course TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('Present', 'Absent', 'Late')),
      UNIQUE(student_id, date),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    )
  `);

  // Seed admin
  const admin = await get("SELECT id FROM users WHERE username = ?", ["admin"]);
  if (!admin) {
    const hash = bcrypt.hashSync("1234", 10);
    await run("INSERT INTO users (username, password, full_name) VALUES (?, ?, ?)", [
      "admin", hash, "Administrator"
    ]);
    console.log("✓ Admin user created (admin / 1234)");
  }

  // Seed students
  const count = await get("SELECT COUNT(*) as c FROM students");
  if (count.c === 0) {
    const samples = [
      ["John Kamau", "DIT-001", "Diploma in IT"],
      ["Mary Wanjiku", "DIT-002", "Diploma in IT"],
      ["Brian Otieno", "DIT-003", "Diploma in IT"],
      ["Lucy Achieng", "DIT-004", "Diploma in IT"],
      ["Kevin Mwangi", "DIT-005", "Diploma in IT"],
      ["Faith Njeri", "DIT-006", "Diploma in IT"]
    ];
    for (const s of samples) {
      await run("INSERT INTO students (name, reg_no, course) VALUES (?, ?, ?)", s);
    }
    console.log("✓ Sample students added");
  }
}

module.exports = { db, run, get, all, initDb };
