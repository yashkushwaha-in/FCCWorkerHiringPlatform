const session = require("express-session");
const express = require("express");
const path = require("path");
require("dotenv").config();

const pool = require("./config/db");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 1000 * 60 * 60 * 2
    }
}));

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");

        res.json({
            success: true,
            message: "CONCO server and MySQL connected successfully"
        });
    } catch (error) {
        console.error("Database connection error:", error.message);

        res.status(500).json({
            success: false,
            message: "Database connection failed"
        });
    }
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/jobs", require("./routes/jobRoutes"));
app.use("/api/applications", require("./routes/applicationRoutes"));
app.use("/api/workers", require("./routes/workerRoutes"));
app.use("/api/builders", require("./routes/builderRoutes"));

app.get("/api/auth/me", (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: "Not authenticated."
        });
    }

    res.json({
        success: true,
        user: req.session.user
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`CONCO server running at http://localhost:${PORT}`);
});