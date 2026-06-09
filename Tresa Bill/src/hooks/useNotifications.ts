import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { renultApi } from "@/api/foreform";

// ── useNotifications ──────────────────────────────────────────────────────────
// Fetches the paginated notification list for the current user.
export function useNotifications(query?: {
  category?: string;
  unread_only?: boolean;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ["notifications", query],
    queryFn: () => renultApi.notifications.list(query),
    retry: 1,
    staleTime: 30_000,
  });
}

// ── useUnreadCount ────────────────────────────────────────────────────────────
// Polls the unread notification count every 30 s.
export function useUnreadCount() {
  return useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: () => renultApi.notifications.unreadCount(),
    refetchInterval: 30_000,
    retry: 1,
    select: (data) => data.unread_count ?? data.count ?? 0,
  });
}

// ── useMarkRead ───────────────────────────────────────────────────────────────
export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => renultApi.notifications.markRead(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}

// ── useMarkAllRead ────────────────────────────────────────────────────────────
export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => renultApi.notifications.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}

// ── useDeleteNotification ─────────────────────────────────────────────────────
export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => renultApi.notifications.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}
