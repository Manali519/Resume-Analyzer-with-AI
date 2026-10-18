"""Rule-based parsing of resume structure: sections, experience length, degree and traits."""

import re
from datetime import date

# A heading is a whole short line, matched after lower-casing and dropping punctuation, so body lines
# such as "Skills used: React" or "Experience with Docker" do not start a new section.
# Checked in order: "Project Experience" is a projects heading, not an experience one.
_QUALIFIER = (r"(?:(?:key|academic|personal|selected|relevant|technical|major|minor|notable|professional|other|"
              r"recent|software|research|course|college|university|featured|independent|side|mini|capstone)\s+){0,2}")
_AND = r"(?:\s+(?:and|&)\s+\w+(?:\s+\w+)?)?"
SECTION_HEADINGS = {
    "projects": re.compile(
        _QUALIFIER + r"(?:projects?(?:\s+(?:work|experience|undertaken|portfolio|details))?" + _AND
        + r"|portfolio|capstone)"
    ),
    "skills": re.compile(
        _QUALIFIER + r"(?:skills?|skill\s?set|technologies|tech\s+stack|tools(?:\s+and\s+technologies)?|"
        r"(?:core\s+)?competenc(?:y|ies)|areas?\s+of\s+expertise|expertise)" + _AND
    ),
    "experience": re.compile(
        _QUALIFIER + r"(?:(?:work|industry|internship|job)\s+)?(?:experience|employment(?:\s+history)?|"
        r"work\s+history|career\s+history|internships?)" + _AND
    ),
    "education": re.compile(
        _QUALIFIER + r"(?:education(?:al)?(?:\s+(?:background|qualifications?|details))?|"
        r"academic\s+(?:background|qualifications?|details)|qualifications?)" + _AND
    ),
    "additional": re.compile(
        r"(?:additional\s+\w+|achievements?|accomplishments|awards?|certifications?|certificates|"
        r"extra\s?curricular(?:\s+activities)?|co\s?curricular(?:\s+activities)?|activities|"
        r"volunteer(?:ing)?(?:\s+(?:work|experience))?|leadership(?:\s+\w+)?|interests|hobbies|publications|"
        r"languages|positions?\s+of\s+responsibility|honou?rs)" + _AND
    ),
    # Headings that end the previous section without belonging to a scored one
    "other": re.compile(
        r"(?:professional\s+|career\s+)?(?:summary|objective|profile|about\s+me|contact(?:\s+\w+)?|"
        r"references|declaration|personal\s+(?:details|information))"
    ),
}
_HEADING_COLON = re.compile(r"^\s*([A-Za-z &/,'-]{3,40}?)\s*:\s*(\S.*)$")

SOFT_TRAITS = {
    "leadership": ["lead", "led", "leadership", "mentor", "mentored", "managed", "captain", "head"],
    "communication": ["communication", "presented", "presentation", "stakeholder", "collaborated", "collaboration", "teamwork", "team"],
    "problem": ["problem solving", "problem-solving", "analytical", "optimized", "optimised", "improved", "solved", "debugging"],
    "initiative": ["initiative", "founded", "organised", "organized", "volunteer", "open source", "hackathon", "award", "certification", "certified", "publication"],
    "adaptability": ["adaptable", "fast learner", "self-taught", "quick learner", "learned", "cross-functional"],
}

# Short forms are matched case-sensitively or with dots, so words like "be", "ba" and "ms" do not count
DEGREES = [
    (4, re.compile(r"\bph\.?\s?d\b|doctorate", re.I)),
    (3, re.compile(r"master|\bm\.?\s?tech\b|\bm\.?sc\b|\bmba\b|\bm\.s\.|(?-i:\bMS\b)", re.I)),
    (2, re.compile(r"bachelor|\bb\.?\s?tech\b|\bb\.?sc\b|\bb\.(?:e|s|a)\.|(?-i:\b(?:BE|BS|BA)\b)", re.I)),
    (1, re.compile(r"diploma|associate'?s? degree", re.I)),
]

YEARS_RE = re.compile(r"(\d{1,2})\+?\s*(?:years?|yrs?)", re.I)
RANGE_RE = re.compile(r"((?:19|20)\d{2})\s*(?:-|–|—|to)\s*((?:19|20)\d{2}|present|current)", re.I)


