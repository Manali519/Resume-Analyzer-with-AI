"""JobBERT wrappers: skill/knowledge extraction (token tagging) and semantic embeddings."""

import re
from functools import lru_cache

import numpy as np
import torch
from sentence_transformers import SentenceTransformer
from transformers import AutoModelForTokenClassification, AutoTokenizer

from .config import CHUNK_WORDS, EMBEDDING_MODEL, KNOWLEDGE_MODEL, SKILL_MODEL

MAX_SKILL_WORDS = 6
SHORT_SKILLS = {"js", "ml", "ai", "qa", "ui", "ux", "go", "r", "c", "ci/cd"}
NOT_A_SKILL = re.compile(r"degree|bachelor|master|ph\.?d|diploma", re.I)


def _is_skill(skill: str) -> bool:
    if not skill or len(skill.split()) > MAX_SKILL_WORDS or len(skill) > 40 or NOT_A_SKILL.search(skill):
        return False
    if not any(c.isalnum() for c in skill):
        return False
    return len(skill) >= 3 or skill in SHORT_SKILLS


def _load(loader, name: str, **kwargs):
    """Loads from the local Hugging Face cache; downloads only when the model is not cached yet."""
    try:
        return loader(name, local_files_only=True, **kwargs)
    except OSError:
        print(f"[INFO] {name} not in local cache, downloading from Hugging Face...")
        return loader(name, **kwargs)


class SpanTagger:
    """B/I/O tagger from the JobBERT extraction models; returns the tagged spans."""

    def __init__(self, name: str):
        self.tokenizer = _load(AutoTokenizer.from_pretrained, name)
        self.model = _load(AutoModelForTokenClassification.from_pretrained, name).eval()
        self.labels = {int(i): label for i, label in self.model.config.id2label.items()}

    def _decode(self, text, word_ids, predicted, offsets) -> list[str]:
        """Reads one label per word (its first sub-token) and joins B/I words into spans."""
        words: dict[int, list] = {}
        for token, word in enumerate(word_ids):
            if word is None:
                continue
            start, end = offsets[token]
            if word not in words:
                words[word] = [self.labels[predicted[token]], start, end]
            else:
                words[word][2] = end

        spans, begin, end = [], None, None
        for label, w_start, w_end in words.values():
            if label == "I" and begin is not None:
                end = w_end
                continue
            if begin is not None:
                spans.append(text[begin:end])
            begin, end = (w_start, w_end) if label == "B" else (None, None)
        if begin is not None:
            spans.append(text[begin:end])
        return spans

    @torch.no_grad()
    def spans(self, lines: list[str], batch_size: int = 32) -> list[str]:
        found: list[str] = []
        for start in range(0, len(lines), batch_size):
            batch = lines[start:start + batch_size]
            enc = self.tokenizer(
                batch, return_tensors="pt", padding=True, truncation=True,
                max_length=128, return_offsets_mapping=True,
            )
            offsets = enc.pop("offset_mapping")
            predictions = self.model(**enc).logits.argmax(-1)

            for i, text in enumerate(batch):
                found.extend(self._decode(text, enc.word_ids(i), predictions[i].tolist(), offsets[i].tolist()))
        return found


def _clean(span: str) -> str:
    return re.sub(r"\s+", " ", span.strip(" \t-•*,;:.()[]")).lower()


class SkillExtractor:
    def __init__(self):
        self.taggers = [SpanTagger(SKILL_MODEL), SpanTagger(KNOWLEDGE_MODEL)]

    def extract(self, text: str) -> list[str]:
        """Skills and knowledge terms found in the text, in first-seen order."""
        lines = [p.strip() for line in text.splitlines() for p in re.split(r"[,;•|]", line) if p.strip()]
        lines = [line for line in lines if len(line) > 1]
        seen: dict[str, None] = {}
        for tagger in self.taggers:
            for span in tagger.spans(lines):
                skill = _clean(span)
                if _is_skill(skill):
                    seen.setdefault(skill)
        return list(seen)


class Embedder:
    def __init__(self):
        self.model = _load(SentenceTransformer, EMBEDDING_MODEL, trust_remote_code=True)
        # None when the model does not declare it; then read it off a real embedding
        self.dim: int = self.model.get_embedding_dimension() or len(self.model.encode("x"))

    def encode(self, texts: list[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, self.dim))
        return self.model.encode(texts, normalize_embeddings=True, show_progress_bar=False)

    def encode_document(self, text: str) -> np.ndarray | None:
        """Mean of chunk embeddings, so long text is not cut off at the model's input limit."""
        words = text.split()
        if not words:
            return None
        chunks = [" ".join(words[i:i + CHUNK_WORDS]) for i in range(0, len(words), CHUNK_WORDS)]
        mean = self.encode(chunks).mean(axis=0)
        return mean / (np.linalg.norm(mean) or 1.0)


@lru_cache(maxsize=1)
def get_extractor() -> SkillExtractor:
    return SkillExtractor()


@lru_cache(maxsize=1)
def get_embedder() -> Embedder:
    return Embedder()
