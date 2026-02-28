import jwt from "jsonwebtoken";

const authenticateToken = (req, res, next) => {
  //logic here
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach user info to request object
    next(); // Call the next middleware or route handler
  } catch (error) {
    return res.status(403).json({ error: "invalid or expired token" });
  }
};
export default authenticateToken;
