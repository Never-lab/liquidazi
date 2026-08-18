/** Nearest series index for a pointer-x in viewBox coords. */
export const nearestIndex = (xs: readonly number[], x: number): number => {
  if (xs.length === 0) return -1;
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < xs.length; i++) {
    const d = Math.abs(xs[i]! - x);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
};
