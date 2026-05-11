"use client";

import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useToasts, dismissToast, type ToastTone } from "@/lib/toast";
import { cn } from "@/lib/utils";

const TONE_STYLE: Record<ToastTone, { box: string; Icon: typeof Info }> = {
  info: { box: "border-border/70 bg-popover/95 text-foreground", Icon: Info },
  warn: { box: "border-amber-400/50 bg-amber-400/10 text-amber-100", Icon: AlertTriangle },
  error: { box: "border-red-500/50 bg-red-500/10 text-red-100", Icon: AlertTriangle },
  success: { box: "border-emerald-500/50 bg-emerald-500/10 text-emerald-100", Icon: CheckCircle2 },
};

export function Toaster() {
  const toasts = useToasts();
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[80] flex flex-col items-end gap-2">
      {toasts.map((t) => {
        const tone = TONE_STYLE[t.tone];
        const Icon = tone.Icon;
        return (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-center gap-2 rounded-sm border px-3 py-2 font-mono text-[11px] uppercase tracking-widest shadow-md backdrop-blur",
              tone.box,
            )}
          >
            <Icon className="size-3.5 shrink-0 opacity-80" />
            <span className="normal-case tracking-normal font-sans text-sm">{t.text}</span>
            <button
              onClick={() => dismissToast(t.id)}
              className="ml-1 cursor-pointer rounded-sm p-0.5 opacity-60 hover:opacity-100"
            >
              <X className="size-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
