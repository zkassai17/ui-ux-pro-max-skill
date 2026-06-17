// Recommendation steering — the three weights the hybrid engine uses, exposed
// to the user as presets + optional fine-tuning. Pure (no storage here).

export type RecWeights = { content: number; collaborative: number; trending: number };

export type RecDimension = keyof RecWeights;

// The 4 levels (Off / Low / Med / High) each dimension can take, as weight values.
export const REC_LEVELS: Record<RecDimension, number[]> = {
  content: [0, 0.6, 1.0, 1.5],
  collaborative: [0, 0.7, 1.2, 2.0],
  trending: [0, 0.2, 0.5, 1.0],
};

export const LEVEL_LABELS = ["Off", "Low", "Med", "High"];

export const DEFAULT_REC_WEIGHTS: RecWeights = { content: 1.0, collaborative: 1.2, trending: 0.2 };

export const REC_PRESETS: { key: string; label: string; weights: RecWeights }[] = [
  { key: "balanced", label: "Balanced", weights: { content: 1.0, collaborative: 1.2, trending: 0.2 } },
  { key: "me", label: "Just for me", weights: { content: 1.5, collaborative: 0, trending: 0 } },
  { key: "friends", label: "Friends", weights: { content: 0.6, collaborative: 2.0, trending: 0 } },
  { key: "popular", label: "Popular", weights: { content: 0.6, collaborative: 0.7, trending: 1.0 } },
];

// Nearest level index for a dimension's current weight (for showing the stepper state).
export function levelIndex(dim: RecDimension, value: number): number {
  const levels = REC_LEVELS[dim];
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < levels.length; i++) {
    const d = Math.abs(levels[i] - value);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

// Which preset (if any) the current weights match — else null ("Custom").
export function matchPreset(w: RecWeights): string | null {
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
  const found = REC_PRESETS.find(
    (p) =>
      near(p.weights.content, w.content) &&
      near(p.weights.collaborative, w.collaborative) &&
      near(p.weights.trending, w.trending)
  );
  return found?.key ?? null;
}
