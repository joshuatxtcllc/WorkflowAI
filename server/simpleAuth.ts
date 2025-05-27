import { RequestHandler } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { storage } from "./storage";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export const authenticateToken: RequestHandler = async (req: any, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

export const loginUser = async (email: string, password: string) => {
  const user = await storage.getUserByEmail(email);
  if (!user || !user.password) {
    return null;
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return null;
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role
    }
  };
};

export const createDefaultUser = async () => {
  try {
    // Check if admin user already exists
    const existingAdmin = await storage.getUserByEmail("admin@jaysframes.com");
    if (existingAdmin) {
      console.log("Admin user already exists");
      return;
    }

    // Create default admin user
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await storage.createUser({
      email: "admin@jaysframes.com",
      password: hashedPassword,
      firstName: "Jay",
      lastName: "Admin"
    });

    console.log("Default admin user created: admin@jaysframes.com / admin123");
  } catch (error) {
    console.error("Error creating default user:", error);
  }
};