const jwt = require("jsonwebtoken");

module.exports = function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  const token = header.split(" ")[1];
  try {
    const secret = process.env.JWT_SECRET || "change_this_to_a_long_random_string";
    const decoded = jwt.verify(token, secret);
    req.admin = decoded;   // { id, email, name, role }
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};
