const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
// bcryptjs removed in favor of Bun.password
const pool = require("./db");
const { setupSocket } = require("./socket");

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:13001",
  "http://std.meo.in.th:13001",
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// Make io accessible to routes
app.set("io", io);

// Middleware
// Security Headers
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "script-src 'self'; " +
      "style-src 'self'; " +
      "img-src 'self'; " +
      "font-src 'self'; " +
      "connect-src 'self' ws: wss: " +
      allowedOrigins
        .map((origin) => new URL(origin).origin)
        .filter(
          (origin) =>
            origin.startsWith("https://") ||
            origin === "http://localhost:13001",
        )
        .map((origin) =>
          origin === "http://localhost:13001"
            ? "https://std.meo.in.th:14001"
            : origin.replace("http://", "https://"),
        )
        .join(" ") +
      "; " +
      "object-src 'none'; " +
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'",
  );
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
app.use(express.json());

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/students", require("./routes/students"));
app.use("/api/clubs", require("./routes/clubs"));
app.use("/api/registrations", require("./routes/registrations"));
app.use("/api/settings", require("./routes/settings"));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Socket.IO setup
setupSocket(io);

// Seed admin on startup
async function seedAdmin() {
  try {
    const [rows] = await pool.query("SELECT COUNT(*) as count FROM admins");
    if (rows[0].count === 0) {
      const hash = await Bun.password.hash("admin123");
      await pool.query(
        "INSERT INTO admins (username, password) VALUES (?, ?)",
        ["admin", hash],
      );
      console.log("Admin user seeded: admin / admin123");
    }
  } catch (err) {
    console.error("Seed admin error:", err);
  }
}

const PORT = process.env.PORT || 14001;

async function start() {
  // Wait for DB to be ready
  let retries = 30;
  while (retries > 0) {
    try {
      await pool.query("SELECT 1");
      console.log("Database connected");
      break;
    } catch (err) {
      retries--;
      console.log(`Waiting for database... (${30 - retries}/30)`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  if (retries === 0) {
    console.error("Could not connect to database");
    process.exit(1);
  }

  await seedAdmin();

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
