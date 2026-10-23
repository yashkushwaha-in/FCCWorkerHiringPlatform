const express = require("express");
const router = express.Router();
const db = require("../config/db");

function requireWorker(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: "Please log in to apply for jobs."
        });
    }

    if (req.session.user.role !== "Worker") {
        return res.status(403).json({
            success: false,
            message: "Only workers can apply for jobs."
        });
    }

    next();
}

router.post("/", requireWorker, async (req, res) => {
    try {
        const jobId = Number(req.body.job_id);
        const userId = req.session.user.userId;

        if (!Number.isInteger(jobId) || jobId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid job ID."
            });
        }

        const [workers] = await db.execute(
            "SELECT worker_id FROM Worker_Profiles WHERE user_id = ?",
            [userId]
        );

        if (workers.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Complete your worker profile before applying."
            });
        }

        const workerId = workers[0].worker_id;

        const [jobs] = await db.execute(
            "SELECT job_id FROM Jobs WHERE job_id = ? AND status = 'Open'",
            [jobId]
        );

        if (jobs.length === 0) {
            return res.status(404).json({
                success: false,
                message: "This job is not available."
            });
        }

        await db.execute(
            "INSERT INTO Applications (job_id, worker_id, status) VALUES (?, ?, 'Pending')",
            [jobId, workerId]
        );

        return res.status(201).json({
            success: true,
            message: "Application submitted successfully."
        });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "You have already applied for this job."
            });
        }

        console.error("Application submission error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to submit your application."
        });
    }
});

router.get("/mine", async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({
                success: false,
                message: "Please log in to view your applications."
            });
        }

        const user = req.session.user;

        if (user.role === "Worker") {
            const [rows] = await db.execute(
                `SELECT a.application_id, a.job_id, a.status, a.applied_at,
                        j.title, j.location, j.skill_required, j.daily_wage,
                        u.name AS builder_name
                 FROM Applications a
                 JOIN Worker_Profiles w ON a.worker_id = w.worker_id
                 JOIN Jobs j ON a.job_id = j.job_id
                 JOIN Builder_Profiles b ON j.builder_id = b.builder_id
                 JOIN Users u ON b.user_id = u.user_id
                 WHERE w.user_id = ?
                 ORDER BY a.applied_at DESC`,
                [user.userId]
            );

            return res.json({ success: true, applications: rows });
        }

        if (user.role === "Builder") {
            const [rows] = await db.execute(
                `SELECT a.application_id, a.job_id, a.status, a.applied_at,
                        j.title, w.worker_id, u.name AS worker_name,
                        u.phone, w.skill, w.experience_years
                 FROM Applications a
                 JOIN Worker_Profiles w ON a.worker_id = w.worker_id
                 JOIN Users u ON w.user_id = u.user_id
                 JOIN Jobs j ON a.job_id = j.job_id
                 JOIN Builder_Profiles b ON j.builder_id = b.builder_id
                 WHERE b.user_id = ?
                 ORDER BY a.applied_at DESC`,
                [user.userId]
            );

            return res.json({ success: true, applications: rows });
        }

        return res.status(403).json({
            success: false,
            message: "Access denied."
        });
    } catch (error) {
        console.error("Load applications error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load applications."
        });
    }
});
router.patch("/:applicationId/status", async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({
                success: false,
                message: "Please log in."
            });
        }

        if (req.session.user.role !== "Builder") {
            return res.status(403).json({
                success: false,
                message: "Only builders can update application status."
            });
        }

        const applicationId = Number(req.params.applicationId);
        const { status } = req.body;

        if (!Number.isInteger(applicationId) || applicationId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid application ID."
            });
        }

        if (!["Accepted", "Rejected"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be Accepted or Rejected."
            });
        }

        const [result] = await db.execute(
            `UPDATE Applications a
             JOIN Jobs j ON a.job_id = j.job_id
             JOIN Builder_Profiles b ON j.builder_id = b.builder_id
             SET a.status = ?
             WHERE a.application_id = ? AND b.user_id = ?`,
            [status, applicationId, req.session.user.userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Application not found for your jobs."
            });
        }

        return res.json({
            success: true,
            message: `Application ${status.toLowerCase()} successfully.`,
            status
        });
    } catch (error) {
        console.error("Update application status error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update application status."
        });
    }
});

module.exports = router;
