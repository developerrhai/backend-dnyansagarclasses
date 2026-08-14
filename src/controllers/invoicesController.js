const db = require("../config/db");

function computeStatus(amount, paidAmount, dueDate) {
  const paid = parseFloat(paidAmount) || 0;
  const total = parseFloat(amount) || 0;

  if (paid >= total && total > 0) return "Paid";
  if (paid > 0) return "Partial";

  if (dueDate) {
    const due = new Date(dueDate);
    if (!isNaN(due.getTime())) {
      // Set to end of due date (23:59:59.999) to prevent flagging invoice due today as overdue
      due.setHours(23, 59, 59, 999);
      if (due < new Date()) return "Overdue";
    }
  }
  return "Pending";
}

function parseDate(d) {
  if (!d || typeof d !== "string" || !d.trim()) return null;
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : d;
}

exports.getAll = async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT i.*, 
             COALESCE(NULLIF(i.student_phone, ''), s.phone, '') AS student_phone
      FROM invoices i
      LEFT JOIN students s ON i.student_id = s.id
      WHERE i.admin_id = ?
    `;
    const params = [req.admin.id];
    if (status && status !== "all") { 
      sql += " AND i.status = ?"; 
      params.push(status); 
    }
    sql += " ORDER BY i.created_at DESC";
    const [rows] = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT i.*, 
              COALESCE(NULLIF(i.student_phone, ''), s.phone, '') AS student_phone
       FROM invoices i
       LEFT JOIN students s ON i.student_id = s.id
       WHERE i.id = ? AND i.admin_id = ?`,
      [req.params.id, req.admin.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "Invoice not found" });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { student_name, student_id, student_phone, amount, paid_amount, due_date, description, install_date, transaction_type } = req.body;
    if (!student_name || amount === undefined || amount === null || amount === "")
      return res.status(400).json({ success: false, message: "Student name and amount are required" });

    const total = parseFloat(amount);
    if (isNaN(total)) return res.status(400).json({ success: false, message: "Amount must be a valid number" });

    const paid = parseFloat(paid_amount) || 0;
    const cleanDueDate = parseDate(due_date);
    const cleanInstallDate = parseDate(install_date);
    const status = computeStatus(total, paid, cleanDueDate);

    const [result] = await db.query(
      `INSERT INTO invoices (admin_id, student_id, student_name, student_phone, amount, paid_amount, due_date, status, description, install_date, transaction_type)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        req.admin.id, 
        student_id ? parseInt(student_id) || null : null, 
        student_name.trim(), 
        student_phone ? String(student_phone).trim() : "",
        total, 
        paid, 
        cleanDueDate, 
        status, 
        description || "", 
        cleanInstallDate,
        transaction_type || "Cash"
      ]
    );
    res.status(201).json({ success: true, message: "Invoice created", id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { student_name, student_id, student_phone, amount, paid_amount, due_date, install_date, transaction_type, description } = req.body;
    if (!student_name || amount === undefined || amount === null || amount === "")
      return res.status(400).json({ success: false, message: "Student name and amount are required" });

    const total = parseFloat(amount);
    if (isNaN(total)) return res.status(400).json({ success: false, message: "Amount must be a valid number" });

    const paid = parseFloat(paid_amount) || 0;
    const cleanDueDate = parseDate(due_date);
    const cleanInstallDate = parseDate(install_date);
    const status = computeStatus(total, paid, cleanDueDate);

    const [result] = await db.query(
      `UPDATE invoices
       SET student_name=?, student_id=?, student_phone=?, amount=?, paid_amount=?, due_date=?, status=?, description=?, install_date=?, transaction_type=? 
       WHERE id=? AND admin_id=?`,
      [
        student_name.trim(), 
        student_id ? parseInt(student_id) || null : null, 
        student_phone ? String(student_phone).trim() : "",
        total, 
        paid, 
        cleanDueDate, 
        status, 
        description || "", 
        cleanInstallDate,
        transaction_type || "Cash", 
        req.params.id, 
        req.admin.id
      ]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: "Invoice not found" });
    res.json({ success: true, message: "Invoice updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const [result] = await db.query(
      "DELETE FROM invoices WHERE id = ? AND admin_id = ?",
      [req.params.id, req.admin.id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: "Invoice not found" });
    res.json({ success: true, message: "Invoice deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* GET /api/invoices/summary – totals for summary cards */
exports.summary = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
         COALESCE(SUM(amount), 0) AS total_invoiced,
         COALESCE(SUM(paid_amount), 0) AS total_paid,
         COALESCE(SUM(GREATEST(0, amount - paid_amount)), 0) AS total_pending
       FROM invoices WHERE admin_id = ?`,
      [req.admin.id]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

