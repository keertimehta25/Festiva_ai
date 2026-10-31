// Verifies WCAG contrast ratios for the colour pairs used in the UI (AA: 4.5:1 text, 3:1 large text / UI).
// Usage: node scripts/check-contrast.mjs
const pairs = [
  ['Body text on ivory', '#2a1f2d', '#fbf7f1', 4.5],
  ['Muted text on ivory', '#6b5e6e', '#fbf7f1', 4.5],
  ['Muted text on white', '#6b5e6e', '#ffffff', 4.5],
  ['Muted text on surface-muted', '#6b5e6e', '#f5eee5', 4.5],
  ['Link/plum text on ivory', '#5b2a4e', '#fbf7f1', 4.5],
  ['White on plum button', '#ffffff', '#5b2a4e', 4.5],
  ['White on plum hover', '#ffffff', '#471f3d', 4.5],
  ['Plum on plum-tint (badge)', '#5b2a4e', '#f1e6ee', 4.5],
  ['Forest on forest-tint (badge)', '#2f5d50', '#e4f0ea', 4.5],
  ['Gold-ink on gold-tint (warning)', '#7a4a00', '#fff1d6', 4.5],
  ['Rose on rose-tint (error)', '#9b2c2c', '#fbe4e1', 4.5],
  ['Rose error text on white', '#9b2c2c', '#ffffff', 4.5],
  ['White on rose danger button', '#ffffff', '#9b2c2c', 4.5],
  ['White on forest toast', '#ffffff', '#2f5d50', 4.5],
  ['White on ink toast', '#ffffff', '#2a1f2d', 4.5],
  ['Ink on gold button (callout)', '#2a1f2d', '#e8a33d', 4.5],
  ['White on plum (callout text)', '#ffffff', '#5b2a4e', 4.5],
  ['Focus ring on ivory (UI)', '#8a4b00', '#fbf7f1', 3],
  ['Input border on white (UI)', '#857868', '#ffffff', 3],
  ['Input border on ivory (UI)', '#857868', '#fbf7f1', 3],
  ['Progress fill on track (UI)', '#2f5d50', '#f5eee5', 3],
  ['Selected tab text on ivory', '#5b2a4e', '#fbf7f1', 4.5],
  ['Muted tab text on ivory', '#6b5e6e', '#fbf7f1', 4.5],
];

const channel = (v) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel(n >> 16) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
};
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

let failed = 0;
for (const [label, fg, bg, min] of pairs) {
  const value = ratio(fg, bg);
  const ok = value >= min;
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${value.toFixed(2).padStart(5)}:1  (need ${min})  ${label}`);
}
process.exit(failed ? 1 : 0);
