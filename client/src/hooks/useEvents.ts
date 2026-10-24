import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export const queryKeys = {
  events: ['events'] as const,
  workspace: (eventId: string) => ['workspace', eventId] as const,
};

export function useEventList() {
  return useQuery({ queryKey: queryKeys.events, queryFn: api.listEvents });
}

export function useWorkspace(eventId: string) {
  return useQuery({ queryKey: queryKeys.workspace(eventId), queryFn: () => api.getWorkspace(eventId) });
}

/**
 * Runs a change against one event and then refreshes that event's data and the dashboard
 * list. Everything derived (totals, progress) is recalculated from the refreshed data.
 */
export function useWorkspaceMutation<Input, Output>(eventId: string, run: (input: Input) => Promise<Output>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.workspace(eventId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.events }),
      ]);
    },
  });
}
