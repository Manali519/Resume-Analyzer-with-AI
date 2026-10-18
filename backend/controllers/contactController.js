const ContactMessage = require("../models/contactMessage");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/contact - stores a message from the Contact Us form
exports.submitContactMessage = async (req, res) => {
    try {
        const { name, email, message } = req.body || {};

        if (![name, email, message].every((v) => typeof v === "string" && v.trim())) {
            return res.status(400).json({ error: "Name, email and message are required." });
        }
        if (!EMAIL_RE.test(email.trim())) {
            return res.status(400).json({ error: "Please provide a valid email address." });
        }

        const saved = await ContactMessage.create({ name, email, message });
        res.status(201).json({ success: true, id: saved._id });
    } catch (error) {
        if (error.name === "ValidationError") {
            return res.status(400).json({ error: error.message });
        }
        console.error("Failed to save contact message:", error.message);
        res.status(500).json({ error: "Could not save your message. Please try again later." });
    }
};
