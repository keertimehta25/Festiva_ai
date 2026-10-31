import type { Workspace } from '@shared/types';
import { ErrorNotice } from '../../components/ui/Feedback';
import { Notice } from '../../components/ui/Notice';
import { ChatComposer } from './ChatComposer';
import { ChatLog } from './ChatLog';
import { useChat } from './useChat';

const QUICK_PROMPTS = [
  'What should I complete during the next two weeks?',
  'What tasks am I likely to have forgotten?',
  'Where can I save money on my budget?',
  'Suggest a rain contingency plan.',
  'Give me unique ideas that match my theme.',
];

export default function CopilotTab({ workspace }: { workspace: Workspace }) {
  const { event } = workspace;
  const chat = useChat(event.id);

  return (
    <div className="card max-w-820">
      <h2>Event copilot</h2>
      <p className="muted">
        Ask about “{event.name}”. The copilot sees your saved details, budget, expenses, tasks and vendor names (never
        vendor contact details). It can suggest changes, but nothing is saved unless you press Apply.
      </p>
      <Notice tone="info">
        <p className="small">
          Answers are AI-generated suggestions and estimates, not verified prices or availability. This conversation is
          not saved when you leave the page.
        </p>
      </Notice>

      <div className="chip-row mt-md" role="group" aria-label="Quick questions">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="chip"
            disabled={chat.isPending}
            onClick={() => {
              chat.send(prompt);
            }}
          >
            {prompt}
          </button>
        ))}
      </div>

      <ChatLog turns={chat.turns} pending={chat.isPending} event={event} />
      {chat.error && <ErrorNotice error={chat.error} onRetry={chat.retry} />}
      <ChatComposer disabled={chat.isPending} onSend={chat.send} />
    </div>
  );
}
