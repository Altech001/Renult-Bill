export type VoucherUiStatus = "Active" | "Expired" | "Unactivated";

export function voucherUiStatus(status: string): VoucherUiStatus {
  if (status === "ACTIVE") return "Active";
  if (status === "EXPIRED" || status === "ROUTER_MISSING" || status === "ROUTER_SYNC_FAILED") return "Expired";
  return "Unactivated";
}
