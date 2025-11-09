import express from "express";
import cors from "cors";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();
app.use(cors({
  origin: "http://localhost:3000",
  credentials: false,
}));
app.use(express.json());

app.get("/test", (req, res) => {
    res.json({ status: "ok" })
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// npm run dev - Runs Typescript directly
// npm run build - Compiles Typescript to JavaScript
// npm run start - Runs the JavaScript file
// npm run prisma:studio - starts the prisma studio, opens up a web interface to view the database

