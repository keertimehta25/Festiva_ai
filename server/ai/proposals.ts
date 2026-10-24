import { isValidIsoDate } from '@shared/dates';
import { stripControlChars, type AiProposal } from '@shared/schemas';
import type { EventRecord } from '@shared/types';

/**
 * The copilot may only *suggest* changes. Before they reach the user, every proposal is
 * checked against the real event so impossible or malformed suggestions are dropped.
 */
export function sanitizeProposals(proposals: AiProposal[], event: EventRecord, today: string): AiProposal[] {
  const safe: AiProposal[] = [];

  for (const proposal of proposals) {
    if (proposal.type === 'add_task') {
      const title = stripControlChars(proposal.task.title).trim();
      if (title.length === 0) continue;

      let dueDate = proposal.task.dueDate;
      if (dueDate !== null && (!isValidIsoDate(dueDate) || dueDate < today)) dueDate = null;
      if (dueDate !== null && event.eventDate !== null && dueDate > event.eventDate) dueDate = event.eventDate;

      safe.push({ ...proposal, task: { ...proposal.task, title, dueDate } });
    } else {
      const available = event.allocations[proposal.fromCategory];
      if (proposal.fromCategory === proposal.toCategory || proposal.amount > available) continue;
      safe.push(proposal);
    }
  }
  return safe;
}
