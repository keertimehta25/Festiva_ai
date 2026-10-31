import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { EventInput } from '@shared/schemas';
import { EventForm } from '../features/events/EventForm';
import { queryKeys } from '../hooks/useEvents';
import { api } from '../lib/api';

export default function NewEventPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (input: EventInput) => api.createEvent(input),
    onSuccess: async ({ event }) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.events });
      // Land on the plan tab, where the AI plan can be generated next.
      void navigate(`/events/${event.id}/plan`);
    },
  });

  return (
    <div className="container page max-w-820">
      <h1>Plan a new event</h1>
      <p className="muted">
        Only the name, budget and guest count are required. Everything else makes the plan more personal, and you can
        change it later.
      </p>
      <EventForm
        submitLabel="Create event"
        busy={create.isPending}
        onSubmit={async (input) => {
          await create.mutateAsync(input);
        }}
      />
    </div>
  );
}
