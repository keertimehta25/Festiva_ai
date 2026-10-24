import { axe } from 'vitest-axe';

/**
 * Runs axe-core on rendered markup. jsdom has no layout or canvas, so the colour-contrast rule
 * cannot run here; contrast is verified separately by scripts/check-contrast.mjs.
 */
export const checkA11y = (container: Element) => axe(container, { rules: { 'color-contrast': { enabled: false } } });
