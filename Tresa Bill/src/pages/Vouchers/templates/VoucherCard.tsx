import { Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import { VoucherTheme } from "./voucherThemes";

export interface VoucherCardData {
  code: string;
  packageName: string;
  duration: string;
  price: number;
  batchId?: string;
  wifiName?: string;
}

interface VoucherCardProps {
  voucher: VoucherCardData;
  theme: VoucherTheme;
  showWifiName: boolean;
}

/**
 * Compact voucher card template.
 * Sized (via printStyles) so 5 columns x 15 rows = 75 cards fit on one A4
 * page, i.e. 150 vouchers print across exactly 2 pages.
 */
export function VoucherCard({ voucher, theme, showWifiName }: VoucherCardProps) {
  return (
    <div
      className={cn(
        "print-card group relative flex aspect-[368/176] w-full flex-col overflow-hidden rounded-lg border bg-white shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md",
        theme.border,
      )}
    >
      <div className={cn("print-card-header flex items-center justify-between gap-1 px-2 py-1 text-white", theme.header)}>
        <div className="flex min-w-0 items-center gap-1">
          <Wifi className="print-card-icon h-3 w-3 shrink-0" />
          {showWifiName && (
            <span className="print-card-wifi truncate text-[8px] font-black uppercase tracking-wider">
              {voucher.wifiName || "TRESA WIFI"}
            </span>
          )}
        </div>
        <span className="print-card-duration shrink-0 rounded-full bg-white/25 px-1.5 py-0.5 text-[7px] font-bold uppercase leading-none">
          {voucher.duration}
        </span>
      </div>

      <div className={cn("print-card-code flex flex-1 items-center justify-center", theme.codeBg)}>
        <span className={cn("print-card-code-text font-mono text-base font-black uppercase tracking-[0.15em]", theme.codeText)}>
          {voucher.code}
        </span>
      </div>

      <div className="print-card-footer flex items-center justify-between gap-1 border-t border-black/5 px-2 py-1 text-[8px]">
        <span className="print-card-price font-bold text-foreground/70">UGX {voucher.price.toLocaleString()}</span>
        <span className={cn("print-card-package truncate font-semibold", theme.accent)}>{voucher.packageName}</span>
      </div>
    </div>
  );
}
