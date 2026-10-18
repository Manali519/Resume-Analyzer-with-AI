"""Similar-job recommender served by the ML service, using the profiles built by ML/training/.

The resume's skills are mapped onto the dataset vocabulary first, by name or alias and by JobBERT
embedding similarity, so "PyTorch" or "React" count towards Machine Learning or JavaScript.
"""

import json
import logging
from collections.abc import Iterable

from ..config import ARTIFACTS_DIR, MAX_SCORE, PROFILES_FILE, RECOMMEND_TOP_N, ROLE_BANDS, VOCAB_MATCH_THRESHOLD
from ..models import Embedder
from .ranking import TitleRanker
from .skillset import phrases_for, skills_in_text

log = logging.getLogger(__name__)


def _percent(ratio: float) -> int:
    return min(MAX_SCORE, round(max(0.0, min(1.0, float(ratio))) * 100))


def _band(score: int) -> tuple[str, str]:
    return next((key, label) for floor, key, label in ROLE_BANDS if score >= floor)


class JobRecommender:
    def __init__(self, profiles: dict, embedder: Embedder):
        self.ranker = TitleRanker(profiles)
        self.vocabulary: dict[str, str] = profiles["vocabulary"]
        self.embedder = embedder

        # Every way a vocabulary skill is written, embedded once, to place free-form resume skills
        self.phrase_keys = [key for key in self.vocabulary for _ in phrases_for(key)]
        self.phrase_vectors = embedder.encode([p for key in self.vocabulary for p in phrases_for(key)])

    @classmethod
    def load(cls, embedder: Embedder) -> "JobRecommender | None":
        """None when the profiles are missing, so resumes are still scored before training."""
        path = ARTIFACTS_DIR / PROFILES_FILE
        if not path.exists():
            log.warning("Similar jobs disabled: %s not found. Run the training steps in ML/README.md.", path)
            return None
        return cls(json.loads(path.read_text(encoding="utf-8")), embedder)

    def _names(self, keys: Iterable[str]) -> list[str]:
        return [self.vocabulary[k] for k in keys]

    def _resume_skills(self, resume_text: str, extracted: list[str]) -> list[str]:
        """Vocabulary skills shown by the resume: named in the text, or close to a JobBERT-extracted skill."""
        found = skills_in_text(resume_text, self.vocabulary)
        if extracted:
            similarity = self.embedder.encode(extracted) @ self.phrase_vectors.T
            found += [self.phrase_keys[int(row.argmax())] for row in similarity if row.max() >= VOCAB_MATCH_THRESHOLD]
        return list(dict.fromkeys(found))

    def _card(self, i: int, user: set[str], scores: dict) -> dict:
        core = self.ranker.core_skills(i)
        score = _percent(scores["score"][i])
        band, band_label = _band(score)
        return {
            "title": self.ranker.titles[i],
            "skills": self._names(core),
            "matched": self._names(k for k in core if k in user),
            "missing": self._names(k for k in core if k not in user),
            "similarity": _percent(scores["similarity"][i]),
            "coverage": _percent(scores["coverage"][i]),
            "score": score,
            "band": band,
            "bandLabel": band_label,
            "postings": int(self.ranker.postings[i]),
        }

    def for_resume(self, resume_text: str, extracted: list[str]) -> dict:
        """The resume's dataset skills and the top job titles for them, best first."""
        skills = self._resume_skills(resume_text, extracted)
        if not skills:
            return {"skills": [], "jobs": []}
        user = set(skills)
        order, scores = self.ranker.rank(user)
        return {
            "skills": self._names(skills),
            "jobs": [self._card(int(i), user, scores) for i in order[:RECOMMEND_TOP_N]],
        }
