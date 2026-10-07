# Student Attendance Monitoring System

**Full-stack** Student Attendance Monitoring System built with:

- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Backend**: Node.js + Express
- **Database**: SQLite (better-sqlite3)
- **Auth**: Session-based login with bcrypt password hashing

## Features

- Secure login (admin account)
- Dashboard with live statistics
- Full Student CRUD (Create, Read, Update, Delete + Search)
- Daily attendance marking (Present / Absent / Late)
- Attendance reports & performance rates
- Printable reports
- JSON data export
- Responsive design (mobile friendly)

## Demo Login

- **Username:** `admin`
- **Password:** `1234`

## How to Run Locally

### Requirements
- Node.js 18 or higher

### Steps

1. Open a terminal in this folder
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
4. Open your browser at:  
   **http://localhost:3000**

The database file (`db/attendance.db`) is created automatically on first run.

## Project Structure

```
attendance-system/
├── server.js              # Main Express server
├── package.json
├── db/
│   └── database.js        # SQLite setup + seed data
├── routes/
│   ├── auth.js            # Login / Logout
│   ├── students.js        # Student CRUD
│   ├── attendance.js      # Mark & view attendance
│   └── reports.js         # Reports & statistics
└── public/                # Frontend files
    ├── index.html
    ├── login.html
    ├── dashboard.html
    ├── students.html
    ├── attendance.html
    ├── reports.html
    ├── settings.html
    ├── style.css
    └── app.js
```

## Deploy Online (Free options)

### Render.com (recommended)
1. Push this project to a GitHub repository
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your repo
4. Build command: `npm install`
5. Start command: `npm start`
6. Add environment variable (optional): `SESSION_SECRET=your-random-secret`

### Railway.app
Similar process — connect GitHub repo and deploy.

## Notes

- All data is stored permanently in SQLite
- Passwords are securely hashed with bcrypt
- Session lasts 24 hours
- Perfect for school/college projects

---

Built as a complete student project © 2026
