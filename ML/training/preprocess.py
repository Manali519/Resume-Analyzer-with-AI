"""Step 1: cleans the job dataset and learns the skill vocabulary and job titles from it.

Run from the ML folder:  python -m training.preprocess

Handles, and counts in artifacts/data_quality.json:
- missing or placeholder values ("", "N/A", "none", "-") in titles and skill lists
- spacing, casing and alias variants ("  data science", "ML" -> "machine learning"), repeated skills
- misspelt skills and titles: rare values close to a frequent one are corrected, the rest dropped
- Match_Score that is not a number or outside 0..1; Recommended that is not 0 or 1
- labels that contradict the score threshold the rest of the data follows; missing labels from that threshold
- exact duplicate rows, rows with no job skills left, titles with too few postings to profile
"""

import difflib
import json
import re
from collections import Counter, defaultdict

import numpy as np
import pandas as pd

from app.config import ARTIFACTS_DIR, JOB_DATASET, MIN_SKILL_COUNT, MIN_TITLE_POSTINGS, TYPO_CUTOFF
from app.jobs.skillset import clean_text, skill_key, split_skills

REQUIRED_COLUMNS = {"Job_Title", "Job_Requirements"}
SPLIT = r"[,;|]"
# The label follows a score threshold when at least this share of labelled rows agree with it
THRESHOLD_AGREEMENT = 0.98
BOOLEAN_WORDS = {"yes": "1", "y": "1", "true": "1", "no": "0", "n": "0", "false": "0"}


def load_data(path=JOB_DATASET) -> pd.DataFrame:
    print(f"[INFO] Loading dataset from: {path}")
    # Read everything as text so bad values are seen, not silently turned into NaN
    df = pd.read_csv(path, dtype=str, keep_default_na=False)
    df.columns = [c.strip() for c in df.columns]
    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise SystemExit(f"[ERROR] Dataset is missing columns: {', '.join(sorted(missing))}")
    for column in ("User_Skills", "Match_Score", "Recommended"):
        if column not in df.columns:
            df[column] = ""
    print(f"[INFO] Dataset loaded. Shape: {df.shape}")
    return df


def correct_rare(counts: Counter, minimum: int) -> tuple[dict, int, int]:
    """Maps each value to itself, to a close frequent value (a typo), or to None (too rare to trust)."""
    frequent = [v for v, n in counts.items() if n >= minimum]
    mapping, fixed, dropped = {}, 0, 0
    for value, n in counts.items():
        if n >= minimum:
            mapping[value] = value
            continue
        close = difflib.get_close_matches(value, frequent, n=1, cutoff=TYPO_CUTOFF)
        mapping[value] = close[0] if close else None
        fixed, dropped = (fixed + n, dropped) if close else (fixed, dropped + n)
    return mapping, fixed, dropped


def most_common_spelling(spellings: dict[str, Counter], key: str) -> str:
    written = spellings.get(key)
    return written.most_common(1)[0][0] if written else key.title()


def clean_titles(df: pd.DataFrame, report: dict) -> pd.DataFrame:
    df["Job_Title"] = df["Job_Title"].map(clean_text)
    report["missing_title"] = int((df["Job_Title"] == "").sum())
    df = df[df["Job_Title"] != ""].copy()

    # The same title in different casing or spacing is one title
    keys = df["Job_Title"].str.lower()
    spellings = defaultdict(Counter)
    for key, written in zip(keys, df["Job_Title"]):
        spellings[key][written] += 1

    mapping, report["title_typos_fixed"], report["rare_title_rows_dropped"] = correct_rare(Counter(keys), MIN_TITLE_POSTINGS)
    df["Job_Title"] = keys.map(lambda k: mapping[k] and most_common_spelling(spellings, mapping[k]))
    return df[df["Job_Title"].notna()]


