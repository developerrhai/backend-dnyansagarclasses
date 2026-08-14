const db = require("./src/config/db");

async function testSummary() {
  try {
    const adminId = 1;

    // Current query in invoicesController.js:
    const [current] = await db.query(
      `SELECT
         COALESCE(SUM(amount), 0) AS total_invoiced,
         COALESCE(SUM(paid_amount), 0) AS total_paid,
         COALESCE(SUM(GREATEST(0, amount - paid_amount)), 0) AS total_pending
       FROM invoices WHERE admin_id = ?`,
      [adminId]
    );

    // Corrected query sourcing actual total fees from students:
    const [corrected] = await db.query(
      `SELECT
         COALESCE(s.total_invoiced, 0) AS total_invoiced,
         COALESCE(i.total_paid, 0)     AS total_paid,
         COALESCE(GREATEST(0, s.total_invoiced - i.total_paid), 0) AS total_pending
       FROM (
         SELECT SUM(fee) AS total_invoiced FROM students WHERE admin_id = ?
       ) s
       CROSS JOIN (
         SELECT SUM(paid_amount) AS total_paid FROM invoices WHERE admin_id = ?
       ) i`,
      [adminId, adminId]
    );

    console.log("=== CURRENT (INFLATED) INVOICE SUMMARY ===");
    console.log(current[0]);

    console.log("\n=== CORRECTED INVOICE SUMMARY ===");
    console.log(corrected[0]);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

testSummary();
