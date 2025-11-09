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

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// npm run dev - Runs Typescript directly
// npm run build - Compiles Typescript to JavaScript
// npm run start - Runs the JavaScript file
// npm run prisma:studio - starts the prisma studio, opens up a web interface to view the database



