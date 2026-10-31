// @vitest-environment jsdom
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeAiPlan, makeAllocations, makeEvent, makeTask } from '@shared/test-utils';
import type { StoredPlan, Workspace } from '@shared/types';
import { checkA11y } from '../../test/a11y';
import { renderWithProviders } from '../../test/render';
import PlanTab from './PlanTab';

vi.mock('../../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api')>();
  return { ...actual, api: { generatePlan: vi.fn(), applyPlanTasks: vi.fn(), applyPlanBudget: vi.fn() } };
});

const { api, ApiError } = await import('../../lib/api');

function storedPlan(overrides: Partial<StoredPlan> = {}): StoredPlan {
  return {
    ...makeAiPlan(),
    model: 'test-model',
    allocationAmounts: makeAllocations({ venue: 200_000, catering: 600_000 }),
    estimatedTotal: 450_000,
    budgetWarning: null,
    ...overrides,
  };
}

function workspaceWith(plan: StoredPlan | null): Workspace {
  return {
    event: makeEvent({ totalBudget: 800_000, plan }),
    tasks: [makeTask()],
    expenses: [],
    vendors: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PlanTab without a plan', () => {
  it('offers to generate a plan and reports success', async () => {
    const workspace = workspaceWith(null);
    vi.mocked(api.generatePlan).mockResolvedValue({ event: workspace.event, notes: [] });
    const user = userEvent.setup();
    renderWithProviders(<PlanTab workspace={workspace} />);

    expect(screen.getByRole('heading', { name: 'Generate your personalised plan' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Generate AI plan/ }));

    expect(api.generatePlan).toHaveBeenCalledWith(workspace.event.id);
    expect(await screen.findByText('Your plan is ready')).toBeInTheDocument();
  });

  it('shows a readable error with a retry when generation fails', async () => {
    vi.mocked(api.generatePlan).mockRejectedValue(new ApiError(502, 'AI_UNAVAILABLE', 'The AI is resting.'));
    const user = userEvent.setup();
    renderWithProviders(<PlanTab workspace={workspaceWith(null)} />);

    await user.click(screen.getByRole('button', { name: /Generate AI plan/ }));
    expect(await screen.findByText(/The AI is resting\./)).toBeInTheDocument();

    vi.mocked(api.generatePlan).mockResolvedValue({ event: makeEvent(), notes: [] });
    await user.click(screen.getByRole('button', { name: /Try again|Retry/i }));
    await waitFor(() => expect(api.generatePlan).toHaveBeenCalledTimes(2));
  });
});

describe('PlanTab with a plan', () => {
  it('renders every section of the plan and has no accessibility violations', async () => {
    const { container } = renderWithProviders(<PlanTab workspace={workspaceWith(storedPlan())} />);

    expect(screen.getByRole('heading', { name: 'Heritage garden wedding' })).toBeInTheDocument();
    expect(screen.getByText(/Generated with test-model/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Suggested budget split' })).toBeInTheDocument();
    expect(screen.getByText('Garden lawn')).toBeInTheDocument();
    expect(screen.getByText('Book venue')).toBeInTheDocument();
    expect(screen.getByText('Is a tasting included?')).toBeInTheDocument();
    expect(screen.getByText('Regional thali')).toBeInTheDocument();
    expect(screen.getByText('Guests arrive')).toBeInTheDocument();
    expect(screen.getByText('Covered hall on standby')).toBeInTheDocument();
    expect(screen.getByText('Use seasonal flowers')).toBeInTheDocument();
    expect(await checkA11y(container)).toHaveNoViolations();
  });

  it('shows the budget warning and the model’s open questions when present', () => {
    renderWithProviders(
      <PlanTab
        workspace={workspaceWith(
          storedPlan({ budgetWarning: 'Estimates exceed your budget', clarifyingQuestions: ['Is the venue indoors?'] }),
        )}
      />,
    );
    expect(screen.getByText(/Estimates exceed your budget/)).toBeInTheDocument();
    expect(screen.getByText('Is the venue indoors?')).toBeInTheDocument();
  });

  it('applies the budget split and reports it', async () => {
    const workspace = workspaceWith(storedPlan());
    vi.mocked(api.applyPlanBudget).mockResolvedValue({ event: workspace.event });
    const user = userEvent.setup();
    renderWithProviders(<PlanTab workspace={workspace} />);

    await user.click(screen.getByRole('button', { name: /Apply budget split/ }));
    expect(await screen.findByText('Budget split applied')).toBeInTheDocument();
  });

  it('reports a failure to apply the budget split', async () => {
    vi.mocked(api.applyPlanBudget).mockRejectedValue(new Error('Allocations exceed the budget'));
    const user = userEvent.setup();
    renderWithProviders(<PlanTab workspace={workspaceWith(storedPlan())} />);

    await user.click(screen.getByRole('button', { name: /Apply budget split/ }));
    expect(await screen.findByText('Allocations exceed the budget')).toBeInTheDocument();
  });

  it('adds the timeline to tasks and says how many were skipped', async () => {
    vi.mocked(api.applyPlanTasks).mockResolvedValue({ created: [makeTask(), makeTask()], skipped: 1 });
    const user = userEvent.setup();
    renderWithProviders(<PlanTab workspace={workspaceWith(storedPlan())} />);

    await user.click(screen.getByRole('button', { name: /Add timeline to tasks/ }));
    expect(await screen.findByText('Added 2 tasks, skipped 1 that already exist')).toBeInTheDocument();
  });

  it('uses the singular for one added task and reports a failure', async () => {
    vi.mocked(api.applyPlanTasks).mockResolvedValueOnce({ created: [makeTask()], skipped: 0 });
    const user = userEvent.setup();
    renderWithProviders(<PlanTab workspace={workspaceWith(storedPlan())} />);

    await user.click(screen.getByRole('button', { name: /Add timeline to tasks/ }));
    expect(await screen.findByText('Added 1 task')).toBeInTheDocument();

    vi.mocked(api.applyPlanTasks).mockRejectedValueOnce(new Error('Task limit reached'));
    await user.click(screen.getByRole('button', { name: /Add timeline to tasks/ }));
    expect(await screen.findByText('Task limit reached')).toBeInTheDocument();
  });

  it('asks before replacing the plan, and can be cancelled', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PlanTab workspace={workspaceWith(storedPlan())} />);

    await user.click(screen.getByRole('button', { name: /Regenerate/ }));
    expect(screen.getByRole('dialog', { name: 'Replace this plan?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.generatePlan).not.toHaveBeenCalled();
  });

  it('regenerates after confirmation and shows the server’s notes', async () => {
    const workspace = workspaceWith(storedPlan());
    vi.mocked(api.generatePlan).mockResolvedValue({ event: workspace.event, notes: ['Two items were trimmed'] });
    const user = userEvent.setup();
    renderWithProviders(<PlanTab workspace={workspace} />);

    await user.click(screen.getByRole('button', { name: /Regenerate/ }));
    await user.click(dialogButton('Regenerate'));

    expect(await screen.findByText('Two items were trimmed')).toBeInTheDocument();
    expect(api.generatePlan).toHaveBeenCalledTimes(1);
  });
});

/** The confirm button inside the open dialog (the page behind it has a button with the same name). */
function dialogButton(name: string): HTMLElement {
  const dialog = screen.getByRole('dialog');
  const button = Array.from(dialog.querySelectorAll('button')).find((b) => b.textContent === name);
  if (!button) throw new Error(`No "${name}" button in the dialog`);
  return button;
}
