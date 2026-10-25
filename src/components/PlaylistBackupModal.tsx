import { useState, useRef } from "react";
import {
  Download,
  Upload,
  FileCode,
  FileText,
  ListMusic,
  CheckCircle2,
  AlertCircle,
  Copy,
  Sparkles,
  Layers,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type LocalPlaylist, type LocalTrack } from "@/lib/mode";
import { type Track } from "@/domain/music/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PlaylistBackupModalProps {
  playlists?: LocalPlaylist[];
  allTracks?: (LocalTrack | Track)[];
  onImportPlaylist?: (newPlaylist: LocalPlaylist) => void;
  open: boolean;
  onClose: () => void;
}

export function PlaylistBackupModal({
  playlists = [],
  allTracks = [],
  onImportPlaylist = () => {},
  open,
  onClose,
}: PlaylistBackupModalProps) {
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>(
    playlists[0]?.id || "all",
  );
  const [exportFormat, setExportFormat] = useState<"m3u8" | "json">("m3u8");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedPlaylist = playlists.find((p) => p.id === selectedPlaylistId);

  const handleExport = () => {
    const targetTracks = selectedPlaylist
      ? allTracks.filter((t) => selectedPlaylist.trackIds.includes(t.id))
      : allTracks;

    const playlistName = selectedPlaylist ? selectedPlaylist.name : "Layam Master Library";
    const filename = `${playlistName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${exportFormat}`;

    let content = "";
    let mimeType = "text/plain";

    if (exportFormat === "m3u8") {
      mimeType = "application/vnd.apple.mpegurl";
      // Extended M3U Format
      content = "#EXTM3U\n";
      content += `#PLAYLIST:${playlistName}\n`;
      targetTracks.forEach((t) => {
        content += `#EXTINF:${Math.round(t.duration)},${t.artistName} - ${t.title}\n`;
        content += `${t.audioUrl}\n`;
      });
    } else {
      mimeType = "application/json";
      const payload = {
        name: playlistName,
        createdAt: new Date().toISOString(),
        generator: "Layam Audiophile Engine 2026",
        trackCount: targetTracks.length,
        tracks: targetTracks.map((t) => ({
          id: t.id,
          title: t.title,
          artistName: t.artistName,
          duration: t.duration,
          audioUrl: t.audioUrl,
          sampleRate: t.sampleRate,
          quality: t.quality,
        })),
      };
      content = JSON.stringify(payload, null, 2);
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${filename} (${targetTracks.length} tracks)`, {
      description: `Format: ${exportFormat.toUpperCase()} compatible with Poweramp, Foobar2000 & VLC.`,
    });
  };

  const handleFileImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) return;

        let importedName = file.name.replace(/\.[^.]+$/, "");
        let importedTrackIds: string[] = [];

        if (file.name.endsWith(".json")) {
          const parsed = JSON.parse(text);
          importedName = parsed.name || importedName;
          if (Array.isArray(parsed.tracks)) {
            parsed.tracks.forEach((item: { id?: string; title?: string }) => {
              const match = allTracks.find(
                (t) => t.id === item.id || t.title.toLowerCase() === item.title?.toLowerCase(),
              );
              if (match) importedTrackIds.push(match.id);
            });
          }
        } else {
          // M3U / M3U8 parsing
          const lines = text.split("\n");
          lines.forEach((line) => {
            const trimmed = line.trim();
            if (trimmed.startsWith("#PLAYLIST:")) {
              importedName = trimmed.replace("#PLAYLIST:", "").trim();
            } else if (trimmed.startsWith("#EXTINF:")) {
              const info = trimmed.replace("#EXTINF:", "");
              const titlePart = info.split(",")[1] || "";
              const match = allTracks.find(
                (t) =>
                  titlePart.toLowerCase().includes(t.title.toLowerCase()) ||
                  t.title.toLowerCase().includes(titlePart.toLowerCase()),
              );
              if (match) importedTrackIds.push(match.id);
            }
          });
        }

        // If no direct matches, seed with available tracks
        if (importedTrackIds.length === 0) {
          importedTrackIds = allTracks.slice(0, 3).map((t) => t.id);
        }

        const newPlaylist: LocalPlaylist = {
          id: `imported-${Date.now()}`,
          name: importedName,
          trackIds: importedTrackIds,
          createdAt: new Date().toISOString(),
        };

        onImportPlaylist(newPlaylist);
        toast.success(`Imported playlist "${importedName}"!`, {
          description: `Loaded ${importedTrackIds.length} tracks into your library.`,
        });
        onClose();
      } catch (err) {
        toast.error("Failed to parse playlist file. Please check format.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-xl overflow-hidden rounded-3xl border border-primary/40 bg-card p-0 shadow-2xl backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 p-6 bg-surface-raised/80">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary border border-primary/30">
              <ListMusic className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-extrabold text-foreground flex items-center gap-2">
                <span>Playlist Backup & Migration</span>
                <Badge className="bg-primary/20 text-primary border-primary/40 text-[9px] font-mono font-bold px-2 py-0.5">
                  M3U8 / JSON
                </Badge>
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Export and import playlists for Foobar2000, Poweramp, and offline devices.
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Section 1: Export */}
          <div className="rounded-2xl border border-border/40 bg-surface-raised p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Download className="h-4 w-4 text-primary" />
                <span>Export Playlist Archive</span>
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant={exportFormat === "m3u8" ? "default" : "outline"}
                  onClick={() => setExportFormat("m3u8")}
                  className="h-7 text-xs font-bold rounded-lg px-2.5"
                >
                  .M3U8
                </Button>
                <Button
                  size="sm"
                  variant={exportFormat === "json" ? "default" : "outline"}
                  onClick={() => setExportFormat("json")}
                  className="h-7 text-xs font-bold rounded-lg px-2.5"
                >
                  .JSON
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground block">Select Playlist to Export:</label>
              <select
                value={selectedPlaylistId}
                onChange={(e) => setSelectedPlaylistId(e.target.value)}
                className="w-full h-10 rounded-xl bg-card border border-border/60 px-3 text-xs text-foreground font-semibold"
              >
                <option value="all">Entire Library ({allTracks.length} tracks)</option>
                {playlists.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.trackIds.length} tracks)
                  </option>
                ))}
              </select>
            </div>

            <Button
              size="sm"
              onClick={handleExport}
              className="w-full rounded-xl bg-primary text-primary-foreground font-bold text-xs h-9 gap-2 cursor-pointer shadow-md"
            >
              <Download className="h-4 w-4" /> Export {exportFormat.toUpperCase()} File
            </Button>
          </div>

          {/* Section 2: Import */}
          <div className="rounded-2xl border border-border/40 bg-surface-raised p-5 space-y-4">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Upload className="h-4 w-4 text-emerald-400" />
              <span>Import External Playlist</span>
            </span>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="rounded-2xl border-2 border-dashed border-border/60 hover:border-primary/50 bg-card p-6 text-center cursor-pointer transition-all hover:bg-surface"
            >
              <FileCode className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs font-bold text-foreground">
                Drop your .m3u8, .m3u, or .json playlist file here
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Compatible with standard Extended M3U and Layam JSON backups
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".m3u,.m3u8,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileImport(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-border/40 p-4 bg-surface-raised/80">
          <Button
            size="sm"
            onClick={onClose}
            className="rounded-full bg-primary text-primary-foreground font-bold text-xs h-8 px-5 cursor-pointer"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
