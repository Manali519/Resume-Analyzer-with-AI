const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        fileName: { type: String, required: true, maxlength: 255 },
        fileType: { type: String, default: "application/pdf" },
        rawText: { type: String, required: true }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Resume", resumeSchema);
