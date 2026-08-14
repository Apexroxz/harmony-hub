import { useState, useRef } from "react";
import { Edit3, ImagePlus, Save } from "lucide-react";
import type { LocalTrack } from "@/lib/mode";
import { useAppMode } from "@/lib/mode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface TagEditorModalProps {
  track: LocalTrack;
  trigger?: React.ReactNode;
}

export function TagEditorModal({ track, trigger }: TagEditorModalProps) {
  const [open, setOpen] = useState(false);
  const { updateLocalTrackMetadata } = useAppMode();

  const [title, setTitle] = useState(track.title);
  const [artistName, setArtistName] = useState(track.artistName);
  const [album, setAlbum] = useState(track.album || "");
  const [coverImage, setCoverImage] = useState(track.coverImage);

  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const imageUrl = URL.createObjectURL(file);
      setCoverImage(imageUrl);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateLocalTrackMetadata(track.id, {
      title,
      artistName,
      album: album || "Local Library",
      coverImage,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Edit Tags</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md rounded-3xl border-border/60 bg-background/95 p-6 backdrop-blur-2xl">
        <DialogHeader className="mb-4">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
            <Edit3 className="h-5 w-5 text-primary" />
            <span>Edit ID3 Tags & Artwork</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Update metadata saved in your local device state.
          </p>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Cover Image Upload */}
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="relative group h-28 w-28 overflow-hidden rounded-2xl border border-border/60 shadow-lg">
              <img src={coverImage} alt="Cover Preview" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-semibold"
              >
                <ImagePlus className="h-6 w-6 mb-1 text-primary" />
                Change Artwork
              </button>
            </div>

            <input
              type="file"
              ref={imageInputRef}
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => imageInputRef.current?.click()}
              className="text-xs h-7 border-border/60"
            >
              <ImagePlus className="mr-1.5 h-3.5 w-3.5 text-primary" />
              Upload Custom Artwork
            </Button>
          </div>

          {/* Metadata Inputs */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Track Title
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                required
                className="rounded-xl border-border/60 bg-surface-raised text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Artist Name
              </label>
              <Input
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                placeholder="Artist"
                required
                className="rounded-xl border-border/60 bg-surface-raised text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Album
              </label>
              <Input
                value={album}
                onChange={(e) => setAlbum(e.target.value)}
                placeholder="Album"
                className="rounded-xl border-border/60 bg-surface-raised text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
              Save Tag Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
