/* require("dotenv").config(); */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const express = require("express");
const cors    = require("cors");
const morgan  = require("morgan");
const db      = require("./config/db");

const app = express();

/* ── Middleware ─────────────────────────────────────────── */
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "https://financereactjs.vercel.app",
    "https://dnyansagarclasses.com",
    "https://www.dnyansagarclasses.com",
    "https://dnyansagarclasses.vercel.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.options("*", cors()); // ✅ ADD THIS TO HANDLE ALL PREFLIGHTS

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(morgan("dev"));

/* ── Serve Uploaded Invoice Images ──────────────────────── */
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));


/* ── Routes ─────────────────────────────────────────────── */


/* ── Routes ─────────────────────────────────────────────── */

app.use("/api/auth", require("./routes/auth"));
app.use("/api/profile", require("./routes/profile"));
app.use("/api/students", require("./routes/students"));
app.use("/api/teachers", require("./routes/teachers"));
app.use("/api/inquiries", require("./routes/inquiries"));
app.use("/api/appointments", require("./routes/appointments"));
app.use("/api/students-universal", require("./routes/studentsUniversal"));
app.use("/api/invoices", require("./routes/invoices"));
app.use("/api/finance", require("./routes/finance"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/admissions/public", require("./routes/admissionPublic"));
app.use("/api/inquiries/public", require("./routes/inquiryPublic"));
app.use("/api/teacher-updates/public", require("./routes/teacherUpdatePublic"));
app.use("/api/inquiry-extra", require("./routes/inquiryExtra"));
app.use("/api/teacher-updates", require("./routes/teacherUpdates"));
app.use("/api/inquiry-extra", require("./routes/inquiryExtra"));
app.use("/api/teacher-student-assessments", require("./routes/teacherStudentAssessments"));
app.use("/api/subjects",  require("./routes/subjects"));
app.use("/api/batches",  require("./routes/batchRoute"));
app.use("/api/chapters",  require("./routes/chapters"));
app.use("/api/standards",  require("./routes/standard"));
app.use("/api/notes",  require("./routes/notes"));
app.use("/api/boards",  require("./routes/boards"));
app.use("/api/branches",  require("./routes/branchRoute"));
app.use("/api/assign-teacher",  require("./routes/teacherAssignRoute"));
app.use("/api/admin",     require("./routes/scheduleRoute"));
app.use("/api/whatsapp",  require("./routes/whatsapp"));


/* ── Health check ───────────────────────────────────────── */
app.get("/api/health", (_req, res) =>
  res.json({ success: true, message: "InstituteMS API running", ts: new Date() })
);

/* ── 404 handler ────────────────────────────────────────── */
app.use((_req, res) =>
  res.status(404).json({ success: false, message: "Route not found" })
);

/* ── Global error handler ───────────────────────────────── */
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});


/* ── 404 handler ────────────────────────────────────────── */
app.use((_req, res) =>
  res.status(404).json({ success: false, message: "Route not found" })
);

/* ── Global error handler ───────────────────────────────── */
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});


/* ── Boot ───────────────────────────────────────────────── */
const PORT = process.env.PORT || 5001;

(async () => {
  try {
    await db.testConnection();
    console.log("✅ MySQL connected");
    app.listen(PORT, () => {
      console.log(`\n🚀 InstituteMS backend  →  http://localhost:${PORT}`);
      console.log(`   ENV : ${process.env.NODE_ENV || "development"}`);
      console.log(`   DB  : ${process.env.DB_NAME}@${process.env.DB_HOST}\n`);
    });
  } catch (err) {
    console.error("❌ Cannot connect to MySQL:", err.message);
    console.error("   Make sure MySQL is running and .env credentials are correct.");
    process.exit(1);
  }
})();
