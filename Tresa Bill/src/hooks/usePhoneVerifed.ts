import { renultApi } from "@/api/foreform";
import { useQuery } from "@tanstack/react-query";

const PHONE_VERIFICATION_CACHE_TIME = 24 * 60 * 60 * 1000;

export function usePhoneVerifed(msisdn: string | null) {
  return useQuery({
    queryKey: ["phone-identity", msisdn],
    queryFn: () => renultApi.identity.verifyPhone(msisdn!),
    enabled: Boolean(msisdn),
    retry: false,
    staleTime: PHONE_VERIFICATION_CACHE_TIME,
    gcTime: PHONE_VERIFICATION_CACHE_TIME,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
}
