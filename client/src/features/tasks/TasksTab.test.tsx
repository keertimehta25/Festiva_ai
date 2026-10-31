// @vitest-environment jsdom
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeEvent, makeTask } from '@shared/test-utils';
import type { Workspace } from '@shared/types';
import { checkA11y } from '../../test/a11y';
import { renderWithProviders } from '../../test/render';
import TasksTab from './TasksTab';

vi.mock('../../hooks/useToday', () => ({ getToday: () => '2026-11-01' }));
vi.mock('../../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/api')>();
  return { ...actual, api: { updateTask: vi.fn(), deleteTask: vi.fn(), createTask: vi.fn() } };
});

const { api } = await import('../../lib/api');

const tasks = [
  makeTask({ title: 'Book venue', category: 'venue', priority: 'high', dueDate: '2026-11-10' }),
  makeTask({ title: 'Order cake', category: 'catering', priority: 'low', dueDate: '2026-11-20', status: 'completed' }),
  makeTask({ title: 'Print invites', category: 'invitations', priority: 'medium', dueDate: '2026-10-20' }),
];

const workspace = (list = tasks): Workspace => ({ event: makeEvent(), tasks: list, expenses: [], vendors: [] });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TasksTab', () => {
  it('lists tasks in date order and passes an accessibility audit', async () => {
    const { container } = renderWithProviders(<TasksTab workspace={workspace()} />);

    const titles = screen.getAllByRole('checkbox').map((box) => box.closest('label')?.textContent ?? '');
    expect(titles.join('|')).toMatch(/Print invites.*Book venue.*Order cake/);
    expect(screen.getByText('Showing 3 of 3 tasks')).toBeInTheDocument();
    expect(await checkA11y(container)).toHaveNoViolations();
  });

  it('invites the user to add a first task', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TasksTab workspace={workspace([])} />);

    expect(screen.getByText('No tasks yet')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Add task/ }));
    expect(screen.getByRole('dialog', { name: 'Add task' })).toBeInTheDocument();
  });

  it('filters by status, category and priority, and says when nothing matches', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TasksTab workspace={workspace()} />);

    await user.selectOptions(screen.getByLabelText('Status'), 'completed');
    expect(screen.getByText('Showing 1 of 3 tasks')).toBeInTheDocument();
    expect(screen.getByText('Order cake')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Status'), '');
    await user.selectOptions(screen.getByLabelText('Category'), 'venue');
    expect(screen.getByText('Showing 1 of 3 tasks')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Priority'), 'low');
    expect(screen.getByText('No tasks match these filters')).toBeInTheDocument();
  });

  it('switches to the timeline view and back', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TasksTab workspace={workspace()} />);

    await user.click(screen.getByRole('button', { name: 'Timeline' }));
    expect(screen.getByRole('button', { name: 'Timeline' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Book venue')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'List' }));
    expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('marks a task done and undone', async () => {
    vi.mocked(api.updateTask).mockResolvedValue(tasks[0] as never);
    const user = userEvent.setup();
    const ws = workspace();
    renderWithProviders(<TasksTab workspace={ws} />);

    await user.click(screen.getByRole('checkbox', { name: /Book venue/ }));
    expect(api.updateTask).toHaveBeenLastCalledWith(ws.event.id, tasks[0]?.id, { status: 'completed' });

    await user.click(screen.getByRole('checkbox', { name: /Order cake/ }));
    expect(api.updateTask).toHaveBeenLastCalledWith(ws.event.id, tasks[1]?.id, { status: 'pending' });
  });

  it('reports a failed status change', async () => {
    vi.mocked(api.updateTask).mockRejectedValue(new Error('Could not save'));
    const user = userEvent.setup();
    renderWithProviders(<TasksTab workspace={workspace()} />);

    await user.click(screen.getByRole('checkbox', { name: /Book venue/ }));
    expect(await screen.findByText('Could not save')).toBeInTheDocument();
  });

  it('opens the edit dialog for a task', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TasksTab workspace={workspace()} />);

    await user.click(screen.getByRole('button', { name: 'Edit Book venue' }));
    expect(screen.getByRole('dialog', { name: 'Edit task' })).toBeInTheDocument();
  });

  it('deletes a task after confirmation', async () => {
    vi.mocked(api.deleteTask).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderWithProviders(<TasksTab workspace={workspace()} />);

    await user.click(screen.getByRole('button', { name: 'Delete Book venue' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete task' }));

    expect(await screen.findByText('Task deleted')).toBeInTheDocument();
    expect(api.deleteTask).toHaveBeenCalledWith(expect.any(String), tasks[0]?.id);
  });

  it('reports a failed delete, and can cancel one', async () => {
    vi.mocked(api.deleteTask).mockRejectedValue(new Error('Task is locked'));
    const user = userEvent.setup();
    renderWithProviders(<TasksTab workspace={workspace()} />);

    await user.click(screen.getByRole('button', { name: 'Delete Book venue' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete task' }));
    expect(await screen.findByText('Task is locked')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete Book venue' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
