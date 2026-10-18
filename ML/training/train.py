"""Step 2: learns a skill profile per job title, evaluates it, and saves it for the ML service.

Run from the ML folder after preprocessing:  python -m training.train

Why profiles and not a classifier on Recommended: the label audit below groups pairs by how much
the user's skills overlap the job's. If Recommended rose with overlap, it would be worth learning;
in this dataset it stays flat, because the label follows Match_Score alone. A model fitted to it
would rank roles at random, so ranking uses the title profiles (see training/profiles.py and app/jobs/ranking.py).
"""

import json

import pandas as pd

from app.config import ARTIFACTS_DIR, PROFILES_FILE, RECOMMEND_WEIGHTS
from app.jobs.ranking import TitleRanker
from app.jobs.skillset import split_skills

from .profiles import build_profiles, evaluate

HOLDOUT = 0.2
SEED = 42
# Recommended rates that differ by less than this across overlap levels carry no skill signal
SIGNAL_SPREAD = 0.05


def load_processed_data() -> tuple[pd.DataFrame, dict]:
    print("[INFO] Loading processed data...")
    df = pd.read_csv(ARTIFACTS_DIR / "processed_data.csv", keep_default_na=False)
    df["Job_Skills"] = df["Job_Skills"].map(split_skills)
    df["User_Skills"] = df["User_Skills"].map(split_skills)
    vocabulary = json.loads((ARTIFACTS_DIR / "vocabulary.json").read_text(encoding="utf-8"))
    print(f"[INFO] Data loaded. Shape: {df.shape}")
    return df, vocabulary


def split(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Holds out the same share of every title, so small titles are tested too."""
    test = df.groupby("Job_Title", group_keys=False).sample(frac=HOLDOUT, random_state=SEED)
    return df.drop(test.index), test


def popularity_baseline(train: pd.DataFrame, test: pd.DataFrame) -> float:
    """hit@1 of always recommending the title with the most postings."""
    return round(float((test["Job_Title"] == train["Job_Title"].value_counts().idxmax()).mean()), 4)


def label_audit(df: pd.DataFrame) -> dict:
    """Recommended rate by user/job skill overlap (Jaccard, in tenths)."""
    labelled = df[pd.to_numeric(df["Recommended"], errors="coerce").notna() & (df["User_Skills"].map(len) > 0)]
    if labelled.empty:
        return {"rows": 0, "rate_by_overlap": {}, "spread": None, "has_skill_signal": False}

    def jaccard(user, job):
        user, job = set(user), set(job)
        return round(len(user & job) / len(user | job), 1)

    overlap = [jaccard(u, j) for u, j in zip(labelled["User_Skills"], labelled["Job_Skills"])]
    rates = pd.to_numeric(labelled["Recommended"]).groupby(overlap).agg(["mean", "size"])
    rates = rates[rates["size"] >= 100]["mean"].round(3)
    spread = float(rates.max() - rates.min()) if len(rates) > 1 else 0.0
    return {
        "rows": int(len(labelled)),
        "rate_by_overlap": {str(k): float(v) for k, v in rates.items()},
        "spread": round(spread, 3),
        "has_skill_signal": spread >= SIGNAL_SPREAD,
    }


def report(metrics: dict, baseline: float, audit: dict) -> None:
    print("\n" + "=" * 55)
    print("         RECOMMENDER EVALUATION")
    print("=" * 55)
    print("Query = a held-out posting's skills; target = its own title")
    for name, value in metrics.items():
        print(f"  {name:<8}{value:.2%}")
    print(f"  Popularity baseline hit@1: {baseline:.2%}")

    print("\nLabel audit: Recommended rate by skill overlap")
    for overlap, rate in audit["rate_by_overlap"].items():
        print(f"  overlap {overlap}: {rate:.1%}")
    if audit["has_skill_signal"]:
        print("  -> The label rises with skill overlap; it could be used as feedback.")
    else:
        print(f"  -> Spread {audit['spread']}: the label does not depend on skills, so it is not used for ranking.")
    print("=" * 55)


def main():
    df, vocabulary = load_processed_data()

    train, test = split(df)
    print(f"[INFO] Profile postings: {len(train)}, held-out postings: {len(test)}")
    metrics = evaluate(TitleRanker(build_profiles(train)), test)
    baseline = popularity_baseline(train, test)
    audit = label_audit(df)
    report(metrics, baseline, audit)

    # The served profiles use every posting
    profiles = build_profiles(df)
    profiles.update({
        "vocabulary": {k: vocabulary.get(k, k.title()) for k in profiles["skills"]},
        "weights": RECOMMEND_WEIGHTS,
        "evaluation": {**metrics, "popularity_hit@1": baseline},
        "label_audit": audit,
    })
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    (ARTIFACTS_DIR / PROFILES_FILE).write_text(json.dumps(profiles, indent=2), encoding="utf-8")
    print(f"\n[INFO] Saved {PROFILES_FILE} ({len(profiles['titles'])} titles) to {ARTIFACTS_DIR}")
    print("[SUCCESS] Training complete. Restart the ML service to load the recommender.")


if __name__ == "__main__":
    main()
