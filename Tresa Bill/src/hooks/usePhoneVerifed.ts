import { renultApi } from "@/api/foreform";
import { useQuery } from "@tanstack/react-query";

export function usePhoneVerifed(msisdn: string | null) {
  return useQuery({
    queryKey: ["phone-identity", msisdn],
    queryFn: () => renultApi.identity.verifyPhone(msisdn!),
    enabled: Boolean(msisdn),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
