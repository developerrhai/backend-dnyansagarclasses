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

function numberToWords(num) {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const n = parseInt(num);
  if (isNaN(n) || n === 0) return 'Zero Rupees only';
  const val = n.toString().padStart(9, '0').match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!val) return `${n.toLocaleString()} Rupees only`;
  let str = '';
  str += (val[1] != 0) ? (a[Number(val[1])] || (b[val[1][0]] + ' ' + a[val[1][1]])) + 'Crore ' : '';
  str += (val[2] != 0) ? (a[Number(val[2])] || (b[val[2][0]] + ' ' + a[val[2][1]])) + 'Lakh ' : '';
  str += (val[3] != 0) ? (a[Number(val[3])] || (b[val[3][0]] + ' ' + a[val[3][1]])) + 'Thousand ' : '';
  str += (val[4] != 0) ? (a[Number(val[4])] || (b[val[4][0]] + ' ' + a[val[4][1]])) + 'Hundred ' : '';
  str += (val[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(val[5])] || (b[val[5][0]] + ' ' + a[val[5][1]])) : '';
  return (str.trim() + ' Rupees only').replace(/\s+/g, ' ');
}

/* GET /api/invoices/public/:id/pdf – Public Printable Payment Receipt / PDF View */
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
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-GB") : "—";
    const amountInWords = numberToWords(paid);

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Receipt #${inv.id} - Dnyansagar Classes</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #2d3748; margin: 0; padding: 20px; background: #f8fafc; }
    .container { max-width: 794px; margin: 0 auto; background: #fff; padding: 40px; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1f7fa6; padding-bottom: 12px; }
    .institute h2 { margin: 0; color: #1f7fa6; font-size: 22px; font-weight: bold; letter-spacing: 0.5px; }
    .institute p { margin: 3px 0; font-size: 13px; color: #4a5568; }
    .logo { height: 60px; max-width: 140px; object-fit: contain; }
    .title { text-align: center; color: #1f7fa6; font-size: 22px; font-weight: bold; margin: 25px 0 20px 0; }
    .top-details { display: flex; justify-content: space-between; margin-bottom: 25px; font-size: 14px; line-height: 1.6; }
    .left-info p, .right-info p { margin: 4px 0; }
    .right-info { text-align: right; }
    .right-info h4 { margin: 0 0 6px 0; font-size: 15px; color: #2d3748; }
    .receipt-table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px; }
    .receipt-table td { padding: 10px 0; color: #2d3748; }
    .receipt-table td:last-child { text-align: right; font-weight: bold; }
    .receipt-table tr.total-border td { border-top: 1px solid #718096; font-weight: bold; }
    .footer { margin-top: 60px; text-align: right; font-size: 14px; }
    .footer .auth { font-weight: bold; margin-top: 40px; color: #1a202c; }
    @media print {
      body { padding: 0; background: #fff; }
      .container { border: none; box-shadow: none; padding: 0; width: 100%; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="text-align: right; max-width: 794px; margin: 0 auto 15px auto;">
    <button onclick="window.print()" style="background: #1f7fa6; color: #fff; border: none; padding: 10px 22px; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">🖨️ Save as PDF / Print</button>
  </div>
  <div class="container">
    <div class="header">
      <div class="institute">
        <h2>DNYANSAGAR CLASSES</h2>
        <p>201/A, New Excelsior Building Opp. Crown Hotel, KHADKI Pune - 411003</p>
        <p>Phone no : 8862010906</p>
        <p>State: Maharashtra</p>
      </div>
    </div>

    <div class="title">Payment Receipt</div>

    <div class="top-details">
      <div class="left-info">
        <p><b>Received From</b></p>
        <p style="text-transform: lowercase;">${inv.student_name}</p>
        <p><b>Contact No :</b> ${inv.student_phone || "—"}</p>
        <p style="margin-top: 12px;"><b>Amount in words</b></p>
        <p>${amountInWords}</p>
      </div>
      <div class="right-info">
        <h4>Receipt Details</h4>
        <p><b>Receipt No :</b> ${inv.id}</p>
        <p><b>Date :</b> ${fmtDate(inv.install_date || inv.created_at)}</p>
      </div>
    </div>

    <table class="receipt-table">
      <tbody>
        <tr>
          <td>Received</td>
          <td>₹ ${paid.toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td>Payment mode</td>
          <td>${inv.transaction_type || "Cash"}</td>
        </tr>
        <tr>
          <td>Previous Balance</td>
          <td>₹ ${amount.toLocaleString('en-IN')}</td>
        </tr>
        <tr class="total-border">
          <td>Current Balance</td>
          <td>₹ ${balance.toLocaleString('en-IN')}</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      <div>For : DNYANSAGAR CLASSES</div>
      <div class="auth">Authorized Signatory</div>
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

