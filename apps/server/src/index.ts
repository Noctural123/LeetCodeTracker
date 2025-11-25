import express from "express";
import cors from "cors";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Initialize Prisma Client with logging
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

const app = express();
app.use(cors({
  origin: "http://localhost:3000",
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

// Data validation for creating an attempt
const AttemptCreate = z.object({
  user_handle: z.string().min(1, "user_handle is required"),
  slug: z.string().min(1, "slug is required"),
  title: z.string().min(1, "title is required"),
  topics:z.string().default(""),
  lc_difficulty: z.number().int().min(0).max(3).default(0),
  status: z.enum(["accepted", "rejected"]),
  lang: z.string().optional(),
  runtime_ms: z.number().int().optional(),
  memory_kb: z.number().int().optional(),
  seconds: z.number().int().optional(),
  code: z.string().optional(),
  ts: z.string().datetime().optional(),
});

app.post("/attempt", async (req, res) => {
  const parsed = AttemptCreate.safeParse(req.body);
  if(!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }
  
  const p = parsed.data;

  const user = await prisma.user.upsert({
    where: { handle: p.user_handle }, // check if user exists, if not create a new user
    update: {},
    create: { handle: p.user_handle },
  });

  const problem = await prisma.problem.upsert({
    where: { slug: p.slug }, 
    update: { // update the problem if it exists
      title: p.title,
      topics: p.topics,
      lcDifficulty: p.lc_difficulty,
    },
    create: { // create a new problem if it doesn't exist
      slug: p.slug,
      title: p.title,
      topics: p.topics,
      lcDifficulty: p.lc_difficulty,
    },
});

  const attempt = await prisma.attempt.create({
    data: {
      // from the user and problem data, we can create a new attempt
      userId: user.id, // ".id" comes from the prisma schema we defined
      problemId: problem.id,

      status: p.status,
      lang: p.lang ?? null,
      runtimeMs: p.runtime_ms ?? null,
      memoryKb: p.memory_kb ?? null,
      seconds: p.seconds ?? null,
      code: p.code ?? null,
      ts: p.ts ?? new Date(),
    },
    include: { user: true, problem: true }, // fetch the user and problem data, e.g., handle, title, id, slug, title, etc.
});

  res.json({ // return the attempt data
    id: attempt.id,
    user_handle: attempt.user.handle,
    slug: attempt.problem.slug,
    title: attempt.problem.title,
    topics: attempt.problem.topics,
    lc_difficulty: attempt.problem.lcDifficulty,
    status: attempt.status,
    lang: attempt.lang,
    runtime_ms: attempt.runtimeMs,
    memory_kb: attempt.memoryKb,
    seconds: attempt.seconds,
    ts: attempt.ts,
  });
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
