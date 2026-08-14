const db = require("./src/config/db");

async function detailAudit() {
  try {
    const [rows] = await db.query(`
      SELECT 
        s.id AS student_id,
        s.name AS student_name,
        s.fee AS student_total_fee,
        s.paid_fee AS student_paid_fee,
        COUNT(i.id) AS invoice_count,
        SUM(i.amount) AS total_invoiced_in_db,
        SUM(i.paid_amount) AS total_paid_in_db
      FROM students s
      JOIN invoices i ON s.id = i.student_id
      GROUP BY s.id, s.name, s.fee, s.paid_fee
      HAVING COUNT(i.id) > 1
      ORDER BY total_invoiced_in_db DESC
      LIMIT 15
    `);

    console.log("=== MULTIPLE INVOICES PER STUDENT BREAKDOWN ===");
    console.table(rows);

    // Also get details of one student (e.g. HUZEFA SHAIKH)
    const [huzefaInvoices] = await db.query(`
      SELECT id, student_name, amount, paid_amount, status, created_at, install_date
      FROM invoices
      WHERE student_name LIKE '%HUZEFA%'
    `);
    console.log("\n=== INVOICES FOR HUZEFA SHAIKH ===");
    console.table(huzefaInvoices);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

detailAudit();
