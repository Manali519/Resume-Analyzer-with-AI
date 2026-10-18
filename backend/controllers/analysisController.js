const Analysis = require("../models/analysis");
const Resume = require("../models/resume");
const Job = require("../models/jobs");
const ml = require("../services/mlClient");

const isText = (v) => typeof v === "string" && v.trim().length > 0;

const fileTypeOf = (name) => (/\.pdf$/i.test(name || "") ? "application/pdf" : "text/plain");

const toDto = (a) => ({
    id: a._id,
    createdAt: a.createdAt,
    jobName: a.jobId?.fileName,
    jobType: a.jobId?.fileType,
    resumeName: a.resumeId?.fileName,
    resumeType: a.resumeId?.fileType,
    total: a.scores.overall,
    parts: {
        skills: a.scores.skills,
        projects: a.scores.projects,
        experience: a.scores.experience,
        additional: a.scores.additional,
        education: a.scores.education
    },
    verdict: a.verdict,
    matched: a.matchedSkills,
    missing: a.missingSkills,
    traits: a.traits,
    tips: a.tips,
    steps: a.steps || [],
    datasetSkills: a.datasetSkills || [],
    similarJobs: (a.similarJobs || []).map((j) => (j.toObject ? j.toObject() : j))
});

const populated = (query) => query.populate("resumeId", "fileName fileType").populate("jobId", "fileName fileType");

const readInput = (body = {}) => {
    const { resumeText, jobText } = body;
    if (!isText(resumeText) || !isText(jobText)) {
        const error = new Error("Resume and job description are required.");
        error.status = 400;
        throw error;
    }
    return body;
};

// POST /api/analyses/preview - scores without saving, open to guests
exports.previewAnalysis = async (req, res) => {
    const { resumeText, jobText } = readInput(req.body);
    res.json({ analysis: await ml.analyze(resumeText, jobText) });
};

// POST /api/analyses - scores, then stores the resume, job and result
exports.createAnalysis = async (req, res) => {
    const { resumeText, jobText, resumeName, jobName } = readInput(req.body);
    const result = await ml.analyze(resumeText, jobText);

    const userId = req.user._id;
    const resumeFile = isText(resumeName) ? resumeName.trim() : "Pasted resume";
    const jobFile = isText(jobName) ? jobName.trim() : "Pasted job description";

    const [resume, job] = await Promise.all([
        Resume.create({ userId, fileName: resumeFile, fileType: fileTypeOf(resumeFile), rawText: resumeText }),
        Job.create({ userId, fileName: jobFile, fileType: fileTypeOf(jobFile), description: jobText })
    ]);

    const analysis = await Analysis.create({
        userId,
        resumeId: resume._id,
        jobId: job._id,
        scores: { overall: result.total, ...result.parts },
        verdict: result.verdict,
        matchedSkills: result.matched,
        missingSkills: result.missing,
        traits: result.traits,
        tips: result.tips,
        steps: result.steps || [],
        datasetSkills: result.datasetSkills || [],
        similarJobs: result.similarJobs || []
    });

    res.status(201).json({ analysis: toDto(await populated(Analysis.findById(analysis._id))) });
};

// GET /api/analyses - the signed-in user's history, newest first
exports.listAnalyses = async (req, res) => {
    const items = await populated(Analysis.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50));
    res.json({ analyses: items.map(toDto) });
};

// DELETE /api/analyses/:id - owner only
exports.deleteAnalysis = async (req, res) => {
    const analysis = await Analysis.findById(req.params.id).catch(() => null);
    if (!analysis || !analysis.userId.equals(req.user._id)) {
        return res.status(404).json({ error: "Analysis not found." });
    }
    await Promise.all([
        analysis.deleteOne(),
        Resume.deleteOne({ _id: analysis.resumeId }),
        Job.deleteOne({ _id: analysis.jobId })
    ]);
    res.status(204).end();
};
