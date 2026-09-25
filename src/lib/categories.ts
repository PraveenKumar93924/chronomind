export const CATEGORIES = [
  "Education",
  "Career",
  "Projects",
  "Achievements",
  "Certifications",
  "Workshops",
  "Courses",
  "Activities",
  "Documents",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_EMOJI: Record<string, string> = {
  Education: "🎓",
  Career: "💼",
  Projects: "💻",
  Achievements: "🏆",
  Certifications: "📜",
  Workshops: "🏫",
  Courses: "📚",
  Activities: "🎯",
  Documents: "📄",
  Other: "📌",
};

export function categoryEmoji(category?: string | null) {
  return (category && CATEGORY_EMOJI[category]) || "📌";
}
