"""Section matching and the weighted final score."""

from dataclasses import dataclass

import numpy as np

from .config import (MAX_SCORE, SIMILARITY_CEILING, SIMILARITY_FLOOR, SKILL_MATCH_THRESHOLD,
                     VERDICTS, WEIGHTS)
from .models import Embedder, SkillExtractor
from .sections import (degree_level, find_projects, has_phrase, required_years, split_projects, split_sections,
                       traits_in, years_of_experience, listed_skills)

# Bullets shown under the verdict; the rest are reached through "+N more"
SHORT_TIPS = 3
TIP_SKILLS = 3


def _percent(ratio: float) -> int:
    return min(MAX_SCORE, round(max(0.0, min(1.0, ratio)) * 100))


def _scaled(similarity: float) -> float:
    """Maps raw cosine similarity onto 0..1 using the configured working range."""
    span = SIMILARITY_CEILING - SIMILARITY_FLOOR
    return max(0.0, min(1.0, (similarity - SIMILARITY_FLOOR) / span))


@dataclass
class Match:
    covered: list[str]
    missing: list[str]


class Analyzer:
    def __init__(self, extractor: SkillExtractor, embedder: Embedder):
        self.extractor = extractor
        self.embedder = embedder

    def _similarity(self, text_a: str, text_b: str) -> float:
        a, b = self.embedder.encode_document(text_a), self.embedder.encode_document(text_b)
        return 0.0 if a is None or b is None else float(a @ b)

    def _match_skills(self, wanted: list[str], available: list[str], source: str) -> Match:
        """A wanted skill is covered when the text names it, or an extracted skill is semantically close."""
        if not wanted:
            return Match([], [])
        best = np.zeros(len(wanted))
        if available:
            best = (self.embedder.encode(wanted) @ self.embedder.encode(available).T).max(axis=1)
        covered = [s for s, v in zip(wanted, best) if v >= SKILL_MATCH_THRESHOLD or has_phrase(source, s)]
        return Match(covered, [s for s in wanted if s not in covered])

    def analyze(self, resume: str, job: str) -> dict:
        sec = split_sections(resume)
        has_sections = any(sec[k].strip() for k in ("skills", "projects", "experience"))

        job_skills = self.extractor.extract(job)
        resume_skills = list(dict.fromkeys([*self.extractor.extract(resume), *listed_skills(sec["skills"])]))
        match = self._match_skills(job_skills, resume_skills, resume)

        # Skills: concept coverage 75%, similarity of the skills section 25%
        coverage = len(match.covered) / len(job_skills) if job_skills else 0.0
        skills_text = sec["skills"] if sec["skills"].strip() else resume
        skills = 0.75 * coverage + 0.25 * _scaled(self._similarity(skills_text, job))

        # Projects: similarity 50%, job skills shown inside the projects 50%
        found_projects = find_projects(sec)
        project_text = found_projects if found_projects.strip() else ("" if has_sections else resume)
        projects = 0.0
        if project_text.strip():
            in_projects = self.extractor.extract(project_text)
            overlap = len(self._match_skills(job_skills, in_projects, project_text).covered) / len(job_skills) if job_skills else 0.0
            sim = max((self._similarity(p, job) for p in split_projects(project_text)), default=0.0)
            projects = 0.5 * _scaled(sim) + 0.5 * overlap

        # Experience: similarity 60%, years versus years required 40%
        experience_text = sec["experience"] if sec["experience"].strip() else ("" if has_sections else resume)
        want_years = required_years(job)
        have_years = years_of_experience(experience_text)
        years_ratio = min(1.0, have_years / want_years) if want_years else (0.7 if experience_text.strip() else 0.0)
        experience = (
            0.6 * _scaled(self._similarity(experience_text, job)) + 0.4 * years_ratio
            if experience_text.strip() else 0.0
        )

        # Additional experience / traits: wanted traits shown 60%, three or more traits 40%
        traits_found, traits_wanted = traits_in(resume), traits_in(job)
        hit = len(set(traits_wanted) & set(traits_found)) / len(traits_wanted) if traits_wanted else 0.5
        extra_text = (sec["additional"] + sec["other"]).strip()
        additional = 0.6 * hit + 0.4 * min(1.0, len(traits_found) / 3) - (0.0 if extra_text else 0.1)

        # Education: degree level held versus required
        want_degree = degree_level(job)
        have_degree = degree_level(sec["education"] or resume)
        education = 0.0 if not have_degree else (min(1.0, have_degree / want_degree) if want_degree else 0.8)

        parts = {
            "skills": _percent(skills),
            "projects": _percent(projects),
            "experience": _percent(experience),
            "additional": _percent(additional),
            "education": _percent(education),
        }
        total = min(MAX_SCORE, round(sum(parts[k] * w for k, w in WEIGHTS.items())))

        # Each advice item has a short bullet and a full step for editing the resume.
        # The bullets end in "+N more" when skills or advice are hidden; the frontend makes that clickable.
        advice: list[tuple[str, list[str]]] = []
        if match.missing:
            advice.append((f"Add: {', '.join(match.missing[:TIP_SKILLS])}", [
                f"Add \"{s}\": list it under Skills and show it in a project or job bullet." for s in match.missing
            ]))
        if not project_text.strip():
            advice.append(("Add a Projects section", [
                "Add a Projects section with 2-3 projects: name, tech stack, what you built and a measurable result.",
            ]))
        elif parts["projects"] < 50:
            advice.append(("Align projects with the role", [
                "Rewrite project bullets with the job's keywords and tools, starting each with an action verb.",
                "Add numbers to project outcomes (users, speed-up, accuracy, time saved).",
            ]))
        if want_years and have_years < want_years:
            advice.append((f"Show {want_years}+ years experience", [
                f"The role asks for ~{want_years} years: add start-end dates to every role and internship "
                f"so your {have_years or 'relevant'}-year experience is explicit.",
            ]))
        if parts["additional"] < 50:
            advice.append(("Highlight leadership or certifications", [
                "Add an Achievements or Certifications section: leadership, teamwork, awards, hackathons.",
            ]))
        if not have_degree:
            advice.append(("List your degree clearly", [
                "List your education clearly: degree, institution and graduation year.",
            ]))
        if not advice:
            advice.append(("Strong fit — tailor your summary", [
                "Tailor your summary line to the job title and its top two requirements.",
            ]))

        steps = [step for _, item_steps in advice for step in item_steps]
        tips = [tip for tip, _ in advice[:SHORT_TIPS]]
        hidden = max(0, len(match.missing) - TIP_SKILLS) + max(0, len(advice) - SHORT_TIPS)
        if hidden:
            tips[-1 if len(advice) > SHORT_TIPS or not match.missing else 0] += f" +{hidden} more"

        return {
            "total": total,
            "parts": parts,
            "matched": match.covered,
            "missing": match.missing,
            "traits": traits_found,
            "tips": tips,
            "steps": steps,
            "verdict": next(label for floor, label in VERDICTS if total >= floor),
            "extracted": {
                "resumeSkills": resume_skills,
                "jobSkills": job_skills,
                "projects": len(split_projects(found_projects)) if found_projects.strip() else 0,
                "experienceYears": have_years,
                "requiredYears": want_years,
                "degreeLevel": have_degree,
                "requiredDegreeLevel": want_degree,
            },
        }
