const mongoose = require("mongoose");

const contactMessageSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 100 },
        email: { type: String, required: true, lowercase: true, trim: true, maxlength: 200 },
        message: { type: String, required: true, trim: true, maxlength: 2000 }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("ContactMessage", contactMessageSchema);
