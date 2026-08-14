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
    const aid = req.admin.id;
    const [rows] = await db.query(
      `SELECT
         COALESCE((SELECT SUM(fee) FROM students WHERE admin_id = ?), 0) AS total_invoiced,
         COALESCE((SELECT SUM(paid_amount) FROM invoices WHERE admin_id = ?), 0) AS total_paid,
         COALESCE(GREATEST(0, 
           COALESCE((SELECT SUM(fee) FROM students WHERE admin_id = ?), 0) - 
           COALESCE((SELECT SUM(paid_amount) FROM invoices WHERE admin_id = ?), 0)
         ), 0) AS total_pending`,
      [aid, aid, aid, aid]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* GET /api/invoices/public/:id/pdf – Public Printable Tax Invoice PDF View */
exports.getPdf = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT i.*, 
              COALESCE(NULLIF(i.student_phone, ''), s.phone, '') AS student_phone,
              s.standard, s.course
       FROM invoices i
       LEFT JOIN students s ON i.student_id = s.id
       WHERE i.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).send("Invoice not found");
    const inv = rows[0];

    const amount = Number(inv.amount || 0);
    const paid = Number(inv.paid_amount || 0);
    const balance = Math.max(0, amount - paid);
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : "—";

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tax Invoice #${inv.id} - Dnyansagar Classes</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; margin: 0; padding: 20px; background: #f8fafc; }
    .container { max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 35px; border-radius: 8px; background: #fff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1f7fa6; padding-bottom: 15px; }
    .institute h2 { margin: 0; color: #1f7fa6; font-size: 24px; text-transform: uppercase; letter-spacing: 0.5px; }
    .institute p { margin: 3px 0; font-size: 13px; color: #4a5568; }
    .title { text-align: center; color: #1f7fa6; font-size: 22px; font-weight: bold; margin: 20px 0 10px 0; letter-spacing: 1px; }
    .details-grid { display: flex; justify-content: space-between; margin-top: 15px; background: #f7fafc; padding: 15px; border-radius: 6px; border: 1px solid #edf2f7; }
    .details-grid p { margin: 4px 0; font-size: 14px; }
    .table { width: 100%; border-collapse: collapse; margin-top: 25px; }
    .table th { background: #1f7fa6; color: #fff; padding: 10px 12px; text-align: left; font-size: 14px; }
    .table td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    .table td:last-child, .table th:last-child { text-align: right; }
    .summary-box { margin-top: 25px; display: flex; justify-content: flex-end; }
    .summary-table { width: 320px; border-collapse: collapse; }
    .summary-table td { padding: 8px 12px; font-size: 14px; }
    .summary-table tr.total-row { background: #e6fffa; font-weight: bold; font-size: 16px; border-top: 2px solid #319795; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
    .badge-paid { background: #c6f6d5; color: #22543d; }
    .badge-partial { background: #feebc8; color: #744210; }
    .badge-pending { background: #e2e8f0; color: #2d3748; }
    .footer { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #edf2f7; padding-top: 20px; }
    .signature { text-align: right; }
    .auth { font-weight: bold; margin-top: 5px; color: #2d3748; font-size: 13px; }
    @media print {
      body { padding: 0; background: #fff; }
      .container { border: none; box-shadow: none; padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="text-align: right; max-width: 800px; margin: 0 auto 15px auto;">
    <button onclick="window.print()" style="background: #1f7fa6; color: #fff; border: none; padding: 10px 20px; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 14px;">🖨️ Save as PDF / Print</button>
  </div>
  <div class="container">
    <div class="header">
      <div class="institute">
        <h2>Dnyansagar Classes</h2>
        <p>201/A, New Excelsior Building Opp. Crown Hotel, KHADKI Pune - 411003</p>
        <p>Phone: 8862010906 | State: Maharashtra</p>
      </div>
    </div>
    <div class="title">TAX INVOICE</div>
    <div class="details-grid">
      <div>
        <p><b>STUDENT DETAILS:</b></p>
        <p><b>Name:</b> ${inv.student_name}</p>
        <p><b>Student ID:</b> ${inv.student_id || "—"}</p>
        <p><b>Phone:</b> ${inv.student_phone || "—"}</p>
      </div>
      <div style="text-align: right;">
        <p><b>INVOICE DETAILS:</b></p>
        <p><b>Invoice No:</b> #INV${String(inv.id).padStart(3, '0')}</p>
        <p><b>Date:</b> ${fmtDate(inv.install_date || inv.created_at)}</p>
        <p><b>Due Date:</b> ${fmtDate(inv.due_date)}</p>
        <p><b>Status:</b> <span class="badge ${balance === 0 ? 'badge-paid' : (paid > 0 ? 'badge-partial' : 'badge-pending')}">${inv.status || (balance === 0 ? 'Paid' : 'Pending')}</span></p>
      </div>
    </div>
    <table class="table">
      <thead>
        <tr>
          <th>Description</th>
          <th>Transaction Type</th>
          <th>Total Amount</th>
          <th>Paid Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${inv.description || "Tuition Fee"}</td>
          <td>${inv.transaction_type || "Cash"}</td>
          <td>₹${amount.toLocaleString()}</td>
          <td>₹${paid.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>
    <div class="summary-box">
      <table class="summary-table">
        <tr>
          <td>Total Amount:</td>
          <td style="text-align: right;">₹${amount.toLocaleString()}</td>
        </tr>
        <tr>
          <td>Amount Paid:</td>
          <td style="text-align: right;">₹${paid.toLocaleString()}</td>
        </tr>
        <tr class="total-row">
          <td>Remaining Balance:</td>
          <td style="text-align: right;">₹${balance.toLocaleString()}</td>
        </tr>
      </table>
    </div>
    <div class="footer">
      <div>
        <p style="font-size: 12px; color: #718096; margin: 0;">Thank you for choosing Dnyansagar Classes.</p>
        <p style="font-size: 11px; color: #a0aec0; margin-top: 4px;">Computer-generated tax invoice.</p>
      </div>
      <div class="signature">
        <p style="font-size: 13px; font-weight: bold; margin-bottom: 30px;">For Dnyansagar Classes</p>
        <div class="auth">Authorized Signatory</div>
      </div>
    </div>
  </div>
  <script>
    if (new URLSearchParams(window.location.search).get('print') === 'true') {
      window.onload = function() { window.print(); };
    }
  </script>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating invoice PDF");
  }
};

