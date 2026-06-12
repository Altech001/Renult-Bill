import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";

export interface VoucherProgressEvent {
  time: string;
  stage: string;
  message: string;
}

interface VoucherProgressDialogProps {
  open: boolean;
  stage?: string;
  message?: string;
  progress?: number;
  events?: VoucherProgressEvent[];
  failed?: boolean;
}

function formatEventTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/**
 * Colorful progress dialog shown while a voucher job runs on MikroTik.
 * Replaces the old plain progress-bar + table-style event log.
 */
export function VoucherProgressDialog({
  open,
  stage,
  message,
  progress = 0,
  events = [],
  failed = false,
}: VoucherProgressDialogProps) {
  const pct = Math.max(0, Math.min(100, progress));
  const isComplete = pct >= 100 && !failed;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <Dialog open={open}>
      <DialogContent
        className="gap-0 overflow-hidden p-0 sm:max-w-md [&>button]:hidden"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Generating vouchers</DialogTitle>
          <DialogDescription>Voucher creation progress on MikroTik</DialogDescription>
        </DialogHeader>

        {/* Hero / spinner */}
        <div
          className={cn(
            "relative overflow-hidden px-6 pb-9 pt-8 text-center text-white",
            failed
              ? "bg-gradient-to-br from-rose-500 via-red-500 to-orange-500"
              : "bg-gradient-to-br from-violet-600 via-indigo-600 to-fuchsia-600",
          )}
        >
          <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -right-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

          <div className="relative mx-auto h-24 w-24">
            {!isComplete && !failed && (
              <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-white/25 border-t-white" />
            )}
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="6" />
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="white"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="transition-[stroke-dashoffset] duration-500 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              {failed ? (
                <AlertTriangle className="h-9 w-9" />
              ) : isComplete ? (
                <CheckCircle2 className="h-9 w-9" />
              ) : (
                <span className="text-xl font-extrabold tabular-nums">{Math.round(pct)}%</span>
              )}
            </div>
          </div>

          <h3 className="relative mt-4 flex items-center justify-center gap-1.5 text-base font-bold">
            {!isComplete && !failed && <Sparkles className="h-4 w-4 animate-pulse" />}
            {failed ? "Something went wrong" : isComplete ? "Vouchers ready!" : stage || "Queueing"}
          </h3>
          <p className="relative mt-1 text-xs text-white/85">{message || "Saving the voucher job to PostgreSQL..."}</p>
        </div>

        {/* Timeline */}
        <div className="max-h-56 overflow-y-auto px-5 py-4">
          {events.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">Waiting for the first update from MikroTik...</p>
          ) : (
            events.map((event, index) => {
              const isLast = index === events.length - 1;
              const isErrorEvent = /error|fail/i.test(event.stage) || /error|fail/i.test(event.message);
              return (
                <div key={`${event.time}-${index}`} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-4",
                        isErrorEvent
                          ? "bg-destructive ring-destructive/15"
                          : isLast && !isComplete
                            ? "animate-pulse bg-primary ring-primary/15"
                            : "bg-emerald-500 ring-emerald-500/15",
                      )}
                    />
                    {!isLast && <div className="w-px flex-1 bg-border" />}
                  </div>
                  <div className={cn("min-w-0 flex-1", isLast ? "pb-1" : "pb-3")}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-foreground">{event.stage}</span>
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{formatEventTime(event.time)}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{event.message}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-border/50 bg-muted/30 px-5 py-2.5 text-center text-[11px] text-muted-foreground">
          Please don't close or reload this page while we talk to MikroTik.
        </div>
      </DialogContent>
    </Dialog>
  );
}
