import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { LIMITS } from '@shared/constants';
import type { AiProposal } from '@shared/schemas';
import { api } from '../../lib/api';

export interface Turn {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  proposals?: AiProposal[];
}

type HistoryItem = Pick<Turn, 'role' | 'content'>;

/** The conversation with the copilot: turns so far, sending a message and the pending / error state. */
export function useChat(eventId: string) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const nextId = useRef(1);

  const ask = useMutation({
    mutationFn: ({ message, history }: { message: string; history: HistoryItem[] }) =>
      api.chat(eventId, message, history),
    onSuccess: (reply) => {
      setTurns((current) => [
        ...current,
        { id: nextId.current++, role: 'assistant', content: reply.reply, proposals: reply.proposals },
      ]);
    },
  });

  /** Returns true when the message was sent (so the caller can clear its input box). */
  function send(message: string): boolean {
    const text = message.trim();
    if (!text || ask.isPending) return false;
    // History is captured before the new message is added, so the question is never sent twice.
    const history = turns.slice(-LIMITS.maxChatHistory).map(({ role, content }) => ({ role, content }));
    setTurns((current) => [...current, { id: nextId.current++, role: 'user', content: text }]);
    ask.mutate({ message: text, history });
    return true;
  }

  /** Sends the last request again after a failure. */
  function retry() {
    if (ask.variables) ask.mutate(ask.variables);
  }

  return { turns, send, isPending: ask.isPending, error: ask.error, retry };
}
