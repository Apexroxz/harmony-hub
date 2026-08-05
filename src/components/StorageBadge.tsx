import { useQuery } from "@tanstack/react-query";
import { ownershipQueryOptions } from "@/domain/ownership/queries";
import { storageLabel } from "@/domain/ownership/types";
import { cn } from "@/lib/utils";

interface StorageBadgeProps {
  trackId: string;
  className?: string;
}

/** Renders the storage layer for a track. Ownership-domain concern only. */
export function StorageBadge({ trackId, className }: StorageBadgeProps) {
  const { data } = useQuery(ownershipQueryOptions());
  const ownership = data?.[trackId];
  if (!ownership) return null;

  return (
    <span
      className={cn(
        "rounded-full bg-surface-raised px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground",
        className
      )}
    >
      {storageLabel(ownership.storageProvider)}
    </span>
  );
}
