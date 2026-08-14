const db = require("./src/config/db");

async function audit() {
  try {
    const [inv] = await db.query(
      "SELECT COUNT(*) AS total_invoices, SUM(amount) AS sum_inv_amount, SUM(paid_amount) AS sum_inv_paid FROM invoices"
    );
    const [stu] = await db.query(
      "SELECT COUNT(*) AS total_students, SUM(fee) AS sum_stu_fee, SUM(paid_fee) AS sum_stu_paid FROM students"
    );
    const [dups] = await db.query(
      "SELECT student_name, COUNT(*) AS invoice_count, SUM(amount) AS total_inv_amount, SUM(paid_amount) AS total_inv_paid FROM invoices GROUP BY student_name HAVING COUNT(*) > 1 ORDER BY COUNT(*) DESC LIMIT 20"
    );
    const [byAdmin] = await db.query(
      "SELECT admin_id, COUNT(*) AS inv_count, SUM(amount) AS inv_sum, SUM(paid_amount) AS paid_sum FROM invoices GROUP BY admin_id"
    );

    console.log("=== INVOICES SUMMARY ===");
    console.log(inv[0]);

    console.log("\n=== STUDENTS SUMMARY ===");
    console.log(stu[0]);

    console.log("\n=== INVOICES BY ADMIN ===");
    console.log(byAdmin);

    console.log("\n=== STUDENTS WITH MULTIPLE INVOICES ===");
    console.log(dups);
  } catch (err) {
    console.error("Audit error:", err);
  } finally {
    process.exit();
  }
}

audit();
