const User = require("../models/user");
const { verifyToken } = require("../utils/token");

exports.protect = async (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: "Authentication required." });
    }

    try {
        const { id } = verifyToken(token);
        const user = await User.findById(id);
        if (!user) {
            return res.status(401).json({ error: "Account no longer exists." });
        }
        req.user = user;
        next();
    } catch {
        res.status(401).json({ error: "Invalid or expired token." });
    }
};
