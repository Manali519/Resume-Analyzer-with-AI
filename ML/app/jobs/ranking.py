"""Content-based ranking of job titles against a set of skills.

Each title gets a skill profile learned from its postings: the share of postings that ask for each
skill, shrunk towards the overall share when a title has few postings. Skills are weighted by
inverse title frequency, so a skill that every role asks for counts less than a distinctive one.

    similarity = cosine(user skills, title profile), both IDF-weighted
    coverage   = share of a typical posting's requirements the user already has
    score      = w_sim * similarity + w_cov * coverage
"""

import numpy as np

from ..config import CORE_SKILL_SHARE, RECOMMEND_WEIGHTS


class TitleRanker:
    def __init__(self, profiles: dict):
        self.skills = profiles["skills"]
        self.index = {s: i for i, s in enumerate(self.skills)}
        self.titles = [t["title"] for t in profiles["titles"]]
        self.postings = np.array([t["postings"] for t in profiles["titles"]])
        self.share = np.array([[t["share"].get(s, 0.0) for s in self.skills] for t in profiles["titles"]])
        self.idf = np.array(profiles["idf"])

        weighted = self.share * self.idf
        self.vectors = weighted / np.linalg.norm(weighted, axis=1, keepdims=True).clip(min=1e-12)

    def core_skills(self, row: int) -> list[str]:
        """Skills most postings of the title ask for; the top three when none reach the threshold."""
        order = np.argsort(-self.share[row])
        core = [self.skills[j] for j in order if self.share[row, j] >= CORE_SKILL_SHARE]
        return core or [self.skills[j] for j in order[:3]]

    def score(self, user: set[str]) -> dict[str, np.ndarray]:
        """Similarity, coverage and final score of every title for the given skill keys."""
        have = np.zeros(len(self.skills))
        have[[self.index[s] for s in user if s in self.index]] = 1.0
        if not have.any():
            zeros = np.zeros(len(self.titles))
            return {"similarity": zeros, "coverage": zeros, "score": zeros}

        query = have * self.idf
        similarity = self.vectors @ (query / np.linalg.norm(query))
        coverage = (self.share @ have) / self.share.sum(axis=1)
        score = RECOMMEND_WEIGHTS["similarity"] * similarity + RECOMMEND_WEIGHTS["coverage"] * coverage
        return {"similarity": similarity, "coverage": coverage, "score": score}

    def rank(self, user: set[str]) -> tuple[np.ndarray, dict[str, np.ndarray]]:
        """Title indices best first (more postings breaks ties) and the scores they were ranked by."""
        scores = self.score(user)
        return np.lexsort((-self.postings, -scores["score"])), scores
