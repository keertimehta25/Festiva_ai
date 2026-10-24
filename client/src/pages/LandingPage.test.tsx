// @vitest-environment jsdom
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Layout } from '../components/Layout';
import { AuthProvider } from '../auth/AuthProvider';
import { checkA11y } from '../test/a11y';
import { renderWithProviders } from '../test/render';
import { LandingPage } from './LandingPage';

function renderLanding() {
  return renderWithProviders(
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<LandingPage />} />
          <Route path="events/new" element={<h1>New event page</h1>} />
          <Route path="signin" element={<h1>Sign in page</h1>} />
        </Route>
      </Routes>
    </AuthProvider>,
  );
}

describe('Landing page', () => {
  it('shows the value proposition and both calls to action in the first screen', () => {
    renderLanding();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Big celebrations. Thoughtful plans. Zero chaos.');
    const planLinks = screen.getAllByRole('link', { name: 'Plan My Event' });
    expect(planLinks.length).toBeGreaterThanOrEqual(1);
    for (const link of planLinks) expect(link).toHaveAttribute('href', '/events/new');
    // The primary action must be reachable without scrolling: the first one sits in the hero.
    expect(planLinks[0]?.closest('.hero')).not.toBeNull();
    expect(screen.getByRole('link', { name: 'Explore Features' })).toHaveAttribute('href', '#features');
  });

  it('describes every core feature', () => {
    renderLanding();
    for (const title of ['AI event plan', 'Budget manager', 'Timeline and tasks', 'Vendor tracker', 'Personal ideas', 'Event copilot']) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
  });

  it('has landmarks, a skip link and privacy and honesty statements in the footer', () => {
    renderLanding();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByText(/Privacy:/)).toBeInTheDocument();
    expect(within(footer).getByText(/does not verify vendors/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main');
  });

  it('offers a sign-in link to visitors who are not signed in', () => {
    renderLanding();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/signin');
  });

  it('lets visitors switch the example budget split, which is calculated rather than hard-coded', async () => {
    const user = userEvent.setup();
    renderLanding();
    const table = screen.getByRole('table', { name: /wedding.*₹8,00,000/ });
    expect(within(table).getByRole('row', { name: /Catering.*30%.*₹2,40,000/ })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Birthday' }));
    expect(screen.getByRole('tab', { name: 'Birthday' })).toHaveAttribute('aria-selected', 'true');
    expect(within(screen.getByRole('table', { name: /birthday/ })).getByRole('row', { name: /Catering.*40%.*₹3,20,000/ })).toBeInTheDocument();
  });

  it('has no detectable accessibility violations', async () => {
    const { container } = renderLanding();
    expect(await checkA11y(container)).toHaveNoViolations();
  });
});
