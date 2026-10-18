"""Skill normalisation shared by preprocessing and serving. The vocabulary itself is learned from the dataset."""

import re

from ..sections import has_phrase

# Written forms of a skill; frameworks count towards their language. Keys are lowercase skill names.
ALIASES = {
    "python": ["python", "django", "flask", "fastapi", "pandas", "numpy"],
    "sql": ["sql", "mysql", "postgresql", "postgres", "sqlite", "sql server", "pl/sql", "t-sql", "oracle database"],
    "java": ["java", "spring boot", "spring framework", "hibernate", "j2ee"],
    "javascript": ["javascript", "js", "typescript", "react", "react.js", "node.js", "nodejs", "angular", "vue", "express.js", "expressjs"],
    "html": ["html", "html5"],
    "css": ["css", "css3", "tailwind", "bootstrap", "sass"],
    "c++": ["c++", "cpp"],
    "machine learning": ["machine learning", "ml", "deep learning", "scikit-learn", "sklearn", "tensorflow", "pytorch", "keras"],
    "ai": ["ai", "artificial intelligence", "nlp", "natural language processing", "computer vision", "llm", "generative ai"],
    "data science": ["data science", "data scientist", "data analysis", "data analytics", "statistics", "data visualization"],
}
_ALIAS_TO_KEY = {phrase: key for key, phrases in ALIASES.items() for phrase in phrases}

# Cell values that mean "unknown" rather than a real skill or title
PLACEHOLDERS = {"", "nan", "none", "null", "n/a", "na", "-", "--", "?", "unknown", "tbd", "not specified"}

MAX_SKILL_CHARS = 40


def clean_text(value) -> str:
    """Trimmed, single-spaced text; "" for missing or placeholder values."""
    text = re.sub(r"\s+", " ", str(value if value is not None else "")).strip(" \t\"';:|")
    return "" if text.lower() in PLACEHOLDERS else text


def skill_key(raw) -> str | None:
    """One written skill to its lowercase key ("ML " -> "machine learning"); None when it is not a skill."""
    text = clean_text(raw).lower()
    if not text or len(text) > MAX_SKILL_CHARS or not re.search(r"[a-z]", text):
        return None
    return _ALIAS_TO_KEY.get(text, text)


def split_skills(value) -> list[str]:
    """A comma/semicolon/pipe separated cell to skill keys, in order, without duplicates."""
    keys = (skill_key(part) for part in re.split(r"[,;|]", clean_text(value)))
    return list(dict.fromkeys(k for k in keys if k))


def phrases_for(key: str) -> list[str]:
    return ALIASES.get(key, [key])


def skills_in_text(text: str, vocabulary) -> list[str]:
    """Vocabulary skills named anywhere in free text, by the skill itself or one of its aliases."""
    return [key for key in vocabulary if any(has_phrase(text, p) for p in phrases_for(key))]