def heading_of(line: str) -> str | None:
    """The section a line is the heading of, or None for a normal line."""
    line = re.sub(r"^[#*\s\-•▪●◦|]+|[\s:\-–—_*#|]+$", "", line)
    if re.fullmatch(r"(?:[A-Za-z&] {1,3})+[A-Za-z]", line):  # letter-spaced, e.g. "K E Y  P R O J E C T S"
        line = " ".join(word.replace(" ", "") for word in re.split(r" {2,}", line))
    if not line or len(line) > 45 or re.search(r"\d", line):
        return None
    norm = re.sub(r"\s+", " ", re.sub(r"[^a-z&]+", " ", line.lower())).strip()
    if len(norm.split()) > 5:
        return None
    return next((name for name, rx in SECTION_HEADINGS.items() if rx.fullmatch(norm)), None)


def split_sections(text: str) -> dict[str, str]:
    sections = {name: "" for name in SECTION_HEADINGS}
    current = "other"
    for raw in text.splitlines():
        heading = heading_of(raw.strip())
        if heading:
            current = heading
            continue
        # "Projects: Resume Analyzer ..." - heading and content on one line. Lines such as
        # "Technologies: React" inside a section stay where they are.
        inline = _HEADING_COLON.match(raw)
        heading = inline and heading_of(inline.group(1))
        if heading and heading != "other" and (heading == "projects" or current == "other"):
            current = heading
            raw = inline.group(2)
        sections[current] += raw + "\n"
    return sections


_PROJECT_HINT = re.compile(r"\bprojects?\b|github\.com|gitlab\.com", re.I)


def find_projects(sections: dict[str, str]) -> str:
    """Project text: the Projects section, or project-like blocks written under other headings."""
    if sections["projects"].strip():
        return sections["projects"]
    blocks = [
        block
        for name in ("experience", "other", "additional")
        for block in split_projects(sections[name])
        if _PROJECT_HINT.search(block)
    ]
    return "\n\n".join(blocks)


def split_projects(text: str) -> list[str]:
    """Splits a projects section into one block per project."""
    blocks = [b.strip() for b in re.split(r"\n\s*\n", text) if b.strip()]
    if len(blocks) > 1:
        return blocks

    # No blank lines: a non-bullet line following bullet lines starts a new project
    bullet = re.compile(r"^\s*[-•*▪●◦]")
    projects, current, seen_bullet = [], [], False
    for line in filter(str.strip, text.splitlines()):
        if current and seen_bullet and not bullet.match(line):
            projects.append("\n".join(current))
            current, seen_bullet = [], False
        current.append(line)
        seen_bullet = seen_bullet or bool(bullet.match(line))
    if current:
        projects.append("\n".join(current))
    return projects


def years_of_experience(text: str) -> int:
    explicit = [int(m.group(1)) for m in YEARS_RE.finditer(text)]
    this_year = date.today().year
    ranges = [
        max(0, (int(m.group(2)) if m.group(2)[0].isdigit() else this_year) - int(m.group(1)))
        for m in RANGE_RE.finditer(text)
    ]
    return max([0, *explicit, sum(ranges)])


def required_years(job_text: str) -> int:
    return max([0, *(int(m.group(1)) for m in YEARS_RE.finditer(job_text))])


def degree_level(text: str) -> int:
    return next((level for level, rx in DEGREES if rx.search(text)), 0)


def has_phrase(text: str, phrase: str) -> bool:
    return re.search(rf"(^|[^a-z0-9+#]){re.escape(phrase)}($|[^a-z0-9+#])", text, re.I) is not None


def traits_in(text: str) -> list[str]:
    return [t for t, words in SOFT_TRAITS.items() if any(has_phrase(text, w) for w in words)]


def listed_skills(skills_section: str) -> list[str]:
    """Items written out in a Skills section, e.g. "React, Node.js, REST APIs"."""
    items = re.split(r"[,;•|\n]|\s[-–]\s", skills_section)
    cleaned = (re.sub(r"^[\s\-*▪●◦:]+|[\s.:]+$", "", item).lower() for item in items)
    return list(dict.fromkeys(i for i in cleaned if 1 < len(i) <= 30 and len(i.split()) <= 4))
