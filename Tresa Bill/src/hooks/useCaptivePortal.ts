import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { renultApi, CaptivePortalPushPayload, CaptivePortalUpsert } from "@/api/foreform";

export function useCaptivePortal(routerId: string) {
  return useQuery({
    queryKey: ["captivePortal", routerId],
    queryFn: () => renultApi.captivePortal.get(routerId),
    enabled: !!routerId,
    retry: 1,
  });
}

export function useUpsertCaptivePortal(routerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CaptivePortalUpsert) =>
      renultApi.captivePortal.upsert(routerId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["captivePortal", routerId] });
    },
  });
}

export function usePushCaptivePortal(routerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload?: CaptivePortalPushPayload) => renultApi.captivePortal.push(routerId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["captivePortal", routerId] });
    },
  });
}
