import express from "express";
import cors from "cors";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());

app.get("/test", (req, res) => {
    res.json({ status: "ok" })
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
  if (!user_handle) return res.status(400).json({ error: "user_handle required" });

  const topic = req.query.topic ? String(req.query.topic) : null;
  const status = req.query.status ? String(req.query.status) : null;

  const rows = await prisma.attempt.findMany({
    where: {
      user: { handle: user_handle },
      ...(status ? { status } : {}),
      ...(topic ? { problem: { topics: { contains: topic } } } : {}),
    },
    include: { user: true, problem: true },
    orderBy: { ts: "desc" },
    take: 50,
  });
  res.json(
    rows.map((a) => ({
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

// npm run dev - Runs Typescript directly
// npm run build - Compiles Typescript to JavaScript
// npm run start - Runs the JavaScript file
// npm run prisma:studio - starts the prisma studio, opens up a web interface to view the database