def clean_skills(df: pd.DataFrame, report: dict) -> tuple[pd.DataFrame, dict]:
    """Skill cells to lists of vocabulary keys; returns the vocabulary {key: display name}."""
    spellings = defaultdict(Counter)
    for cell in pd.concat([df["Job_Requirements"], df["User_Skills"]]):
        for part in re.split(SPLIT, str(cell)):
            written, key = clean_text(part), skill_key(part)
            if key and written.lower() == key:
                spellings[key][written] += 1

    job_lists = df["Job_Requirements"].map(split_skills)
    user_lists = df["User_Skills"].map(split_skills)
    counts = Counter(s for lists in (job_lists, user_lists) for row in lists for s in row)
    mapping, report["skill_typos_fixed"], report["rare_skills_dropped"] = correct_rare(counts, MIN_SKILL_COUNT)

    def apply(row):
        return list(dict.fromkeys(mapping[s] for s in row if mapping.get(s)))

    df["Job_Skills"] = job_lists.map(apply)
    df["User_Skills"] = user_lists.map(apply)

    report["missing_job_skills"] = int((df["Job_Skills"].map(len) == 0).sum())
    report["missing_user_skills"] = int((df["User_Skills"].map(len) == 0).sum())
    df = df[df["Job_Skills"].map(len) > 0].copy()

    vocabulary = {k: most_common_spelling(spellings, k) for k in sorted({s for row in df["Job_Skills"] for s in row})}
    return df, vocabulary


def clean_labels(df: pd.DataFrame, report: dict) -> pd.DataFrame:
    """Invalid scores and labels become NaN; labels are checked against the score threshold they follow."""
    given = df["Match_Score"].map(clean_text) != ""
    score = pd.to_numeric(df["Match_Score"], errors="coerce")
    valid = score.between(0, 1)
    report["missing_match_score"] = int((~given).sum())
    report["invalid_match_score"] = int((given & ~valid).sum())
    score = score.where(valid)

    written = df["Recommended"].map(clean_text).str.lower()
    label = pd.to_numeric(written.replace(BOOLEAN_WORDS), errors="coerce")
    report["missing_recommended"] = int((written == "").sum())
    report["invalid_recommended"] = int(((written != "") & ~label.isin([0, 1])).sum())
    label = label.where(label.isin([0, 1]))

    both = score.notna() & label.notna()
    report["label_threshold"] = None
    if both.any():
        grid = np.round(np.arange(0, 1.001, 0.01), 2)
        agreement = [((score[both] >= t) == (label[both] == 1)).mean() for t in grid]
        best = int(np.argmax(agreement))
        if agreement[best] >= THRESHOLD_AGREEMENT:
            threshold = float(grid[best])
            implied = (score >= threshold).astype(float).where(score.notna())
            conflict = both & (implied != label)
            report["label_threshold"] = threshold
            report["label_conflicts_cleared"] = int(conflict.sum())
            report["labels_filled_from_score"] = int((label.isna() & implied.notna()).sum())
            label = label.mask(conflict).fillna(implied.where(label.isna()))

    df["Match_Score"], df["Recommended"] = score, label
    return df


def preprocess(df: pd.DataFrame) -> tuple[pd.DataFrame, dict, dict]:
    report = {"rows_in": int(len(df))}
    df = clean_titles(df, report)
    df, vocabulary = clean_skills(df, report)
    df = clean_labels(df, report)

    # Exact duplicates add no information and would over-weight a posting
    key = df.assign(Job_Skills=df["Job_Skills"].map(", ".join), User_Skills=df["User_Skills"].map(", ".join))
    duplicated = key.drop(columns=["Job_Requirements"]).duplicated()
    report["duplicate_rows"] = int(duplicated.sum())
    df = df[~duplicated]

    report["rows_out"] = int(len(df))
    report["titles"] = int(df["Job_Title"].nunique())
    report["skills"] = len(vocabulary)
    return df, vocabulary, report


def save_artifacts(df: pd.DataFrame, vocabulary: dict, report: dict) -> None:
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    out = df[["Job_Title", "Job_Skills", "User_Skills", "Match_Score", "Recommended"]].copy()
    out["Job_Skills"] = out["Job_Skills"].map(", ".join)
    out["User_Skills"] = out["User_Skills"].map(", ".join)
    out.to_csv(ARTIFACTS_DIR / "processed_data.csv", index=False)
    (ARTIFACTS_DIR / "vocabulary.json").write_text(json.dumps(vocabulary, indent=2), encoding="utf-8")
    (ARTIFACTS_DIR / "data_quality.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"[INFO] Saved processed_data.csv, vocabulary.json and data_quality.json to {ARTIFACTS_DIR}")


def main():
    df, vocabulary, report = preprocess(load_data())
    print("\n[INFO] Data quality report")
    for name, value in report.items():
        print(f"  {name:<26}{value}")
    print(f"\n[INFO] Titles: {', '.join(sorted(df['Job_Title'].unique()))}")
    print(f"[INFO] Skills: {', '.join(vocabulary.values())}")
    save_artifacts(df, vocabulary, report)
    print("\n[SUCCESS] Preprocessing complete. Next: python -m training.train")


if __name__ == "__main__":
    main()
