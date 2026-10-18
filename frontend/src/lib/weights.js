// Share of the final score contributed by each area (percent); mirrors ML/app/config.py
export const WEIGHTS = {
  skills: 40,
  projects: 20,
  experience: 20,
  additional: 15,
  education: 5,
};

export const AREAS = [
  { key: "skills", label: "Skills", hint: "Tools and technologies the job asks for" },
  { key: "projects", label: "Projects", hint: "Hands-on work related to the role" },
  { key: "experience", label: "Experience", hint: "Relevant work history and years" },
  { key: "additional", label: "Traits", hint: "Leadership, teamwork, achievements" },
  { key: "education", label: "Education", hint: "Degree level required by the job" },
];
