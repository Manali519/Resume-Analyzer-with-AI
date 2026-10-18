const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const rateLimit = require("./middleware/rateLimit");

const isProduction = process.env.NODE_ENV === "production";

const missing = ["MONGO_URI", "JWT_SECRET"].filter((name) => !process.env[name]);
if (missing.length) {
    console.error(`Missing environment variables: ${missing.join(", ")}. Set them in backend/.env.`);
    process.exit(1);
}
if (isProduction && process.env.JWT_SECRET.length < 32) {
    console.error("JWT_SECRET must be at least 32 characters in production.");
    process.exit(1);
}

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173").split(",").map((o) => o.trim());
// The built React app, served by this server when present (single-service deployment)
const clientDir = path.resolve(__dirname, process.env.CLIENT_DIST || "../frontend/dist");

const app = express();

app.disable("x-powered-by");
// Number of proxies in front of the app (load balancer, ingress), so req.ip is the real client
app.set("trust proxy", Number(process.env.TRUST_PROXY) || 0);

app.use((req, res, next) => {
    res.set({
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin-when-cross-origin"
    });
    next();
});
app.use("/api", cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (req, res) => {
    const db = mongoose.connection.readyState === 1;
    res.status(db ? 200 : 503).json({ status: db ? "ok" : "degraded", db });
});

app.use("/api/auth", rateLimit({ windowMs: FIFTEEN_MINUTES, max: 20, message: "Too many attempts. Please try again later." }));
app.use("/api/analyses", rateLimit({ windowMs: FIFTEEN_MINUTES, max: 60, message: "Too many scans. Please wait a few minutes." }));
app.use("/api/contact", rateLimit({ windowMs: FIFTEEN_MINUTES, max: 5, message: "Too many messages. Please try again later." }));

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/analyses", require("./routes/analysisRoutes"));
app.post("/api/contact", require("./controllers/contactController").submitContactMessage);

app.use("/api", (req, res) => res.status(404).json({ error: "Not found." }));

if (fs.existsSync(path.join(clientDir, "index.html"))) {
    app.use(express.static(clientDir, { index: false, maxAge: "1h" }));
    // Client-side routes (/scan, /dashboard, ...) all load the app
    app.get("*", (req, res) => res.sendFile(path.join(clientDir, "index.html")));
}

app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) console.error(err);
    // Only messages written for users (or flagged safe by Express) are sent back
    const message = status < 500 && (err.expose !== false) ? err.message : "Something went wrong.";
    res.status(status).json({ error: message });
});

const PORT = Number(process.env.PORT) || 5000;

mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 })
    .then(() => {
        console.log("MongoDB connected");
        const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

        const shutdown = (signal) => {
            console.log(`${signal} received, shutting down`);
            server.close(() => mongoose.disconnect().finally(() => process.exit(0)));
            setTimeout(() => process.exit(1), 10000).unref();
        };
        process.on("SIGTERM", shutdown);
        process.on("SIGINT", shutdown);
    })
    .catch((error) => {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    });
