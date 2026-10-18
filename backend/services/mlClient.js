const ML_URL = process.env.ML_URL || "http://localhost:8000";
const TIMEOUT_MS = Number(process.env.ML_TIMEOUT_MS) || 120000;

const fail = (status, message) => Object.assign(new Error(message), { status });

// Scores a resume against a job description; the result also lists the top similar jobs
exports.analyze = async (resumeText, jobText) => {
    let res;
    try {
        res = await fetch(`${ML_URL}/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resumeText, jobText }),
            signal: AbortSignal.timeout(TIMEOUT_MS)
        });
    } catch {
        throw fail(503, "The analysis service is not available. Please try again shortly.");
    }

    if (res.ok) return res.json();
    if (res.status === 422) throw fail(400, "Resume and job description must each be between 30 and 50,000 characters.");
    if (res.status === 503) throw fail(503, "The analysis service is still starting. Please try again shortly.");
    throw fail(502, "The analysis service failed.");
};
