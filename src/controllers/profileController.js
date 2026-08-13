const db = require("../config/db");

/* GET /api/profile */
exports.getProfile = async (req, res) => {
  try {
    const role = req.admin.role || "admin";
    const tableName = role === "teacher" ? "teachers" : "admins";
    const fields = role === "teacher" 
      ? "id, name, email, phone, institute, location, subjects, created_at"
      : "id, name, email, institute, address, created_at";

    const [rows] = await db.query(
      `SELECT ${fields} FROM ${tableName} WHERE id = ?`,
      [req.admin.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "User not found" });
    const user = rows[0];
    if (user.subjects && typeof user.subjects === "string") {
      try { user.subjects = JSON.parse(user.subjects); } catch (e) {}
    }
    res.json({ success: true, data: { ...user, role } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* PUT /api/profile */
exports.updateProfile = async (req, res) => {
  try {
    const role = req.admin.role || "admin";
    const { name, email, institute, address, phone, location, password } = req.body;
    const bcrypt = require("bcryptjs");

    if (role === "teacher") {
      let query = "UPDATE teachers SET name=?, email=?, institute=?, location=?, phone=?";
      let params = [name, email, institute, location || "", phone || ""];

      if (password && password.trim()) {
        const hashedPassword = await bcrypt.hash(password.trim(), 10);
        query += ", password=?";
        params.push(hashedPassword);
      }

      query += " WHERE id=?";
      params.push(req.admin.id);
      await db.query(query, params);
    } else {
      let query = "UPDATE admins SET name=?, email=?, institute=?, address=?";
      let params = [name, email, institute, address];

      if (password && password.trim()) {
        const hashedPassword = await bcrypt.hash(password.trim(), 10);
        query += ", password=?";
        params.push(hashedPassword);
      }

      query += " WHERE id=?";
      params.push(req.admin.id);
      await db.query(query, params);
    }

    res.json({ success: true, message: "Profile updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
