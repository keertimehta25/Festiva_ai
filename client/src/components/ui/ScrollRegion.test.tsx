// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { checkA11y } from '../../test/a11y';
import { ScrollRegion } from './ScrollRegion';

describe('ScrollRegion', () => {
  it('is a labelled landmark that keyboard users can focus', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ScrollRegion label="Expenses for this event" className="chart-table">
        <table>
          <caption>Expenses</caption>
          <tbody>
            <tr>
              <td>Venue</td>
            </tr>
          </tbody>
        </table>
      </ScrollRegion>,
    );

    const region = screen.getByRole('region', { name: 'Expenses for this event' });
    expect(region).toHaveClass('table-wrap', 'chart-table');
    await user.tab();
    expect(region).toHaveFocus();
    expect(await checkA11y(container)).toHaveNoViolations();
  });
});
