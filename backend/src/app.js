import express from "express";
import cors from "cors";
import morgan from "morgan";

import authRouter from "./routes/authRoutes.js";
import habitRouter from "./routes/habitRoutes.js";
import dailyLogRoutes from "./routes/dailyLogRoutes.js";

const app = express();

/* =======================
   MIDDLEWARE
======================= */
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(morgan("dev"));
app.use(express.json());

/* =======================
   HEALTH CHECK
======================= */
app.get("/", (_, res) => {
  res.json({ message: "AiShipshape API is running." });
});

/* =======================
   ROUTES
======================= */
app.use("/auth", authRouter);
app.use("/habits", habitRouter);

// 🔥 DAILY LOG ROUTES (MATCH FRONTEND)
app.use(dailyLogRoutes);

/* =======================
   ERROR HANDLERS (LAST)
======================= */
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal Server Error" });
});

app.use((req, res) => {
  res.status(404).json({ message: "Resource not Found" });
});

export default app;
