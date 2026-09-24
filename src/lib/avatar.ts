export function initialsOf(name?: string | null): string {
  if (!name) return '??';
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i) | 0;
  }
  return Math.abs(h);
}

// Deterministic gradient seeded from a stable value (id/email) so the same
// user always gets the same colors, while different users get varied hues.
export function gradientFor(seed: string): string {
  const h = hash(seed || 'user');
  const hue1 = h % 360;
  const hue2 = (hue1 + 40 + (h % 60)) % 360;
  return `linear-gradient(135deg, hsl(${hue1} 70% 55%), hsl(${hue2} 70% 45%))`;
}
