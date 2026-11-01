import type { ReactNode } from 'react';

interface ScrollRegionProps {
  /** Names the region for screen-reader users, for example "Expenses for this event". */
  label: string;
  className?: string;
  children: ReactNode;
}

/**
 * A wrapper for wide content (tables) that scrolls sideways on narrow screens. It is focusable and labelled so
 * keyboard users can reach and scroll it (WCAG 2.1.1).
 */
export function ScrollRegion({ label, className = '', children }: ScrollRegionProps) {
  return (
    // A scrolling region has to take focus, or keyboard users cannot scroll it.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    <div className={`table-wrap ${className}`.trim()} role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}
