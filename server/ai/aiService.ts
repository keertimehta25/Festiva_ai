import type { AiChatReply, AiPlan, AiSavings, ChatRequest } from '@shared/schemas';
import type { EventRecord, ExpenseRecord, TaskRecord, VendorRecord } from '@shared/types';

/** Everything the AI is allowed to know about one event. */
export interface AiWorkspace {
  event: EventRecord;
  tasks: TaskRecord[];
  expenses: ExpenseRecord[];
  vendors: VendorRecord[];
  /** Today's date (YYYY-MM-DD) in the app's time zone. */
  today: string;
}

/**
 * The only way the rest of the app talks to a language model. Swapping providers means
 * writing another implementation of this interface; routes and the client do not change.
 */
export interface AiService {
  /** Whether a provider key is configured (used by the health check, never to fake output). */
  readonly isConfigured: boolean;
  generatePlan(input: { workspace: AiWorkspace; notes: string[] }): Promise<AiPlan>;
  chat(input: { workspace: AiWorkspace; message: string; history: ChatRequest['history'] }): Promise<AiChatReply>;
  suggestSavings(input: { workspace: AiWorkspace }): Promise<AiSavings>;
}
