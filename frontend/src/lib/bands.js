// Score ranges used across the app; mirrors the verdicts produced by the ML service
export const BAND_LIST = [
  { key: "excellent", min: 75, label: "Excellent", meaning: "Ready to apply" },
  { key: "good", min: 55, label: "Good", meaning: "A few gaps to close" },
  { key: "partial", min: 35, label: "Partial", meaning: "Needs focused work" },
  { key: "low", min: 0, label: "Low", meaning: "Not a fit yet" },
];

export const bandOf = (score) => BAND_LIST.find((b) => score >= b.min);
