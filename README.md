# Know Your Career

A resume analyzer that scores a resume against a job description using semantic analysis and not just keyword matching , explains where the score comes from, and suggests other job roles the resume already fits.

## Objective

Applicants rarely know how closely their resume matches a posting or what to change before applying. This project reads both documents, extracts skills with job-domain language models, and returns a match score broken down by area, along with the specific edits that would raise it.

### Key features

- **Resume vs. job scoring**: a 0–95 match score with a verdict (Excellent, Good, Partial, Low match). The score never reaches 100, so no result reads as a guaranteed fit.
- **Area breakdown**: separate scores for Skills (40%), Projects (20%), Experience (20%), Additional traits (15%) and Education (5%).
- **Matched and missing skills**: skills are compared by meaning as well as by name, so "PyTorch" can cover "deep learning".
- **Resume edits**: short tips plus a full list of concrete changes (skills to add, projects to rewrite, dates to make explicit).
- **Similar jobs**: the top 3 job titles from the dataset that suit the resume, each with core skills, matched and missing skills, and a strong / moderate / weak band.
- **PDF and text input**: PDFs are read in the browser with pdf.js, keeping line and paragraph breaks so sections and projects can be told apart.
- **Accounts and history**: guests can run a scan without saving. Signed-in users get a dashboard with a score trend, skill gaps, next steps, and a history of past scans they can delete.
- **Contact form**: messages are stored in MongoDB.

## Architecture

```
React (Vite)  ──/api──▶  Node / Express  ──HTTP──▶  Python / FastAPI (ML service)
                              │
                           MongoDB
```

- The **frontend** extracts text from the uploaded files and calls the backend.
- The **backend** handles authentication, rate limiting and storage, and forwards scan requests to the ML service.
- The **ML service** loads the models once at startup and serves a single `/analyze` endpoint.

## Models

All three models are pretrained and come from Hugging Face. They download the first time the ML service starts (about 1.5 GB in total) and load from the local cache after that.

