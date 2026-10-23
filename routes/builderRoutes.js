const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.get("/profile", async (req, res) => {
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
                message: "Only builders can access this profile."
            });
        }

        const [rows] = await db.execute(
            `SELECT u.user_id, u.name, u.email, u.phone,
                    b.builder_id, b.company_name, b.work_area
             FROM Users u
             LEFT JOIN Builder_Profiles b ON u.user_id = b.user_id
             WHERE u.user_id = ?`,
            [req.session.user.userId]
        );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: "Builder profile not found."
            });
        }

        return res.json({
            success: true,
            profile: rows[0]
        });
    } catch (error) {
        console.error("Builder profile error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load builder profile."
        });
    }
});

module.exports = router;