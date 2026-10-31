import { useEffect, useRef } from 'react';
import type { EventRecord } from '@shared/types';
import { ProposalCard } from './ProposalCard';
import type { Turn } from './useChat';

interface ChatLogProps {
  turns: Turn[];
  pending: boolean;
  event: EventRecord;
}

/** The scrolling conversation. It stays scrolled to the newest message. */
export function ChatLog({ turns, pending, event }: ChatLogProps) {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [turns, pending]);

  // The log scrolls, so it must be focusable for keyboard users to read earlier messages (WCAG 2.1.1).
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    <div ref={logRef} className="chat-log" role="log" aria-live="polite" aria-label="Conversation" tabIndex={0}>
      {turns.length === 0 && <p className="muted">No messages yet. Pick a quick question or type your own.</p>}
      {turns.map((turn) => (
        <div key={turn.id} className={`chat-turn chat-turn-${turn.role}`}>
          <div className={`bubble bubble-${turn.role}`}>
            <span className="visually-hidden">{turn.role === 'user' ? 'You said: ' : 'Copilot said: '}</span>
            {turn.content}
          </div>
          {turn.proposals?.map((proposal) => (
            <ProposalCard key={`${turn.id}-${proposal.summary}`} proposal={proposal} event={event} />
          ))}
        </div>
      ))}
      {pending && (
        <div className="bubble bubble-assistant" role="status">
          <span className="spinner spinner-inline" aria-hidden="true" />
          Thinking…
        </div>
      )}
    </div>
  );
}
