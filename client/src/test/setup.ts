import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, expect } from 'vitest';
import * as axeMatchers from 'vitest-axe/matchers';

expect.extend(axeMatchers);

// Only the jsdom (client) tests render components; cleanup is a no-op for Node tests.
afterEach(() => {
  cleanup();
});

// jsdom does not implement the modal <dialog> API. This minimal stand-in mirrors what browsers
// expose to the page (the `open` attribute and the close event); focus trapping is browser-native
// and is therefore verified manually rather than here.
if (typeof HTMLDialogElement !== 'undefined' && typeof HTMLDialogElement.prototype.showModal !== 'function') {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}
