
const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.get("/profile", async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: "Please log in." });
        }

        if (req.session.user.role !== "Worker") {
            return res.status(403).json({ success: false, message: "Only workers can access this profile." });
        }

        const [rows] = await db.execute(
            `SELECT u.user_id, u.name, u.email, u.phone,
                    w.worker_id, w.skill, w.experience_years,
                    w.preferred_area, w.expected_daily_wage, w.availability
             FROM Users u
             LEFT JOIN Worker_Profiles w ON u.user_id = w.user_id
             WHERE u.user_id = ?`,
            [req.session.user.userId]
        );

        if (!rows.length) {
            return res.status(404).json({ success: false, message: "Worker profile not found." });
        }

        return res.json({ success: true, profile: rows[0] });
    } catch (error) {
        console.error("Worker profile error:", error);
        return res.status(500).json({ success: false, message: "Unable to load worker profile." });
    }
});

router.put("/profile", async (req, res) => {
    const user = req.session.user;

    if (!user) {
        return res.status(401).json({ success: false, message: "Please log in." });
    }

    if (user.role !== "Worker") {
        return res.status(403).json({ success: false, message: "Only workers can edit this profile." });
    }

    const {
        name,
        phone,
        skill,
        experience_years,
        preferred_area,
        expected_daily_wage,
        availability
    } = req.body;

    const experience = Number(experience_years);
    const wage = Number(expected_daily_wage);

    if (
        !name?.trim() ||
        !phone?.trim() ||
        !skill?.trim() ||
        !preferred_area?.trim() ||
        !Number.isInteger(experience) ||
        experience < 0 ||
        !Number.isFinite(wage) ||
        wage < 0 ||
        !["Available", "Unavailable"].includes(availability)
    ) {
        return res.status(400).json({
            success: false,
            message: "Please provide valid profile details."
        });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        await connection.execute(
            "UPDATE Users SET name = ?, phone = ? WHERE user_id = ?",
            [name.trim(), phone.trim(), user.userId]
        );

        const [result] = await connection.execute(
            `UPDATE Worker_Profiles
             SET skill = ?, experience_years = ?, preferred_area = ?,
                 expected_daily_wage = ?, availability = ?
             WHERE user_id = ?`,
            [
                skill.trim(),
                experience,
                preferred_area.trim(),
                wage,
                availability,
                user.userId
            ]
        );

        if (result.affectedRows === 0) {
            const [profiles] = await connection.execute(
                "SELECT worker_id FROM Worker_Profiles WHERE user_id = ?",
                [user.userId]
            );

            if (!profiles.length) {
                await connection.rollback();
                return res.status(404).json({
                    success: false,
                    message: "Worker profile not found."
                });
            }
        }

        await connection.commit();

        return res.json({
            success: true,
            message: "Worker profile updated successfully."
        });
    } catch (error) {
        await connection.rollback();
        console.error("Worker profile update error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to update worker profile."
        });
    } finally {
        connection.release();
    }
});

module.exports = router;
