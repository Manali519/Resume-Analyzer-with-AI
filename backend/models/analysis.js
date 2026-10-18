const mongoose = require("mongoose");

const percent = { type: Number, min: 0, max: 100, default: 0 };
const strings = { type: [String], default: [] };

// A job role from the dataset that the resume also fits
const similarJobSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        skills: strings,
        matched: strings,
        missing: strings,
        similarity: percent,
        coverage: percent,
        score: percent,
        band: { type: String, enum: ["strong", "moderate", "weak"] },
        bandLabel: String
    },
    { _id: false }
);

const analysisSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        resumeId: { type: mongoose.Schema.Types.ObjectId, ref: "Resume", required: true },
        jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
        scores: {
            overall: percent,
            skills: percent,
            projects: percent,
            experience: percent,
            additional: percent,
            education: percent
        },
        verdict: { type: String, required: true },
        matchedSkills: strings,
        missingSkills: strings,
        traits: strings,
        tips: strings,
        steps: strings,
        datasetSkills: strings,
        similarJobs: { type: [similarJobSchema], default: [] }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Analysis", analysisSchema);
