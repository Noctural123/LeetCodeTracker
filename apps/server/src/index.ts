import express from "express";
import cors from "cors";
import { z } from "zod";import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
    res.json({ status: "ok" })
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});