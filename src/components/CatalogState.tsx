import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Placeholder grid matching the TrackCard footprint. */
export function TrackGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-border/40 bg-card"
          aria-hidden="true"
        >
          <div className="aspect-square animate-pulse bg-surface-raised" />
          <div className="space-y-2 p-4">
            <div className="h-4 w-2/3 animate-pulse rounded bg-surface-raised" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-surface-raised" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Placeholder rows matching the stream feed footprint. */
export function FeedSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="rounded-3xl border border-border/50 bg-card/70 p-4 sm:p-5"
          aria-hidden="true"
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-pulse rounded-full bg-surface-raised" />
            <div className="h-3 w-32 animate-pulse rounded bg-surface-raised" />
          </div>
          <div className="mt-4 flex gap-4">
            <div className="h-24 w-24 shrink-0 animate-pulse rounded-2xl bg-surface-raised sm:h-28 sm:w-28" />
            <div className="flex-1 space-y-3 py-1">
              <div className="h-5 w-1/2 animate-pulse rounded bg-surface-raised" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-surface-raised" />
              <div className="h-10 animate-pulse rounded bg-surface-raised" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function LoadError({
  message = "We couldn't load this from the library.",
  onRetry,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 px-6 py-16 text-center",
        className
      )}
    >
      <AlertTriangle className="h-8 w-8 text-destructive" />
      <p className="text-base font-medium text-foreground">{message}</p>
      <p className="text-sm text-muted-foreground">
        The connection may have dropped. Try again in a moment.
      </p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="mt-2 border-border/60">
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 py-24 text-center">
      <p className="text-lg font-medium text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}
