import { useMutation } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { LIMITS } from '@shared/constants';
import type { AiProposal } from '@shared/schemas';
import type { Workspace } from '@shared/types';
import { ErrorNotice } from '../../components/ui/Feedback';
import { Notice } from '../../components/ui/Notice';
import { api } from '../../lib/api';
import { ProposalCard } from './ProposalCard';

interface Turn { id: number; role: 'user' | 'assistant'; content: string; proposals?: AiProposal[] }

const QUICK_PROMPTS = [
  'What should I complete during the next two weeks?',
  'What tasks am I likely to have forgotten?',
  'Where can I save money on my budget?',
  'Suggest a rain contingency plan.',
  'Give me unique ideas that match my theme.',
];

export default function CopilotTab({ workspace }: { workspace: Workspace }) {
  const { event } = workspace;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const nextId = useRef(1);
  const logRef = useRef<HTMLDivElement>(null);

  const ask = useMutation({
    mutationFn: ({ message, history }: { message: string; history: { role: 'user' | 'assistant'; content: string }[] }) =>
      api.chat(event.id, message, history),
    onSuccess: (reply) => setTurns((current) => [...current, { id: nextId.current++, role: 'assistant', content: reply.reply, proposals: reply.proposals }]),
  });

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [turns, ask.isPending]);

  function send(message: string) {
    const text = message.trim();
    if (!text || ask.isPending) return;
    // History is captured before the new message is added, so the question is never sent twice.
    const history = turns.slice(-LIMITS.maxChatHistory).map(({ role, content }) => ({ role, content }));
    setTurns((current) => [...current, { id: nextId.current++, role: 'user', content: text }]);
    setDraft('');
    ask.mutate({ message: text, history });
  }

  const handleSubmit = (submit: FormEvent) => { submit.preventDefault(); send(draft); };

  return (
    <div className="card" style={{ maxWidth: 820 }}>
      <h2>Event copilot</h2>
      <p className="muted">
        Ask about “{event.name}”. The copilot sees your saved details, budget, expenses, tasks and vendor names (never vendor contact details). It can suggest changes, but nothing is saved unless you press Apply.
      </p>
      <Notice tone="info"><p className="small">Answers are AI-generated suggestions and estimates, not verified prices or availability. This conversation is not saved when you leave the page.</p></Notice>

      <div className="chip-row" style={{ marginTop: '1rem' }} role="group" aria-label="Quick questions">
        {QUICK_PROMPTS.map((prompt) => <button key={prompt} type="button" className="chip" disabled={ask.isPending} onClick={() => send(prompt)}>{prompt}</button>)}
      </div>

      {/* The log scrolls, so it must be focusable for keyboard users to read earlier messages (WCAG 2.1.1). */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div ref={logRef} className="chat-log" role="log" aria-live="polite" aria-label="Conversation" tabIndex={0}>
        {turns.length === 0 && <p className="muted">No messages yet. Pick a quick question or type your own.</p>}
        {turns.map((turn) => (
          <div key={turn.id} className="stack-sm" style={{ display: 'flex', flexDirection: 'column', alignItems: turn.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div className={`bubble bubble-${turn.role}`}><span className="visually-hidden">{turn.role === 'user' ? 'You said: ' : 'Copilot said: '}</span>{turn.content}</div>
            {turn.proposals?.map((proposal) => <ProposalCard key={`${turn.id}-${proposal.summary}`} proposal={proposal} event={event} />)}
          </div>
        ))}
        {ask.isPending && <div className="bubble bubble-assistant" role="status"><span className="spinner" aria-hidden="true" style={{ display: 'inline-block', marginRight: 8, verticalAlign: 'middle' }} />Thinking…</div>}
      </div>

      {ask.error && <ErrorNotice error={ask.error} onRetry={() => ask.variables && ask.mutate(ask.variables)} />}

      <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
        <div className="field">
          <label htmlFor="chat-input">Your question</label>
          <textarea id="chat-input" className="textarea" style={{ minHeight: 72 }} value={draft} maxLength={LIMITS.maxChatMessageChars} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(draft); } }} aria-describedby="chat-hint" />
          <span id="chat-hint" className="hint">{draft.length}/{LIMITS.maxChatMessageChars} characters. Enter to send, Shift+Enter for a new line.</span>
        </div>
        <button type="submit" className="btn btn-primary" disabled={ask.isPending || draft.trim() === ''}><Send size={16} aria-hidden="true" /> Send</button>
      </form>
    </div>
  );
}
