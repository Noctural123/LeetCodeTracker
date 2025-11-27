import express from "express";
import cors from "cors";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Initialize Prisma Client with logging
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

const app = express();
app.use(cors({
  origin: true, // Allow dynamic origin for Chrome Extension support
  credentials: true,
}));
app.use(express.json()); // Ensure JSON body parsing is enabled

// Health check and startup log
console.log("Starting server...");

app.get("/test", (req, res) => {
    res.json({ status: "ok" })
});

// Registration endpoint
const RegisterSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

app.post("/auth/register", async (req, res) => {
  console.log("Received registration request:", req.body);
  
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    console.log("Validation failed:", parsed.error.issues);
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { username, email, password } = parsed.data;

  try {
    // Check if user already exists
    console.log("Checking for existing user...");
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { handle: username },
          { email: email },
        ],
      },
    });

    if (existingUser) {
      console.log("User already exists:", existingUser.handle === username ? "handle" : "email");
      return res.status(400).json({ 
        error: existingUser.handle === username 
          ? "Username already taken" 
          : "Email already registered" 
      });
    }

    // Hash password
    console.log("Hashing password...");
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    console.log("Creating user in database...");
    const user = await prisma.user.create({
      data: {
        handle: username,
        email: email,
        password: hashedPassword,
      },
    });
    
    console.log("User created successfully:", user.id);

    res.json({ 
      message: "User created successfully",
      user: {
        id: user.id,
        username: user.handle,
        email: user.email,
      },
    });
  } catch (error: any) {
    // Log the full error structure
    console.error("Registration error full object:", error);
    console.error("Registration error stringified:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    
    res.status(500).json({ 
        error: `Registration failed: ${error.message || "Unknown error"}`,
        details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

// Login endpoint (for NextAuth credentials provider)
const LoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

app.post("/auth/login", async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { username, password } = parsed.data;

  try {
    // Find user by username (handle) or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { handle: username },
          { email: username },
        ],
      },
    });

    if (!user || !user.password) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    res.json({
      id: user.id,
      username: user.handle,
      email: user.email,
      name: user.name,
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// Forgot Password Endpoint
const ForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

app.post("/auth/forgot-password", async (req, res) => {
  const parsed = ForgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { email } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({ message: "If that email is registered, a reset link has been sent." });
    }

    // Generate token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour from now

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpires,
      },
    });

    // In a real app, send email here using a service like SendGrid/AWS SES
    // For now, log the token to console
    const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;
    console.log(`
      ==================================================
      PASSWORD RESET REQUEST
      User: ${user.handle} (${user.email})
      Reset Link: ${resetLink}
      ==================================================
    `);

    res.json({ message: "If that email is registered, a reset link has been sent." });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "Failed to process request" });
  }
});

// Forgot Username Endpoint
app.post("/auth/forgot-username", async (req, res) => {
  const parsed = ForgotPasswordSchema.safeParse(req.body); // Re-use schema since it just checks email
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { email } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
       // Security: don't reveal existence
      return res.json({ message: "If that email is registered, your username has been sent." });
    }

    // In a real app, send email here
    console.log(`
      ==================================================
      USERNAME RETRIEVAL REQUEST
      Email: ${email}
      Username: ${user.handle}
      ==================================================
    `);

    res.json({ message: "If that email is registered, your username has been sent." });
  } catch (error: any) {
    console.error("Forgot username error:", error);
    res.status(500).json({ error: "Failed to process request" });
  }
});

// Reset Password Endpoint
const ResetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

app.post("/auth/reset-password", async (req, res) => {
  const parsed = ResetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { token, password } = parsed.data;

  try {
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: {
          gt: new Date(), // Token must not be expired
        },
      },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    res.json({ message: "Password reset successfully" });
  } catch (error: any) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
});


// Data validation for creating an attempt
const AttemptCreate = z.object({
  user_handle: z.string().min(1, "user_handle is required"),
  slug: z.string().min(1, "slug is required"),
  title: z.string().min(1, "title is required"),
  problem_number: z.number().int().nullable().optional(),
  topics:z.string().default(""),
  lc_difficulty: z.number().int().min(0).max(3).default(0),
  status: z.string(), // Allow any string status (e.g. "Accepted", "Wrong Answer")
  lang: z.string().optional(),
  runtime_ms: z.number().int().optional(),
  memory_kb: z.number().int().optional(),
  seconds: z.number().int().optional(),
  code: z.string().optional(),
  ts: z.string().datetime().optional(),
});

