"""HTTP service used by the Node backend."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from .jobs.recommender import JobRecommender
from .models import get_embedder, get_extractor
from .scoring import Analyzer

# Longest resume or job description accepted, in characters (about 15 pages of text)
MAX_TEXT = 50_000

state: dict = {}


@asynccontextmanager
async def lifespan(_: FastAPI):
    state["analyzer"] = Analyzer(get_extractor(), get_embedder())
    state["recommender"] = JobRecommender.load(get_embedder())
    yield
    state.clear()


app = FastAPI(title="Resume Analyzer ML", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)


class AnalyzeRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    resume_text: str = Field(alias="resumeText", min_length=30, max_length=MAX_TEXT)
    job_text: str = Field(alias="jobText", min_length=30, max_length=MAX_TEXT)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "modelsLoaded": "analyzer" in state,
        "recommenderLoaded": state.get("recommender") is not None,
    }


@app.post("/analyze")
def analyze(body: AnalyzeRequest):
    analyzer = state.get("analyzer")
    if analyzer is None:
        raise HTTPException(status_code=503, detail="Models are still loading.")

    result = analyzer.analyze(body.resume_text, body.job_text)
    recommender = state.get("recommender")
    similar = (
        recommender.for_resume(body.resume_text, result["extracted"]["resumeSkills"])
        if recommender else {"skills": [], "jobs": []}
    )
    return {**result, "similarJobs": similar["jobs"], "datasetSkills": similar["skills"]}
