const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
        fileName: { type: String, maxlength: 255 },
        fileType: { type: String, default: "text/plain" },
        description: { type: String, required: true }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Job", jobSchema);
