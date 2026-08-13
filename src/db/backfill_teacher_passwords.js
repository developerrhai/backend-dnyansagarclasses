/**
 * backfill_teacher_passwords.js
 * Scans the `teachers` table for any records with NULL or empty passwords,
 * generates a default password (First 4 letters of name + First 4 digits of phone or '1234'),
 * hashes it using bcrypt, and updates the database record.
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const bcrypt = require("bcryptjs");
const db = require("../config/db");

async function backfillPasswords() {
  console.log("🔍 Checking for teachers with missing passwords...");

  try {
    const [rows] = await db.query(
      "SELECT id, name, email, phone, password FROM teachers WHERE password IS NULL OR password = ''"
    );

    if (rows.length === 0) {
      console.log("✅ All teachers already have passwords set. No backfill needed.");
      process.exit(0);
    }

    console.log(`📌 Found ${rows.length} teacher(s) with missing passwords:`);

    for (const teacher of rows) {
      const namePart = (teacher.name || "Teac").replace(/\s+/g, "").substring(0, 4);
      const cleanPhone = (teacher.phone || "").replace(/\D/g, "");
      const phonePart = cleanPhone ? cleanPhone.substring(0, 4).padEnd(4, "0") : "1234";
      const defaultPassword = `${namePart}${phonePart}`;

      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      await db.query("UPDATE teachers SET password = ? WHERE id = ?", [hashedPassword, teacher.id]);

      console.log(
        `  - ID ${teacher.id} (${teacher.name} | ${teacher.email}): Default password set to "${defaultPassword}"`
      );
    }

    console.log("🎉 Successfully backfilled all missing teacher passwords!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Backfill failed:", err);
    process.exit(1);
  }
}

backfillPasswords();
