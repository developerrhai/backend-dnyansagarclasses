const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

/* ── POST /api/auth/signup ──────────────────────────────── */
exports.signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role)
      return res.status(400).json({ success: false, message: "All fields are required" });
    const userRole = role.toLowerCase();
    const tableName = userRole === "admin" ? "admins" : "teachers";
    const [rows] = await db.query(`SELECT id FROM ${tableName} WHERE email = ?`, [email]);
    if (rows.length)
      return res.status(409).json({ success: false, message: "Email already registered" });

    const hash = await bcrypt.hash(password, 10);
    
    if (userRole === "admin") {
      const [result] = await db.query(
        `INSERT INTO admins (name, email, password) VALUES (?, ?, ?)`,
        [name, email, hash]
      );
      return res.status(201).json({
        success: true,
        message: "Account created successfully. Please log in.",
        adminId: result.insertId,
      });
    } else {
      const [result] = await db.query(
        `INSERT INTO teachers (admin_id, name, email, password) VALUES (?, ?, ?, ?)`,
        [1, name, email, hash]
      );
      return res.status(201).json({
        success: true,
        message: "Account created successfully. Please log in.",
        teacherId: result.insertId,
      });
    }
  } catch (err) {
    console.error("signup error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};



exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and password are required" 
      });
    }

    let user = null;
    let role = null;

    // 1. Check Admins Table
    const [adminRows] = await db.query("SELECT * FROM admins WHERE email = ?", [email]);
    
    if (adminRows.length > 0) {
      user = adminRows[0];
      role = "admin";
    } else {
      // 2. If not found in admins, check Teachers Table
      const [teacherRows] = await db.query("SELECT * FROM teachers WHERE email = ?", [email]);
      if (teacherRows.length > 0) {
        user = teacherRows[0];
        role = "teacher";
      }
    }

    // 3. If user doesn't exist in either table
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid credentials" 
      });
    }

    // 4. Verify Password (Check for NULL or empty password safely)
    if (!user.password) {
      return res.status(401).json({ 
        success: false, 
        message: "Password is not set for this account. Please contact admin." 
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid credentials" 
      });
    }

    // 5. Generate Token (Include role in payload)
    const secret = process.env.JWT_SECRET || "change_this_to_a_long_random_string";
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: role 
      },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    // 6. Return user data (excluding password)
    const { password: _pw, ...userData } = user;
    
    return res.json({ 
      success: true, 
      message: `Login successful as ${role}`, 
      token, 
      user: { ...userData, role } 
    });

  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
};
