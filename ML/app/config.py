"""Model names, scoring weights and thresholds."""

import os
from pathlib import Path

ML_DIR = Path(__file__).resolve().parent.parent

SKILL_MODEL = "jjzha/jobbert_skill_extraction"
KNOWLEDGE_MODEL = "jjzha/jobbert_knowledge_extraction"
EMBEDDING_MODEL = "TechWolf/JobBERT-v2"

# Score weights, as shown on the "How Your Score Is Calculated" page
WEIGHTS = {
    "skills": 0.40,
    "projects": 0.20,
    "experience": 0.20,
    "additional": 0.15,
    "education": 0.05,
}

# A job skill counts as covered when a resume skill is at least this similar
SKILL_MATCH_THRESHOLD = 0.72

# Raw cosine similarity between a section and the job is rescaled from this
# range onto 0..1 before it is used in a score
SIMILARITY_FLOOR = 0.25
SIMILARITY_CEILING = 0.75

# Words per chunk when embedding long text (JobBERT-v2 reads ~64 tokens)
CHUNK_WORDS = 45

# No result is ever shown as a perfect match; every percentage is capped here
MAX_SCORE = 95

VERDICTS = [(75, "Excellent match"), (55, "Good match"), (35, "Partial match"), (0, "Low match")]

# Job recommender: dataset of user/job skill pairs with job titles, built by ML/training/
JOB_DATASET = Path(os.environ.get("JOB_DATASET", ML_DIR.parent / "Job Dataset.csv"))
ARTIFACTS_DIR = Path(os.environ.get("ARTIFACTS_DIR", ML_DIR / "artifacts"))
PROFILES_FILE = "job_profiles.json"

# Preprocessing: a skill seen fewer times is a typo (fixed when close to a known skill) or dropped;
# a title with fewer postings is dropped as unreliable
MIN_SKILL_COUNT = 5
TYPO_CUTOFF = 0.85
MIN_TITLE_POSTINGS = 20

# Ranking: a title's skill shares are shrunk towards the overall share as if it had this many
# extra average postings; a skill asked for by at least this share of postings is a core skill
PRIOR_STRENGTH = 10
CORE_SKILL_SHARE = 0.5

# Final role score = IDF-weighted cosine similarity and weighted skill coverage
RECOMMEND_WEIGHTS = {"similarity": 0.5, "coverage": 0.5}
# Similar jobs shown below the score
RECOMMEND_TOP_N = 3

# A JobBERT-extracted resume skill maps onto a dataset skill at this similarity or above
VOCAB_MATCH_THRESHOLD = 0.80

# > 70 strong, 40-70 moderate, below weak
ROLE_BANDS = [(70, "strong", "Strong match"), (40, "moderate", "Moderate match"), (0, "weak", "Weak match")]
