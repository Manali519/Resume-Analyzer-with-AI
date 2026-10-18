const User = require("../models/user");
const { signToken } = require("../utils/token");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sendSession = (res, status, user) =>
    res.status(status).json({ token: signToken(user._id), user: user.toPublic() });

// POST /api/auth/register
exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body || {};

        if (![name, email, password].every((v) => typeof v === "string" && v.trim())) {
            return res.status(400).json({ error: "Name, email and password are required." });
        }
        if (!EMAIL_RE.test(email.trim())) {
            return res.status(400).json({ error: "Please provide a valid email address." });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters." });
        }
        if (await User.exists({ email: email.trim().toLowerCase() })) {
            return res.status(409).json({ error: "This email is already registered." });
        }

        const user = await User.create({ name, email, password });
        sendSession(res, 201, user);
    } catch (error) {
        console.error("Registration failed:", error.message);
        res.status(500).json({ error: "Could not create your account. Please try again later." });
    }
};

// POST /api/auth/login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body || {};

        if (typeof email !== "string" || typeof password !== "string") {
            return res.status(400).json({ error: "Email and password are required." });
        }

        const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        sendSession(res, 200, user);
    } catch (error) {
        console.error("Login failed:", error.message);
        res.status(500).json({ error: "Could not log you in. Please try again later." });
    }
};

// GET /api/auth/me
exports.me = (req, res) => {
    res.json({ user: req.user.toPublic() });
};
