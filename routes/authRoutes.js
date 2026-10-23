const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../config/db");

const router = express.Router();

router.post("/register", async (req, res) => {
    let connection;

    try {
        connection = await pool.getConnection();
        const {
            name, email, phone, password, role,
            skill, experience_years, preferred_area, expected_daily_wage,
            company_name, work_area
        } = req.body;

        if (!name || !email || !phone || !password || !role) {
            return res.status(400).json({
                success: false,
                message: "Name, email, phone, password and role are required."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 8 characters."
            });
        }

        if (!["Worker", "Builder"].includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Role must be Worker or Builder."
            });
        }

        if (role === "Worker" &&
            (!skill || !preferred_area || experience_years === undefined ||
            expected_daily_wage === undefined ||
            !Number.isInteger(Number(experience_years)) ||
            Number(experience_years) < 0 ||
            !Number.isFinite(Number(expected_daily_wage)) ||
            Number(expected_daily_wage) < 0)) {
            return res.status(400).json({
                success: false,
                message: "Valid worker profile details are required."
            });
        }

        if (role === "Builder" && (!company_name || !work_area)) {
            return res.status(400).json({
                success: false,
                message: "Company name and work area are required."
            });
        }

        const [existing] = await connection.execute(
            "SELECT user_id FROM Users WHERE email = ? OR phone = ?",
            [email.trim(), phone.trim()]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Email or phone number is already registered."
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        await connection.beginTransaction();

        const [userResult] = await connection.execute(
            "INSERT INTO Users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)",
            [name.trim(), email.trim().toLowerCase(), phone.trim(), passwordHash, role]
        );

        if (role === "Worker") {
            await connection.execute(
                `INSERT INTO Worker_Profiles
                (user_id, skill, experience_years, preferred_area, expected_daily_wage)
                VALUES (?, ?, ?, ?, ?)`,
                [
                    userResult.insertId,
                    skill.trim(),
                    Number(experience_years),
                    preferred_area.trim(),
                    Number(expected_daily_wage)
                ]
            );
        } else {
            await connection.execute(
                "INSERT INTO Builder_Profiles (user_id, company_name, work_area) VALUES (?, ?, ?)",
                [userResult.insertId, company_name.trim(), work_area.trim()]
            );
        }

        await connection.commit();

        res.status(201).json({
            success: true,
            message: "Registration successful.",
            userId: userResult.insertId,
            role
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Email or phone number is already registered."
            });
        }

        console.error("Registration error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Registration failed due to a server error."
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const [users] = await pool.execute(
            "SELECT user_id, name, email, password_hash, role FROM Users WHERE email = ?",
            [email.trim().toLowerCase()]
        );

        if (users.length === 0 ||
            !(await bcrypt.compare(password, users[0].password_hash))) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const user = users[0];

        req.session.user = {
            userId: user.user_id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        res.json({
            success: true,
            message: "Login successful.",
            user: req.session.user
        });
    } catch (error) {
        console.error("Login error:", error.message);
        res.status(500).json({
            success: false,
            message: "Login failed due to a server error."
        });
    }
});

router.post("/logout", (req, res) => {
    if (!req.session) {
        return res.json({ success: true, message: "Logged out." });
    }

    req.session.destroy((error) => {
        if (error) {
            return res.status(500).json({
                success: false,
                message: "Logout failed."
            });
        }

        res.clearCookie("connect.sid");
        res.json({ success: true, message: "Logged out successfully." });
    });
});

module.exports = router;