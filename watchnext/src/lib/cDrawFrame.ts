// Pure keyframe interpolation for the "c draws itself" loading animation.
//
// Mirrors the source @keyframes (1.7s ease-in-out loop) from the original HTML:
//   0%   -> stroke-dasharray:14 86 ; stroke-dashoffset:0
//   50%  -> stroke-dasharray:62 38 ; stroke-dashoffset:-30
//   100% -> stroke-dasharray:14 86 ; stroke-dashoffset:-100
//
// The circle has pathLength=100, so the dash pair always sums to 100 (dashB = 100 - dashA).
// `p` is the loop phase in [0,1); values outside are wrapped so callers can pass raw
// elapsed/duration without bookkeeping.

export interface CDrawFrame {
  dashA: number; // visible dash length (portion of the c revealed)
  dashB: number; // gap length = 100 - dashA
  offset: number; // stroke-dashoffset
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function cDrawFrame(p: number): CDrawFrame {
  // Wrap into [0,1) so the loop is seamless.
  let phase = p % 1;
  if (phase < 0) phase += 1;

  let dashA: number;
  let offset: number;
  if (phase < 0.5) {
    const t = phase / 0.5; // 0 -> 1 across first half
    dashA = lerp(14, 62, t);
    offset = lerp(0, -30, t);
  } else {
    const t = (phase - 0.5) / 0.5; // 0 -> 1 across second half
    dashA = lerp(62, 14, t);
    offset = lerp(-30, -100, t);
  }
  return { dashA, dashB: 100 - dashA, offset };
}
