const express = require("express");
const pool = require("../config/db");

const router = express.Router();

function requireRole(role) {
    return (req, res, next) => {
        if (!req.session.user) {
            return res.status(401).json({
                success: false,
                message: "Please log in first."
            });
        }

        if (req.session.user.role !== role) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to perform this action."
            });
        }

        next();
    };
}

router.get("/", async (req, res) => {
    try {
        const [jobs] = await pool.execute(`
            SELECT j.job_id, j.title, j.description, j.location,
                   j.skill_required, j.workers_required, j.daily_wage,
                   j.duration_days, j.status, j.posted_at,
                   b.company_name
            FROM Jobs j
            JOIN Builder_Profiles b ON j.builder_id = b.builder_id
            WHERE j.status = 'Open'
            ORDER BY j.posted_at DESC
        `);

        res.json({
            success: true,
            jobs
        });
    } catch (error) {
        console.error("Fetch jobs error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to retrieve jobs."
        });
    }
});

router.post("/", requireRole("Builder"), async (req, res) => {
    try {
        const {
            title, description, location, skill_required,
            workers_required, daily_wage, duration_days
        } = req.body;

        if (
            typeof title !== "string" || !title.trim() ||
            typeof location !== "string" || !location.trim() ||
            typeof skill_required !== "string" || !skill_required.trim() ||
            !Number.isInteger(Number(workers_required)) ||
            Number(workers_required) <= 0 ||
            !Number.isFinite(Number(daily_wage)) ||
            Number(daily_wage) < 0 ||
            !Number.isInteger(Number(duration_days)) ||
            Number(duration_days) <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide valid job details."
            });
        }

        const [profiles] = await pool.execute(
            "SELECT builder_id FROM Builder_Profiles WHERE user_id = ?",
            [req.session.user.userId]
        );

        if (profiles.length === 0) {
            return res.status(403).json({
                success: false,
                message: "Builder profile not found."
            });
        }

        const [result] = await pool.execute(
            `INSERT INTO Jobs
            (builder_id, title, description, location, skill_required,
             workers_required, daily_wage, duration_days)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                profiles[0].builder_id,
                title.trim(),
                description || null,
                location.trim(),
                skill_required.trim(),
                Number(workers_required),
                Number(daily_wage),
                Number(duration_days)
            ]
        );

        res.status(201).json({
            success: true,
            message: "Job posted successfully.",
            jobId: result.insertId
        });
    } catch (error) {
        console.error("Post job error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to post job."
        });
    }
});

router.get("/mine", requireRole("Builder"), async (req, res) => {
    try {
        const [jobs] = await pool.execute(
            `SELECT j.*
             FROM Jobs j
             JOIN Builder_Profiles b ON j.builder_id = b.builder_id
             WHERE b.user_id = ?
             ORDER BY j.posted_at DESC`,
            [req.session.user.userId]
        );

        res.json({
            success: true,
            jobs
        });
    } catch (error) {
        console.error("Fetch builder jobs error:", error.message);
        res.status(500).json({
            success: false,
            message: "Unable to retrieve your jobs."
        });
    }
});

module.exports = router;