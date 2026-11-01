# Accessibility

Festiva AI targets **WCAG 2.2 AA**. This page lists what is built in, how it is checked, and what is not covered.

## Structure and navigation

- A **skip link** is the first focusable element and jumps to the main content.
- Pages use landmarks (`header`, `nav`, `main`) and one `h1` per screen, with headings in order.
- Every control is reachable and usable with the keyboard. The focus ring is always visible (`:focus-visible`).
- The workspace uses real links for its tabs, so the browser's back button and deep links work.
- Wide tables sit inside a **labelled, focusable scroll region** (`ScrollRegion`), so keyboard users can scroll them on narrow screens.

## Forms

- Every input has a visible `<label>`; optional fields say "optional".
- Hints and errors are linked to their field with `aria-describedby`, and invalid fields set `aria-invalid`.
- On a failed submit, an **error summary** receives focus and says how many fields need attention.
- Server-side validation errors are mapped back onto the same fields, in plain language.
- Numeric text fields accept what people actually type, such as `8,00,000`.

## Dialogs and live content

- Dialogs use the native `<dialog>` element opened as a modal: the browser traps focus, **Escape closes it**, and focus returns to the control that opened it (this is built-in behaviour of `<dialog>`, checked by hand rather than by an automated test).
- Destructive actions (deleting an event, task or vendor) ask for confirmation first.
- Toasts and status messages are announced through live regions (`role="status"` / `role="alert"`).
- The copilot conversation is a scrollable `role="log"` that can take keyboard focus.
- Loading states are announced, and decorative icons are hidden from assistive technology (`aria-hidden`).

## Visual design

- Text and UI contrast is checked by `scripts/check-contrast.mjs`: **23 colour pairs, all passing** (text 4.5:1, interface elements 3:1).
- Colour is never the only signal. Status badges and warnings carry text as well.
- Touch targets are at least 44 px.
- `prefers-reduced-motion` switches animation off.
- The layout is responsive, and the real-browser audit also runs on a phone-sized viewport (Pixel 7).

## How it is verified

| Check                       | What it covers                                                                                                             | Where                                  |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| ESLint `jsx-a11y`           | Static rules for labels, roles, alt text, keyboard handlers                                                                | `eslint.config.js`                     |
| axe-core in component tests | Forms, dialogs, tabs and every major screen rendered in jsdom                                                              | `*.test.tsx` (via `vitest-axe`)        |
| axe-core in a real browser  | The full journey audited against WCAG 2.0, 2.1 and 2.2 A/AA rules **including colour contrast**, on desktop **and** mobile | `e2e/` (Playwright, Pixel 7 + desktop) |
| Contrast script             | Every colour pair in the palette                                                                                           | `scripts/check-contrast.mjs`           |
| Targeted tests              | Focusable scroll regions, error summaries, labelled and described fields, dialog labelling and Escape handling             | `client/src/**/*.test.tsx`             |

Running the real-browser audit on a phone-sized screen found one real problem that the desktop run had missed: wide tables that scrolled but could not be reached with the keyboard. It is fixed and covered by a test.

## Not covered

- No manual screen-reader pass (NVDA, VoiceOver, TalkBack) has been done. Automated tools find roughly a third of accessibility problems, so this remains a gap.
- Colour contrast in jsdom cannot be evaluated, so it is checked in the real browser and by the contrast script instead.
- The interface is in English only. Prices follow Indian number formatting.
