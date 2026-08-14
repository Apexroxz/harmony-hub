import { useState, useMemo } from "react";
import { Folder, FolderOpen, Play, Music, ListPlus, ChevronRight, ChevronDown } from "lucide-react";
import type { LocalTrack } from "@/lib/mode";
import { usePlayer } from "@/lib/player";
import { formatDuration } from "@/domain/music/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface FolderBrowserProps {
  localTracks: LocalTrack[];
}

export function FolderBrowser({ localTracks }: FolderBrowserProps) {
  const { playTrack, addToQueue } = usePlayer();
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const folderMap = useMemo(() => {
    const map: Record<string, LocalTrack[]> = {};
    for (const track of localTracks) {
      const folder = track.folderPath || "Local Tracks";
      if (!map[folder]) map[folder] = [];
      map[folder].push(track);
    }
    return map;
  }, [localTracks]);

  const toggleFolder = (folderName: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderName]: !prev[folderName],
    }));
  };

  const folderEntries = Object.entries(folderMap);

  if (folderEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 bg-surface-raised p-12 text-center">
        <Folder className="h-10 w-10 text-muted-foreground mb-3" />
        <h3 className="text-lg font-semibold text-foreground">No folders found</h3>
        <p className="text-sm text-muted-foreground mt-1">Import local audio files or folders to browse.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Folder Browser</h2>
          <p className="text-xs text-muted-foreground">Browse local audio files by directory structure.</p>
        </div>
        <Badge variant="secondary" className="bg-primary/10 text-primary">
          {folderEntries.length} Folder(s)
        </Badge>
      </div>

      <div className="space-y-3">
        {folderEntries.map(([folderName, tracks]) => {
          const isExpanded = expandedFolders[folderName] ?? true;
          return (
            <div
              key={folderName}
              className="overflow-hidden rounded-2xl border border-border/60 bg-surface-raised/80 backdrop-blur-md"
            >
              {/* Folder Header */}
              <div
                onClick={() => toggleFolder(folderName)}
                className="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-card"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  {isExpanded ? (
                    <FolderOpen className="h-5 w-5 text-primary shrink-0" />
                  ) : (
                    <Folder className="h-5 w-5 text-primary shrink-0" />
                  )}
                  <div className="min-w-0">
                    <span className="font-semibold text-foreground text-sm truncate block">
                      {folderName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {tracks.length} track(s)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (tracks[0]) playTrack(tracks[0], tracks);
                    }}
                    className="h-8 bg-gradient-to-r from-violet to-cyan text-primary-foreground hover:opacity-90 gap-1 text-xs"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    Play Folder
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => tracks.forEach((t) => addToUpNext(t))}
                    title="Add folder to Up Next"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <ListPlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Tracks inside folder */}
              {isExpanded && (
                <div className="border-t border-border/40 divide-y divide-border/30 bg-card/60">
                  {tracks.map((track, i) => (
                    <div
                      key={track.id}
                      className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-surface-raised"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={track.coverImage}
                          alt={track.title}
                          className="h-9 w-9 rounded-lg object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground text-sm truncate">
                            {track.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {track.artistName} {track.album ? `• ${track.album}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-mono text-muted-foreground">
                          {formatDuration(track.duration)}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => playTrack(track, tracks)}
                          className="h-8 w-8 text-primary hover:bg-primary/10"
                        >
                          <Play className="h-4 w-4 fill-current" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
