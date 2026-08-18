import jwt from "jsonwebtoken";

const JWT_ISSUER = process.env.JWT_ISSUER || "workout-tracker-api";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "workout-tracker-mobile";

const authenticateToken = (req, res, next) => {
  //logic here
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: "JWT secret is not configured." });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    req.user = decoded; // Attach user info to request object
    next(); // Call the next middleware or route handler
  } catch (error) {
    return res.status(403).json({ error: "invalid or expired token" });
  }
};
export default authenticateToken;
