import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck } from "lucide-react";
import { catalogQueryOptions, findArtist } from "@/domain/music/queries";
import { cn } from "@/lib/utils";

interface ArtistAvatarProps {
  artistId: string;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  linked?: boolean;
}

const sizes = {
  sm: "h-8 w-8",
  md: "h-11 w-11",
  lg: "h-16 w-16",
};

function useArtist(artistId: string) {
  const { data } = useQuery(catalogQueryOptions());
  return findArtist(data, artistId);
}

export function ArtistAvatar({
  artistId,
  name,
  size = "md",
  className,
  linked = true,
}: ArtistAvatarProps) {
  const artist = useArtist(artistId);
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const inner = (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-raised ring-1 ring-border/60",
        sizes[size],
        className,
      )}
    >
      {artist?.avatar ? (
        <img
          src={artist.avatar}
          alt={`${name} avatar`}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-xs font-semibold text-muted-foreground">{initials}</span>
      )}
    </span>
  );

  if (!linked) return inner;

  return (
    <Link to="/artist/$id" params={{ id: artistId }} className="shrink-0">
      {inner}
    </Link>
  );
}

export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <BadgeCheck
      aria-label="Verified artist"
      className={cn("h-4 w-4 shrink-0 fill-primary/20 text-primary", className)}
    />
  );
}

export function ArtistName({
  artistId,
  name,
  className,
}: {
  artistId: string;
  name: string;
  className?: string;
}) {
  const artist = useArtist(artistId);
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <Link
        to="/artist/$id"
        params={{ id: artistId }}
        className={cn("truncate font-medium text-foreground hover:text-primary", className)}
      >
        {name}
      </Link>
      {artist?.verified && <VerifiedBadge />}
    </span>
  );
}