app.post("/attempt", async (req, res) => {
  console.log("Received attempt request:", req.body); // DEBUG LOG

  const parsed = AttemptCreate.safeParse(req.body);
  if(!parsed.success) {
    console.log("Validation error:", parsed.error.message); // DEBUG LOG
    return res.status(400).json({ error: parsed.error.message });
  }
  
  const p = parsed.data;
  
  // Normalize status to lowercase for consistency, if needed
  const normalizedStatus = p.status.toLowerCase();

  try {
    // Verify user exists first
    const userExists = await prisma.user.findUnique({
        where: { handle: p.user_handle }
    });

    if (!userExists) {
        console.log("User not found:", p.user_handle); // DEBUG LOG
        // Option: fail if user doesn't exist, or create them. 
        // For safety, let's ensure we only track for registered users or auto-create if that's the policy.
        // Previous code used upsert, which is fine.
    }

    const user = await prisma.user.upsert({
        where: { handle: p.user_handle },
        update: {},
        create: { handle: p.user_handle },
    });
    
    console.log("User upserted:", user.id); // DEBUG LOG

    const problem = await prisma.problem.upsert({
        where: { slug: p.slug }, 
        update: { 
        title: p.title,
        number: p.problem_number,
        // Only update topics/difficulty if they are provided (not default/empty)
        topics: p.topics || undefined,
        lcDifficulty: p.lc_difficulty > 0 ? p.lc_difficulty : undefined,
        },
        create: { 
        slug: p.slug,
        title: p.title,
        number: p.problem_number,
        topics: p.topics,
        lcDifficulty: p.lc_difficulty,
        },
    });

    console.log("Problem upserted:", problem.id); // DEBUG LOG

    const attempt = await prisma.attempt.create({
        data: {
        userId: user.id,
        problemId: problem.id,
        status: normalizedStatus,
        lang: p.lang ?? null,
        runtimeMs: p.runtime_ms ?? null,
        memoryKb: p.memory_kb ?? null,
        seconds: p.seconds ?? null,
        code: p.code ?? null,
        ts: p.ts ?? new Date(),
        },
        include: { user: true, problem: true },
    });

    console.log("Attempt created:", attempt.id); // DEBUG LOG

    res.json({ 
        id: attempt.id,
        user_handle: attempt.user.handle,
        slug: attempt.problem.slug,
        title: attempt.problem.title,
        status: attempt.status,
    });
  } catch (e: any) {
      console.error("Error saving attempt:", e);
      res.status(500).json({ error: e.message || "Server error" });
  }
});

app.get("/attempts", async (req, res) => {
  const user_handle = String(req.query.user_handle || "");
  
  if (!user_handle) {
      return res.json([]);
  }

  const attempts = await prisma.attempt.findMany({
    where: {
      user: {
        handle: user_handle,
      },
    },
    include: {
      problem: true,
      user: true,
    },
    orderBy: {
      ts: "desc",
    },
  });

  res.json(
    attempts.map((a) => ({
      id: a.id,
      user_handle: a.user.handle,
      slug: a.problem.slug,
      title: a.problem.title,
      problem_number: a.problem.number,
      topics: a.problem.topics,
      lc_difficulty: a.problem.lcDifficulty,
      status: a.status,
      lang: a.lang,
      runtime_ms: a.runtimeMs,
      memory_kb: a.memoryKb,
      seconds: a.seconds,
      ts: a.ts,
    }))
  );
});

app.delete("/attempt/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid attempt ID" });
  }

  try {
    // Check if attempt exists
    const existing = await prisma.attempt.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: "Attempt not found" });
    }

    // Delete attempt
    await prisma.attempt.delete({
      where: { id },
    });

    res.json({ message: "Attempt deleted successfully" });
  } catch (error: any) {
    console.error("Delete error:", error);
    res.status(500).json({ error: "Failed to delete attempt" });
  }
});

const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => {
  console.log(`API on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});
process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});
