import { PortalAdUpsert, renultApi } from "@/api/foreform";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function usePortalAd(routerId: string) {
  return useQuery({
    queryKey: ["portalAd", routerId],
    queryFn: () => renultApi.ads.get(routerId),
    enabled: !!routerId,
    retry: 1,
  });
}

export function useSavePortalAd(routerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PortalAdUpsert) => renultApi.ads.upsert(routerId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portalAd", routerId] });
    },
  });
}
