"""Builds the title profiles served by app/jobs/ranking.py, and measures how well they rank."""

import math

import numpy as np
import pandas as pd

from app.config import CORE_SKILL_SHARE, PRIOR_STRENGTH
from app.jobs.ranking import TitleRanker


def build_profiles(df: pd.DataFrame) -> dict:
    """Title profiles from cleaned rows with columns Job_Title and Job_Skills (lists of keys)."""
    skills = sorted({s for row in df["Job_Skills"] for s in row})
    index = {s: i for i, s in enumerate(skills)}
    titles = sorted(df["Job_Title"].unique())

    counts = np.zeros((len(titles), len(skills)))
    postings = df.groupby("Job_Title").size().reindex(titles).to_numpy(dtype=float)
    for row, (_, jobs) in enumerate(df.groupby("Job_Title")["Job_Skills"]):
        for job in jobs:
            counts[row, [index[s] for s in job]] += 1

    overall = counts.sum(axis=0) / postings.sum()
    share = (counts + PRIOR_STRENGTH * overall) / (postings[:, None] + PRIOR_STRENGTH)

    core_titles = (share >= CORE_SKILL_SHARE).sum(axis=0)
    idf = np.log((1 + len(titles)) / (1 + core_titles)) + 1

    return {
        "skills": skills,
        "idf": idf.round(6).tolist(),
        "titles": [
            {"title": t, "postings": int(n), "share": dict(zip(skills, share[i].round(6).tolist()))}
            for i, (t, n) in enumerate(zip(titles, postings))
        ],
    }


def evaluate(ranker: TitleRanker, rows: pd.DataFrame, k: int = 3) -> dict:
    """Uses each held-out posting's requirements as the query: is its own title ranked first / in the top k?"""
    position = {t: i for i, t in enumerate(ranker.titles)}
    hits1 = hitsk = reciprocal = 0.0
    for title, skills in zip(rows["Job_Title"], rows["Job_Skills"]):
        order, _ = ranker.rank(set(skills))
        rank = int(np.where(order == position[title])[0][0]) + 1 if title in position else math.inf
        hits1 += rank == 1
        hitsk += rank <= k
        reciprocal += 1 / rank
    n = max(len(rows), 1)
    return {"hit@1": round(hits1 / n, 4), f"hit@{k}": round(hitsk / n, 4), "mrr": round(reciprocal / n, 4)}