| Purpose | Model | How it is used |
|---|---|---|
| Skill extraction | [`jjzha/jobbert_skill_extraction`](https://huggingface.co/jjzha/jobbert_skill_extraction) | Token classifier (B/I/O tags) that marks skill phrases such as "project management" in resumes and job descriptions. |
| Knowledge extraction | [`jjzha/jobbert_knowledge_extraction`](https://huggingface.co/jjzha/jobbert_knowledge_extraction) | Same approach, tuned for knowledge terms such as tools, languages and frameworks. Its output is merged with the skill tagger's. |
| Semantic embeddings | [`TechWolf/JobBERT-v2`](https://huggingface.co/TechWolf/JobBERT-v2) | Sentence-transformer trained on job titles and skills. Used to match skills by meaning and to measure how close each resume section is to the job. |

### Scoring

1. The resume is split into sections (Skills, Projects, Experience, Education, Additional) with rule-based heading detection in `sections.py`.
2. Skills are extracted from both documents. A job skill counts as covered when the resume names it directly or a resume skill has cosine similarity ≥ 0.72 with it.
3. Long text is embedded in 45-word chunks and averaged, since JobBERT-v2 reads only about 64 tokens at a time. Raw similarity is rescaled from the 0.25–0.75 range onto 0–1.
4. Each area is scored:
   - **Skills**: 75% skill coverage + 25% similarity of the skills section to the job
   - **Projects**: 50% best project similarity + 50% job skills shown inside projects
   - **Experience**: 60% similarity + 40% years held versus years required
   - **Additional**: 60% soft traits the job asks for + 40% number of traits shown
   - **Education**: degree level held versus degree level required
5. The final score is the weighted sum, capped at 95.

Weights and thresholds are set in [ML/app/config.py](ML/app/config.py). The frontend copies the weights in [frontend/src/lib/weights.js](frontend/src/lib/weights.js), so change both together.

### Similar-jobs recommender

The recommender is trained on `Job Dataset.csv` (100,000 rows; columns `User_ID, Job_Title, User_Skills, Job_Requirements, Match_Score, Recommended`). After cleaning, it covers 13 job titles and 10 skills.

- **Preprocessing** handles placeholders, casing and alias variants ("ML" becomes "machine learning"), typos, invalid scores and labels, and duplicate rows. Every fix is counted in `artifacts/data_quality.json`.
- **Title profiles**: for each title, the share of postings that ask for each skill. Shares are smoothed towards the overall average for titles with few postings, and skills are IDF-weighted so that common skills count for less.
- **Ranking**: `0.5 × cosine similarity + 0.5 × skill coverage` between the resume's skills and each title profile.
- **Why there is no classifier**: a label audit in `train.py` showed that the `Recommended` column follows `Match_Score` alone and does not rise with skill overlap. A model trained on it would learn nothing useful about skills, so ranking uses the profiles instead.

Evaluation on a 20% held-out split, stratified by title. Each posting's skills are the query and its own title is the target.

| Metric | Value |
|---|---|
| Hit@1 | 60.1% |
| Hit@3 | 98.2% |
| MRR | 0.780 |
| Popularity baseline Hit@1 | 16.3% |

If the trained profiles are missing, the ML service still scores resumes and simply returns no similar jobs.

## Project structure

```
MDM minor project/
├── Job Dataset.csv            Training data for the recommender (not committed)
├── ML/                        Python ML service
│   ├── requirements.txt       Python dependencies
│   ├── app/
│   │   ├── main.py            FastAPI app: loads models at startup, /health and /analyze endpoints
│   │   ├── config.py          Model names, score weights, thresholds and paths
│   │   ├── models.py          JobBERT wrappers: span tagger, skill extractor, chunked embedder
│   │   ├── scoring.py         Per-area scoring, final score, verdict and resume advice
│   │   ├── sections.py        Rule-based parsing: section headings, projects, years, degree, traits
│   │   └── jobs/
│   │       ├── recommender.py Maps resume skills to the dataset vocabulary and returns top job titles
│   │       ├── ranking.py     IDF-weighted similarity and coverage ranking of job titles
│   │       └── skillset.py    Skill aliases and text cleaning shared by training and serving
│   ├── training/
│   │   ├── preprocess.py      Step 1: cleans the dataset, builds the vocabulary and data-quality report
│   │   ├── train.py           Step 2: builds title profiles, evaluates them, runs the label audit
│   │   └── profiles.py        Profile construction and Hit@k / MRR evaluation
│   └── artifacts/             Generated output: processed data, vocabulary, job_profiles.json
│
├── backend/                   Node.js / Express API
│   ├── server.js              App setup, security headers, CORS, rate limits, MongoDB connection;
│   │                          also serves the built frontend when present
│   ├── routes/
│   │   ├── authRoutes.js      /api/auth: register, login, me
│   │   └── analysisRoutes.js  /api/analyses: preview (guest), create, list, delete
│   ├── controllers/
│   │   ├── authController.js      Registration and login with validation
│   │   ├── analysisController.js  Calls the ML service and stores resume, job and result
│   │   └── contactController.js   Saves Contact Us messages
│   ├── models/                Mongoose schemas: user, resume, jobs, analysis, contactMessage
│   ├── middleware/
│   │   ├── authMiddleware.js  Verifies the JWT bearer token
│   │   └── rateLimit.js       In-memory per-IP rate limiter
│   ├── services/mlClient.js   HTTP client for the ML service with timeout and error mapping
│   └── utils/
│       ├── token.js           JWT sign / verify
│       └── asyncHandler.js    Passes async errors to the error middleware
│
└── frontend/                  React 19 + Vite
    ├── index.html
    ├── vite.config.js         Dev server; proxies /api to localhost:5000
    └── src/
        ├── main.jsx, App.jsx  Entry point and routes
        ├── pages/
        │   ├── HomePage.jsx   Landing page built from home/ (Hero, Features, How, Contact)
        │   ├── ScanPage.jsx   Upload resume and job description, view the result
        │   ├── DashboardPage.jsx  Overview of a signed-in user's scans
        │   ├── HistoryPage.jsx    List and delete past scans
        │   └── AuthPage.jsx   Login and registration
        ├── components/
        │   ├── Uploader.jsx   File (.pdf, .txt, .md) or pasted text input
        │   ├── ScoreResult.jsx    Score, verdict, area bars, skills and tips
        │   ├── SimilarJobs.jsx    Recommended job title cards
        │   ├── dashboard/     StatTiles, ScoreTrend, AreaBreakdown, SkillGaps, NextSteps, Summary
        │   ├── Header.jsx, Footer.jsx, Reveal.jsx, ProtectedRoute.jsx
        ├── layouts/           Public and dashboard page layouts
        ├── context/AuthContext.jsx  Signed-in user state
        ├── hooks/useAnalyses.js     Loads and caches the user's scans
        ├── services/api.js    Fetch wrapper for the backend API; token kept in memory only
        ├── lib/
        │   ├── pdfText.js     PDF to text, keeping line and paragraph breaks
        │   ├── weights.js     Score weights and area labels (mirror of config.py)
        │   └── bands.js       Score bands used across the UI
        └── styles.css
```

## Installation

### Prerequisites

- Python 3.11 or newer
- Node.js 20 or newer
- MongoDB (local or Atlas)
- About 2 GB of free disk space for the models

### 1. ML service

```bash
cd ML
python -m venv .venv
# Windows: .venv\Scripts\activate    macOS/Linux: source .venv/bin/activate

# Install the CPU build of PyTorch first, then the rest
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
```

Build the similar-jobs profiles. `Job Dataset.csv` must be in the project root, or you can point the `JOB_DATASET` environment variable at it.

```bash
python -m training.preprocess
python -m training.train
```

Start the service:

```bash
uvicorn app.main:app --port 8000
```

The first start downloads the three models. `GET http://localhost:8000/health` returns `"modelsLoaded": true` once they are ready.

### 2. Backend

Create `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/know-your-career
JWT_SECRET=replace-with-a-long-random-string
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
ML_URL=http://localhost:8000
```

`MONGO_URI` and `JWT_SECRET` are required. In production, `JWT_SECRET` must be at least 32 characters long.

```bash
cd backend
npm install
npm start
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server forwards `/api` requests to the backend on port 5000.

### Production build

```bash
cd frontend && npm run build
```

When `frontend/dist` exists, the backend serves it, so only the backend and the ML service need to run. Set `VITE_API_URL` at build time if the API is on a different host.

## Conclusion

Know Your Career combines job-specific language models with transparent, rule-based scoring. Users get a score with the reasoning behind it: which skills match, which are missing, and how each section of the resume contributes. The similar-jobs recommender uses the same skill extraction to point to roles a candidate may not have considered. The model choices, weights and thresholds are kept in one config file, so the scoring can be tuned or the recommender retrained on a larger dataset without changes elsewhere in the code.
