// Single source of truth for the 1–5 personal rating scale. The stored value
// stays a 1–5 int; this maps each level to its face, word, and accent color.
export type RatingLevel = { value: number; emoji: string; label: string; color: string };

export const RATING_SCALE: readonly RatingLevel[] = [
  { value: 1, emoji: "😖", label: "Bad", color: "#ff3b5b" },
  { value: 2, emoji: "😕", label: "Meh", color: "#ff9f43" },
  { value: 3, emoji: "🙂", label: "Good", color: "#ffc048" },
  { value: 4, emoji: "😀", label: "Great", color: "#b9553c" },
  { value: 5, emoji: "😍", label: "Loved it", color: "#1dd1a1" },
];

export function ratingLevel(value: number | null): RatingLevel | null {
  if (value == null) return null;
  return RATING_SCALE.find((l) => l.value === value) ?? null;
}

export function ratingEmoji(value: number | null): string | null {
  return ratingLevel(value)?.emoji ?? null;
}

export function ratingLabel(value: number | null): string | null {
  return ratingLevel(value)?.label ?? null;
}
