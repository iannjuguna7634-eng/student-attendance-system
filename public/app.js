(() => {
  "use strict";

  const API = "/api";
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));

  async function api(path, options = {}) {
    const res = await fetch(API + path, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function dateText(x) {
    return new Date(x + "T00:00:00").toLocaleDateString(undefined, {
      weekday: "short", month: "short", day: "numeric", year: "numeric"
    });
  }

  function statusBadge(s) {
    return `<span class="status ${String(s).toLowerCase()}">${esc(s)}</span>`;
  }

  // Auth check for protected pages
  async function requireLogin() {
    const page = location.pathname.split("/").pop() || "index.html";
    const protectedPages = ["dashboard.html", "students.html", "attendance.html", "reports.html", "settings.html"];
    if (!protectedPages.includes(page)) return true;

    try {
      await api("/auth/me");
      return true;
    } catch {
      location.href = "login.html";
      return false;
    }
  }

  function common() {
    document.querySelectorAll(".nav a[data-page]").forEach(a => {
      const page = location.pathname.split("/").pop().replace(".html", "");
      a.classList.toggle("active", a.dataset.page === page);
    });

    if ($("liveDate")) {
      $("liveDate").textContent = new Date().toLocaleDateString(undefined, {
        weekday: "short", month: "short", day: "numeric"
      });
    }

    $("logoutBtn")?.addEventListener("click", async () => {
      try {
        await api("/auth/logout", { method: "POST" });
      } catch {}
      location.href = "login.html";
    });
  }

  // ========== LOGIN ==========
  function loginPage() {
    if (!$("loginForm")) return;

    // If already logged in, go to dashboard
    api("/auth/me").then(() => location.href = "dashboard.html").catch(() => {});

    $("loginForm").addEventListener("submit", async e => {
      e.preventDefault();
      const msg = $("loginMessage");
      msg.textContent = "";
      msg.className = "message";

      try {
        await api("/auth/login", {
          method: "POST",
          body: JSON.stringify({
            username: $("username").value.trim(),
            password: $("password").value
          })
        });
        msg.textContent = "Login successful...";
        msg.className = "message success";
        setTimeout(() => location.href = "dashboard.html", 300);
      } catch (err) {
        msg.textContent = err.message || "Invalid credentials";
      }
    });
  }

  // ========== DASHBOARD ==========
  async function dashboardPage() {
    if (!$("totalStudents")) return;

    try {
      const data = await api("/attendance/today");
      $("totalStudents").textContent = data.total;
      $("presentToday").textContent = data.present;
      $("absentToday").textContent = data.absent;
      $("attendanceRate").textContent = data.rate + "%";
      $("todayLabel").textContent = dateText(data.date);

      $("dashboardAttendance").innerHTML = data.list.map(x => `
        <tr>
          <td><b>${esc(x.name)}</b></td>
          <td>${esc(x.reg_no)}</td>
          <td>${esc(x.course)}</td>
          <td>${statusBadge(x.status)}</td>
        </tr>
      `).join("") || `<tr><td colspan="4" class="empty">No students yet.</td></tr>`;
    } catch (err) {
      console.error(err);
    }
  }

  // ========== STUDENTS ==========
  let deleteId = null;

  async function studentsPage() {
    if (!$("studentsTable")) return;

    const render = async () => {
      const q = $("studentSearch").value.trim();
      try {
        const students = await api("/students" + (q ? `?q=${encodeURIComponent(q)}` : ""));
        $("studentCount").textContent = students.length;
        $("studentsTable").innerHTML = students.length
          ? students.map(x => `
              <tr>
                <td><b>${esc(x.name)}</b></td>
                <td>${esc(x.reg_no)}</td>
                <td>${esc(x.course)}</td>
                <td class="actions">
                  <button class="table-btn" data-edit="${x.id}">Edit</button>
                  <button class="table-btn delete-btn" data-del="${x.id}">Delete</button>
                </td>
              </tr>
            `).join("")
          : `<tr><td colspan="4" class="empty">No students found.</td></tr>`;
      } catch (err) {
        $("studentsTable").innerHTML = `<tr><td colspan="4" class="empty">${esc(err.message)}</td></tr>`;
      }
    };

    $("openStudentModal").addEventListener("click", () => {
      $("studentModalTitle").textContent = "Add Student";
      $("editStudentId").value = "";
      $("studentForm").reset();
      $("studentMessage").textContent = "";
      $("studentModal").classList.remove("hidden");
    });

    $("studentSearch").addEventListener("input", () => render());

    document.querySelectorAll("[data-close]").forEach(b =>
      b.addEventListener("click", () => document.querySelectorAll(".modal").forEach(m => m.classList.add("hidden")))
    );

    $("studentsTable").addEventListener("click", async e => {
      if (e.target.dataset.edit) {
        try {
          const s = await api(`/students/${e.target.dataset.edit}`);
          $("studentModalTitle").textContent = "Edit Student";
          $("editStudentId").value = s.id;
          $("studentName").value = s.name;
          $("studentReg").value = s.reg_no;
          $("studentCourse").value = s.course;
          $("studentMessage").textContent = "";
          $("studentModal").classList.remove("hidden");
        } catch (err) {
          alert(err.message);
        }
      }
      if (e.target.dataset.del) {
        deleteId = e.target.dataset.del;
        $("confirmModal").classList.remove("hidden");
      }
    });

    $("studentForm").addEventListener("submit", async e => {
      e.preventDefault();
      const id = $("editStudentId").value;
      const body = {
        name: $("studentName").value.trim(),
        reg_no: $("studentReg").value.trim(),
        course: $("studentCourse").value.trim()
      };

      try {
        if (id) {
          await api(`/students/${id}`, { method: "PUT", body: JSON.stringify(body) });
        } else {
          await api("/students", { method: "POST", body: JSON.stringify(body) });
        }
        $("studentModal").classList.add("hidden");
        render();
      } catch (err) {
        $("studentMessage").textContent = err.message;
      }
    });

    $("confirmDelete").addEventListener("click", async () => {
      try {
        await api(`/students/${deleteId}`, { method: "DELETE" });
        $("confirmModal").classList.add("hidden");
        render();
      } catch (err) {
        alert(err.message);
      }
    });

    render();
  }

  // ========== ATTENDANCE ==========
  async function attendancePage() {
    if (!$("attendanceTable")) return;
    $("attendanceDate").value = today();

    const render = async () => {
      const date = $("attendanceDate").value;
      const q = $("attendanceSearch").value.toLowerCase();

      try {
        const data = await api(`/attendance?date=${date}`);
        const statusMap = {};
        data.records.forEach(r => statusMap[r.student_id] = r.status);

        let students = data.students;
        if (q) {
          students = students.filter(x =>
            `${x.name} ${x.reg_no} ${x.course}`.toLowerCase().includes(q)
          );
        }

        $("attendanceTable").innerHTML = students.length
          ? students.map((x, i) => {
              const st = statusMap[x.id] || "Absent";
              return `
                <tr>
                  <td>${i + 1}</td>
                  <td><b>${esc(x.name)}</b></td>
                  <td>${esc(x.reg_no)}</td>
                  <td>${esc(x.course)}</td>
                  <td>
                    <select class="status-select" data-id="${x.id}">
                      <option ${st === "Present" ? "selected" : ""}>Present</option>
                      <option ${st === "Absent" ? "selected" : ""}>Absent</option>
                      <option ${st === "Late" ? "selected" : ""}>Late</option>
                    </select>
                  </td>
                </tr>`;
            }).join("")
          : `<tr><td colspan="5" class="empty">No students found.</td></tr>`;

        updateSummary();
      } catch (err) {
        $("attendanceTable").innerHTML = `<tr><td colspan="5" class="empty">${esc(err.message)}</td></tr>`;
      }
    };

    const updateSummary = () => {
      let p = 0, a = 0, l = 0;
      document.querySelectorAll(".status-select").forEach(sel => {
        if (sel.value === "Present") p++;
        else if (sel.value === "Absent") a++;
        else if (sel.value === "Late") l++;
      });
      $("attendancePresent").textContent = p + " Present";
      $("attendanceAbsent").textContent = a + " Absent";
      $("attendanceLate").textContent = l + " Late";
    };

    $("attendanceDate").addEventListener("change", render);
    $("attendanceSearch").addEventListener("input", render);
    $("attendanceTable").addEventListener("change", updateSummary);

    $("saveAttendance").addEventListener("click", async () => {
      const date = $("attendanceDate").value;
      const records = [];
      document.querySelectorAll(".status-select").forEach(sel => {
        records.push({ student_id: +sel.dataset.id, status: sel.value });
      });

      try {
        const res = await api("/attendance", {
          method: "POST",
          body: JSON.stringify({ date, records })
        });
        $("attendanceMessage").textContent = res.message || "Saved!";
        $("attendanceMessage").className = "message success";
        setTimeout(() => { $("attendanceMessage").textContent = ""; }, 3000);
      } catch (err) {
        $("attendanceMessage").textContent = err.message;
        $("attendanceMessage").className = "message";
      }
    });

    render();
  }

  // ========== REPORTS ==========
  async function reportsPage() {
    if (!$("reportsTable")) return;

    const render = async () => {
      const q = $("reportSearch").value.trim();
      try {
        const data = await api("/reports" + (q ? `?q=${encodeURIComponent(q)}` : ""));

        $("reportDates").textContent = data.summary.dates;
        $("reportPresent").textContent = data.summary.present;
        $("reportRate").textContent = data.summary.rate + "%";

        $("reportsTable").innerHTML = data.performance.length
          ? data.performance.map(x => `
              <tr>
                <td><b>${esc(x.name)}</b></td>
                <td>${esc(x.reg_no)}</td>
                <td>${x.present}</td>
                <td>${x.absent}</td>
                <td>${x.late}</td>
                <td>${x.rate}%</td>
              </tr>
            `).join("")
          : `<tr><td colspan="6" class="empty">No students found.</td></tr>`;

        $("dateSummary").innerHTML = data.dateSummary.length
          ? data.dateSummary.map(d => `
              <div class="date-card">
                <div><b>${esc(dateText(d.date))}</b><small>${d.total} records</small></div>
                <div>
                  <b style="color:var(--success)">${d.present}</b> Present &nbsp;
                  <b style="color:var(--danger)">${d.absent}</b> Absent &nbsp;
                  <b>${d.late}</b> Late &nbsp;
                  <b>${d.rate}%</b>
                </div>
              </div>
            `).join("")
          : `<div class="empty">No attendance records yet.</div>`;
      } catch (err) {
        console.error(err);
      }
    };

    $("reportSearch").addEventListener("input", () => render());
    $("printReport")?.addEventListener("click", () => window.print());
    render();
  }

  // ========== SETTINGS ==========
  function settingsPage() {
    $("exportData")?.addEventListener("click", async () => {
      try {
        const students = await api("/students");
        // Get all attendance via reports for simplicity
        const reports = await api("/reports");
        const blob = new Blob([JSON.stringify({
          exportedAt: new Date().toISOString(),
          students,
          performance: reports.performance,
          dateSummary: reports.dateSummary
        }, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "attendance-data.json";
        a.click();
        URL.revokeObjectURL(a.href);
      } catch (err) {
        alert(err.message);
      }
    });
  }

  // Init
  document.addEventListener("DOMContentLoaded", async () => {
    const ok = await requireLogin();
    if (!ok) return;
    common();
    loginPage();
    dashboardPage();
    studentsPage();
    attendancePage();
    reportsPage();
    settingsPage();
  });
})();
