import { Send } from 'lucide-react';
import { useState, type SyntheticEvent } from 'react';
import { LIMITS } from '@shared/constants';

interface ChatComposerProps {
  disabled: boolean;
  /** Called with the typed text; returns true when it was sent. */
  onSend: (message: string) => boolean;
}

/** Message box with a character counter. Enter sends, Shift+Enter adds a new line. */
export function ChatComposer({ disabled, onSend }: ChatComposerProps) {
  const [draft, setDraft] = useState('');

  const send = () => {
    if (onSend(draft)) setDraft('');
  };
  const handleSubmit = (event: SyntheticEvent) => {
    event.preventDefault();
    send();
  };

  return (
    <form onSubmit={handleSubmit} className="mt-md">
      <div className="field">
        <label htmlFor="chat-input">Your question</label>
        <textarea
          id="chat-input"
          className="textarea textarea-compact"
          value={draft}
          maxLength={LIMITS.maxChatMessageChars}
          onChange={(e) => {
            setDraft(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          aria-describedby="chat-hint"
        />
        <span id="chat-hint" className="hint">
          {draft.length}/{LIMITS.maxChatMessageChars} characters. Enter to send, Shift+Enter for a new line.
        </span>
      </div>
      <button type="submit" className="btn btn-primary" disabled={disabled || draft.trim() === ''}>
        <Send size={16} aria-hidden="true" /> Send
      </button>
    </form>
  );
}
